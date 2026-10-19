import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Briefcase,
  Edit3,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  PieChart,
  ShieldCheck,
  Palmtree,
  Home,
  AlertOctagon,
  Search,
  ExternalLink,
  Layers,
} from 'lucide-react'
import {
  User,
  Mail,
  Calendar,
  Clock,
  Sparkles,
  Copy,
  Check,
  Share2,
  Users,
  TrendingUp,
  Phone,
} from '@/components/animate-ui/icons'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ChartCard } from '@/components/charts/ChartCard'
import { DonutChart } from '@/components/charts/DonutChart'
import { BarsChart } from '@/components/charts/BarsChart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useHasPermission } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'
import { workforceApi, type AttendanceType, type LeaveType } from '../api'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import { AttendanceSummaryCard } from '../components/AttendanceSummaryCard'
import { DepartmentBadge } from '../components/DepartmentBadge'
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge'
import { LeaveBalanceCard } from '../components/LeaveBalanceCard'

/** Calculate tenure from a joining date string. */
function calculateTenure(joiningDateStr?: string) {
  if (!joiningDateStr) return 'N/A'
  const start = new Date(joiningDateStr)
  if (isNaN(start.getTime())) return 'N/A'
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const years = Math.floor(diffDays / 365)
  const months = Math.floor((diffDays % 365) / 30)

  if (years > 0 && months > 0) return `${years}y ${months}m`
  if (years > 0) return `${years} ${years === 1 ? 'yr' : 'yrs'}`
  if (months > 0) return `${months} ${months === 1 ? 'mo' : 'mos'}`
  return `${diffDays} days`
}

/** Get initials for avatar fallback. */
function getInitials(name?: string | null, fallback?: string): string {
  const target = (name || fallback || 'Employee').trim()
  const parts = target.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return target.slice(0, 2).toUpperCase()
}

