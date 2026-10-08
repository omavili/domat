import { describe, expect, it } from 'vitest'
import { createInitialState, timerReducer } from './reducer'
import type { Action, State } from './types'

const run = (state: State, ...actions: Action[]) => actions.reduce(timerReducer, state)

/** Starts the timer at t=0 and ticks past its end. */
function finishCurrent(state: State): State {
  const started = timerReducer(state, { type: 'start', now: 0 })
  return timerReducer(started, { type: 'tick', now: started.endsAt! })
}

describe('timerReducer', () => {
  it('starts with a full work session', () => {
    const s = createInitialState()
    expect(s).toMatchObject({ mode: 'work', status: 'idle', remainingMs: 25 * 60_000 })
  })

  it('counts down and pauses with the remaining time', () => {
    const s = run(
      createInitialState(),
      { type: 'start', now: 1000 },
      { type: 'tick', now: 11_000 },
      { type: 'pause', now: 11_000 },
    )
    expect(s.status).toBe('paused')
    expect(s.remainingMs).toBe(25 * 60_000 - 10_000)
  })

  it('resumes from the paused remaining time', () => {
    const s = run(
      createInitialState(),
      { type: 'start', now: 0 },
      { type: 'pause', now: 60_000 },
      { type: 'start', now: 500_000 },
    )
    expect(s.endsAt).toBe(500_000 + 24 * 60_000)
  })

  it('moves to a short break after a work session without auto-starting', () => {
    const s = finishCurrent(createInitialState())
    expect(s).toMatchObject({
      mode: 'shortBreak',
      status: 'idle',
      completedWork: 1,
      justFinished: 'work',
    })
  })

  it('returns to work after a break', () => {
    const s = finishCurrent(finishCurrent(createInitialState()))
    expect(s).toMatchObject({ mode: 'work', justFinished: 'shortBreak', completedWork: 1 })
  })

  it('gives a long break after the 4th work session', () => {
    let s = createInitialState()
    for (let i = 0; i < 3; i++) s = finishCurrent(finishCurrent(s))
    expect(s.mode).toBe('work')
    s = finishCurrent(s)
    expect(s).toMatchObject({ mode: 'longBreak', completedWork: 4 })
  })

  it('skip does not count a work session', () => {
    const s = run(createInitialState(), { type: 'skip' })
    expect(s).toMatchObject({ mode: 'shortBreak', completedWork: 0, status: 'idle' })
  })

  it('reset restores the current mode duration', () => {
    const s = run(
      createInitialState(),
      { type: 'start', now: 0 },
      { type: 'tick', now: 5000 },
      { type: 'reset' },
    )
    expect(s).toMatchObject({ status: 'idle', remainingMs: 25 * 60_000, endsAt: null })
  })

  it('changing the active mode duration resets it; other modes do not', () => {
    const base = run(createInitialState(), { type: 'start', now: 0 })
    const active = timerReducer(base, { type: 'setDuration', mode: 'work', minutes: 10 })
    expect(active).toMatchObject({ status: 'idle', remainingMs: 10 * 60_000 })
    const other = timerReducer(base, { type: 'setDuration', mode: 'longBreak', minutes: 20 })
    expect(other.status).toBe('running')
    expect(other.settings.longBreak).toBe(20)
  })

  it('ignores a duration equal to the current one', () => {
    const s = run(createInitialState(), { type: 'start', now: 0 })
    expect(timerReducer(s, { type: 'setDuration', mode: 'work', minutes: 25 })).toBe(s)
  })

  it('ignores invalid durations and clamps to at least 1 minute', () => {
    const s = createInitialState()
    expect(timerReducer(s, { type: 'setDuration', mode: 'work', minutes: NaN })).toBe(s)
    expect(timerReducer(s, { type: 'setDuration', mode: 'work', minutes: 0 }).settings.work).toBe(1)
  })
})
