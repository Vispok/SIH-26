// require("dotenv").config();
// const express=require("express");
// const cors=require("cors");
// const fs=require("fs");
// const{parse}=require("csv-parse/sync");

// const MAP_KEY=process.env.FIRMS_MAP_KEY;
// const FIRMS_BASE_URL="https://firms.modaps.eosdis.nasa.gov/api/area/csv";
// const SNAPSHOT_PATH="fires_snapshot.json";
// const CACHE_TTL_MS=10*60*1000; // 10 minutes
// const PORT=process.env.PORT || 8000;

// if(!MAP_KEY){
//     throw new Error("FIRMS_MAP_KEY not set. Copy .env.example to .env and add your key.");
// }

// const app=express();
// app.use(cors());

// let cache={data:null,fetchedAt:0,params:null};

// if(fs.existsSync(SNAPSHOT_PATH)){
//     try{
//         cache = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8"));
//     }catch (e) {
//         console.warn("Could not load snapshot file:", e.message);
//     }
// }

// async function fetchFirmsCsv(source, areaCoords, dayRange) {
//   const url = `${FIRMS_BASE_URL}/${MAP_KEY}/${source}/${areaCoords}/${dayRange}`;
//   const resp = await fetch(url);
//   if (!resp.ok) {
//     throw new Error(`FIRMS request failed with status ${resp.status}`);
//   }
//   const text = await resp.text();

//   // FIRMS returns plain-text error messages (not CSV) on a bad key or bad params
//   const head = text.slice(0, 200);
//   if (head.includes("Invalid") || head.toLowerCase().includes("error")) {
//     throw new Error(`FIRMS API returned an error: ${head}`);
//   }

//   const rows = parse(text, { columns: true, skip_empty_lines: true });
//   if (!rows.length) {
//     throw new Error("FIRMS returned zero rows — check area_coords/source/day_range.");
//   }
//   return rows;
// }

// app.get("/api/health", (req, res) => {
//   res.json({ status: "ok" });
// });

// app.get("/api/fires", async (req, res) => {
//   const source = req.query.source || "VIIRS_SNPP_NRT"; // or MODIS_NRT, VIIRS_NOAA20_NRT, etc.
//   const areaCoords = req.query.area_coords || "68,6,98,38"; // west,south,east,north — default ~India bbox
//   const dayRange = parseInt(req.query.day_range || "2", 10);
//   const forceRefresh = req.query.force_refresh === "true";

//   const paramsKey = JSON.stringify([source, areaCoords, dayRange]);
//   const now = Date.now();

//   if (
//     !forceRefresh &&
//     cache.data &&
//     cache.params === paramsKey &&
//     now - cache.fetchedAt < CACHE_TTL_MS
//   ) {
//     return res.json({ cached: true, count: cache.data.length, data: cache.data });
//   }

//   try {
//     const rows = await fetchFirmsCsv(source, areaCoords, dayRange);
//     cache = { data: rows, fetchedAt: now, params: paramsKey };
//     return res.json({ cached: false, count: rows.length, data: rows });
//   } catch (e) {
//     // fall back to the last good cache instead of dying mid-demo
//     if (cache.data) {
//       return res.json({
//         cached: true,
//         stale: true,
//         error: e.message,
//         count: cache.data.length,
//         data: cache.data,
//       });
//     }
//     return res.status(502).json({ detail: `Could not fetch FIRMS data: ${e.message}` });
//   }
// });

// app.post("/api/fires/snapshot", (req, res) => {
//   // Call this once you have good live data, BEFORE your demo — it freezes
//   // the current cache to disk so your demo doesn't depend on live internet
//   // or the FIRMS API being up at the exact moment you're presenting.
//   if (!cache.data) {
//     return res.status(400).json({ detail: "No data cached yet — call /api/fires first." });
//   }
//   fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(cache));
//   return res.json({ saved: true, path: SNAPSHOT_PATH, count: cache.data.length });
// });

