from flask import Flask, request, jsonify

from nvidia_risk_classifier import classify_risk as classify_risk_llm  # kept for later, not used by default
from risk_classifier import classify_risk

app = Flask(__name__)


def analyze_single_event(anomaly: dict, facility: dict) -> dict:
    risk_result = classify_risk(anomaly, facility)

    return {
        "anomaly": anomaly,
        "facility": facility,
        "risk": risk_result,
    }


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()

    if not data or "anomaly" not in data or "facility" not in data:
        return jsonify({"error": "Request must include both 'anomaly' and 'facility' objects."}), 400

    anomaly = data["anomaly"]
    facility = data["facility"]

    if "latitude" not in anomaly or "longitude" not in anomaly:
        return jsonify({"error": "'anomaly' must include 'latitude' and 'longitude'."}), 400

    try:
        result = analyze_single_event(anomaly, facility)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze/batch", methods=["POST"])
def analyze_batch():
    events = request.get_json()

    if not isinstance(events, list):
        return jsonify({"error": "Request body must be a JSON array of {anomaly, facility} objects."}), 400

    results = []
    for event in events:
        try:
            results.append(analyze_single_event(event["anomaly"], event["facility"]))
        except Exception as e:
            results.append({"event": event, "error": str(e)})

    return jsonify(results), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)
