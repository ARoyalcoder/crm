import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Ambient backdrop with floating organic orbs, rotating glassmorphic ring, and soft radial glows.
 * Matches the visual fidelity and smooth physics of the Login page across all application views.
 */
export function AmbientBackdrop() {
  const orbRef1 = useRef<HTMLDivElement>(null)
  const orbRef2 = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const centerGlowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (orbRef1.current) {
        gsap.to(orbRef1.current, {
          y: -28,
          x: 16,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }
      if (orbRef2.current) {
        gsap.to(orbRef2.current, {
          y: 24,
          x: -20,
          duration: 8.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }
      if (ringRef.current) {
        gsap.to(ringRef.current, {
          rotation: 360,
          duration: 45,
          repeat: -1,
          ease: 'linear',
        })
      }
      if (centerGlowRef.current) {
        gsap.to(centerGlowRef.current, {
          scale: 1.1,
          opacity: 0.5,
          duration: 5,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        })
      }
    })

    return () => ctx.revert()
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10 select-none">
      {/* Top ambient radial gradient */}
      <div
        ref={centerGlowRef}
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[550px] bg-gradient-to-b from-blue-200/35 via-sky-100/20 to-transparent dark:from-blue-900/20 dark:via-cyan-950/10 blur-3xl transition-all duration-700 ease-in-out"
      />

      {/* Top-right floating glassmorphic torus / crescent */}
      <div
        ref={ringRef}
        className="absolute -top-20 right-1/4 w-80 h-80 rounded-full border-[18px] border-white/40 dark:border-blue-500/10 shadow-[0_20px_60px_rgba(180,200,240,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md opacity-60 transition-all duration-700 ease-in-out"
      />

      {/* Floating cyan/sky sphere 1 */}
      <div
        ref={orbRef1}
        className="absolute top-1/3 right-4 w-72 h-72 rounded-full bg-gradient-to-tr from-sky-300/30 via-blue-400/20 to-indigo-300/10 dark:from-sky-600/15 dark:via-blue-600/10 dark:to-transparent blur-3xl transition-all duration-700 ease-in-out"
      />

      {/* Floating deep blue/indigo sphere 2 */}
      <div
        ref={orbRef2}
        className="absolute bottom-12 -left-16 w-96 h-96 rounded-full bg-gradient-to-br from-blue-300/25 via-indigo-200/20 to-sky-100/10 dark:from-blue-700/15 dark:via-indigo-900/10 dark:to-transparent blur-3xl transition-all duration-700 ease-in-out"
      />
    </div>
  )
}