export function EmployeeProfilePage() {
  const { id = '' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('WORKFORCE_UPDATE')
  const canCreate = useHasPermission('WORKFORCE_CREATE')

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1)
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [skillsSearch, setSkillsSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')

  // Mark Attendance Modal state
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(() => today.toISOString().split('T')[0])
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('PRESENT')
  const [checkInTime, setCheckInTime] = useState('09:30')
  const [checkOutTime, setCheckOutTime] = useState('18:30')
  const [attendanceNotes, setAttendanceNotes] = useState('')

  // Queries
  const employee = useQuery(workforceApi.detailQuery(id))
  const emp = employee.data

  const managerQuery = useQuery({
    ...workforceApi.detailQuery(emp?.managerId ?? ''),
    enabled: Boolean(emp?.managerId),
  })

  const team = useQuery(workforceApi.teamQuery(id))
  const attendance = useQuery(workforceApi.attendanceQuery(id, calYear, calMonth))
  const summary = useQuery(
    workforceApi.attendanceSummaryQuery(
      id,
      `${calYear}-01-01`,
      `${calYear}-12-31`,
    ),
  )
  const leaveBalances = useQuery(workforceApi.leaveBalancesQuery(id, calYear))

  // Single Mark Attendance Mutation
  const markAttendanceMutation = useMutation({
    mutationFn: (data: {
      date: string
      type: AttendanceType
      checkIn?: string
      checkOut?: string
      notes?: string
    }) => {
      return workforceApi.markAttendance(id, {
        date: data.date,
        type: data.type,
        checkIn: data.checkIn || undefined,
        checkOut: data.checkOut || undefined,
        notes: data.notes || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', id, 'attendance'] })
      queryClient.invalidateQueries({ queryKey: ['employees', id, 'attendance', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success('Attendance recorded')
      setIsAttendanceModalOpen(false)
    },
    onError: () => {
      toast.error('Could not record attendance. Try again.')
    },
  })

  // Clipboard copy helpers
  const handleCopyCode = () => {
    if (emp?.employeeCode) {
      navigator.clipboard.writeText(emp.employeeCode)
      setCopiedCode(true)
      toast.success(`Copied employee code: ${emp.employeeCode}`)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleCopyEmail = () => {
    if (emp?.email) {
      navigator.clipboard.writeText(emp.email)
      setCopiedEmail(true)
      toast.success(`Copied email address: ${emp.email}`)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Profile URL copied to clipboard')
  }

  // Month navigation
  const prevMonth = () => {
    if (calMonth === 1) {
      setCalYear((y) => y - 1)
      setCalMonth(12)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (calMonth === 12) {
      setCalYear((y) => y + 1)
      setCalMonth(1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  const resetToCurrentMonth = () => {
    setCalYear(today.getFullYear())
    setCalMonth(today.getMonth() + 1)
  }

  const monthName = new Date(calYear, calMonth - 1, 1).toLocaleString('default', { month: 'long' })

  // Derived KPI calculations
  const totalDays = summary.data
    ? summary.data.presentDays +
      summary.data.workFromHomeDays +
      summary.data.halfDays +
      summary.data.leaveDays +
      summary.data.holidayDays +
      summary.data.absentDays
    : 0

  const activeWorkDays = summary.data
    ? summary.data.presentDays + summary.data.workFromHomeDays + summary.data.halfDays * 0.5
    : 0

  const attendanceRate =
    summary.data && totalDays > 0
      ? Math.round((activeWorkDays / (totalDays - summary.data.holidayDays || 1)) * 100)
      : null

  const totalRemainingLeave = leaveBalances.data?.reduce((sum, lb) => sum + lb.remaining, 0) ?? 0
  const totalAllocatedLeave = leaveBalances.data?.reduce((sum, lb) => sum + lb.allocated, 0) ?? 0

  // Attendance Donut Data for Visual Clarity
  const attendanceDonutData = useMemo(() => {
    if (!summary.data) return []
    return [
      { key: 'present', label: 'Present', value: summary.data.presentDays, color: '#10b981' },
      { key: 'wfh', label: 'Work from home', value: summary.data.workFromHomeDays, color: '#8b5cf6' },
      { key: 'half_day', label: 'Half day', value: summary.data.halfDays, color: '#f59e0b' },
      { key: 'leave', label: 'Leave', value: summary.data.leaveDays, color: '#f97316' },
      { key: 'absent', label: 'Absent', value: summary.data.absentDays, color: '#ef4444' },
      { key: 'holiday', label: 'Holiday', value: summary.data.holidayDays, color: '#3b82f6' },
    ].filter((d) => d.value > 0)
  }, [summary.data])

  const attendanceTableModel = useMemo(() => {
    if (!summary.data) return undefined
    return {
      caption: `${calYear} Attendance Distribution`,
      columns: [
        { key: 'category', label: 'Status category' },
        { key: 'days', label: 'Logged days', align: 'right' as const },
        { key: 'share', label: 'Share of total', align: 'right' as const },
      ],
      rows: [
        { category: 'Present at office', days: summary.data.presentDays, share: totalDays ? `${Math.round((summary.data.presentDays / totalDays) * 100)}%` : '0%' },
        { category: 'Work from home (WFH)', days: summary.data.workFromHomeDays, share: totalDays ? `${Math.round((summary.data.workFromHomeDays / totalDays) * 100)}%` : '0%' },
        { category: 'Half day', days: summary.data.halfDays, share: totalDays ? `${Math.round((summary.data.halfDays / totalDays) * 100)}%` : '0%' },
        { category: 'Approved leave', days: summary.data.leaveDays, share: totalDays ? `${Math.round((summary.data.leaveDays / totalDays) * 100)}%` : '0%' },
        { category: 'Official holidays', days: summary.data.holidayDays, share: totalDays ? `${Math.round((summary.data.holidayDays / totalDays) * 100)}%` : '0%' },
        { category: 'Unapproved absence', days: summary.data.absentDays, share: totalDays ? `${Math.round((summary.data.absentDays / totalDays) * 100)}%` : '0%' },
      ].filter((r) => Number(r.days) > 0 || r.category === 'Present at office'),
    }
  }, [summary.data, calYear, totalDays])

  // Leave Balances Comparison Bar Data
  const leaveBarsData = useMemo(() => {
    if (!leaveBalances.data?.length) return []
    return leaveBalances.data.map((lb) => ({
      label: lb.leaveType,
      allocated: lb.allocated,
      used: lb.used,
      remaining: lb.remaining,
    }))
  }, [leaveBalances.data])

  const leaveTableModel = useMemo(() => {
    if (!leaveBalances.data?.length) return undefined
    return {
      caption: `${calYear} Leave Allocation and Balances`,
      columns: [
        { key: 'type', label: 'Leave type' },
        { key: 'allocated', label: 'Allocated days', align: 'right' as const },
        { key: 'used', label: 'Used days', align: 'right' as const },
        { key: 'remaining', label: 'Remaining days', align: 'right' as const },
      ],
      rows: leaveBalances.data.map((lb) => ({
        type: lb.leaveType,
        allocated: lb.allocated,
        used: lb.used,
        remaining: lb.remaining,
      })),
    }
  }, [leaveBalances.data, calYear])

  // Direct reports filtering
  const filteredTeam = useMemo(() => {
    if (!team.data) return []
    if (!teamSearch.trim()) return team.data
    const q = teamSearch.toLowerCase()
    return team.data.filter(
      (m) =>
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        m.employeeCode.toLowerCase().includes(q) ||
        m.designation.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q),
    )
  }, [team.data, teamSearch])

  // Skills parsing & filtering
  const allSkills = useMemo(() => {
    if (!emp?.skills) return []
    return emp.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [emp?.skills])

  const filteredSkills = useMemo(() => {
    if (!skillsSearch.trim()) return allSkills
    const q = skillsSearch.toLowerCase()
    return allSkills.filter((s) => s.toLowerCase().includes(q))
  }, [allSkills, skillsSearch])

  if (employee.isPending) {
    return (
      <div className="grid gap-6 animate-pulse p-2 sm:p-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (employee.isError || !emp) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <ErrorState
          title="Could not find employee profile"
          message="Employee record not found, or you lack permission to view it."
          onRetry={() => employee.refetch()}
        />
        <Button asChild variant="outline">
          <Link to="/workforce/employees">
            <ChevronLeft className="mr-1.5 size-4" />
            Back to employees
          </Link>
        </Button>
      </div>
    )
  }

  const displayName = emp.fullName || emp.designation
  const tenure = calculateTenure(emp.joiningDate)
  const manager = managerQuery.data

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to="/workforce/employees">
            <ChevronLeft className="size-4" />
            <span>Workforce directory</span>
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShareProfile} className="gap-1.5 text-xs">
            <Share2 animateOnHover className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          {canUpdate && (
            <Button size="sm" asChild className="gap-1.5 text-xs shadow-xs">
              <Link to={`/workforce/employees/${id}/edit`}>
                <Edit3 className="size-3.5" />
                <span>Edit profile</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Dynamic Hero Identity Card */}
      <Card className="relative overflow-hidden border border-border/80 dark:border-slate-800/80 bg-card shadow-soft">
        {/* Soft top gradient backdrop glow */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-sky-500/10 dark:from-blue-500/15 dark:via-indigo-500/10 dark:to-cyan-500/15 border-b border-border/40" />

        <CardContent className="relative pt-12 pb-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:left">
              {/* Profile Avatar with Status Pulse */}
              <div className="relative group">
                <Avatar className="size-24 sm:size-28 border-4 border-card bg-slate-100 dark:bg-slate-800 shadow-md">
                  <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-gradient-to-tr from-blue-600 to-indigo-600 text-white">
                    {getInitials(emp.fullName, emp.designation)}
                  </AvatarFallback>
                </Avatar>
                {/* Active Indicator Ring */}
                <span
                  className={cn(
                    'absolute bottom-1 right-1 size-5 rounded-full border-2 border-card flex items-center justify-center',
                    emp.employmentStatus === 'ACTIVE'
                      ? 'bg-emerald-500'
                      : emp.employmentStatus === 'PROBATION'
                        ? 'bg-amber-500'
                        : emp.employmentStatus === 'ON_LEAVE'
                          ? 'bg-sky-500'
                          : 'bg-rose-500',
                  )}
                  title={`Status: ${emp.employmentStatus}`}
                />
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {displayName}
                  </h1>
                  <DepartmentBadge department={emp.department} />
                  <EmployeeStatusBadge status={emp.employmentStatus} />
                </div>

                <p className="text-sm font-medium text-muted-foreground flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span>{emp.designation}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                    title="Click to copy employee code"
                  >
                    <span>{emp.employeeCode}</span>
                    {copiedCode ? <Check animate className="size-3 text-emerald-600" /> : <Copy animateOnHover className="size-3 opacity-60" />}
                  </button>
                </p>

                {/* Sub-pills row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  {emp.email && (
                    <div className="inline-flex items-center gap-1.5 hover:text-foreground">
                      <Mail animateOnHover className="size-3.5 opacity-70" />
                      <a href={`mailto:${emp.email}`} className="hover:underline">
                        {emp.email}
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer"
                        title="Copy email"
                      >
                        {copiedEmail ? <Check animate className="size-3 text-emerald-600" /> : <Copy animateOnHover className="size-3" />}
                      </button>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5">
                    <Calendar animateOnHover className="size-3.5 opacity-70" />
                    <span>
                      Joined {new Date(emp.joiningDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}{' '}
                      <span className="opacity-75">({tenure})</span>
                    </span>
                  </div>
                  {manager && (
                    <div className="inline-flex items-center gap-1.5">
                      <User animateOnHover className="size-3.5 opacity-70" />
                      <span>Manager: </span>
                      <Link
                        to={`/workforce/employees/${manager.id}`}
                        className="text-primary dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-0.5"
                      >
                        {manager.fullName || manager.designation}
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Button Pill */}
            <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0">
              {canCreate && (
                <Button
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-xs"
                >
                  <PlusCircle className="size-4" />
                  <span>Log attendance</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 Executive KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Attendance Rate */}
        <Card className="border border-border/80 dark:border-slate-800/80 bg-card p-4 shadow-soft hover:shadow-pop transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Attendance rate</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {attendanceRate !== null ? `${attendanceRate}%` : 'N/A'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.data?.presentDays ?? 0}d Present
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            Based on {totalDays} logged days in {calYear}
          </p>
        </Card>

        {/* Working Hours */}
        <Card className="border border-border/80 dark:border-slate-800/80 bg-card p-4 shadow-soft hover:shadow-pop transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Hours logged</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Clock animateOnHover className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summary.data ? `${summary.data.totalWorkingHours.toFixed(1)}h` : '0.0h'}
            </span>
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
              {summary.data?.workFromHomeDays ?? 0}d WFH
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {activeWorkDays > 0 ? `${(summary.data!.totalWorkingHours / activeWorkDays).toFixed(1)}h daily average` : 'No active shifts'}
          </p>
        </Card>

        {/* Leave Balance Available */}
        <Card className="border border-border/80 dark:border-slate-800/80 bg-card p-4 shadow-soft hover:shadow-pop transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Leave available</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Palmtree className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {totalRemainingLeave} <span className="text-sm font-normal text-muted-foreground">days</span>
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {totalAllocatedLeave - totalRemainingLeave} used
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            Total {totalAllocatedLeave} days annual allocation
          </p>
        </Card>

        {/* Direct Reports / Team */}
        <Card className="border border-border/80 dark:border-slate-800/80 bg-card p-4 shadow-soft hover:shadow-pop transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Team</span>
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <Users animateOnHover className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {team.data?.length ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
              {team.data?.length ? 'People manager' : 'Individual'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {manager ? `Reports to ${manager.fullName || manager.designation}` : 'Top-level leadership'}
          </p>
        </Card>
      </div>

      {/* Interactive Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-border/80 pb-px">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
            <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold gap-1.5 px-3 py-1.5">
              <User className="size-3.5" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg text-xs font-semibold gap-1.5 px-3 py-1.5">
              <Calendar className="size-3.5" />
              <span>Attendance</span>
              {summary.data && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                  {summary.data.presentDays + summary.data.workFromHomeDays}d
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="leave" className="rounded-lg text-xs font-semibold gap-1.5 px-3 py-1.5">
              <Palmtree className="size-3.5" />
              <span>Leave</span>
              {leaveBalances.data && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                  {totalRemainingLeave}d left
                </span>
              )}
            </TabsTrigger>
            {team.data && team.data.length > 0 && (
              <TabsTrigger value="team" className="rounded-lg text-xs font-semibold gap-1.5 px-3 py-1.5">
                <Users className="size-3.5" />
                <span>Direct reports ({team.data.length})</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & PROFILE                                                 */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Primary Profile Details Grid */}
            <Card className="border border-border/80 dark:border-slate-800/80 bg-card shadow-soft">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="size-4 text-primary" />
                  <span>Employment details</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Official employee record and hierarchy placement
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                    <dt className="text-muted-foreground font-medium mb-1">Employee code</dt>
                    <dd className="font-mono font-bold text-sm text-foreground flex items-center gap-1.5">
                      <span>{emp.employeeCode}</span>
                    </dd>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                    <dt className="text-muted-foreground font-medium mb-1">Department</dt>
                    <dd className="flex items-center">
                      <DepartmentBadge department={emp.department} />
                    </dd>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                    <dt className="text-muted-foreground font-medium mb-1">Designation</dt>
                    <dd className="font-semibold text-foreground text-sm truncate" title={emp.designation}>
                      {emp.designation}
                    </dd>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                    <dt className="text-muted-foreground font-medium mb-1">Employment status</dt>
                    <dd className="flex items-center">
                      <EmployeeStatusBadge status={emp.employmentStatus} />
                    </dd>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                    <dt className="text-muted-foreground font-medium mb-1">Joining date</dt>
                    <dd className="font-semibold text-foreground text-sm">
                      {new Date(emp.joiningDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                    <dt className="text-muted-foreground font-medium mb-1">Tenure</dt>
                    <dd className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                      {tenure} of continuous service
                    </dd>
                  </div>

                  {emp.email && (
                    <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                      <dt className="text-muted-foreground font-medium mb-1">Work email</dt>
                      <dd className="font-mono text-sm text-foreground flex items-center justify-between">
                        <a href={`mailto:${emp.email}`} className="hover:underline text-primary dark:text-blue-400">
                          {emp.email}
                        </a>
                        <Button variant="ghost" size="icon-sm" onClick={handleCopyEmail} className="h-6 w-6">
                          <Copy className="size-3" />
                        </Button>
                      </dd>
                    </div>
                  )}

                  {manager && (
                    <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/50 flex items-center justify-between">
                      <div>
                        <dt className="text-muted-foreground font-medium mb-0.5">Reporting manager</dt>
                        <dd className="font-semibold text-sm text-foreground">
                          {manager.fullName || manager.designation} ({manager.employeeCode})
                        </dd>
                      </div>
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <Link to={`/workforce/employees/${manager.id}`}>View manager</Link>
                      </Button>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Skills & Technical Competencies Card */}
            <Card className="border border-border/80 dark:border-slate-800/80 bg-card shadow-soft flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-500" />
                      <span>Skills</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {allSkills.length} verified technical and operational skills
                    </CardDescription>
                  </div>
                  {allSkills.length > 5 && (
                    <div className="relative w-36">
                      <Search className="absolute left-2 top-2 size-3 text-muted-foreground" />
                      <Input
                        value={skillsSearch}
                        onChange={(e) => setSkillsSearch(e.target.value)}
                        placeholder="Search skills…"
                        className="h-7 pl-6 text-xs"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  {filteredSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {filteredSkills.map((skill, idx) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-foreground border border-border/70 transition-all hover:scale-105 shadow-2xs"
                        >
                          <span className="size-1.5 rounded-full bg-blue-500" />
                          <span>{skill}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      {skillsSearch ? 'No skills matched your search' : 'No skills recorded for this profile.'}
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Workforce Compliance Banner */}
              <div className="p-4 m-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 text-xs flex items-start gap-3">
                <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-300">
                    Employee profile
                  </div>
                  <div className="text-blue-700 dark:text-blue-400 mt-0.5">
                    Profile updated on {new Date(emp.updatedAt).toLocaleDateString()} by {emp.updatedBy}.
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Direct Reports Mini Section */}
          {team.data && team.data.length > 0 && (
            <Card className="border border-border/80 dark:border-slate-800/80 bg-card shadow-soft">
              <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="size-4 text-violet-500" />
                    <span>Direct reports ({team.data.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Employees reporting directly to {displayName}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('team')} className="text-xs h-7">
                  View all reports
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {team.data.slice(0, 6).map((member) => (
                    <Link
                      key={member.id}
                      to={`/workforce/employees/${member.id}`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/70 dark:border-slate-800/70 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all hover:shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 bg-primary/10 text-primary border border-border">
                          <AvatarFallback className="text-xs font-bold">
                            {getInitials(member.fullName, member.designation)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {member.fullName || member.designation}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground truncate">
                            {member.employeeCode}
                          </div>
                        </div>
                      </div>
                      <EmployeeStatusBadge status={member.employmentStatus} />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: ATTENDANCE ANALYTICS & INTERACTIVE CALENDAR                        */}
        {/* ========================================================================= */}
        <TabsContent value="attendance" className="space-y-6 mt-0">
          {/* Attendance KPI Summary Card */}
          {summary.data && <AttendanceSummaryCard summary={summary.data} />}

          {/* Month / Year Interactive Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/80 dark:border-slate-800/80 p-3 rounded-xl shadow-soft">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 px-2.5">
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous month</span>
              </Button>
              <h2 className="text-sm font-bold text-foreground px-2 min-w-[140px] text-center">
                {monthName} {calYear}
              </h2>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 px-2.5">
                <ChevronRight className="size-4" />
                <span className="sr-only">Next month</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToCurrentMonth}
                className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Today
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  onClick={() => {
                    setAttendanceDate(new Date().toISOString().split('T')[0])
                    setIsAttendanceModalOpen(true)
                  }}
                  className="h-8 text-xs gap-1.5"
                >
                  <PlusCircle className="size-3.5" />
                  <span>Log shift</span>
                </Button>
              )}
            </div>
          </div>

          {/* 2D Interactive Calendar Grid */}
          {attendance.isPending ? (
            <Skeleton className="h-80 w-full rounded-xl" />
          ) : attendance.isError ? (
            <ErrorState message="Could not load attendance for this period." onRetry={() => attendance.refetch()} />
          ) : (
            <AttendanceCalendar
              year={calYear}
              month={calMonth}
              records={attendance.data ?? []}
              onSelectDay={(dateStr, record) => {
                setAttendanceDate(dateStr)
                if (record) {
                  setAttendanceType(record.type)
                  setCheckInTime(record.checkIn || '09:30')
                  setCheckOutTime(record.checkOut || '18:30')
                  setAttendanceNotes(record.notes || '')
                }
                setIsAttendanceModalOpen(true)
              }}
            />
          )}

          {/* 2D Attendance Breakdown ChartCard with Dual [ Chart | Table ] View */}
          {summary.data && attendanceDonutData.length > 0 && (
            <ChartCard
              title={`${calYear} Attendance Distribution`}
              description={`Yearly breakdown of shifts and presence for ${displayName}`}
              table={attendanceTableModel}
              height={260}
            >
              <DonutChart
                data={attendanceDonutData}
                centerLabel="Workdays"
                centerValue={`${activeWorkDays}d`}
                description="Attendance category distribution"
              />
            </ChartCard>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: LEAVE & BALANCES                                                   */}
        {/* ========================================================================= */}
        <TabsContent value="leave" className="space-y-6 mt-0">
          <div className="flex items-center justify-between bg-card border border-border/80 dark:border-slate-800/80 p-3 rounded-xl shadow-soft">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Leave balances</h3>
              <p className="text-xs text-muted-foreground">Annual leave tracker and quota management for {calYear}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={calYear === today.getFullYear() ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalYear(today.getFullYear())}
                className="h-8 text-xs"
              >
                {today.getFullYear()} Current
              </Button>
              <Button
                variant={calYear === today.getFullYear() - 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalYear(today.getFullYear() - 1)}
                className="h-8 text-xs"
              >
                {today.getFullYear() - 1} Previous
              </Button>
            </div>
          </div>

          {/* Leave Cards Grid */}
          {leaveBalances.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : leaveBalances.isError ? (
            <ErrorState message="Could not load leave balances." onRetry={() => leaveBalances.refetch()} />
          ) : (leaveBalances.data?.length ?? 0) === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-border/80">
              <Palmtree className="size-8 mx-auto mb-2 opacity-40 text-amber-500" />
              <p className="font-semibold text-sm">No leave balances found for {calYear}</p>
              <p className="text-xs mt-1">Leave quotas appear here once allocated by HR or Admin.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leaveBalances.data!.map((lb) => (
                <LeaveBalanceCard key={lb.id} balance={lb} />
              ))}
            </div>
          )}

          {/* 2D Leave Allocation vs Used ChartCard with Table Switcher */}
          {leaveBalances.data && leaveBalances.data.length > 0 && (
            <ChartCard
              title={`${calYear} Leave Quota & Consumption`}
              description="Allocated, used and remaining days per leave type"
              table={leaveTableModel}
              height={260}
            >
              <BarsChart
                data={leaveBarsData}
                series={[
                  { key: 'allocated', name: 'Allocated days', color: '#3b82f6' },
                  { key: 'used', name: 'Used days', color: '#f59e0b' },
                  { key: 'remaining', name: 'Remaining days', color: '#10b981' },
                ]}
                orientation="columns"
                description="Leave quota bar comparison"
              />
            </ChartCard>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: DIRECT REPORTS (Dedicated Tab)                                     */}
        {/* ========================================================================= */}
        {team.data && team.data.length > 0 && (
          <TabsContent value="team" className="space-y-6 mt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 dark:border-slate-800/80 p-3.5 rounded-xl shadow-soft">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Direct reports ({filteredTeam.length})
                </h3>
                <p className="text-xs text-muted-foreground">Team members reporting directly to this profile</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Filter by name, code or department…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeam.map((member) => (
                <Card
                  key={member.id}
                  className="border border-border/70 dark:border-slate-800/70 bg-card hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all shadow-soft"
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-11 border border-border shadow-xs">
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {getInitials(member.fullName, member.designation)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate" title={member.fullName || member.designation}>
                            {member.fullName || member.designation}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">{member.designation}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{member.employeeCode}</p>
                        </div>
                      </div>
                      <EmployeeStatusBadge status={member.employmentStatus} />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <DepartmentBadge department={member.department} />
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1">
                        <Link to={`/workforce/employees/${member.id}`}>
                          <span>View profile</span>
                          <ChevronRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ========================================================================= */}
      {/* INTERACTIVE MARK ATTENDANCE DIALOG                                       */}
      {/* ========================================================================= */}
      <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4 text-primary" />
              <span>Record attendance</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log or adjust attendance record for <span className="font-semibold text-foreground">{displayName}</span>
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              markAttendanceMutation.mutate({
                date: attendanceDate,
                type: attendanceType,
                checkIn: checkInTime,
                checkOut: checkOutTime,
                notes: attendanceNotes,
              })
            }}
            className="space-y-4 py-2"
          >
            {/* Date Input */}
            <div className="space-y-1.5">
              <Label htmlFor="att-date" className="text-xs font-semibold">
                Attendance date
              </Label>
              <Input
                id="att-date"
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>

            {/* Attendance Type Segmented Buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status / shift</Label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(
                  [
                    { id: 'PRESENT', label: 'Present', icon: CheckCircle2, color: 'text-emerald-600' },
                    { id: 'WORK_FROM_HOME', label: 'WFH', icon: Home, color: 'text-violet-600' },
                    { id: 'HALF_DAY', label: 'Half day', icon: Clock, color: 'text-amber-600' },
                    { id: 'LEAVE', label: 'Leave', icon: Palmtree, color: 'text-orange-600' },
                    { id: 'HOLIDAY', label: 'Holiday', icon: Calendar, color: 'text-blue-600' },
                    { id: 'ABSENT', label: 'Absent', icon: AlertOctagon, color: 'text-rose-600' },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon
                  const isSelected = attendanceType === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAttendanceType(item.id)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                          : 'bg-card border-border/80 hover:bg-muted text-foreground',
                      )}
                    >
                      <Icon className={cn('size-3.5', isSelected ? 'text-white' : item.color)} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Shift Timings (Show when present, WFH, or half day) */}
            {['PRESENT', 'WORK_FROM_HOME', 'HALF_DAY'].includes(attendanceType) && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="att-in" className="text-xs font-semibold">
                    Punch in time
                  </Label>
                  <Input
                    id="att-in"
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="att-out" className="text-xs font-semibold">
                    Punch out time
                  </Label>
                  <Input
                    id="att-out"
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="att-notes" className="text-xs font-semibold">
                Notes (optional)
              </Label>
              <Textarea
                id="att-notes"
                value={attendanceNotes}
                onChange={(e) => setAttendanceNotes(e.target.value)}
                placeholder="Shift notes, client visits, reason for leave…"
                className="text-xs min-h-[60px] resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={markAttendanceMutation.isPending}
                className="text-xs font-semibold"
              >
                {markAttendanceMutation.isPending ? 'Saving…' : 'Save attendance'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
