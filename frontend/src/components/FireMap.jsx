// import { useEffect, useState } from 'react'

// import {
//   MapContainer,
//   TileLayer,
//   Polyline
// } from 'react-leaflet'

// import MapFilters from './MapFilters'
// import ThermalMarker from './ThermalMarker'
// import IndustrialMarker from './IndustrialMarker'
// import MapLegend from './MapLegend'
// import EventDetailsPanel from './EventDetailsPanel'

// import {
//   thermalEvents,
//   industrialFacilities
// } from '../data/mockData'


// function calculateDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371

//   const dLat = (lat2 - lat1) * Math.PI / 180
//   const dLon = (lon2 - lon1) * Math.PI / 180

//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(lat1 * Math.PI / 180) *
//     Math.cos(lat2 * Math.PI / 180) *
//     Math.sin(dLon / 2) ** 2

//   const c = 2 * Math.atan2(
//     Math.sqrt(a),
//     Math.sqrt(1 - a)
//   )

//   return R * c
// }


// function FireMap() {
//   const center = [30.3165, 78.0322]

//   const [selectedEvent, setSelectedEvent] = useState(null)
//   const [riskFilter, setRiskFilter] = useState('ALL')
//   const [facilityFilter, setFacilityFilter] = useState('ALL')
//   const [timeFilter, setTimeFilter] = useState('ALL')
  
//   let nearestFacility = null

//   if (selectedEvent) {
//     nearestFacility = industrialFacilities.reduce(
//       (nearest, facility) => {

//         const distance = calculateDistance(
//           selectedEvent.latitude,
//           selectedEvent.longitude,
//           facility.latitude,
//           facility.longitude
//         )

//         if (!nearest || distance < nearest.distance) {
//           return {
//             facility,
//             distance
//           }
//         }

//         return nearest
//       },
//       null
//     )
//   }

//   useEffect(() => {
//     if (
//       selectedEvent &&
//       riskFilter !== 'ALL' &&
//       selectedEvent.risk !== riskFilter
//     ) {
//       setSelectedEvent(null)
//     }
//   }, [riskFilter, selectedEvent])

// const filteredEvents = thermalEvents.filter((event) => {

//   // Risk filter
//   if (
//     riskFilter !== 'ALL' &&
//     event.risk !== riskFilter
//   ) {
//     return false
//   }

//   // Time filter
//   if (timeFilter !== 'ALL') {

//     const eventTime = new Date(event.timestamp)
//     const now = new Date()

//     const difference =
//       now.getTime() - eventTime.getTime()

//     const hours =
//       difference / (1000 * 60 * 60)

//     if (timeFilter === '24H' && hours > 24) {
//       return false
//     }

//     if (timeFilter === '7D' && hours > 24 * 7) {
//       return false
//     }

//     if (timeFilter === '30D' && hours > 24 * 30) {
//       return false
//     }
//   }

//   return true
// })

//   const filteredFacilities = industrialFacilities.filter((facility) => {
//     if (facilityFilter === 'ALL') return true

//     return facility.type === facilityFilter
//   })

//   return (
//     <div className="relative h-[500px] w-full rounded-xl overflow-hidden">

//       <MapContainer
//         center={center}
//         zoom={7}
//         className="h-full w-full"
//       >

//         <TileLayer
//           attribution="&copy; OpenStreetMap contributors"
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />


//         {filteredEvents.map((event) => (
//           <ThermalMarker
//             key={event.id}
//             event={event}
//             onSelect={setSelectedEvent}
//             isSelected={selectedEvent?.id === event.id}
//           />
//         ))}


//         {filteredFacilities.map((facility) => (
//           <IndustrialMarker
//             key={facility.id}
//             facility={facility}
//           />
//         ))}


//         {selectedEvent && nearestFacility && (
//           <Polyline
//             positions={[
//               [
//                 selectedEvent.latitude,
//                 selectedEvent.longitude
//               ],
//               [
//                 nearestFacility.facility.latitude,
//                 nearestFacility.facility.longitude
//               ]
//             ]}
//             pathOptions={{
//               color: '#dc2626',
//               weight: 3,
//               dashArray: '8 8'
//             }}
//           />
//         )}

//       </MapContainer>

//       <MapFilters
//         riskFilter={riskFilter}
//         setRiskFilter={setRiskFilter}
//         facilityFilter={facilityFilter}
//         setFacilityFilter={setFacilityFilter}
//         timeFilter={timeFilter}
//         setTimeFilter={setTimeFilter}
//       />

//       <MapLegend />


//       {selectedEvent && nearestFacility && (
//         <EventDetailsPanel
//           event={selectedEvent}
//           facility={nearestFacility.facility}
//           distance={nearestFacility.distance}
//           onClose={() => setSelectedEvent(null)}
//         />
//       )}

//     </div>
//   )
// }

// export default FireMap

import { useEffect, useState } from 'react'

import {
  MapContainer,
  TileLayer,
  Polyline
} from 'react-leaflet'

import MapFilters from './MapFilters'
import ThermalMarker from './ThermalMarker'
import MapLegend from './MapLegend'
import EventDetailsPanel from './EventDetailsPanel'


const API_BASE_URL = 'http://localhost:8000'


