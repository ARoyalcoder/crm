import * as React from 'react'
import type { ElementType, ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'
import * as AnimatedIcons from '@/components/animate-ui/icons'

export type Icon3DTone =
  | 'primary'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'pink'
  | 'rose'
  | 'amber'
  | 'orange'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'slate'
  | 'neutral'
  | 'gold'

export type Icon3DSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type Icon3DVariant = 'solid-3d' | 'glass-3d' | 'floating-3d' | 'minimal-3d'

export interface Icon3DProps {
  /** The icon to render: Lucide component, Animated UI component, or React element */
  icon?: ElementType | ReactNode
  tone?: Icon3DTone
  size?: Icon3DSize
  variant?: Icon3DVariant
  active?: boolean
  animateOnHover?: boolean
  float?: boolean
  tilt?: boolean
  className?: string
  iconClassName?: string
  title?: string
}

/** Registry mapping common icon displayNames to animated counterparts in @/components/animate-ui/icons */
const ANIMATED_ICON_MAP: Record<string, ElementType> = {
  Briefcase: AnimatedIcons.Briefcase,
  BriefcaseBusiness: AnimatedIcons.BriefcaseBusiness,
  BriefcasePlus: AnimatedIcons.BriefcasePlus,
  BriefcaseMedical: AnimatedIcons.Briefcase,
  BriefcaseConveyorBelt: AnimatedIcons.Luggage,
  Toolbox: AnimatedIcons.Toolbox,
  ToolCase: AnimatedIcons.Toolbox,
  Luggage: AnimatedIcons.Luggage,
  BaggageClaim: AnimatedIcons.Luggage,
  Package: AnimatedIcons.Package,
  Package2: AnimatedIcons.Package,
  PackageCheck: AnimatedIcons.PackageCheck,
  PackageOpen: AnimatedIcons.Package,
  PackageSearch: AnimatedIcons.Package,
  Box: AnimatedIcons.Package,
  Boxes: AnimatedIcons.Package,
  FileBox: AnimatedIcons.Package,
  ShoppingBag: AnimatedIcons.ShoppingBag,
  Handbag: AnimatedIcons.ShoppingBag,
  PaperBag: AnimatedIcons.ShoppingBag,
  Backpack: AnimatedIcons.Luggage,
  LayoutDashboard: AnimatedIcons.LayoutDashboard,
  ListTodo: AnimatedIcons.ListTodo,
  Target: AnimatedIcons.Target,
  Banknote: AnimatedIcons.Banknote,
  ShieldCheck: AnimatedIcons.ShieldCheck,
  Shield: AnimatedIcons.ShieldCheck,
  Sparkles: AnimatedIcons.Sparkles,
  MessageSquareText: AnimatedIcons.MessageSquareText,
  Gauge: AnimatedIcons.Gauge,
  Users: AnimatedIcons.Users,
  UsersRound: AnimatedIcons.Users,
  User: AnimatedIcons.User,
  UserCheck: AnimatedIcons.User,
  UserPlus: AnimatedIcons.User,
  Calendar: AnimatedIcons.Calendar,
  CalendarCheck: AnimatedIcons.CalendarCheck,
  CalendarDays: AnimatedIcons.Calendar,
  TrendingUp: AnimatedIcons.TrendingUp,
  Headphones: AnimatedIcons.Headphones,
  Clock: AnimatedIcons.Clock,
  Folder: AnimatedIcons.Folder,
  FolderOpen: AnimatedIcons.FolderOpen,
  FolderKanban: AnimatedIcons.Folder,
  FileText: AnimatedIcons.FileText,
  FileSpreadsheet: AnimatedIcons.FileText,
  ReceiptText: AnimatedIcons.FileText,
  ScrollText: AnimatedIcons.FileText,
  FileCheck2: AnimatedIcons.FileText,
  ChartColumn: AnimatedIcons.ChartColumn,
  BarChart3: AnimatedIcons.ChartColumn,
  BarChart: AnimatedIcons.ChartColumn,
  ChartLine: AnimatedIcons.ChartLine,
  Bell: AnimatedIcons.Bell,
  Search: AnimatedIcons.Search,
  Settings: AnimatedIcons.Settings,
  Settings2: AnimatedIcons.Settings,
  Trophy: AnimatedIcons.Trophy,
  Zap: AnimatedIcons.Zap,
  Check: AnimatedIcons.Check,
  CheckCheck: AnimatedIcons.CheckCheck,
  Copy: AnimatedIcons.Copy,
  Share2: AnimatedIcons.Share2,
  Lock: AnimatedIcons.Lock,
  LockOpen: AnimatedIcons.LockOpen,
  Mail: AnimatedIcons.Mail,
  MailOpen: AnimatedIcons.MailOpen,
  Phone: AnimatedIcons.Phone,
  PhoneCall: AnimatedIcons.PhoneCall,
  RefreshCw: AnimatedIcons.RefreshCw,
  Star: AnimatedIcons.Star,
  Sun: AnimatedIcons.Sun,
  Moon: AnimatedIcons.Moon,
  ThumbsUp: AnimatedIcons.ThumbsUp,
  Trash2: AnimatedIcons.Trash2,
  Bookmark: AnimatedIcons.Bookmark,
  Activity: AnimatedIcons.Activity,
  ArrowRight: AnimatedIcons.ArrowRight,
}

const TONE_STYLES: Record<
  Icon3DTone,
  {
    solid: string
    activeSolid: string
    glass: string
    shadow: string
    glow: string
    text: string
  }
> = {
  primary: {
    solid: 'bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8] text-white',
    activeSolid: 'bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] text-white ring-2 ring-white/50',
    glass: 'bg-blue-500/15 border border-blue-400/40 text-blue-600 dark:text-blue-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(37,99,235,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(37,99,235,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  blue: {
    solid: 'bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] text-white',
    activeSolid: 'bg-gradient-to-br from-[#93c5fd] via-[#3b82f6] to-[#1e40af] text-white ring-2 ring-white/50',
    glass: 'bg-blue-500/15 border border-blue-400/40 text-blue-600 dark:text-blue-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(59,130,246,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(59,130,246,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  indigo: {
    solid: 'bg-gradient-to-br from-[#818cf8] via-[#6366f1] to-[#4338ca] text-white',
    activeSolid: 'bg-gradient-to-br from-[#a5b4fc] via-[#6366f1] to-[#3730a3] text-white ring-2 ring-white/50',
    glass: 'bg-indigo-500/15 border border-indigo-400/40 text-indigo-600 dark:text-indigo-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(99,102,241,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(99,102,241,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  violet: {
    solid: 'bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] text-white',
    activeSolid: 'bg-gradient-to-br from-[#c4b5fd] via-[#8b5cf6] to-[#5b21b6] text-white ring-2 ring-white/50',
    glass: 'bg-violet-500/15 border border-violet-400/40 text-violet-600 dark:text-violet-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(139,92,246,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(139,92,246,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  purple: {
    solid: 'bg-gradient-to-br from-[#c084fc] via-[#a855f7] to-[#7e22ce] text-white',
    activeSolid: 'bg-gradient-to-br from-[#d8b4fe] via-[#a855f7] to-[#6b21a8] text-white ring-2 ring-white/50',
    glass: 'bg-purple-500/15 border border-purple-400/40 text-purple-600 dark:text-purple-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(168,85,247,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(168,85,247,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  emerald: {
    solid: 'bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#047857] text-white',
    activeSolid: 'bg-gradient-to-br from-[#6ee7b7] via-[#10b981] to-[#065f46] text-white ring-2 ring-white/50',
    glass: 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-600 dark:text-emerald-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(16,185,129,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(16,185,129,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  teal: {
    solid: 'bg-gradient-to-br from-[#2dd4bf] via-[#14b8a6] to-[#0f766e] text-white',
    activeSolid: 'bg-gradient-to-br from-[#5eead4] via-[#14b8a6] to-[#115e59] text-white ring-2 ring-white/50',
    glass: 'bg-teal-500/15 border border-teal-400/40 text-teal-600 dark:text-teal-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(20,184,166,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(20,184,166,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  cyan: {
    solid: 'bg-gradient-to-br from-[#22d3ee] via-[#06b6d4] to-[#0e7490] text-white',
    activeSolid: 'bg-gradient-to-br from-[#67e8f9] via-[#06b6d4] to-[#155e75] text-white ring-2 ring-white/50',
    glass: 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-600 dark:text-cyan-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(6,182,212,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(6,182,212,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  amber: {
    solid: 'bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#b45309] text-white',
    activeSolid: 'bg-gradient-to-br from-[#fde68a] via-[#f59e0b] to-[#92400e] text-white ring-2 ring-white/50',
    glass: 'bg-amber-500/15 border border-amber-400/40 text-amber-600 dark:text-amber-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(245,158,11,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  orange: {
    solid: 'bg-gradient-to-br from-[#fb923c] via-[#f97316] to-[#c2410c] text-white',
    activeSolid: 'bg-gradient-to-br from-[#fed7aa] via-[#f97316] to-[#9a3412] text-white ring-2 ring-white/50',
    glass: 'bg-orange-500/15 border border-orange-400/40 text-orange-600 dark:text-orange-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(249,115,22,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(249,115,22,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  rose: {
    solid: 'bg-gradient-to-br from-[#fb7185] via-[#f43f5e] to-[#be123c] text-white',
    activeSolid: 'bg-gradient-to-br from-[#fecdd3] via-[#f43f5e] to-[#9f1239] text-white ring-2 ring-white/50',
    glass: 'bg-rose-500/15 border border-rose-400/40 text-rose-600 dark:text-rose-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(244,63,94,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(244,63,94,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  pink: {
    solid: 'bg-gradient-to-br from-[#f472b6] via-[#ec4899] to-[#be185d] text-white',
    activeSolid: 'bg-gradient-to-br from-[#fbcfe8] via-[#ec4899] to-[#9d174d] text-white ring-2 ring-white/50',
    glass: 'bg-pink-500/15 border border-pink-400/40 text-pink-600 dark:text-pink-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(236,72,153,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(236,72,153,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  slate: {
    solid: 'bg-gradient-to-br from-[#64748b] via-[#475569] to-[#1e293b] text-white',
    activeSolid: 'bg-gradient-to-br from-[#94a3b8] via-[#475569] to-[#0f172a] text-white ring-2 ring-white/50',
    glass: 'bg-slate-500/15 border border-slate-400/40 text-slate-700 dark:text-slate-300 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(71,85,105,0.3),inset_0_1.5px_1px_rgba(255,255,255,0.35),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(71,85,105,0.35)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
  neutral: {
    solid: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:text-white',
    activeSolid: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-slate-900 dark:from-slate-600 dark:via-slate-700 dark:to-slate-900 dark:text-white ring-2 ring-primary/40',
    glass: 'bg-slate-500/10 border border-border/50 text-foreground backdrop-blur-md',
    shadow: 'shadow-[0_4px_10px_rgba(0,0,0,0.1),inset_0_1.5px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)]',
    glow: 'rgba(0,0,0,0.15)',
    text: 'text-foreground',
  },
  gold: {
    solid: 'bg-gradient-to-br from-[#fde047] via-[#eab308] to-[#a16207] text-white',
    activeSolid: 'bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#854d0e] text-white ring-2 ring-white/50',
    glass: 'bg-amber-500/15 border border-amber-300/40 text-amber-600 dark:text-amber-400 backdrop-blur-md',
    shadow: 'shadow-[0_4px_12px_rgba(234,179,8,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.5),inset_0_-1.5px_2px_rgba(0,0,0,0.25)]',
    glow: 'rgba(234,179,8,0.45)',
    text: 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]',
  },
}

const SIZE_STYLES: Record<
  Icon3DSize,
  {
    container: string
    iconSize: number
    badgeRadius: string
  }
> = {
  xs: {
    container: 'size-5 min-w-5',
    iconSize: 11,
    badgeRadius: 'rounded-md',
  },
  sm: {
    container: 'size-6.5 min-w-6.5',
    iconSize: 13.5,
    badgeRadius: 'rounded-[8px]',
  },
  md: {
    container: 'size-8.5 min-w-8.5',
    iconSize: 17,
    badgeRadius: 'rounded-[10px]',
  },
  lg: {
    container: 'size-11 min-w-11',
    iconSize: 22,
    badgeRadius: 'rounded-[14px]',
  },
  xl: {
    container: 'size-14 min-w-14',
    iconSize: 28,
    badgeRadius: 'rounded-[18px]',
  },
}

/**
 * Premium 3D Animated Icon component:
 * Renders an elevated 3D tactile icon with realistic bevels, multi-layer depth shadow,
 * interactive spring physics, and animated SVG paths from @animate-ui.
 */
export function Icon3D({
  icon: IconProp,
  tone = 'primary',
  size = 'md',
  variant = 'solid-3d',
  active = false,
  animateOnHover = true,
  float = false,
  tilt = true,
  className,
  iconClassName,
  title,
}: Icon3DProps) {
  if (!IconProp) return null

  const toneConfig = TONE_STYLES[tone] ?? TONE_STYLES.primary
  const sizeConfig = SIZE_STYLES[size] ?? SIZE_STYLES.md

  // Determine the effective icon component to render
  let IconComponent: ElementType | null = null
  let isCustomElement = false

  if (React.isValidElement(IconProp)) {
    isCustomElement = true
  } else if (typeof IconProp === 'function' || typeof IconProp === 'object') {
    const rawComponent = IconProp as ElementType & { displayName?: string; name?: string }
    const name = rawComponent.displayName || rawComponent.name || ''
    
    // Check if there is an animated equivalent in @/components/animate-ui/icons
    if (name && ANIMATED_ICON_MAP[name]) {
      IconComponent = ANIMATED_ICON_MAP[name]
    } else {
      IconComponent = rawComponent
    }
  }

  // Floating idle levitation animation
  const floatAnimation = float
    ? {
        y: [-2, 2, -2],
        rotate: [-1, 1, -1],
        transition: {
          duration: 3.2,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      }
    : undefined

  // Base styling depending on variant
  const isGlass = variant === 'glass-3d'
  const isMinimal = variant === 'minimal-3d'
  const backgroundClass = isMinimal
    ? active
      ? toneConfig.solid
      : 'bg-muted/70 text-foreground border border-border/60 shadow-xs'
    : isGlass
    ? toneConfig.glass
    : active
    ? toneConfig.activeSolid
    : toneConfig.solid

  const shadowClass = isMinimal ? '' : toneConfig.shadow

  return (
    <motion.div
      title={title}
      aria-hidden="true"
      style={{ perspective: 600, transformStyle: 'preserve-3d' }}
      animate={floatAnimation}
      whileHover={
        tilt
          ? {
              scale: 1.12,
              rotateX: -10,
              rotateY: 10,
              translateZ: 8,
              transition: { type: 'spring', stiffness: 450, damping: 16 },
            }
          : undefined
      }
      whileTap={{ scale: 0.93, translateZ: 0 }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden transition-all duration-200 select-none group',
        sizeConfig.container,
        sizeConfig.badgeRadius,
        backgroundClass,
        shadowClass,
        className,
      )}
    >
      {/* 3D Specular Sheen Beam that glides across on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 transform -rotate-45 group-hover:translate-x-full transition-transform duration-700 ease-out"
      />

      {/* 3D Ambient Top Specular Light Rim */}
      {!isMinimal && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-white/40 rounded-t-full"
        />
      )}

      {/* Render the Icon */}
      {isCustomElement ? (
        (IconProp as ReactNode)
      ) : IconComponent ? (
        <motion.div
          whileHover={{
            scale: 1.12,
            rotate: -4,
            transition: { type: 'spring', stiffness: 400, damping: 14 },
          }}
          className="flex items-center justify-center pointer-events-none z-10"
        >
          <IconComponent
            size={sizeConfig.iconSize}
            animateOnHover={animateOnHover}
            className={cn('shrink-0 transition-transform', isMinimal && !active ? 'text-current' : toneConfig.text, iconClassName)}
          />
        </motion.div>
      ) : null}
    </motion.div>
  )
}
