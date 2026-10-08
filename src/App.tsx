import { useEffect, useRef, useState } from 'react'
import { DurationInput } from './DurationInput'
import { formatTime } from './timer/format'
import { MODE_LABELS } from './timer/labels'
import { notificationsSupported, requestNotificationPermission, unlockAudio } from './timer/notify'
import type { Mode } from './timer/types'
import { useTimer } from './timer/useTimer'

const MODES: Mode[] = ['work', 'shortBreak', 'longBreak']

export default function App() {
  const [sound, setSound] = useState(false)
  const [notifications, setNotifications] = useState(notificationsSupported)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const { state, dispatch } = useTimer({ sound, notifications })
  const running = state.status === 'running'
  const primaryRef = useRef<HTMLButtonElement>(null)
  const permissionRequested = useRef(false)

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setPermissionDenied(!granted)
    setNotifications(granted)
  }

  // Notifications are on by default, so ask for permission on startup.
  useEffect(() => {
    if (permissionRequested.current || !notificationsSupported()) return
    permissionRequested.current = true
    void enableNotifications()
  }, [])

  // Keep the start/pause button focused so the timer is usable with Tab + Enter/Space.
  const focusPrimary = () => primaryRef.current?.focus()

  useEffect(() => {
    if (!state.justFinished) return
    // Don't pull focus away from a duration field the user is typing in.
    const active = document.activeElement
    if (active instanceof HTMLInputElement && active.type === 'number') return
    focusPrimary()
  }, [state.justFinished, state.mode])

  return (
    <main>
      <h1>Pomodoro</h1>

      <section aria-label="Zamanlayıcı">
        <h2>{MODE_LABELS[state.mode]}</h2>
        <p role="timer" aria-live="off">
          {formatTime(state.remainingMs)}
        </p>
        {state.justFinished && <p role="status">{MODE_LABELS[state.justFinished]} bitti.</p>}
        <p>Tamamlanan çalışma oturumu: {state.completedWork}</p>

        <button
          ref={primaryRef}
          type="button"
          onClick={() => {
            unlockAudio()
            dispatch(running ? { type: 'pause', now: Date.now() } : { type: 'start', now: Date.now() })
            focusPrimary()
          }}
        >
          {running ? 'Duraklat' : state.status === 'paused' ? 'Devam et' : 'Başlat'}
        </button>{' '}
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'reset' })
            focusPrimary()
          }}
        >
          Sıfırla
        </button>{' '}
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'skip' })
            focusPrimary()
          }}
        >
          Atla
        </button>
      </section>

      <section aria-label="Ayarlar">
        <h2>Süreler (dakika)</h2>
        {MODES.map((mode) => (
          <p key={mode}>
            <DurationInput
              label={MODE_LABELS[mode]}
              value={state.settings[mode]}
              onCommit={(minutes) => dispatch({ type: 'setDuration', mode, minutes })}
            />
          </p>
        ))}

        <h2>Bildirimler</h2>
        <p>
          <label>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => {
                if (e.target.checked) unlockAudio()
                setSound(e.target.checked)
              }}
            />{' '}
            Süre bitince ses çal
          </label>
        </p>
        <p>
          <label>
            <input
              type="checkbox"
              checked={notifications}
              disabled={!notificationsSupported()}
              onChange={(e) => {
                if (e.target.checked) void enableNotifications()
                else setNotifications(false)
              }}
            />{' '}
            Tarayıcı bildirimi göster
          </label>
        </p>
        {permissionDenied && <p role="alert">
            Bildirim izni verilmedi. Tarayıcı izni engellemiş olabilir; Chrome gizli pencerede
            bildirim izni sormadan reddeder. Normal pencerede deneyin ya da adres çubuğundaki site
            ayarlarından bildirimlere izin verin.
          </p>}
      </section>
    </main>
  )
}
