function StatCard({ title, value, description }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <h3 className="text-3xl font-bold mt-2">
        {value}
      </h3>

      <p className="text-sm text-gray-500 mt-2">
        {description}
      </p>

    </div>
  )
}

export default StatCard