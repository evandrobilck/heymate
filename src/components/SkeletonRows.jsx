export default function SkeletonRows({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}
