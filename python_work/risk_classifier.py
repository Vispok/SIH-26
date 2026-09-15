def classify_risk(anomaly: dict, facility: dict) -> dict:
    score = 0
    key_factors = []

    frp = anomaly.get("frp", 0) or 0
    if frp >= 100:
        score += 30
        key_factors.append("Very high fire radiative power")
    elif frp >= 50:
        score += 20
        key_factors.append("High fire radiative power")
    elif frp >= 20:
        score += 10
        key_factors.append("Moderate fire radiative power")

    brightness = anomaly.get("brightness", 0) or 0
    if brightness >= 360:
        score += 20
        key_factors.append("Very high brightness temperature")
    elif brightness >= 330:
        score += 12
        key_factors.append("Elevated brightness temperature")
    elif brightness >= 300:
        score += 5

    confidence = str(anomaly.get("confidence", "")).lower()
    if confidence in ("h", "high", "nominal") or confidence.replace("%", "").isdigit() and int(confidence.replace("%", "")) >= 80:
        score += 15
        key_factors.append("High detection confidence")
    elif confidence in ("n", "nominal"):
        score += 10
    elif confidence in ("l", "low"):
        score += 3

    distance_km = facility.get("distance_km", 999) if facility else 999
    if distance_km <= 1:
        score += 25
        key_factors.append(f"Very close to facility ({distance_km} km)")
    elif distance_km <= 3:
        score += 15
        key_factors.append(f"Near facility ({distance_km} km)")
    elif distance_km <= 5:
        score += 7
        key_factors.append(f"Within monitoring range of facility ({distance_km} km)")

    facility_type = (facility.get("type", "") or "").lower() if facility else ""
    high_risk_types = ["chemical", "refinery", "fuel", "gas", "power"]
    if any(t in facility_type for t in high_risk_types):
        score += 15
        key_factors.append(f"High-hazard facility type ({facility_type})")

    repeat_count = anomaly.get("repeat_count", 0) or 0
    if repeat_count >= 5:
        score += 15
        key_factors.append(f"Repeated detections ({repeat_count} times recently)")
    elif repeat_count >= 2:
        score += 8
        key_factors.append(f"Multiple recent detections ({repeat_count} times)")

    if score >= 70:
        risk_level = "CRITICAL"
    elif score >= 45:
        risk_level = "HIGH"
    elif score >= 20:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    if not key_factors:
        key_factors = ["No significant risk factors detected"]

    return {
        "risk_level": risk_level,
        "confidence": min(95, 60 + len(key_factors) * 5),  
        "key_factors": key_factors,
        "reasoning": (
            f"Risk score of {score}/120 based on FRP, brightness, detection "
            f"confidence, distance to facility ({distance_km} km), facility "
            f"type, and repeat detections."
        ),
    }