// app.listen(PORT, () => {
//   console.log(`FIRMS data server running on http://127.0.0.1:${PORT}`);
// });

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { parse } = require("csv-parse/sync");

const pool = require("./db");

const app = express();

const PORT = process.env.PORT || 8000;

const FIRMS_KEY = process.env.FIRMS_MAP_KEY;

const PYTHON_API_URL =
    process.env.PYTHON_API_URL ||
    "http://127.0.0.1:3000";

const FIRMS_URL =
    "https://firms.modaps.eosdis.nasa.gov/api/area/csv";


app.use(cors());

app.use(express.json());


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        const pythonResponse =
            await fetch(
                `${PYTHON_API_URL}/health`
            );

        res.json({

            status: "ok",

            database: "connected",

            python:
                pythonResponse.ok
                    ? "connected"
                    : "disconnected"

        });

    } catch (error) {

        res.status(503).json({

            status: "error",

            detail: error.message

        });

    }

});


// ============================================================
// FETCH NASA FIRMS DATA
// ============================================================

async function fetchFirmsData(
    source,
    areaCoords,
    dayRange
) {

    const url =
        `${FIRMS_URL}/` +
        `${FIRMS_KEY}/` +
        `${source}/` +
        `${areaCoords}/` +
        `${dayRange}`;


    console.log(
        "Fetching data from NASA FIRMS..."
    );


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            `FIRMS returned ${response.status}`
        );

    }


    const csv =
        await response.text();


    const rows =
        parse(csv, {

            columns: true,

            skip_empty_lines: true,

            trim: true

        });


    console.log(
        `FIRMS returned ${rows.length} events`
    );


    return rows;

}


// ============================================================
// SAVE FIRMS EVENTS TO POSTGRESQL
// ============================================================

async function saveFireEvents(rows) {

    let saved = 0;


    for (const row of rows) {

        const latitude =
            Number(row.latitude);

        const longitude =
            Number(row.longitude);


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {

            continue;

        }


        /*
         * We use the existing table.

         * No new table is created.
         *
         * geom is generated from latitude/longitude.
         */


        await pool.query(

            `

            INSERT INTO fire_events (

                latitude,

                longitude,

                geom,

                brightness,

                frp,

                confidence,

                acq_date,

                acq_time,

                satellite

            )

            VALUES (

                $1,

                $2,

                ST_SetSRID(
                    ST_MakePoint(
                        $2,
                        $1
                    ),
                    4326
                ),

                $3,

                $4,

                $5,

                $6,

                $7,

                $8

            );

            `,

            [

                latitude,

                longitude,

                Number(row.brightness) || null,

                Number(row.frp) || null,

                row.confidence || null,

                row.acq_date || null,

                row.acq_time || null,

                row.satellite || null

            ]

        );


        saved++;

    }


    return saved;

}


// ============================================================
// GET FIRE EVENTS
// ============================================================

app.get(
    "/api/fires",
    async (req, res) => {

        const source =
            req.query.source ||
            "VIIRS_SNPP_NRT";


        const areaCoords =
            req.query.area_coords ||
            "68,6,98,38";


        const dayRange =
            Number(
                req.query.day_range || 2
            );


        try {

            // ----------------------------------------------
            // 1. Get latest FIRMS data
            // ----------------------------------------------

            const firmsData =
                await fetchFirmsData(

                    source,

                    areaCoords,

                    dayRange

                );


            // ----------------------------------------------
            // 2. Save to PostgreSQL
            // ----------------------------------------------

            const saved =
                await saveFireEvents(
                    firmsData
                );


            // ----------------------------------------------
            // 3. Return stored database records
            // ----------------------------------------------

            const result =
                await pool.query(`

                    SELECT

                        id,

                        latitude,

                        longitude,

                        brightness,

                        frp,

                        confidence,

                        acq_date,

                        acq_time,

                        satellite,

                        risk_score,

                        risk_details,

                        created_at

                    FROM fire_events

                    ORDER BY created_at DESC

                `);


            res.json({

                source,

                count:
                    result.rows.length,

                new_events:
                    saved,

                data:
                    result.rows

            });


        } catch (error) {

            console.error(
                "FIRMS error:",
                error
            );


            /*
             * FIRMS failed.
             *
             * Still try PostgreSQL so the
             * dashboard doesn't completely die.
             */

            try {

                const result =
                    await pool.query(`

                        SELECT

                            id,

                            latitude,

                            longitude,

                            brightness,

                            frp,

                            confidence,

                            acq_date,

                            acq_time,

                            satellite,

                            risk_score,

                            risk_details,

                            created_at

                        FROM fire_events

                        ORDER BY created_at DESC

                    `);


                return res.json({

                    database_only:
                        true,

                    warning:
                        error.message,

                    count:
                        result.rows.length,

                    data:
                        result.rows

                });


            } catch (dbError) {

                return res.status(500).json({

                    error:
                        dbError.message

                });

            }

        }

    }
);