function FireMap() {

  const center = [30.3165, 78.0322]

  const [thermalEvents, setThermalEvents] = useState([])

  const [selectedEvent, setSelectedEvent] = useState(null)

  const [riskFilter, setRiskFilter] = useState('ALL')
  const [facilityFilter, setFacilityFilter] = useState('ALL')
  const [timeFilter, setTimeFilter] = useState('ALL')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)


  // ============================================================
  // FETCH THERMAL EVENTS FROM BACKEND
  // ============================================================

  useEffect(() => {

    async function loadFireEvents() {

      try {

        setLoading(true)
        setError(null)

        const response = await fetch(
          `${API_BASE_URL}/api/fires?day_range=2`
        )

        if (!response.ok) {

          throw new Error(
            `Backend returned ${response.status}`
          )

        }

        const result = await response.json()

        console.log('Fire data received:', result)

        setThermalEvents(result.data || [])

      } catch (err) {

        console.error(
          'Failed to load fire events:',
          err
        )

        setError(err.message)

      } finally {

        setLoading(false)

      }

    }

    loadFireEvents()

  }, [])


  // ============================================================
  // ANALYZE SELECTED FIRE
  // ============================================================

  async function handleSelectEvent(event) {

    setSelectedEvent(event)

    setAnalysis(null)

    setAnalysisLoading(true)

    try {

      console.log(
        `Analyzing fire event ${event.id}`
      )

      const response = await fetch(
        `${API_BASE_URL}/api/analyze/${event.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {

        const errorData =
          await response.json().catch(() => ({}))

        throw new Error(
          errorData.error ||
          `Analysis failed with status ${response.status}`
        )

      }

      const result = await response.json()

      console.log(
        'Analysis result:',
        result
      )

      setAnalysis(result)

    } catch (err) {

      console.error(
        'Fire analysis failed:',
        err
      )

      setAnalysis({
        error: err.message
      })

    } finally {

      setAnalysisLoading(false)

    }

  }


  // ============================================================
  // CLOSE EVENT
  // ============================================================

  function handleCloseEvent() {

    setSelectedEvent(null)
    setAnalysis(null)

  }


  // ============================================================
  // FILTER EVENTS
  // ============================================================

  const filteredEvents =
    thermalEvents.filter((event) => {

      // --------------------------------------------------------
      // Risk filter
      // --------------------------------------------------------

      if (riskFilter !== 'ALL') {

        const risk =
          event.risk_level ||
          event.risk ||
          (
            event.rigsk_details &&
            event.rigsk_details.risk_level
          )

        if (risk !== riskFilter) {
          return false
        }

      }


      // --------------------------------------------------------
      // Time filter
      // --------------------------------------------------------

      if (timeFilter !== 'ALL') {

        const eventDate =
          new Date(
            `${event.acq_date}T${
              String(event.acq_time || '0000')
                .padStart(4, '0')
                .slice(0, 2)
            }:${
              String(event.acq_time || '0000')
                .padStart(4, '0')
                .slice(2, 4)
            }:00`
          )

        const now = new Date()

        const difference =
          now.getTime() -
          eventDate.getTime()

        const hours =
          difference /
          (1000 * 60 * 60)

        if (
          timeFilter === '24H' &&
          hours > 24
        ) {
          return false
        }

        if (
          timeFilter === '7D' &&
          hours > 24 * 7
        ) {
          return false
        }

        if (
          timeFilter === '30D' &&
          hours > 24 * 30
        ) {
          return false
        }

      }


      return true

    })


  return (

    <div className="relative h-[500px] w-full rounded-xl overflow-hidden">


      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (

        <div className="
          absolute
          top-4
          left-1/2
          -translate-x-1/2
          z-[2000]
          bg-white
          px-4
          py-2
          rounded-lg
          shadow-lg
          text-sm
        ">
          Loading thermal events...
        </div>

      )}


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="
          absolute
          top-4
          left-1/2
          -translate-x-1/2
          z-[2000]
          bg-red-50
          text-red-700
          border
          border-red-200
          px-4
          py-2
          rounded-lg
          shadow-lg
          text-sm
        ">
          Failed to load fire data: {error}
        </div>

      )}


      {/* ======================================================
          MAP
      ====================================================== */}

      <MapContainer
        center={center}
        zoom={7}
        className="h-full w-full"
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        {/* ====================================================
            ALL THERMAL EVENTS
        ==================================================== */}

        {filteredEvents.map((event) => (

          <ThermalMarker
            key={event.id}
            event={event}
            onSelect={handleSelectEvent}
            isSelected={
              selectedEvent?.id === event.id
            }
          />

        ))}


        {/* ====================================================
            LINE TO NEAREST FACILITY
        ==================================================== */}

        {analysis?.facility &&
          selectedEvent && (

          <Polyline
            positions={[
              [
                selectedEvent.latitude,
                selectedEvent.longitude
              ],
              [
                analysis.facility.latitude,
                analysis.facility.longitude
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


      {/* ======================================================
          FILTERS
      ====================================================== */}

      <MapFilters
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
        facilityFilter={facilityFilter}
        setFacilityFilter={setFacilityFilter}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
      />


      {/* ======================================================
          LEGEND
      ====================================================== */}

      <MapLegend />


      {/* ======================================================
          EVENT DETAILS
      ====================================================== */}

      {selectedEvent && (

        <EventDetailsPanel
          event={selectedEvent}
          analysis={analysis}
          loading={analysisLoading}
          onClose={handleCloseEvent}
        />

      )}

    </div>

  )

}

export default FireMap