function EventDetailsPanel({
  event,
  facility,
  distance,
  onClose
}) {
  return (
    <div className="absolute top-4 left-4 z-[1000] w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-5">

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Thermal Event #{event.id}
        </h3>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-900 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 text-sm">

        <div>
          <p className="text-gray-500">Risk Level</p>
          <p className="font-semibold">
            {event.risk}
          </p>
        </div>

        <div>
          <p className="text-gray-500">Brightness Temperature</p>
          <p className="font-semibold">
            {event.brightness} K
          </p>
        </div>

        <div>
          <p className="text-gray-500">Fire Radiative Power</p>
          <p className="font-semibold">
            {event.frp} MW
          </p>
        </div>

        <div>
          <p className="text-gray-500">Confidence</p>
          <p className="font-semibold">
            {event.confidence}%
          </p>
        </div>

        <hr />

        <div>
          <p className="text-gray-500">Nearest Industrial Facility</p>
          <p className="font-semibold">
            {facility.name}
          </p>
        </div>

        <div>
          <p className="text-gray-500">Facility Type</p>
          <p className="font-semibold">
            {facility.type}
          </p>
        </div>

        <div>
          <p className="text-gray-500">Distance</p>
          <p className="font-semibold">
            {distance.toFixed(2)} km
          </p>
        </div>

        <hr />

        <div>
          <p className="text-gray-500 mb-2">
            Risk Factors
          </p>

          <ul className="list-disc list-inside space-y-1">
            <li>Thermal intensity</li>
            <li>Fire radiative power</li>
            <li>Proximity to industrial facility</li>
            <li>Detection confidence</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

export default EventDetailsPanel