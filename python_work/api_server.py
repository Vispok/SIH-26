# from flask import Flask, request, jsonify

# from nvidia_risk_classifier import classify_risk as classify_risk_llm  # kept for later, not used by default
# from risk_classifier import classify_risk

# app = Flask(__name__)


# def analyze_single_event(anomaly: dict, facility: dict) -> dict:
#     risk_result = classify_risk(anomaly, facility)

#     return {
#         "anomaly": anomaly,
#         "facility": facility,
#         "risk": risk_result,
#     }


# @app.route("/health", methods=["GET"])
# def health_check():
#     return jsonify({"status": "ok"})


# @app.route("/analyze", methods=["POST"])
# def analyze():
#     data = request.get_json()

#     if not data or "anomaly" not in data or "facility" not in data:
#         return jsonify({"error": "Request must include both 'anomaly' and 'facility' objects."}), 400

#     anomaly = data["anomaly"]
#     facility = data["facility"]

#     if "latitude" not in anomaly or "longitude" not in anomaly:
#         return jsonify({"error": "'anomaly' must include 'latitude' and 'longitude'."}), 400

#     try:
#         result = analyze_single_event(anomaly, facility)
#         return jsonify(result), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


# @app.route("/analyze/batch", methods=["POST"])
# def analyze_batch():
#     events = request.get_json()

#     if not isinstance(events, list):
#         return jsonify({"error": "Request body must be a JSON array of {anomaly, facility} objects."}), 400

#     results = []
#     for event in events:
#         try:
#             results.append(analyze_single_event(event["anomaly"], event["facility"]))
#         except Exception as e:
#             results.append({"event": event, "error": str(e)})

#     return jsonify(results), 200


# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=3000, debug=True)

from flask import Flask, request, jsonify
import json
import math
from pathlib import Path

from risk_classifier import classify_risk


app = Flask(__name__)


# ============================================================
# FACILITY DATASET
# ============================================================

FACILITY_FILE = (
    Path(__file__).parent
    / "facility_data"
    / "industrial_facilities.geojson"
)


# ============================================================
# LOAD OSM FACILITIES
# ============================================================

def load_facilities():

    if not FACILITY_FILE.exists():

        print(
            f"ERROR: Facility file not found: {FACILITY_FILE}"
        )

        return []


    try:

        with open(
            FACILITY_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            geojson = json.load(file)


        facilities = []


        for feature in geojson.get("features", []):

            properties = (
                feature.get("properties") or {}
            )

            geometry = feature.get("geometry")


            if not geometry:
                continue


            # Our downloaded OSM data contains Point features
            if geometry.get("type") != "Point":
                continue


            coordinates = geometry.get(
                "coordinates",
                []
            )


            if len(coordinates) < 2:
                continue


            # GeoJSON order is:
            # [longitude, latitude]

            longitude = coordinates[0]
            latitude = coordinates[1]


            try:

                latitude = float(latitude)
                longitude = float(longitude)

            except (
                ValueError,
                TypeError
            ):

                continue


            # ------------------------------------------------
            # OSM ID
            # ------------------------------------------------

            osm_id = (
                properties.get("@id")
                or feature.get("id")
                or "unknown"
            )


            # ------------------------------------------------
            # Facility name
            # ------------------------------------------------

            name = (
                properties.get("name")
                or properties.get("operator")
                or "Unnamed Industrial Facility"
            )


            # ------------------------------------------------
            # Facility type
            # ------------------------------------------------

            facility_type = get_facility_type(
                properties
            )


            facilities.append({

                "id": osm_id,

                "name": name,

                "type": facility_type,

                "latitude": latitude,

                "longitude": longitude,

                "source": "OpenStreetMap"

            })


        print(
            f"Loaded {len(facilities)} facilities "
            f"from OpenStreetMap"
        )


        return facilities


    except Exception as error:

        print(
            "Error loading facility dataset:"
        )

        print(error)

        return []


# ============================================================
# DETERMINE FACILITY TYPE
# ============================================================

def get_facility_type(properties):

    industrial = str(
        properties.get("industrial") or ""
    ).lower().strip()


    power = str(
        properties.get("power") or ""
    ).lower().strip()


    man_made = str(
        properties.get("man_made") or ""
    ).lower().strip()


    landuse = str(
        properties.get("landuse") or ""
    ).lower().strip()


    # --------------------------------------------------------
    # Specific industrial types
    # --------------------------------------------------------

    if industrial:

        return industrial


    # --------------------------------------------------------
    # Power plants
    # --------------------------------------------------------

    if power == "plant":

        return "power_plant"


    # --------------------------------------------------------
    # Industrial works
    # --------------------------------------------------------

    if man_made == "works":

        return "industrial_works"


    # --------------------------------------------------------
    # Industrial land
    # --------------------------------------------------------

    if landuse == "industrial":

        return "industrial_area"


    return "industrial"


# ============================================================
# LOAD FACILITIES ONCE WHEN SERVER STARTS
# ============================================================

FACILITIES = load_facilities()


# ============================================================
# HAVERSINE DISTANCE
# ============================================================

def haversine_distance(
    lat1,
    lon1,
    lat2,
    lon2
):

    earth_radius = 6371.0


    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)

    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)


    dlat = lat2 - lat1
    dlon = lon2 - lon1


    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1)
        *
        math.cos(lat2)
        *
        math.sin(dlon / 2) ** 2
    )


    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )


    return earth_radius * c


