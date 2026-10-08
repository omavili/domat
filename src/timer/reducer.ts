import type { Action, Mode, Settings, State } from './types'

export const SESSIONS_BEFORE_LONG_BREAK = 4

export const DEFAULT_SETTINGS: Settings = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
}

const toMs = (minutes: number) => minutes * 60_000

export function createInitialState(settings: Settings = DEFAULT_SETTINGS): State {
  return {
    settings,
    mode: 'work',
    status: 'idle',
    remainingMs: toMs(settings.work),
    endsAt: null,
    completedWork: 0,
    justFinished: null,
  }
}

function enterMode(state: State, mode: Mode, patch: Partial<State> = {}): State {
  return {
    ...state,
    ...patch,
    mode,
    status: 'idle',
    remainingMs: toMs(state.settings[mode]),
    endsAt: null,
  }
}

export function timerReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      if (state.status === 'running') return state
      return {
        ...state,
        status: 'running',
        endsAt: action.now + state.remainingMs,
        justFinished: null,
      }

    case 'pause':
      if (state.status !== 'running' || state.endsAt === null) return state
      return {
        ...state,
        status: 'paused',
        remainingMs: Math.max(0, state.endsAt - action.now),
        endsAt: null,
      }

    case 'reset':
      return enterMode(state, state.mode, { justFinished: null })

    case 'skip':
      // Skipping a work session does not count it as completed.
      return enterMode(state, state.mode === 'work' ? 'shortBreak' : 'work', {
        justFinished: null,
      })

    case 'tick': {
      if (state.status !== 'running' || state.endsAt === null) return state
      const remainingMs = state.endsAt - action.now
      if (remainingMs > 0) {
        // Avoid re-rendering when the displayed second has not changed.
        return Math.ceil(remainingMs / 1000) === Math.ceil(state.remainingMs / 1000)
          ? state
          : { ...state, remainingMs }
      }
      if (state.mode !== 'work') {
        return enterMode(state, 'work', { justFinished: state.mode })
      }
      const completedWork = state.completedWork + 1
      const next: Mode =
        completedWork % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak'
      return enterMode(state, next, { completedWork, justFinished: 'work' })
    }

    case 'setDuration': {
      if (!Number.isFinite(action.minutes)) return state
      const minutes = Math.max(1, Math.floor(action.minutes))
      // No-op so re-submitting the same value never resets a running timer.
      if (minutes === state.settings[action.mode]) return state
      const settings = { ...state.settings, [action.mode]: minutes }
      const updated = { ...state, settings }
      // Changing the active mode's duration resets it.
      return action.mode === state.mode
        ? enterMode(updated, state.mode)
        : updated
    }
  }
}