// ============================================================
// ANALYZE ONE FIRE EVENT
// ============================================================

app.post(
    "/api/analyze/:id",
    async (req, res) => {

        const eventId =
            Number(req.params.id);


        if (
            !Number.isInteger(eventId)
        ) {

            return res.status(400).json({

                error:
                    "Invalid fire event ID"

            });

        }


        try {

            // ----------------------------------------------
            // 1. Get fire event from PostgreSQL
            // ----------------------------------------------

            const fireResult =
                await pool.query(

                    `

                    SELECT *

                    FROM fire_events

                    WHERE id = $1

                    `,

                    [eventId]

                );


            if (
                fireResult.rows.length === 0
            ) {

                return res.status(404).json({

                    error:
                        "Fire event not found"

                });

            }


            const fire =
                fireResult.rows[0];


            // ----------------------------------------------
            // 2. Send fire to Python
            // ----------------------------------------------

            console.log(
                `Analyzing fire event ${eventId}`
            );


            const pythonResponse =
                await fetch(

                    `${PYTHON_API_URL}/analyze`,

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                anomaly: {

                                    id:
                                        fire.id,

                                    latitude:
                                        fire.latitude,

                                    longitude:
                                        fire.longitude,

                                    brightness:
                                        fire.brightness,

                                    frp:
                                        fire.frp,

                                    confidence:
                                        fire.confidence,

                                    acq_date:
                                        fire.acq_date,

                                    acq_time:
                                        fire.acq_time,

                                    satellite:
                                        fire.satellite

                                }

                            })

                    }

                );


            if (
                !pythonResponse.ok
            ) {

                const errorText =
                    await pythonResponse.text();


                throw new Error(
                    `Python error: ${errorText}`
                );

            }


            const analysis =
                await pythonResponse.json();


            // ----------------------------------------------
            // 3. Get risk information
            // ----------------------------------------------

            const risk =
                analysis.risk || {};


            const facility =
                analysis.facility || {};


            // ----------------------------------------------
            // 4. Store risk result
            // ----------------------------------------------

            await pool.query(

                `

                UPDATE fire_events

                SET

                    risk_score = $1,

                    risk_details = $2

                WHERE id = $3

                `,

                [

                    Number(
                        risk.confidence
                    ) || null,

                    JSON.stringify({

                        risk_level:
                            risk.risk_level,

                        confidence:
                            risk.confidence,

                        key_factors:
                            risk.key_factors,

                        reasoning:
                            risk.reasoning,

                        facility:
                            facility

                    }),

                    eventId

                ]

            );


            // ----------------------------------------------
            // 5. Return result to frontend
            // ----------------------------------------------

            res.json({

                event_id:
                    eventId,

                anomaly:
                    analysis.anomaly,

                facility:
                    facility,

                risk:
                    risk

            });


        } catch (error) {

            console.error(
                "Analysis error:",
                error
            );


            res.status(502).json({

                error:
                    error.message

            });

        }

    }
);


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