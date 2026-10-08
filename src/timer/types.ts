export type Mode = 'work' | 'shortBreak' | 'longBreak'

export type Status = 'idle' | 'running' | 'paused'

/** Duration of each mode in minutes. */
export type Settings = Record<Mode, number>

export interface State {
  settings: Settings
  mode: Mode
  status: Status
  remainingMs: number
  /** Timestamp (ms) at which the running timer finishes; null unless running. */
  endsAt: number | null
  completedWork: number
  /** Mode that finished naturally last; cleared on the next user action. */
  justFinished: Mode | null
}

export type Action =
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'reset' }
  | { type: 'skip' }
  | { type: 'tick'; now: number }
  | { type: 'setDuration'; mode: Mode; minutes: number }
