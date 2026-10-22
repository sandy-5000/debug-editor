const NL_BADGE_FRAME_SELECTOR = '#nl-badge-frame'
const POLL_MS = 2000

/** Parent sites may inject #nl-badge-frame after load; remove it when it appears. */
export function startRemovingNlBadgeFrame(): void {
  const removeIfPresent = (): boolean => {
    const el = document.querySelector(NL_BADGE_FRAME_SELECTOR)
    if (!el) return false
    el.remove()
    return true
  }

  if (removeIfPresent()) return

  const intervalId = window.setInterval(() => {
    if (removeIfPresent()) {
      window.clearInterval(intervalId)
    }
  }, POLL_MS)
}
