import { useEffect, useReducer, useRef } from 'react'
import { formatTime } from './format'
import { MODE_LABELS } from './labels'
import { playBeep, showNotification } from './notify'
import { createInitialState, timerReducer } from './reducer'

const TICK_INTERVAL_MS = 250

export interface TimerOptions {
  sound: boolean
  notifications: boolean
}

export function useTimer(options: TimerOptions) {
  const [state, dispatch] = useReducer(timerReducer, undefined, () => createInitialState())

  // Read at fire time so toggling an option never re-triggers a notification.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [state.status])

  useEffect(() => {
    // After a mode finishes, the title names the next step instead of a countdown.
    document.title = state.justFinished
      ? MODE_LABELS[state.mode]
      : `${formatTime(state.remainingMs)} – ${MODE_LABELS[state.mode]}`
  }, [state.remainingMs, state.mode, state.justFinished])

  useEffect(() => {
    if (!state.justFinished) return
    if (optionsRef.current.sound) playBeep()
    if (optionsRef.current.notifications) {
      showNotification(
        `${MODE_LABELS[state.justFinished]} bitti`,
        `Sıradaki: ${MODE_LABELS[state.mode]}`,
      )
    }
  }, [state.justFinished, state.mode])

  return { state, dispatch }
}
