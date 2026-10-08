let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  if (typeof AudioContext === 'undefined') return null
  audioContext = new AudioContext()
  return audioContext
}

/** Browsers only allow audio after a user gesture; call this from a click handler. */
export function unlockAudio(): void {
  void getAudioContext()?.resume()
}

/** Three short beeps, synthesized so no audio file is needed. */
export function playBeep(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  void ctx.resume()
  for (let i = 0; i < 3; i++) {
    const start = ctx.currentTime + i * 0.3
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.2)
  }
}

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined'
}

/** Resolves to true only when the user has granted (or already granted) permission. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export function showNotification(title: string, body: string): void {
  if (notificationsSupported() && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}
