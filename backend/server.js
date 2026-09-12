require("dotenv").config();
const express=require("express");
const cors=require("cors");
const fs=require("fs");
const{parse}=require("csv-parse/sync");

const MAP_KEY=process.env.FIRMS_MAP_KEY;
const FIRMS_BASE_URL="https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const SNAPSHOT_PATH="fires_snapshot.json";
const CACHE_TTL_MS=10*60*1000; // 10 minutes
const PORT=process.env.PORT || 8000;

if(!MAP_KEY){
    throw new Error("FIRMS_MAP_KEY not set. Copy .env.example to .env and add your key.");
}

const app=express();
app.use(cors());

let cache={data:null,fetchedAt:0,params:null};

if(fs.existsSync(SNAPSHOT_PATH)){
    try{
        cache = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8"));
    }catch (e) {
        console.warn("Could not load snapshot file:", e.message);
    }
}

async function fetchFirmsCsv(source, areaCoords, dayRange) {
  const url = `${FIRMS_BASE_URL}/${MAP_KEY}/${source}/${areaCoords}/${dayRange}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`FIRMS request failed with status ${resp.status}`);
  }
  const text = await resp.text();

  // FIRMS returns plain-text error messages (not CSV) on a bad key or bad params
  const head = text.slice(0, 200);
  if (head.includes("Invalid") || head.toLowerCase().includes("error")) {
    throw new Error(`FIRMS API returned an error: ${head}`);
  }

  const rows = parse(text, { columns: true, skip_empty_lines: true });
  if (!rows.length) {
    throw new Error("FIRMS returned zero rows — check area_coords/source/day_range.");
  }
  return rows;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/fires", async (req, res) => {
  const source = req.query.source || "VIIRS_SNPP_NRT"; // or MODIS_NRT, VIIRS_NOAA20_NRT, etc.
  const areaCoords = req.query.area_coords || "68,6,98,38"; // west,south,east,north — default ~India bbox
  const dayRange = parseInt(req.query.day_range || "2", 10);
  const forceRefresh = req.query.force_refresh === "true";

  const paramsKey = JSON.stringify([source, areaCoords, dayRange]);
  const now = Date.now();

  if (
    !forceRefresh &&
    cache.data &&
    cache.params === paramsKey &&
    now - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return res.json({ cached: true, count: cache.data.length, data: cache.data });
  }

  try {
    const rows = await fetchFirmsCsv(source, areaCoords, dayRange);
    cache = { data: rows, fetchedAt: now, params: paramsKey };
    return res.json({ cached: false, count: rows.length, data: rows });
  } catch (e) {
    // fall back to the last good cache instead of dying mid-demo
    if (cache.data) {
      return res.json({
        cached: true,
        stale: true,
        error: e.message,
        count: cache.data.length,
        data: cache.data,
      });
    }
    return res.status(502).json({ detail: `Could not fetch FIRMS data: ${e.message}` });
  }
});

app.post("/api/fires/snapshot", (req, res) => {
  // Call this once you have good live data, BEFORE your demo — it freezes
  // the current cache to disk so your demo doesn't depend on live internet
  // or the FIRMS API being up at the exact moment you're presenting.
  if (!cache.data) {
    return res.status(400).json({ detail: "No data cached yet — call /api/fires first." });
  }
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(cache));
  return res.json({ saved: true, path: SNAPSHOT_PATH, count: cache.data.length });
});

app.listen(PORT, () => {
  console.log(`FIRMS data server running on http://127.0.0.1:${PORT}`);
});