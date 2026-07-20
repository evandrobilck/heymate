export default function EmptyState({ icon = '📭', message, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-2 py-6 text-center ${className}`}>
      <span className="text-3xl">{icon}</span>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
