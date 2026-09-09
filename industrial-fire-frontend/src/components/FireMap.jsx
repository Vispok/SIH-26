import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from 'react-leaflet'

function FireMap() {

  const center = [30.3165, 78.0322]

  const thermalEvents = [
  {
    id: 1,
    latitude: 30.3165,
    longitude: 78.0322,
    brightness: 342,
    frp: 87.4,
    confidence: 91
  },
  {
    id: 2,
    latitude: 30.4200,
    longitude: 77.9000,
    brightness: 329,
    frp: 52.1,
    confidence: 86
  },
  {
    id: 3,
    latitude: 29.9500,
    longitude: 78.1600,
    brightness: 351,
    frp: 103.2,
    confidence: 95
  }
]

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-gray-200">

      <MapContainer
        center={center}
        zoom={7}
        className="h-full w-full"
      >

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {thermalEvents.map((event) => (
            <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            >
                <Popup>
                    <strong>Thermal Event #{event.id}</strong>
                    <br />
                    Brightness: {event.brightness} K
                    <br />
                    FRP: {event.frp} MW
                    
                    <br />
                    Confidence: {event.confidence}%
                </Popup>
            </Marker>
        ))}

      </MapContainer>

    </div>
  )

  
}

export default FireMap