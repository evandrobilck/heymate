const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
}

export default function Avatar({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={`flex ${SIZE_CLASSES[size]} shrink-0 items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-700`}
    >
      {initials}
    </div>
  )
}
