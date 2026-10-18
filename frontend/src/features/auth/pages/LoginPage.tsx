import { useState, useEffect, useRef, type MouseEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Moon,
  Sun,
  Check,
  CircleAlert,
  Sparkles,
  Shield
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { useAuth } from '@/features/auth/auth-context'
import { useTheme } from '@/components/theme/theme-context'
import { originOf } from '@/components/theme/theme-transition'
import { ApiError } from '@/lib/api/errors'

const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type LoginValues = z.infer<typeof loginSchema>

const SERVICE_LINES = [
  'CCTV',
  'SOLAR',
  'INTERIOR',
  'ARCHITECTURE',
  'IT',
  'MARKETING'
]

export function LoginPage() {
  const { status, signIn } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()

  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [socialToast, setSocialToast] = useState<string | null>(null)

  const orbRef1 = useRef<HTMLDivElement>(null)
  const orbRef2 = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const emblemGlowRef = useRef<HTMLDivElement>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // GSAP smooth organic ambient floating effect
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (orbRef1.current) {
        gsap.to(orbRef1.current, {
          y: -22,
          x: 12,
          duration: 6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }
      if (orbRef2.current) {
        gsap.to(orbRef2.current, {
          y: 20,
          x: -16,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }
      if (ringRef.current) {
        gsap.to(ringRef.current, {
          rotation: 360,
          duration: 40,
          repeat: -1,
          ease: 'linear',
        })
      }
      if (emblemGlowRef.current) {
        gsap.to(emblemGlowRef.current, {
          scale: 1.15,
          opacity: 0.6,
          duration: 3.5,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        })
      }
    })

    return () => ctx.revert()
  }, [])

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Invalid credentials. Try again.')
      form.setFocus('password')
    }
  }

  function autofillSuperAdmin() {
    form.setValue('email', 'superadmin@pawanputra.com')
    form.setValue('password', 'Password@123')
    setFormError(null)
  }

  function toggleThemeMode(event: MouseEvent<HTMLButtonElement>) {
    setTheme(theme === 'dark' ? 'light' : 'dark', originOf(event.currentTarget))
  }


  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#EEF3FA] dark:bg-[#0A0F1D] text-slate-800 dark:text-slate-100 flex flex-col justify-between select-none transition-colors duration-500">
      {/* ----------------- Ambient GSAP Background Spheres ----------------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft radial background glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[550px] bg-gradient-to-b from-blue-200/40 via-sky-100/20 to-transparent dark:from-blue-900/25 dark:via-cyan-950/10 blur-3xl pointer-events-none" />

        {/* Top-left glassmorphic torus / crescent */}
        <div
          ref={ringRef}
          className="absolute -top-16 -left-16 w-72 h-72 rounded-full border-[18px] border-white/40 dark:border-blue-500/10 shadow-[0_20px_60px_rgba(180,200,240,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md opacity-70 pointer-events-none"
        />

        {/* Floating cyan sphere 1 (GSAP) */}
        <div
          ref={orbRef1}
          className="absolute top-1/4 -right-12 w-64 h-64 rounded-full bg-gradient-to-tr from-sky-300/35 via-blue-400/25 to-indigo-300/10 dark:from-sky-600/20 dark:via-blue-600/15 dark:to-transparent blur-2xl"
        />

        {/* Floating blue sphere 2 (GSAP) */}
        <div
          ref={orbRef2}
          className="absolute bottom-16 -left-12 w-80 h-80 rounded-full bg-gradient-to-br from-blue-300/30 via-indigo-200/20 to-sky-100/10 dark:from-blue-700/20 dark:via-indigo-900/15 dark:to-transparent blur-3xl"
        />
      </div>

      {/* ----------------- Top Navigation / Theme Toggle ----------------- */}
      <header className="relative z-10 w-full px-6 py-3 sm:py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {/* Subtle branding hint */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
            <span className="size-2 rounded-full bg-[#2B66FE] animate-pulse" />
            <span>Pawan Putra OS</span>
          </div>
        </div>

        {/* Neumorphic Theme Toggle Button */}
        <motion.button
          type="button"
          onClick={toggleThemeMode}
          aria-label="Toggle theme mode"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="size-10 sm:size-11 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-amber-300 shadow-[5px_5px_14px_rgba(180,195,225,0.45),-5px_-5px_14px_rgba(255,255,255,0.95)] dark:shadow-[5px_5px_15px_rgba(0,0,0,0.5),-3px_-3px_10px_rgba(255,255,255,0.05)] border border-white/60 dark:border-slate-800 transition-all cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="size-4.5 transition-transform" />
          ) : (
            <Moon className="size-4.5 transition-transform" />
          )}
        </motion.button>
      </header>

      {/* ----------------- Main Login Card Stage ----------------- */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 sm:py-4">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] flex flex-col items-center"
        >
          {/* 3D Fluid Logo Emblem Squircle */}
          <div className="relative mb-3 sm:mb-4">
            {/* GSAP pulsing backdrop glow */}
            <div
              ref={emblemGlowRef}
              className="absolute inset-0 rounded-[28px] bg-gradient-to-tr from-[#2B66FE]/30 via-sky-400/30 to-indigo-500/20 blur-xl -z-10"
            />

            {/* Embossed Neumorphic Squircle Tile */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.98 }}
              className="size-20 sm:size-24 rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-white via-[#F7FAFE] to-[#E9F1FC] dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 flex items-center justify-center shadow-[10px_10px_24px_rgba(180,196,224,0.45),-10px_-10px_24px_rgba(255,255,255,1)] dark:shadow-[8px_8px_22px_rgba(0,0,0,0.65),-6px_-6px_16px_rgba(255,255,255,0.04)] border border-white/80 dark:border-slate-700/50"
            >
              {/* 3D Fluid Ribbon Vector Sculpture */}
              <svg
                viewBox="0 0 100 100"
                className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_8px_16px_rgba(43,102,254,0.35)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Primary Cobalt/Royal Gradient */}
                  <linearGradient id="ribbonGrad1" x1="15%" y1="15%" x2="85%" y2="85%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="45%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#1E40AF" />
                  </linearGradient>

                  {/* Accent Cyan / Luminous Gradient */}
                  <linearGradient id="ribbonGrad2" x1="85%" y1="15%" x2="15%" y2="85%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>

                  {/* Inner Fold Depth Gradient */}
                  <linearGradient id="ribbonDark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1E3A8A" />
                    <stop offset="100%" stopColor="#0F172A" />
                  </linearGradient>
                </defs>

                {/* Ribbon Back Loop */}
                <path
                  d="M 50 18 C 30 18, 18 34, 18 52 C 18 70, 32 82, 50 82 C 68 82, 82 70, 82 52 C 82 34, 70 18, 50 18 Z"
                  stroke="url(#ribbonGrad1)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  className="opacity-95"
                />

                {/* 3D Inner S-Curve Twist */}
                <path
                  d="M 32 66 C 35 45, 65 55, 68 34 C 69 28, 65 24, 58 24 C 42 24, 34 38, 34 50"
                  stroke="url(#ribbonGrad2)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Center Gleam Dot / Nucleus */}
                <circle cx="50" cy="50" r="5" fill="#FFFFFF" className="drop-shadow-[0_0_8px_#38BDF8]" />
              </svg>
            </motion.div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight text-[#0D1527] dark:text-white text-center">
            Welcome back
            <span className="sr-only">Sign in</span>
          </h1>
          <p className="mt-1 text-sm sm:text-base font-medium text-[#7A889B] dark:text-slate-400 text-center">
            Sign in to continue
          </p>

          {/* Super Admin Quick Autofill Helper Pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3.5 mb-1 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={autofillSuperAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/60 text-[#2B66FE] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="size-3.5 text-[#2B66FE]" />
              <span>Autofill super admin credentials</span>
            </button>
          </motion.div>

          {/* Error Alert */}
          <AnimatePresence>
            {formError && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="w-full mt-3 overflow-hidden"
              >
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/60 p-3.5 text-xs sm:text-sm text-rose-700 dark:text-rose-300 shadow-sm"
                >
                  <CircleAlert className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="leading-snug">{formError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Social Notification Toast */}
          <AnimatePresence>
            {socialToast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full mt-2.5 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 text-center"
              >
                {socialToast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full mt-3.5 sm:mt-5 space-y-3 sm:space-y-4" noValidate>
            {/* Input 1: Username / Email Pill */}
            <div>
              <label htmlFor="email-input" className="sr-only">Email</label>
              <div className="relative flex items-center h-12 sm:h-13 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-[6px_6px_16px_rgba(195,208,230,0.38),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.45),-4px_-4px_12px_rgba(255,255,255,0.03)] border border-slate-200/70 dark:border-slate-800 focus-within:ring-2 focus-within:ring-[#2B66FE]/40 focus-within:border-[#2B66FE] transition-all px-4.5 sm:px-5">
                <User className="size-4.5 sm:size-5 text-slate-400 dark:text-slate-500 shrink-0 mr-3" />
                <input
                  id="email-input"
                  aria-label="Email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="Username or email"
                  {...form.register('email')}
                  className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              {form.formState.errors.email && (
                <p className="mt-1 px-4 text-xs font-medium text-rose-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Input 2: Password Pill */}
            <div>
              <label htmlFor="password-input" className="sr-only">Password</label>
              <div className="relative flex items-center h-12 sm:h-13 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-[6px_6px_16px_rgba(195,208,230,0.38),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.45),-4px_-4px_12px_rgba(255,255,255,0.03)] border border-slate-200/70 dark:border-slate-800 focus-within:ring-2 focus-within:ring-[#2B66FE]/40 focus-within:border-[#2B66FE] transition-all px-4.5 sm:px-5">
                <Lock className="size-4.5 sm:size-5 text-slate-400 dark:text-slate-500 shrink-0 mr-3" />
                <input
                  id="password-input"
                  aria-label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password"
                  {...form.register('password')}
                  className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none pr-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide secret value' : 'Show secret value'}
                >
                  {showPassword ? <EyeOff className="size-4.5 sm:size-5" /> : <Eye className="size-4.5 sm:size-5" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="mt-1 px-4 text-xs font-medium text-rose-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between px-2 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`size-4.5 rounded-md flex items-center justify-center border transition-all ${
                    rememberMe
                      ? 'bg-[#2B66FE] border-[#2B66FE] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 group-hover:border-slate-400'
                  }`}
                >
                  {rememberMe && <Check className="size-3 stroke-[3]" />}
                </button>
                <span className="text-xs sm:text-sm font-medium text-[#5F6D82] dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  setSocialToast('To reset your password, contact your Super Administrator.')
                }
                className="text-xs sm:text-sm font-semibold text-[#2B66FE] hover:text-[#1E50E2] dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button with Arrow Badge */}
            <div className="pt-1.5 sm:pt-2">
              <motion.button
                type="submit"
                aria-label="Sign in"
                disabled={form.formState.isSubmitting}
                whileHover={{ scale: 1.018 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full h-12 sm:h-13 rounded-full bg-gradient-to-r from-[#2B66FE] via-[#3872FF] to-[#1E50E2] text-white font-bold text-sm sm:text-base tracking-wide flex items-center justify-between px-5 sm:px-6 shadow-[0_12px_28px_-6px_rgba(43,102,254,0.5)] hover:shadow-[0_16px_32px_-4px_rgba(43,102,254,0.6)] active:shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group overflow-hidden"
              >
                {/* Subtle gradient shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                <span className="pl-3 sm:pl-4">
                  {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </span>

                {/* White Circular Badge with Forward Arrow */}
                <motion.div
                  className="size-8.5 sm:size-9 rounded-full bg-white flex items-center justify-center text-[#2B66FE] shadow-sm ml-auto shrink-0"
                  whileHover={{ x: 2 }}
                >
                  <ArrowRight className="size-4 sm:size-4.5 stroke-[2.5]" />
                </motion.div>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* ----------------- Footer & Accent Badge ----------------- */}
      <footer className="relative z-10 w-full px-6 py-3 sm:py-4 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Service Lines Tagline */}
        <p className="text-center md:text-left text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          {SERVICE_LINES.join(' • ')}
        </p>

        {/* Floating Glassmorphic Accent Badge (as in the reference image bottom right) */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm text-xs font-bold text-[#2B66FE] dark:text-blue-400">
          <Shield className="size-3.5" />
          <span>MORE THAN A CRM • ENTERPRISE OS</span>
        </div>
      </footer>
    </main>
  )
}
