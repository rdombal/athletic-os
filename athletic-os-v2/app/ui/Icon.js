// One icon family: 24px grid, 1.7px stroke, round caps and joins.
// Use <Icon name="..." /> everywhere instead of text characters like ✓ × ▼ →.

const PATHS = {
  home:        <path d="M4 10l8-6 8 6v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />,
  move:        <><circle cx="13" cy="4.5" r="1.8" /><path d="M7 21l3-6 3 2v4M10 15l1-5 4 2 3-1M11 10l-3 1-2 3" /></>,
  eat:         <path d="M4 12h16a8 8 0 01-16 0zM8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />,
  lift:        <path d="M3 12h18M6 7v10M18 7v10M3 9.5v5M21 9.5v5" />,
  rotation:    <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" />,
  profile:     <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></>,
  pillars:     <path d="M4 20h16M6 20V9M10 20V9M14 20V9M18 20V9M3 9l9-5 9 5" />,
  chevronRight:<path d="M9 5l7 7-7 7" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronDown: <path d="M5 9l7 7 7-7" />,
  chevronUp:   <path d="M5 15l7-7 7 7" />,
  arrowRight:  <path d="M5 12h14M13 6l6 6-6 6" />,
  close:       <path d="M6 6l12 12M18 6L6 18" />,
  check:       <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus:        <path d="M12 5v14M5 12h14" />,
  minus:       <path d="M5 12h14" />,
  more:        <><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></>,
  list:        <path d="M5 7h14M5 12h14M5 17h9" />,
  sparkle:     <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" />,
  moon:        <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
  timer:       <><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.5 2M9.5 3h5" /></>,
  edit:        <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  trash:       <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  podcast:     <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" /></>,
  video:       <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.5-2.5z" /></>,
  article:     <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />,
  study:       <path d="M9 3h6M10 3v6l-5 9a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-9V3M7.5 15h9" />,
  external:    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
}

export default function Icon({ name, size = 22, strokeWidth = 1.7, label, style, className }) {
  const body = PATHS[name]
  if (!body) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flexShrink: 0, ...style }}
      className={className}
    >
      {body}
    </svg>
  )
}

// The Hale mark, from the brand logo.
export function HaleMark({ size = 22, color = 'var(--c-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r="27" fill="none" stroke={color} strokeWidth="3.5" />
      <circle cx="32" cy="32" r="16" fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="7.5" fill={color} />
    </svg>
  )
}
