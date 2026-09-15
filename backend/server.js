require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { parse } = require("csv-parse/sync");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 8000;
const FIRMS_KEY = process.env.FIRMS_MAP_KEY;
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:3000";
const FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

app.use(cors());
app.use(express.json());

// VIIRS sends "l"/"n"/"h" instead of a number — confidence column is INTEGER
function confidenceToNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) return asNumber;
  const map = { l: 33, n: 66, h: 100 };
  return map[String(value).toLowerCase()] ?? null;
}

// FIRMS gives "741" or "1436" — acq_time column is TIME, needs "07:41:00"
function formatAcqTime(raw) {
  if (!raw) return null;
  const padded = String(raw).padStart(4, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:00`;
}

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    const pythonResponse = await fetch(`${PYTHON_API_URL}/health`);
    res.json({
      status: "ok",
      database: "connected",
      python: pythonResponse.ok ? "connected" : "disconnected",
    });
  } catch (error) {
    res.status(503).json({ status: "error", detail: error.message });
  }
});

// ============================================================
// FETCH NASA FIRMS DATA
// ============================================================
async function fetchFirmsData(source, areaCoords, dayRange) {
  const url = `${FIRMS_URL}/${FIRMS_KEY}/${source}/${areaCoords}/${dayRange}`;
  console.log("Fetching data from NASA FIRMS...");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`FIRMS returned ${response.status}`);

  const csv = await response.text();
  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`FIRMS returned ${rows.length} events`);
  return rows;
}

// ============================================================
// SAVE FIRMS EVENTS TO POSTGRESQL
// ============================================================
async function saveFireEvents(rows) {
  let saved = 0;

  for (const row of rows) {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    await pool.query(
      `INSERT INTO fire_events
         (latitude, longitude, geom, brightness, frp, confidence, acq_date, acq_time, satellite)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($2, $1), 4326), $3, $4, $5, $6, $7, $8)`,
      [
        latitude,
        longitude,
        Number(row.brightness) || null,
        Number(row.frp) || null,
        confidenceToNumber(row.confidence),
        row.acq_date || null,
        formatAcqTime(row.acq_time),
        row.satellite || null,
      ]
    );
    saved++;
  }

  return saved;
}

// ============================================================
// GET FIRE EVENTS (fetches new FIRMS data, saves it, returns all)
// ============================================================
app.get("/api/fires", async (req, res) => {
  const source = req.query.source || "VIIRS_SNPP_NRT";
  const areaCoords = req.query.area_coords || "68,6,98,38";
  const dayRange = Number(req.query.day_range || 2);

  try {
    const firmsData = await fetchFirmsData(source, areaCoords, dayRange);
    const saved = await saveFireEvents(firmsData);

    const result = await pool.query(`
      SELECT id, latitude, longitude, brightness, frp, confidence,
             acq_date, acq_time, satellite, risk_score, risk_details, created_at
      FROM fire_events
      ORDER BY created_at DESC
    `);

    res.json({ source, count: result.rows.length, new_events: saved, data: result.rows });
  } catch (error) {
    console.error("FIRMS error:", error);

    // FIRMS failed — still try to serve what's already in the database
    try {
      const result = await pool.query(`
        SELECT id, latitude, longitude, brightness, frp, confidence,
               acq_date, acq_time, satellite, risk_score, risk_details, created_at
        FROM fire_events
        ORDER BY created_at DESC
      `);
      res.json({ database_only: true, warning: error.message, count: result.rows.length, data: result.rows });
    } catch (dbError) {
      res.status(500).json({ error: dbError.message });
    }
  }
});

// ============================================================
// ANALYZE ONE FIRE EVENT
// ============================================================
app.post("/api/analyze/:id", async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: "Invalid fire event ID" });
  }

  try {
    const fireResult = await pool.query("SELECT * FROM fire_events WHERE id = $1", [eventId]);
    if (fireResult.rows.length === 0) {
      return res.status(404).json({ error: "Fire event not found" });
    }
    const fire = fireResult.rows[0];

    console.log(`Analyzing fire event ${eventId}`);

    const pythonResponse = await fetch(`${PYTHON_API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anomaly: {
          id: fire.id,
          latitude: fire.latitude,
          longitude: fire.longitude,
          brightness: fire.brightness,
          frp: fire.frp,
          confidence: fire.confidence,
          acq_date: fire.acq_date,
          acq_time: fire.acq_time,
          satellite: fire.satellite,
        },
      }),
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      throw new Error(`Python error: ${errorText}`);
    }

    const analysis = await pythonResponse.json();
    const risk = analysis.risk || {};
    const facility = analysis.facility || {};

    await pool.query(
      `UPDATE fire_events SET risk_score = $1, risk_details = $2 WHERE id = $3`,
      [
        risk.risk_level || null,
        JSON.stringify({
          risk_level: risk.risk_level,
          confidence: risk.confidence,
          key_factors: risk.key_factors,
          reasoning: risk.reasoning,
          facility,
        }),
        eventId,
      ]
    );

    res.json({ event_id: eventId, anomaly: analysis.anomaly, facility, risk });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(502).json({ error: error.message });
  }
});

// ============================================================
// GET FACILITIES
// ============================================================
app.get("/api/facilities", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, facility_type, latitude, longitude
      FROM industrial_facilities
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// START SERVER
// ============================================================
async function startServer() {

    try {

        await pool.query(
            "SELECT 1"
        );


        app.listen(
            PORT,
            () => {

                console.log(
                    `Node server running on http://localhost:${PORT}`
                );

                console.log(
                    `Python server: ${PYTHON_API_URL}`
                );

            }
        );


    } catch (error) {

        console.error(
            "Could not connect to PostgreSQL:"
        );

        console.error(
            error
        );

        process.exit(1);

    }

}


startServer();