interface SegmentedProps<T extends string | number> {
  // Names the group for screen readers.
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

// A row of buttons of which exactly one is pressed, for switching what a card shows.
export function Segmented<T extends string | number>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(option => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
