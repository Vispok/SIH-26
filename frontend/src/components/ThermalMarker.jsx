import { CircleMarker, Popup } from 'react-leaflet'

function ThermalMarker({ event, onSelect, isSelected }) {
  const getColor = () => {
    if (event.risk === 'HIGH') return '#dc2626'
    if (event.risk === 'MEDIUM') return '#f97316'
    return '#16a34a'
  }

  const color = getColor()

  return (
    <CircleMarker
      center={[event.latitude, event.longitude]}
      radius={isSelected ? 14 : 10}
      pathOptions={{
        color: isSelected ? '#111827' : color,
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.8,
        weight: isSelected ? 4 : 2
      }}
      eventHandlers={{
        click: () => onSelect(event)
      }}
    >
      <Popup>
        <div className="min-w-[180px]">
          <h3 className="font-bold text-base mb-2">
            Thermal Event #{event.id}
          </h3>

          <p>
            <strong>Risk:</strong> {event.risk}
          </p>

          <p>
            <strong>Brightness:</strong> {event.brightness} K
          </p>

          <p>
            <strong>FRP:</strong> {event.frp} MW
          </p>

          <p>
            <strong>Confidence:</strong> {event.confidence}%
          </p>
        </div>
      </Popup>
    </CircleMarker>
  )
}

export default ThermalMarker