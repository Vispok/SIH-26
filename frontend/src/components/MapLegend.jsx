function MapLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white rounded-lg shadow-md p-4">

      <h3 className="font-semibold mb-3">
        Map Legend
      </h3>

      <div className="space-y-2 text-sm">

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600"></span>
          High Risk Thermal Event
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          Medium Risk Thermal Event
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-600"></span>
          Low Risk Thermal Event
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-500"></span>
          Industrial Facility
        </div>

      </div>

    </div>
  )
}

export default MapLegend