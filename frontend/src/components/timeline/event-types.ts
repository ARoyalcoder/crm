import {
  BadgeCheck,
  CalendarCheck,
  CircleDot,
  ClipboardCheck,
  FileCheck,
  FileText,
  Flag,
  Hammer,
  IndianRupee,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  PackagePlus,
  Pencil,
  Phone,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  StickyNote,
  Target,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'

/** How a category looks: the icon used when the event type has none of its own, and its colour. */
const CATEGORY_LOOK: Record<string, { icon: LucideIcon; tone: string }> = {
  COMMUNICATION: { icon: MessageSquare, tone: 'bg-info-soft text-info' },
  SALES: { icon: Target, tone: 'bg-accent text-accent-foreground' },
  PROJECT: { icon: Hammer, tone: 'bg-warning-soft text-warning' },
  FINANCE: { icon: IndianRupee, tone: 'bg-success-soft text-success' },
  SERVICE: { icon: LifeBuoy, tone: 'bg-destructive-soft text-destructive' },
  AMC: { icon: ShieldCheck, tone: 'bg-success-soft text-success' },
  RECORD: { icon: Pencil, tone: 'bg-muted text-muted-foreground' },
}

const FALLBACK_LOOK = { icon: CircleDot, tone: 'bg-muted text-muted-foreground' }

/**
 * The icon for each event type (the names in the backend's TimelineEventTypes).
 *
 * A module that introduces a new event type adds a line here to give it its own icon. If it does
 * not, the event is still shown, with its category's icon: nothing is ever hidden for being unknown.
 */
const TYPE_ICON: Record<string, LucideIcon> = {
  // communication
  CALL_LOGGED: Phone,
  MEETING_COMPLETED: CalendarCheck,
  EMAIL_LOGGED: Mail,
  SITE_VISIT_COMPLETED: MapPin,
  MESSAGE_LOGGED: MessageSquare,
  NOTE_ADDED: StickyNote,
  // the customer record
  CUSTOMER_CREATED: UserPlus,
  CUSTOMER_STATUS_CHANGED: Flag,
  CONTACT_ADDED: UserPlus,
  CONTACT_REMOVED: UserMinus,
  ADDRESS_ADDED: MapPin,
  // sales
  LEAD_CREATED: Target,
  QUOTATION_SENT: Send,
  QUOTATION_ACCEPTED: FileCheck,
  ORDER_CREATED: PackagePlus,
  // projects
  PROJECT_STARTED: Hammer,
  MILESTONE_COMPLETED: ClipboardCheck,
  // finance
  INVOICE_GENERATED: FileText,
  PAYMENT_RECEIVED: Receipt,
  // service
  TICKET_CREATED: LifeBuoy,
  TICKET_RESOLVED: BadgeCheck,
  // AMC
  AMC_CREATED: ShieldCheck,
  AMC_RENEWED: RefreshCw,
}

export function eventLook(type: string, category: string): { icon: LucideIcon; tone: string } {
  const look = CATEGORY_LOOK[category] ?? FALLBACK_LOOK
  return { icon: TYPE_ICON[type] ?? look.icon, tone: look.tone }
}
