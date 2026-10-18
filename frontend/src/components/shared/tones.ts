import type { Tone } from '@/lib/status'

/** Classes for a tinted icon chip or soft panel in each tone. Text always clears 4.5:1 on its own tint. */
export const toneChip: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground shadow-xs',
  primary: 'bg-gradient-to-br from-[#8177ff] to-[#5e56e8] text-white shadow-md shadow-[#5e56e8]/25',
  success: 'bg-gradient-to-br from-[#34d399] to-[#059669] text-white shadow-md shadow-[#059669]/25',
  warning: 'bg-gradient-to-br from-[#fbbf24] to-[#d97706] text-white shadow-md shadow-[#d97706]/25',
  danger: 'bg-gradient-to-br from-[#fb7185] to-[#e11d48] text-white shadow-md shadow-[#e11d48]/25',
  info: 'bg-gradient-to-br from-[#60a5fa] to-[#2563eb] text-white shadow-md shadow-[#2563eb]/25',
}

/** Text colour of a tone, for figures and icons that sit on a plain card. */
export const toneText: Record<Tone, string> = {
  neutral: 'text-muted-foreground',
  primary: 'text-accent-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
}

export type { Tone }
