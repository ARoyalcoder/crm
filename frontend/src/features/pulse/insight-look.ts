import { Lightbulb, ShieldAlert, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/lib/status'

export type InsightLook = { label: string; tone: Tone; icon: LucideIcon; plural: string }

/**
 * How each kind of Pawan Pulse insight is shown, everywhere: a risk is a warning to act on, an opportunity
 * a chance to take, an achievement something to celebrate, a next best action a suggestion. Always a word and
 * an icon with the colour, never colour alone.
 */
const LOOKS: Record<string, InsightLook> = {
  RISK: { label: 'Risk', plural: 'Risks', tone: 'danger', icon: ShieldAlert },
  OPPORTUNITY: { label: 'Opportunity', plural: 'Opportunities', tone: 'success', icon: TrendingUp },
  ACHIEVEMENT: { label: 'Achievement', plural: 'Achievements', tone: 'primary', icon: Sparkles },
  NEXT_BEST_ACTION: { label: 'Next best action', plural: 'Next best actions', tone: 'info', icon: Lightbulb },
}

export function insightLook(type: string): InsightLook {
  return LOOKS[type] ?? { label: type, plural: type, tone: 'neutral', icon: Lightbulb }
}
