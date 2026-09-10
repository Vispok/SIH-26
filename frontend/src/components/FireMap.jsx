import { useEffect, useState } from 'react'

import {
  MapContainer,
  TileLayer,
  Polyline
} from 'react-leaflet'

import MapFilters from './MapFilters'
import ThermalMarker from './ThermalMarker'
import IndustrialMarker from './IndustrialMarker'
import MapLegend from './MapLegend'
import EventDetailsPanel from './EventDetailsPanel'

import {
  thermalEvents,
  industrialFacilities
} from '../data/mockData'


function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371

  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  )

  return R * c
}


function FireMap() {
  const center = [30.3165, 78.0322]

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [facilityFilter, setFacilityFilter] = useState('ALL')
  
  let nearestFacility = null

  if (selectedEvent) {
    nearestFacility = industrialFacilities.reduce(
      (nearest, facility) => {

        const distance = calculateDistance(
          selectedEvent.latitude,
          selectedEvent.longitude,
          facility.latitude,
          facility.longitude
        )

        if (!nearest || distance < nearest.distance) {
          return {
            facility,
            distance
          }
        }

        return nearest
      },
      null
    )
  }

  useEffect(() => {
    if (
      selectedEvent &&
      riskFilter !== 'ALL' &&
      selectedEvent.risk !== riskFilter
    ) {
      setSelectedEvent(null)
    }
  }, [riskFilter, selectedEvent])

  const filteredEvents = thermalEvents.filter((event) => {
    if (riskFilter === 'ALL') return true

    return event.risk === riskFilter
  })

  const filteredFacilities = industrialFacilities.filter((facility) => {
    if (facilityFilter === 'ALL') return true

    return facility.type === facilityFilter
  })

  return (
    <div className="relative h-[500px] w-full rounded-xl overflow-hidden">

      <MapContainer
        center={center}
        zoom={7}
        className="h-full w-full"
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        {filteredEvents.map((event) => (
          <ThermalMarker
            key={event.id}
            event={event}
            onSelect={setSelectedEvent}
            isSelected={selectedEvent?.id === event.id}
          />
        ))}


        {filteredFacilities.map((facility) => (
          <IndustrialMarker
            key={facility.id}
            facility={facility}
          />
        ))}


        {selectedEvent && nearestFacility && (
          <Polyline
            positions={[
              [
                selectedEvent.latitude,
                selectedEvent.longitude
              ],
              [
                nearestFacility.facility.latitude,
                nearestFacility.facility.longitude
              ]
            ]}
            pathOptions={{
              color: '#dc2626',
              weight: 3,
              dashArray: '8 8'
            }}
          />
        )}

      </MapContainer>

      <MapFilters
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
        facilityFilter={facilityFilter}
        setFacilityFilter={setFacilityFilter}
      />

      <MapLegend />


      {selectedEvent && nearestFacility && (
        <EventDetailsPanel
          event={selectedEvent}
          facility={nearestFacility.facility}
          distance={nearestFacility.distance}
          onClose={() => setSelectedEvent(null)}
        />
      )}

    </div>
  )
}

export default FireMap