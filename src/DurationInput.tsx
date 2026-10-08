import { useState } from 'react'

interface Props {
  label: string
  value: number
  onCommit: (minutes: number) => void
}

/**
 * Number field that edits a local draft and applies it only on blur/Enter,
 * so the field can be cleared while typing and the timer isn't reset per keystroke.
 */
export function DurationInput({ label, value, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const minutes = Number(draft)
    // Invalid or empty input falls back to the current value.
    if (draft.trim() !== '' && Number.isFinite(minutes) && minutes >= 1) onCommit(minutes)
    setDraft(null)
  }

  return (
    <label>
      {label}{' '}
      <input
        type="number"
        min={1}
        step={1}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}
