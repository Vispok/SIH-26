function Sidebar() {
  return (
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-gray-950 text-white p-4">
      <div className="space-y-2">

        <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-800">
          Dashboard
        </button>

        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800">
          Live Map
        </button>

        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800">
          Analytics
        </button>

        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800">
          Alerts
        </button>

      </div>
    </aside>
  )
}

export default Sidebar