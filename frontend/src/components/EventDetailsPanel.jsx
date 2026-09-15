// function EventDetailsPanel({
//   event,
//   facility,
//   distance,
//   onClose
// }) {
//   return (
//     <div className="absolute top-4 left-4 z-[1000] w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-5">

//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-lg font-bold text-gray-900">
//           Thermal Event #{event.id}
//         </h3>

//         <button
//           onClick={onClose}
//           className="text-gray-500 hover:text-gray-900 text-xl"
//         >
//           ×
//         </button>
//       </div>

//       <div className="space-y-3 text-sm">

//         <div>
//           <p className="text-gray-500">Risk Level</p>
//           <p className="font-semibold">
//             {event.risk}
//           </p>
//         </div>

//         <div>
//           <p className="text-gray-500">Brightness Temperature</p>
//           <p className="font-semibold">
//             {event.brightness} K
//           </p>
//         </div>

//         <div>
//           <p className="text-gray-500">Fire Radiative Power</p>
//           <p className="font-semibold">
//             {event.frp} MW
//           </p>
//         </div>

//         <div>
//           <p className="text-gray-500">Confidence</p>
//           <p className="font-semibold">
//             {event.confidence}%
//           </p>
//         </div>

//         <hr />

//         <div>
//           <p className="text-gray-500">Nearest Industrial Facility</p>
//           <p className="font-semibold">
//             {facility.name}
//           </p>
//         </div>

//         <div>
//           <p className="text-gray-500">Facility Type</p>
//           <p className="font-semibold">
//             {facility.type}
//           </p>
//         </div>

//         <div>
//           <p className="text-gray-500">Distance</p>
//           <p className="font-semibold">
//             {distance.toFixed(2)} km
//           </p>
//         </div>

//         <hr />

//         <div>
//           <p className="text-gray-500 mb-2">
//             Risk Factors
//           </p>

//           <ul className="list-disc list-inside space-y-1">
//             <li>Thermal intensity</li>
//             <li>Fire radiative power</li>
//             <li>Proximity to industrial facility</li>
//             <li>Detection confidence</li>
//           </ul>
//         </div>

//       </div>
//     </div>
//   )
// }

// export default EventDetailsPanel

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