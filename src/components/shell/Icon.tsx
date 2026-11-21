const iconPaths = {
  home: (
    <>
      <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M8 17v-5h4v5" />
    </>
  ),
  close: (
    <>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3M7.5 12.5l2 2 3.5-4" />
    </>
  ),
  months: (
    <>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 11h2M11 11h2M7 14h2" />
    </>
  ),
  portfolio: (
    <>
      <path d="m10 3 7 3.5-7 3.5-7-3.5z" />
      <path d="m3 10 7 3.5 7-3.5M3 13.5 10 17l7-3.5" />
    </>
  ),
  bills: (
    <>
      <path d="M5 2.5h10v15l-2.5-1.5-2.5 1.5-2.5-1.5L5 17.5z" />
      <path d="M8 7h4M8 10h4" />
    </>
  ),
  plan: (
    <>
      <path d="M3 15 8 9l3 3 6-7" />
      <path d="M13 5h4v4" />
    </>
  ),
  planVersusActual: <path d="M4 17V9M10 17V4M16 17v-6" />,
  projections: (
    <>
      <path d="M3 17c4 0 6-3 8-7s4-6 6-6" />
      <path d="M3 17h14" />
    </>
  ),
  spending: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 3v7h7" />
    </>
  ),
  copy: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M13 7V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" />
    </>
  ),
  health: (
    <>
      <path d="M10 3 18 17H2z" />
      <path d="M10 8v4M10 14.5v.5" />
    </>
  ),
  setup: (
    <>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </>
  ),
  menu: <path d="M3 5h14M3 10h14M3 15h14" />,
  eye: (
    <>
      <path d="M1.5 10S5 4 10 4s8.5 6 8.5 6-3.5 6-8.5 6S1.5 10 1.5 10Z" />
      <circle cx="10" cy="10" r="2.5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M1.5 10S5 4 10 4s8.5 6 8.5 6-3.5 6-8.5 6S1.5 10 1.5 10Z" />
      <circle cx="10" cy="10" r="2.5" />
      <path d="M3 17 17 3" />
    </>
  ),
  trend: <path d="M3 14 8 9l3 2.5L17 5" />,
}

export type IconName = keyof typeof iconPaths

// The line icons of the shell, drawn in the current text colour.
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 20 20" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}
