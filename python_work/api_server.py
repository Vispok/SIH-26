from flask import Flask, request, jsonify

from osm_facility_lookup import find_nearby_facilities
from nvidia_risk_classifier import classify_risk

app = Flask(__name__)


def analyze_single_anomaly(anomaly: dict) -> dict:
    facilities = find_nearby_facilities(anomaly["latitude"], anomaly["longitude"])
    nearest_facility = facilities[0] if facilities else None

    if nearest_facility is None:
        return {
            "anomaly": anomaly,
            "nearest_facility": None,
            "risk": None,
            "note": "No industrial facility found nearby.",
        }

    risk_result = classify_risk(anomaly, nearest_facility)

    return {
        "anomaly": anomaly,
        "nearest_facility": nearest_facility,
        "risk": risk_result,
    }


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Expects a single anomaly as JSON in the request body, e.g.:

    {
        "latitude": 30.12,
        "longitude": 78.32,
        "brightness": 340.5,
        "frp": 87.3,
        "confidence": "nominal",
        "acq_date": "2026-09-10",
        "acq_time": "0742",
        "repeat_count": 0
    }

    Returns the nearest facility + risk classification as JSON.
    """
    anomaly = request.get_json()

    if not anomaly or "latitude" not in anomaly or "longitude" not in anomaly:
        return jsonify({"error": "Request must include 'latitude' and 'longitude'."}), 400

    try:
        result = analyze_single_anomaly(anomaly)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze/batch", methods=["POST"])
def analyze_batch():
    anomalies = request.get_json()

    if not isinstance(anomalies, list):
        return jsonify({"error": "Request body must be a JSON array of anomalies."}), 400

    results = []
    for anomaly in anomalies:
        try:
            results.append(analyze_single_anomaly(anomaly))
        except Exception as e:
            results.append({"anomaly": anomaly, "error": str(e)})

    return jsonify(results), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
