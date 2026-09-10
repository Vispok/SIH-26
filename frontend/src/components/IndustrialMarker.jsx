import { CircleMarker, Popup } from 'react-leaflet'

function IndustrialMarker({ facility }) {
  return (
    <CircleMarker
      center={[facility.latitude, facility.longitude]}
      radius={8}
      pathOptions={{
        color: '#1f2937',
        fillColor: '#6b7280',
        fillOpacity: 0.9,
        weight: 2
      }}
    >
      <Popup>
        <div className="min-w-[190px]">

          <h3 className="font-bold text-base mb-2">
            {facility.name}
          </h3>

          <p>
            <strong>Type:</strong> {facility.type}
          </p>

          <p>
            <strong>Source:</strong> OpenStreetMap
          </p>

        </div>
      </Popup>
    </CircleMarker>
  )
}

export default IndustrialMarker