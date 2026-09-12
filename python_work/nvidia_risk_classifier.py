import os
import json
import requests

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "PASTE_YOUR_NVIDIA_API_KEY_HERE")

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

MODEL_NAME = "nvidia/llama-3.1-nemotron-70b-instruct"


def build_prompt(anomaly: dict, facility: dict) -> str:
    return f"""You are a risk-assessment assistant for an industrial fire and
thermal-source monitoring system. Analyze the following detected thermal
anomaly and decide its risk level.

THERMAL ANOMALY:
- Brightness temperature: {anomaly.get('brightness')} K
- Fire Radiative Power (FRP): {anomaly.get('frp')} MW
- Detection confidence: {anomaly.get('confidence')}
- Detected on: {anomaly.get('acq_date')} at {anomaly.get('acq_time')} UTC
- Repeated detections at this location recently: {anomaly.get('repeat_count', 0)}

NEAREST INDUSTRIAL FACILITY:
- Name/type: {facility.get('name', 'Unknown')} ({facility.get('type', 'unknown')})
- Distance from anomaly: {facility.get('distance_km')} km

Classify the overall risk as exactly one of: LOW, MEDIUM, HIGH, CRITICAL.

Respond with ONLY a JSON object in this exact shape, no other text:
{{
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": <a number 0-100 for how confident you are in this classification>,
  "key_factors": ["short factor 1", "short factor 2", "..."],
  "reasoning": "1-2 sentence explanation of why"
}}"""


def classify_risk(anomaly: dict, facility: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": build_prompt(anomaly, facility)}
        ],
        "temperature": 0.2,
        "max_tokens": 400,
    }

    response = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()

    raw_text = response.json()["choices"][0]["message"]["content"].strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        print("Model did not return valid JSON. Raw response was:")
        print(raw_text)
        raise

    return result


def main():
    example_anomaly = {
        "brightness": 340.5,
        "frp": 87.3,
        "confidence": "nominal",
        "acq_date": "2026-09-10",
        "acq_time": "0742",
        "repeat_count": 3,
    }
    example_facility = {
        "name": "Riverside Chemical Plant",
        "type": "chemical_plant",
        "distance_km": 0.8,
    }

    print("Sending anomaly to NVIDIA LLM for risk classification...")
    result = classify_risk(example_anomaly, example_facility)

    print("\nClassification result:")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
