function MapFilters({
  riskFilter,
  setRiskFilter,
  facilityFilter,
  setFacilityFilter
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-64">

      <h3 className="font-semibold text-gray-900 mb-4">
        Map Filters
      </h3>

      <div className="mb-4">
        <label className="block text-sm text-gray-500 mb-1">
          Risk Level
        </label>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Facility Type
        </label>

        <select
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Facilities</option>
          <option value="Chemical Plant">Chemical Plant</option>
          <option value="Power Plant">Power Plant</option>
          <option value="Manufacturing Plant">
            Manufacturing Plant
          </option>
        </select>
      </div>

    </div>
  )
}

export default MapFilters

