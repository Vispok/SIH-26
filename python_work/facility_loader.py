import json
from pathlib import Path


FACILITY_FILE = (
    Path(__file__).parent
    / "facility_data"
    / "industrial_facilities.geojson"
)


def load_facilities():

    if not FACILITY_FILE.exists():

        raise FileNotFoundError(
            f"Facility dataset not found: {FACILITY_FILE}"
        )

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


        if geometry.get("type") != "Point":
            continue


        coordinates = geometry.get(
            "coordinates",
            []
        )

        if len(coordinates) < 2:
            continue


        longitude = coordinates[0]
        latitude = coordinates[1]


        # ----------------------------------------------------
        # Get OSM ID
        # ----------------------------------------------------

        osm_id = (
            properties.get("@id")
            or feature.get("id")
        )


        # ----------------------------------------------------
        # Get facility name
        # ----------------------------------------------------

        name = (
            properties.get("name")
            or properties.get("operator")
            or "Unnamed Industrial Facility"
        )


        # ----------------------------------------------------
        # Determine facility type
        # ----------------------------------------------------

        facility_type = determine_facility_type(
            properties
        )


        facilities.append({

            "id": osm_id,

            "name": name,

            "type": facility_type,

            "latitude": float(latitude),

            "longitude": float(longitude),

            "source": "OpenStreetMap"

        })


    return facilities


def determine_facility_type(properties):

    # More specific OSM tags first

    industrial = (
        properties.get("industrial")
        or ""
    ).lower()


    power = (
        properties.get("power")
        or ""
    ).lower()


    man_made = (
        properties.get("man_made")
        or ""
    ).lower()


    # --------------------------------------------------------
    # High hazard categories
    # --------------------------------------------------------

    if industrial in (
        "chemical",
        "oil",
        "fuel",
        "gas",
        "refinery"
    ):
        return industrial


    # --------------------------------------------------------
    # Factories
    # --------------------------------------------------------

    if industrial:

        return industrial


    # --------------------------------------------------------
    # Power plants
    # --------------------------------------------------------

    if power == "plant":

        return "power_plant"


    # --------------------------------------------------------
    # Other mapped works
    # --------------------------------------------------------

    if man_made == "works":

        return "industrial_works"


    return "industrial"