# ============================================================
# FIND NEAREST FACILITY
# ============================================================

def find_nearest_facility(
    latitude,
    longitude
):

    if not FACILITIES:

        return None


    nearest_facility = None

    nearest_distance = float("inf")


    for facility in FACILITIES:

        distance = haversine_distance(

            latitude,

            longitude,

            facility["latitude"],

            facility["longitude"]

        )


        if distance < nearest_distance:

            nearest_distance = distance

            nearest_facility = facility


    if nearest_facility is None:

        return None


    return {

        "id":
            nearest_facility["id"],

        "name":
            nearest_facility["name"],

        "type":
            nearest_facility["type"],

        "latitude":
            nearest_facility["latitude"],

        "longitude":
            nearest_facility["longitude"],

        "distance_km":
            round(nearest_distance, 2),

        "source":
            nearest_facility["source"]

    }


# ============================================================
# ANALYZE SINGLE EVENT
# ============================================================

def analyze_single_event(
    anomaly: dict
):

    # --------------------------------------------------------
    # Get fire coordinates
    # --------------------------------------------------------

    latitude = float(
        anomaly["latitude"]
    )

    longitude = float(
        anomaly["longitude"]
    )


    # --------------------------------------------------------
    # Find nearest OSM facility
    # --------------------------------------------------------

    facility = find_nearest_facility(

        latitude,

        longitude

    )


    # --------------------------------------------------------
    # Run risk classifier
    # --------------------------------------------------------

    risk_result = classify_risk(

        anomaly,

        facility

    )


    return {

        "anomaly":
            anomaly,

        "facility":
            facility,

        "risk":
            risk_result

    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route(
    "/health",
    methods=["GET"]
)
def health_check():

    return jsonify({

        "status": "ok",

        "service": "risk-analysis",

        "facilities_loaded":
            len(FACILITIES)

    })


# ============================================================
# ANALYZE ONE EVENT
# ============================================================

@app.route(
    "/analyze",
    methods=["POST"]
)
def analyze():

    try:

        data = request.get_json()


        if not data:

            return jsonify({

                "error":
                    "Request body is required."

            }), 400


        if "anomaly" not in data:

            return jsonify({

                "error":
                    "Request must include an 'anomaly' object."

            }), 400


        anomaly = data["anomaly"]


        # ----------------------------------------------------
        # Validate coordinates
        # ----------------------------------------------------

        if (
            "latitude" not in anomaly
            or
            "longitude" not in anomaly
        ):

            return jsonify({

                "error":
                    "'anomaly' must include "
                    "'latitude' and 'longitude'."

            }), 400


        # ----------------------------------------------------
        # Analyze
        # ----------------------------------------------------

        result = analyze_single_event(
            anomaly
        )


        return jsonify(result), 200


    except Exception as error:

        print(
            "Analysis error:",
            error
        )


        return jsonify({

            "error":
                str(error)

        }), 500


# ============================================================
# BATCH ANALYSIS
# ============================================================

@app.route(
    "/analyze/batch",
    methods=["POST"]
)
def analyze_batch():

    try:

        events = request.get_json()


        if not isinstance(events, list):

            return jsonify({

                "error":
                    "Request body must be a JSON array."

            }), 400


        results = []


        for event in events:

            try:

                anomaly = event["anomaly"]


                result = analyze_single_event(
                    anomaly
                )


                results.append(result)


            except Exception as error:

                results.append({

                    "event":
                        event,

                    "error":
                        str(error)

                })


        return jsonify(results), 200


    except Exception as error:

        return jsonify({

            "error":
                str(error)

        }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print(
        "========================================"
    )

    print(
        "Starting Risk Analysis API"
    )

    print(
        f"Facilities loaded: {len(FACILITIES)}"
    )

    print(
        "Server: http://127.0.0.1:3000"
    )

    print(
        "========================================"
    )


    app.run(

        host="0.0.0.0",

        port=3000,

        debug=True

    )