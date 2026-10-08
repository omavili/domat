// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as notify from './timer/notify'

vi.mock('./timer/notify', () => ({
  unlockAudio: vi.fn(),
  playBeep: vi.fn(),
  showNotification: vi.fn(),
  notificationsSupported: vi.fn(() => true),
  requestNotificationPermission: vi.fn(async () => true),
}))

const MINUTE = 60_000

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const timer = () => screen.getByRole('timer').textContent
const renderApp = async () => {
  render(<App />)
  await act(async () => {}) // let the startup permission request settle
}
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('timer', () => {
  it('counts down while running and mirrors the time in the tab title', async () => {
    await renderApp()
    expect(timer()).toBe('25:00')
    click('Başlat')
    advance(10_000)
    expect(timer()).toBe('24:50')
    expect(document.title).toBe('24:50 – Çalışma')
  })

  it('pauses and resumes without losing time', async () => {
    await renderApp()
    click('Başlat')
    advance(MINUTE)
    click('Duraklat')
    advance(5 * MINUTE)
    expect(timer()).toBe('24:00')
    click('Devam et')
    advance(MINUTE)
    expect(timer()).toBe('23:00')
  })

  it('finishes a work session, announces it and waits for the user', async () => {
    await renderApp()
    click('Başlat')
    advance(25 * MINUTE)
    expect(screen.getByRole('heading', { name: 'Kısa mola' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Çalışma bitti.')
    expect(document.title).toBe('Kısa mola')
    expect(timer()).toBe('05:00')
    advance(MINUTE)
    expect(timer()).toBe('05:00')
    expect(screen.getByText('Tamamlanan çalışma oturumu: 1')).toBeTruthy()
  })
})

describe('duration fields', () => {
  it('can be cleared and retyped, applying only on blur', async () => {
    await renderApp()
    const input = field('Çalışma')
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
    fireEvent.change(input, { target: { value: '10' } })
    expect(timer()).toBe('25:00')
    fireEvent.blur(input)
    expect(timer()).toBe('10:00')
    expect(input.value).toBe('10')
  })

  it('applies on Enter', async () => {
    await renderApp()
    const input = field('Çalışma')
    input.focus()
    fireEvent.change(input, { target: { value: '15' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(timer()).toBe('15:00')
  })

  it('reverts to the current value when left empty or invalid', async () => {
    await renderApp()
    const input = field('Çalışma')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(input.value).toBe('25')
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(input.value).toBe('25')
    expect(timer()).toBe('25:00')
  })

  it('does not reset a running timer when blurred unchanged', async () => {
    await renderApp()
    click('Başlat')
    advance(MINUTE)
    const input = field('Çalışma')
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(timer()).toBe('24:00')
  })
})

const soundBox = () => screen.getByLabelText('Süre bitince ses çal') as HTMLInputElement
const notifyBox = () => screen.getByLabelText('Tarayıcı bildirimi göster') as HTMLInputElement

describe('finish alerts', () => {
  it('asks for notification permission on startup and has it enabled', async () => {
    await renderApp()
    expect(notify.requestNotificationPermission).toHaveBeenCalledTimes(1)
    expect(notifyBox().checked).toBe(true)
    expect(soundBox().checked).toBe(false)
  })

  it('shows a notification naming the next step, and no sound by default', async () => {
    await renderApp()
    click('Başlat')
    advance(25 * MINUTE)
    expect(notify.showNotification).toHaveBeenCalledTimes(1)
    expect(notify.showNotification).toHaveBeenCalledWith('Çalışma bitti', 'Sıradaki: Kısa mola')
    expect(notify.playBeep).not.toHaveBeenCalled()
  })

  it('sends no notification once the option is turned off', async () => {
    await renderApp()
    fireEvent.click(notifyBox())
    expect(notifyBox().checked).toBe(false)
    click('Başlat')
    advance(25 * MINUTE)
    expect(notify.showNotification).not.toHaveBeenCalled()
  })

  it('can be re-enabled, which asks for permission again', async () => {
    await renderApp()
    fireEvent.click(notifyBox())
    await act(async () => {
      fireEvent.click(notifyBox())
    })
    expect(notify.requestNotificationPermission).toHaveBeenCalledTimes(2)
    expect(notifyBox().checked).toBe(true)
  })

  it('plays a beep when sound is turned on', async () => {
    await renderApp()
    fireEvent.click(soundBox())
    click('Başlat')
    advance(25 * MINUTE)
    expect(notify.playBeep).toHaveBeenCalledTimes(1)
  })

  it('turns notifications off and explains when permission is denied', async () => {
    vi.mocked(notify.requestNotificationPermission).mockResolvedValueOnce(false)
    await renderApp()
    expect(notifyBox().checked).toBe(false)
    expect(screen.getByRole('alert').textContent).toContain('Bildirim izni verilmedi.')
    click('Başlat')
    advance(25 * MINUTE)
    expect(notify.showNotification).not.toHaveBeenCalled()
  })

  it('skips the permission request and disables the option when unsupported', async () => {
    vi.mocked(notify.notificationsSupported).mockReturnValue(false)
    await renderApp()
    expect(notify.requestNotificationPermission).not.toHaveBeenCalled()
    expect(notifyBox().checked).toBe(false)
    expect(notifyBox().disabled).toBe(true)
    vi.mocked(notify.notificationsSupported).mockReturnValue(true)
  })

  it('does not alert again when an option is toggled after finishing', async () => {
    await renderApp()
    fireEvent.click(soundBox())
    click('Başlat')
    advance(25 * MINUTE)
    fireEvent.click(soundBox())
    fireEvent.click(soundBox())
    expect(notify.playBeep).toHaveBeenCalledTimes(1)
    expect(notify.showNotification).toHaveBeenCalledTimes(1)
  })
})

describe('keyboard focus', () => {
  const focused = () => document.activeElement?.textContent

  it('moves focus to the pause button while running and back to start on pause', async () => {
    await renderApp()
    click('Başlat')
    expect(focused()).toBe('Duraklat')
    click('Duraklat')
    expect(focused()).toBe('Devam et')
  })

  it('focuses start after reset and skip', async () => {
    await renderApp()
    click('Başlat')
    screen.getByRole('button', { name: 'Sıfırla' }).focus()
    click('Sıfırla')
    expect(focused()).toBe('Başlat')
    screen.getByRole('button', { name: 'Atla' }).focus()
    click('Atla')
    expect(focused()).toBe('Başlat')
  })

  it('focuses start when the timer completes', async () => {
    await renderApp()
    click('Başlat')
    screen.getByRole('button', { name: 'Atla' }).focus()
    advance(25 * MINUTE)
    expect(focused()).toBe('Başlat')
  })

  it('does not steal focus from a duration field on completion', async () => {
    await renderApp()
    click('Başlat')
    field('Kısa mola').focus()
    advance(25 * MINUTE)
    expect(document.activeElement).toBe(field('Kısa mola'))
  })
})
