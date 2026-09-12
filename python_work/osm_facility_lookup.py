import json
import time
import math
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

SEARCH_RADIUS_M = 5000

FACILITY_TAGS = [
    ("man_made", "works"),
    ("landuse", "industrial"),
    ("industrial", "chemical"),
    ("industrial", "refinery"),
    ("power", "plant"),
    ("building", "industrial"),
]


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def build_overpass_query(lat: float, lon: float) -> str:
    clauses = "\n".join(
        f'  node["{key}"="{value}"](around:{SEARCH_RADIUS_M},{lat},{lon});\n'
        f'  way["{key}"="{value}"](around:{SEARCH_RADIUS_M},{lat},{lon});'
        for key, value in FACILITY_TAGS
    )
    return f"""
    [out:json][timeout:25];
    (
    {clauses}
    );
    out center;
    """


def find_nearby_facilities(lat: float, lon: float) -> list[dict]:
    query = build_overpass_query(lat, lon)
    response = requests.post(OVERPASS_URL, data={"data": query}, timeout=30)
    response.raise_for_status()

    elements = response.json().get("elements", [])
    facilities = []

    for el in elements:
        f_lat = el.get("lat") or el.get("center", {}).get("lat")
        f_lon = el.get("lon") or el.get("center", {}).get("lon")
        if f_lat is None or f_lon is None:
            continue

        tags = el.get("tags", {})
        facilities.append({
            "name": tags.get("name", "Unnamed facility"),
            "type": tags.get("man_made") or tags.get("landuse") or tags.get("industrial") or tags.get("power") or "industrial",
            "latitude": f_lat,
            "longitude": f_lon,
            "distance_km": round(haversine_km(lat, lon, f_lat, f_lon), 2),
        })

    facilities.sort(key=lambda f: f["distance_km"])
    return facilities


def main():
    with open("firms_anomalies.json") as f:
        data = json.load(f)

    anomalies = data["anomalies"]
    enriched = []

    for i, anomaly in enumerate(anomalies):
        print(f"[{i+1}/{len(anomalies)}] Checking facilities near "
              f"({anomaly['latitude']}, {anomaly['longitude']})...")

        facilities = find_nearby_facilities(anomaly["latitude"], anomaly["longitude"])

        enriched.append({
            "anomaly": anomaly,
            "nearest_facility": facilities[0] if facilities else None,
            "all_nearby_facilities": facilities,
        })

        time.sleep(1)

    with open("anomalies_with_facilities.json", "w") as f:
        json.dump(enriched, f, indent=2)

    print(f"\nSaved {len(enriched)} enriched anomalies to anomalies_with_facilities.json")


if __name__ == "__main__":
    main()
