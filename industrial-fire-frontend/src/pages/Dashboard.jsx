import StatCard from '../components/StatCard'
import FireMap from '../components/FireMap'

function Dashboard() {
  return (
    <div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Fire Monitoring Dashboard
        </h2>

        <p className="text-gray-500 mt-1">
          Real-time monitoring of industrial fire and thermal activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        <StatCard
          title="Active Events"
          value="1,248"
          description="Detected events"
        />

        <StatCard
          title="High Risk"
          value="34"
          description="Require attention"
        />

        <StatCard
          title="Industrial Sites"
          value="182"
          description="Under monitoring"
        />

        <StatCard
          title="Active Alerts"
          value="17"
          description="Currently active"
        />

      </div>

      <FireMap />

    </div>
  )
}

export default Dashboard