const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
}

export default function Avatar({ name, size = 'md', avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full object-cover`}
      />
    )
  }

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
