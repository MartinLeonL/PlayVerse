function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="var(--pv-purple)" />
      <path d="M13 10.5 22 16 13 21.5V10.5Z" fill="#fff" />
    </svg>
  )
}

export default Logo