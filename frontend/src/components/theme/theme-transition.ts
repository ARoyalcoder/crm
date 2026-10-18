/**
 * The animation played when the theme changes.
 *
 * With the View Transitions API the browser freezes a picture of the old page, the page is switched
 * to the new theme underneath, and the new picture is revealed over the old one - a circle growing
 * from the control that was clicked, or a soft fade when there is no control (the operating system
 * changed its theme). Browsers without the API fall back to fading every colour with CSS.
 *
 * The rules that make it look smooth, all enforced here and in index.css:
 *  - the page must change in ONE synchronous step inside the transition callback, or the browser
 *    photographs the old theme twice;
 *  - no CSS colour transition may run while the photographs are taken, or the "new" picture shows
 *    half-faded colours that then jump (index.css switches transitions off for the duration);
 *  - people who ask for reduced motion get an instant change.
 */

/** Where the reveal starts, in viewport pixels. */
export type ThemeOrigin = { x: number; y: number }

type Doc = Document & { startViewTransition?: (update: () => void) => ViewTransitionLike }
type ViewTransitionLike = { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void>; skipTransition: () => void }

const ATTRIBUTE = 'data-theme-transition'
const FALLBACK_CLASS = 'theme-transitioning'
/** Long enough for the CSS colour fade of the fallback (index.css) to finish. */
const FALLBACK_MS = 700

/** The centre of an element, to start the reveal from it. */
export function originOf(element: Element | null | undefined): ThemeOrigin | undefined {
  if (!element) return undefined
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return undefined
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let current: ViewTransitionLike | null = null
let fallbackTimer: number | undefined

/**
 * Runs `update` - which must switch the page to the new theme synchronously - inside the best
 * available animation. `update` always runs exactly once, whatever the browser supports.
 */
export function runThemeTransition(update: () => void, origin?: ThemeOrigin): void {
  const root = document.documentElement
  const doc = document as Doc

  if (prefersReducedMotion()) {
    update()
    return
  }

  if (typeof doc.startViewTransition === 'function') {
    // A change made while another is still playing replaces it instead of queueing behind it.
    current?.skipTransition()

    if (origin) {
      const x = Math.round(origin.x)
      const y = Math.round(origin.y)
      const radius = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)))
      root.style.setProperty('--theme-x', `${x}px`)
      root.style.setProperty('--theme-y', `${y}px`)
      root.style.setProperty('--theme-r', `${radius}px`)
      root.setAttribute(ATTRIBUTE, 'reveal')
    } else {
      root.setAttribute(ATTRIBUTE, 'fade')
    }

    let transition: ViewTransitionLike
    try {
      transition = doc.startViewTransition(update)
    } catch {
      // The browser refused (for example the document is hidden): still change the theme.
      cleanUp(root)
      update()
      return
    }
    current = transition
    const done = () => {
      if (current === transition) {
        current = null
        cleanUp(root)
      }
    }
    // Skipped or interrupted transitions reject these promises; that is expected, not an error.
    transition.updateCallbackDone.catch(() => undefined)
    transition.ready.catch(() => undefined)
    transition.finished.then(done, done)
    return
  }

  // No View Transitions: fade the colours of everything with CSS for a moment.
  window.clearTimeout(fallbackTimer)
  root.classList.add(FALLBACK_CLASS)
  update()
  fallbackTimer = window.setTimeout(() => root.classList.remove(FALLBACK_CLASS), FALLBACK_MS)
}

function cleanUp(root: HTMLElement) {
  root.removeAttribute(ATTRIBUTE)
  root.style.removeProperty('--theme-x')
  root.style.removeProperty('--theme-y')
  root.style.removeProperty('--theme-r')
}
