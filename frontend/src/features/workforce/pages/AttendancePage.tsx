import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Filter,
  Home,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  SunMedium,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHasPermission } from '@/features/auth/auth-context'
import {
  attendanceTypeValues,
  departmentValues,
  leaveTypeValues,
  workforceApi,
  type AttendanceRecord,
  type AttendanceType,
  type EmployeeProfile,
  type LeaveType,
  type WorkforceDepartment,
} from '../api'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import { AttendanceSummaryCard } from '../components/AttendanceSummaryCard'
import { DepartmentBadge } from '../components/DepartmentBadge'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateDisplay(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const ATTENDANCE_CONFIG: Record<
  AttendanceType,
  {
    label: string
    short: string
    color: string
    bgColor: string
    borderColor: string
    icon: typeof CheckCircle2
  }
> = {
  PRESENT: {
    label: 'Present',
    short: 'P',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  ABSENT: {
    label: 'Absent',
    short: 'A',
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800',
    icon: XCircle,
  },
  HALF_DAY: {
    label: 'Half day',
    short: 'HD',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: SunMedium,
  },
  LEAVE: {
    label: 'Leave',
    short: 'L',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: Coffee,
  },
  HOLIDAY: {
    label: 'Holiday',
    short: 'H',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Building2,
  },
  WORK_FROM_HOME: {
    label: 'Work from home',
    short: 'WFH',
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-50 dark:bg-violet-950/40',
    borderColor: 'border-violet-200 dark:border-violet-800',
    icon: Home,
  },
}

interface StagedEntry {
  type: AttendanceType
  checkIn: string
  checkOut: string
  leaveType: LeaveType | ''
  notes?: string
}

export function AttendancePage() {
  const queryClient = useQueryClient()
  const canMark = useHasPermission('WORKFORCE_CREATE')

  // Date state
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const isSelectedDateToday = selectedDate === todayStr()

  // Queries
  const employeesQuery = useQuery(workforceApi.listQuery())
  const attendanceQuery = useQuery(workforceApi.todayAttendanceQuery(selectedDate))
  const myProfileQuery = useQuery(workforceApi.meQuery())

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Bulk / Selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [stagedChanges, setStagedChanges] = useState<Record<string, StagedEntry>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Real-time clock for personal punch
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Monthly report state
  const today = new Date()
  const [monthlyEmployeeId, setMonthlyEmployeeId] = useState<string>('')
  const [monthlyYear, setMonthlyYear] = useState(today.getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(today.getMonth() + 1)

  // Auto-select first employee for monthly sheet
  useEffect(() => {
    if (!monthlyEmployeeId && employeesQuery.data && employeesQuery.data.length > 0) {
      setMonthlyEmployeeId(employeesQuery.data[0].id)
    }
  }, [monthlyEmployeeId, employeesQuery.data])

  // Queries for monthly view
  const monthlyAttendanceQuery = useQuery(
    workforceApi.attendanceQuery(monthlyEmployeeId, monthlyYear, monthlyMonth),
  )
  const monthlySummaryQuery = useQuery(
    workforceApi.attendanceSummaryQuery(
      monthlyEmployeeId,
      `${monthlyYear}-${pad(monthlyMonth)}-01`,
      `${monthlyYear}-${pad(monthlyMonth)}-${new Date(monthlyYear, monthlyMonth, 0).getDate()}`,
    ),
  )

  // Map of saved records by employeeId
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    if (attendanceQuery.data) {
      for (const rec of attendanceQuery.data) {
        map.set(rec.employeeId, rec)
      }
    }
    return map
  }, [attendanceQuery.data])

  // Employees list
  const employees = employeesQuery.data ?? []

  // Stats computation
  const stats = useMemo(() => {
    let present = 0
    let absent = 0
    let halfDay = 0
    let leave = 0
    let wfh = 0
    let holiday = 0
    let unmarked = 0

    for (const emp of employees) {
      const rec = stagedChanges[emp.id] ?? attendanceMap.get(emp.id)
      if (!rec || !rec.type) {
        unmarked++
        continue
      }
      switch (rec.type) {
        case 'PRESENT':
          present++
          break
        case 'ABSENT':
          absent++
          break
        case 'HALF_DAY':
          halfDay++
          break
        case 'LEAVE':
          leave++
          break
        case 'WORK_FROM_HOME':
          wfh++
          break
        case 'HOLIDAY':
          holiday++
          break
      }
    }

    const total = employees.length
    const presentRate = total > 0 ? Math.round((present / total) * 100) : 0

    return { total, present, absent, halfDay, leave, wfh, holiday, unmarked, presentRate }
  }, [employees, stagedChanges, attendanceMap])

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim()
      const name = (emp.fullName || '').toLowerCase()
      const code = (emp.employeeCode || '').toLowerCase()
      const desig = (emp.designation || '').toLowerCase()

      const matchesSearch = !q || name.includes(q) || code.includes(q) || desig.includes(q)
      const matchesDept = departmentFilter === 'ALL' || emp.department === departmentFilter

      if (!matchesSearch || !matchesDept) return false

      if (statusFilter !== 'ALL') {
        const rec = stagedChanges[emp.id] ?? attendanceMap.get(emp.id)
        if (statusFilter === 'UNMARKED') {
          return !rec || !rec.type
        }
        return rec?.type === statusFilter
      }

      return true
    })
  }, [employees, searchQuery, departmentFilter, statusFilter, stagedChanges, attendanceMap])

  // Bulk save mutation
  const saveBulkMutation = useMutation({
    mutationFn: (entriesToSave?: Array<{ employeeId: string; entry: StagedEntry }>) => {
      const entries = entriesToSave || Object.entries(stagedChanges).map(([employeeId, entry]) => ({ employeeId, entry }))
      const records = entries
        .filter((item) => item.entry.type)
        .map((item) => ({
          employeeId: item.employeeId,
          type: item.entry.type,
          checkIn: item.entry.checkIn || undefined,
          checkOut: item.entry.checkOut || undefined,
          leaveType: (item.entry.leaveType || undefined) as LeaveType | undefined,
          notes: item.entry.notes || undefined,
        }))

      return workforceApi.bulkMarkAttendance({
        date: selectedDate,
        records,
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      setStagedChanges({})
      setSelectedEmployeeIds([])
      setSuccessMessage(`Attendance saved for ${data.length} employee${data.length === 1 ? '' : 's'}.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    },
    onError: () => {
      setErrorMessage('Could not save attendance. Try again.')
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  // Single mark mutation (e.g. self-service punch clock or individual row quick save)
  const singleMarkMutation = useMutation({
    mutationFn: ({
      employeeId,
      type,
      checkIn,
      checkOut,
      notes,
    }: {
      employeeId: string
      type: AttendanceType
      checkIn?: string
      checkOut?: string
      notes?: string
    }) => {
      return workforceApi.markAttendance(employeeId, {
        date: selectedDate,
        type,
        checkIn,
        checkOut,
        notes,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      setSuccessMessage('Attendance recorded.')
      setTimeout(() => setSuccessMessage(null), 4000)
    },
    onError: () => {
      setErrorMessage('Could not record attendance.')
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  // Navigation helpers
  const shiftDay = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const current = new Date(y, m - 1, d)
    current.setDate(current.getDate() + days)
    setSelectedDate(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`)
    setStagedChanges({})
  }

  // Update a staged entry
  const setEmployeeStage = (empId: string, partial: Partial<StagedEntry>) => {
    const existing = attendanceMap.get(empId)
    setStagedChanges((prev) => {
      const base: StagedEntry = prev[empId] ?? {
        type: existing?.type ?? 'PRESENT',
        checkIn: existing?.checkIn ?? '09:00',
        checkOut: existing?.checkOut ?? '18:00',
        leaveType: existing?.leaveType ?? '',
        notes: existing?.notes ?? '',
      }
      return { ...prev, [empId]: { ...base, ...partial } }
    })
  }

  // Quick mark a status for an employee
  const handleQuickStatus = (emp: EmployeeProfile, type: AttendanceType) => {
    let checkIn = '09:00'
    let checkOut = '18:00'
    let leaveType: LeaveType | '' = ''

    if (type === 'HALF_DAY') {
      checkOut = '13:00'
    } else if (type === 'ABSENT' || type === 'HOLIDAY') {
      checkIn = ''
      checkOut = ''
    } else if (type === 'LEAVE') {
      checkIn = ''
      checkOut = ''
      leaveType = 'ANNUAL'
    }

    setEmployeeStage(emp.id, { type, checkIn, checkOut, leaveType })
  }

  // Magic action: Mark all currently unmarked employees as Present
  const handleMarkAllUnmarkedPresent = () => {
    const newStage: Record<string, StagedEntry> = { ...stagedChanges }
    let count = 0
    for (const emp of employees) {
      const hasRecord = attendanceMap.has(emp.id)
      const hasStage = !!stagedChanges[emp.id]
      if (!hasRecord && !hasStage) {
        newStage[emp.id] = {
          type: 'PRESENT',
          checkIn: '09:00',
          checkOut: '18:00',
          leaveType: '',
        }
        count++
      }
    }
    if (count === 0) {
      setSuccessMessage('Every employee already has attendance for this day.')
      setTimeout(() => setSuccessMessage(null), 3000)
      return
    }
    setStagedChanges(newStage)
    setSuccessMessage(`Marked ${count} unmarked employee${count === 1 ? '' : 's'} as Present (09:00 - 18:00). Click 'Save Attendance' to confirm.`)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Batch action: Mark selected employees with a specific status
  const handleMarkSelected = (type: AttendanceType) => {
    if (selectedEmployeeIds.length === 0) return
    const newStage = { ...stagedChanges }
    for (const id of selectedEmployeeIds) {
      let checkIn = '09:00'
      let checkOut = '18:00'
      let leaveType: LeaveType | '' = ''
      if (type === 'HALF_DAY') checkOut = '13:00'
      if (type === 'ABSENT' || type === 'HOLIDAY') {
        checkIn = ''
        checkOut = ''
      }
      if (type === 'LEAVE') {
        checkIn = ''
        checkOut = ''
        leaveType = 'ANNUAL'
      }
      newStage[id] = { type, checkIn, checkOut, leaveType }
    }
    setStagedChanges(newStage)
  }

  // Selection toggle
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds(filteredEmployees.map((e) => e.id))
    } else {
      setSelectedEmployeeIds([])
    }
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds((prev) => [...prev, id])
    } else {
      setSelectedEmployeeIds((prev) => prev.filter((item) => item !== id))
    }
  }

  // Export Daily CSV
  const exportDailyCsv = () => {
    if (employees.length === 0) return
    const headers = ['Employee code', 'Full name', 'Designation', 'Department', 'Status', 'Check in', 'Check out', 'Leave type', 'Notes']
    const rows = employees.map((emp) => {
      const rec = stagedChanges[emp.id] ?? attendanceMap.get(emp.id)
      return [
        emp.employeeCode,
        emp.fullName || '',
        emp.designation,
        emp.department,
        rec ? ATTENDANCE_CONFIG[rec.type]?.label ?? rec.type : 'NOT_MARKED',
        rec?.checkIn || '',
        rec?.checkOut || '',
        rec?.leaveType || '',
        rec?.notes || '',
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-${selectedDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Export Monthly CSV
  const exportMonthlyCsv = () => {
    const selectedEmp = employees.find((e) => e.id === monthlyEmployeeId)
    const records = monthlyAttendanceQuery.data || []
    if (!selectedEmp) return

    const headers = ['Date', 'Day', 'Status', 'Check in', 'Check out', 'Working hours', 'Leave type', 'Notes']
    const daysInMonth = new Date(monthlyYear, monthlyMonth, 0).getDate()
    const byDate = new Map(records.map((r) => [r.attendanceDate, r]))

    const rows: string[][] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthlyYear}-${pad(monthlyMonth)}-${pad(day)}`
      const dateObj = new Date(monthlyYear, monthlyMonth - 1, day)
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
      const rec = byDate.get(dateStr)

      rows.push([
        dateStr,
        dayName,
        rec ? ATTENDANCE_CONFIG[rec.type]?.label ?? rec.type : 'UNMARKED',
        rec?.checkIn || '',
        rec?.checkOut || '',
        rec?.workingHours ? String(rec.workingHours.toFixed(1)) : '',
        rec?.leaveType || '',
        rec?.notes || '',
      ])
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `monthly-attendance-${selectedEmp.employeeCode}-${monthlyYear}-${pad(monthlyMonth)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const stagedCount = Object.keys(stagedChanges).length

  return (
    <div className="grid gap-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Attendance"
          description="Daily attendance, bulk punch logs, self-service clock-in and monthly payroll reports."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportDailyCsv}
            disabled={employees.length === 0}
            className="h-9 gap-1.5"
          >
            <Download className="size-4" />
            <span>Export day sheet</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              attendanceQuery.refetch()
              employeesQuery.refetch()
            }}
            className="h-9 gap-1.5"
            title="Refresh attendance records"
          >
            <RefreshCw className="size-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Pulse Metric Cards (Clickable Quick Filters) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
            statusFilter === 'ALL'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border bg-card hover:border-primary/40'
          }`}
        >
          <div className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Total staff</span>
            <Users className="size-3.5" />
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">{stats.total}</div>
          <span className="mt-1 text-[11px] text-muted-foreground">All active team</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PRESENT')}
          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
            statusFilter === 'PRESENT'
              ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/30'
              : 'border-border bg-card hover:border-emerald-400/60'
          }`}
        >
          <div className="flex w-full items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Present</span>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
            {stats.present}
          </div>
          <span className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {stats.presentRate}% attendance
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('WORK_FROM_HOME')}
          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
            statusFilter === 'WORK_FROM_HOME'
              ? 'border-violet-500 bg-violet-50/50 ring-2 ring-violet-500/20 dark:bg-violet-950/30'
              : 'border-border bg-card hover:border-violet-400/60'
          }`}
        >
          <div className="flex w-full items-center justify-between text-xs font-medium text-violet-700 dark:text-violet-400">
            <span>WFH</span>
            <span className="size-2 rounded-full bg-violet-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-violet-700 dark:text-violet-300">
            {stats.wfh}
          </div>
          <span className="mt-1 text-[11px] text-muted-foreground">Remote workers</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('HALF_DAY')}
          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
            statusFilter === 'HALF_DAY'
              ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 dark:bg-amber-950/30'
              : 'border-border bg-card hover:border-amber-400/60'
          }`}
        >
          <div className="flex w-full items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
            <span>Half Day</span>
            <span className="size-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
            {stats.halfDay}
          </div>
          <span className="mt-1 text-[11px] text-muted-foreground">Partial shift</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('LEAVE')}
          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
            statusFilter === 'LEAVE'
              ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 dark:bg-orange-950/30'
              : 'border-border bg-card hover:border-orange-400/60'
          }`}
        >
          <div className="flex w-full items-center justify-between text-xs font-medium text-orange-700 dark:text-orange-400">
            <span>On leave</span>
            <span className="size-2 rounded-full bg-orange-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-orange-700 dark:text-orange-300">
            {stats.leave}
          </div>
          <span className="mt-1 text-[11px] text-muted-foreground">Approved leave</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ABSENT')}
          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
            statusFilter === 'ABSENT'
              ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20 dark:bg-rose-950/30'
              : 'border-border bg-card hover:border-rose-400/60'
          }`}
        >
          <div className="flex w-full items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-400">
            <span>Absent</span>
            <span className="size-2 rounded-full bg-rose-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-rose-700 dark:text-rose-300">
            {stats.absent}
          </div>
          <span className="mt-1 text-[11px] text-muted-foreground">Unplanned off</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('UNMARKED')}
          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all col-span-2 sm:col-span-1 ${
            statusFilter === 'UNMARKED'
              ? 'border-slate-500 bg-slate-50/50 ring-2 ring-slate-500/20 dark:bg-slate-900/40'
              : 'border-border bg-card hover:border-slate-400/60'
          }`}
        >
          <div className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Unmarked</span>
            <span className="size-2 rounded-full bg-slate-400" />
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-muted-foreground">
            {stats.unmarked}
          </div>
          <span className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            {stats.unmarked > 0 ? 'Needs action' : 'All done ✓'}
          </span>
        </button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="roster" className="gap-2">
            <Users className="size-4" />
            <span>Daily roster</span>
          </TabsTrigger>
          <TabsTrigger value="clock" className="gap-2">
            <Clock className="size-4" />
            <span>Self-service punch</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="size-4" />
            <span>Monthly sheet</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DAILY ROSTER & MARKING */}
        <TabsContent value="roster" className="space-y-4 outline-none">
          {/* Date Selector & Quick Jump Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => shiftDay(-1)}
                title="Previous day"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setStagedChanges({})
                  }}
                  className="h-8 w-36 text-xs font-medium"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDate(todayStr())
                    setStagedChanges({})
                  }}
                  className={`h-8 text-xs ${isSelectedDateToday ? 'bg-primary/10 text-primary font-semibold' : ''}`}
                >
                  Today
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => shiftDay(1)}
                title="Next day"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                {formatDateDisplay(selectedDate)}
              </span>
              {isSelectedDateToday ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300">
                  Live today
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Historical
                </Badge>
              )}
            </div>

            {canMark && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAllUnmarkedPresent}
                  disabled={stats.unmarked === 0 || saveBulkMutation.isPending}
                  className="h-8 gap-1.5 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  title="Mark all employees without an attendance record as Present (09:00 - 18:00)"
                >
                  <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Mark Unmarked as Present</span>
                </Button>
              </div>
            )}
          </div>

          {/* Search & Department Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, employee code, or designation…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All departments</SelectItem>
                  {departmentValues.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept.charAt(0) + dept.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {statusFilter !== 'ALL' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('ALL')}
                  className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  <span>Reset status filter</span>
                </Button>
              )}
            </div>

            {/* Batch actions when multiple rows selected */}
            {canMark && selectedEmployeeIds.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium animate-in fade-in duration-200">
                <span>{selectedEmployeeIds.length} selected:</span>
                <button
                  type="button"
                  onClick={() => handleMarkSelected('PRESENT')}
                  className="rounded px-2 py-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold transition-colors"
                >
                  Present
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => handleMarkSelected('ABSENT')}
                  className="rounded px-2 py-0.5 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-800 dark:text-rose-300 font-semibold transition-colors"
                >
                  Absent
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => handleMarkSelected('HALF_DAY')}
                  className="rounded px-2 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold transition-colors"
                >
                  Half Day
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => handleMarkSelected('WORK_FROM_HOME')}
                  className="rounded px-2 py-0.5 hover:bg-violet-100 dark:hover:bg-violet-950 text-violet-800 dark:text-violet-300 font-semibold transition-colors"
                >
                  WFH
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeIds([])}
                  className="text-muted-foreground hover:underline ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          {employeesQuery.isPending || attendanceQuery.isPending ? (
            <div className="grid gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : employeesQuery.isError ? (
            <ErrorState message="Could not load employee list." />
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl border bg-card text-center text-muted-foreground">
              <Users className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium">No employees match the current filter.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => {
                  setSearchQuery('')
                  setDepartmentFilter('ALL')
                  setStatusFilter('ALL')
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b">
                    <tr>
                      {canMark && (
                        <th className="w-10 px-3 py-3 text-center">
                          <Checkbox
                            checked={
                              filteredEmployees.length > 0 &&
                              selectedEmployeeIds.length === filteredEmployees.length
                            }
                            indeterminate={
                              selectedEmployeeIds.length > 0 &&
                              selectedEmployeeIds.length < filteredEmployees.length
                            }
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            aria-label="Select all employees"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 text-left font-semibold">Employee</th>
                      <th className="px-3 py-3 text-left font-semibold">Saved</th>
                      {canMark && (
                        <th className="px-3 py-3 text-left font-semibold">Quick mark</th>
                      )}
                      <th className="px-3 py-3 text-left font-semibold">Check In</th>
                      <th className="px-3 py-3 text-left font-semibold">Check Out</th>
                      <th className="px-3 py-3 text-left font-semibold">Leave type / note</th>
                      {canMark && (
                        <th className="px-3 py-3 text-right font-semibold">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmployees.map((emp) => {
                      const savedRec = attendanceMap.get(emp.id)
                      const staged = stagedChanges[emp.id]
                      const activeType = staged?.type ?? savedRec?.type
                      const isStaged = !!staged
                      const isSelected = selectedEmployeeIds.includes(emp.id)

                      const checkInVal = staged?.checkIn ?? savedRec?.checkIn ?? ''
                      const checkOutVal = staged?.checkOut ?? savedRec?.checkOut ?? ''
                      const leaveTypeVal = staged?.leaveType ?? savedRec?.leaveType ?? ''

                      return (
                        <tr
                          key={emp.id}
                          className={`transition-colors hover:bg-muted/30 ${
                            isStaged ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                          } ${isSelected ? 'bg-primary/5' : ''}`}
                        >
                          {canMark && (
                            <td className="px-3 py-3 text-center">
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => toggleSelectOne(emp.id, e.target.checked)}
                                aria-label={`Select ${emp.fullName || emp.designation}`}
                              />
                            </td>
                          )}

                          {/* Employee info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                                {(emp.fullName || emp.designation || 'E').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate">
                                  {emp.fullName || emp.designation}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <span className="font-mono">{emp.employeeCode}</span>
                                  <span>·</span>
                                  <DepartmentBadge department={emp.department} />
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Current Saved Status */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            {savedRec ? (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                                  ATTENDANCE_CONFIG[savedRec.type]?.bgColor
                                } ${ATTENDANCE_CONFIG[savedRec.type]?.color} ${
                                  ATTENDANCE_CONFIG[savedRec.type]?.borderColor
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    savedRec.type === 'PRESENT'
                                      ? 'bg-emerald-500'
                                      : savedRec.type === 'ABSENT'
                                      ? 'bg-rose-500'
                                      : savedRec.type === 'HALF_DAY'
                                      ? 'bg-amber-500'
                                      : savedRec.type === 'WORK_FROM_HOME'
                                      ? 'bg-violet-500'
                                      : 'bg-blue-500'
                                  }`}
                                />
                                {ATTENDANCE_CONFIG[savedRec.type]?.label ?? savedRec.type}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                                <span className="size-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                Not marked
                              </span>
                            )}
                          </td>

                          {/* Quick Mark Pill Buttons */}
                          {canMark && (
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap items-center gap-1">
                                {(['PRESENT', 'ABSENT', 'HALF_DAY', 'WORK_FROM_HOME', 'LEAVE'] as AttendanceType[]).map(
                                  (type) => {
                                    const isChosen = activeType === type
                                    const cfg = ATTENDANCE_CONFIG[type]
                                    return (
                                      <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleQuickStatus(emp, type)}
                                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                                          isChosen
                                            ? `${cfg.bgColor} ${cfg.color} border ${cfg.borderColor} font-bold shadow-xs`
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                        title={`Mark ${cfg.label}`}
                                      >
                                        {cfg.short}
                                      </button>
                                    )
                                  },
                                )}
                              </div>
                            </td>
                          )}

                          {/* Check-in time */}
                          <td className="px-3 py-3">
                            <Input
                              type="time"
                              disabled={!canMark}
                              value={checkInVal}
                              onChange={(e) => setEmployeeStage(emp.id, { checkIn: e.target.value })}
                              className="h-7 w-24 text-xs font-mono"
                            />
                          </td>

                          {/* Check-out time */}
                          <td className="px-3 py-3">
                            <Input
                              type="time"
                              disabled={!canMark}
                              value={checkOutVal}
                              onChange={(e) => setEmployeeStage(emp.id, { checkOut: e.target.value })}
                              className="h-7 w-24 text-xs font-mono"
                            />
                          </td>

                          {/* Leave Type or Note */}
                          <td className="px-3 py-3">
                            {activeType === 'LEAVE' ? (
                              <Select
                                value={leaveTypeVal}
                                onValueChange={(val) =>
                                  setEmployeeStage(emp.id, { leaveType: val as LeaveType })
                                }
                                disabled={!canMark}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue placeholder="Leave type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {leaveTypeValues.map((lt) => (
                                    <SelectItem key={lt} value={lt}>
                                      {lt.charAt(0) + lt.slice(1).toLowerCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type="text"
                                placeholder="Optional note…"
                                disabled={!canMark}
                                value={staged?.notes ?? savedRec?.notes ?? ''}
                                onChange={(e) => setEmployeeStage(emp.id, { notes: e.target.value })}
                                className="h-7 w-32 text-xs"
                              />
                            )}
                          </td>

                          {/* Row Actions */}
                          {canMark && (
                            <td className="px-3 py-3 text-right">
                              {isStaged ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      saveBulkMutation.mutate([{ employeeId: emp.id, entry: staged }])
                                    }
                                    disabled={saveBulkMutation.isPending}
                                    className="h-7 px-2 text-[11px]"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setStagedChanges((prev) => {
                                        const next = { ...prev }
                                        delete next[emp.id]
                                        return next
                                      })
                                    }}
                                    className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
                                    title="Discard change"
                                  >
                                    <RotateCcw className="size-3" />
                                  </Button>
                                </div>
                              ) : savedRec ? (
                                <span className="text-[11px] text-muted-foreground">Saved</span>
                              ) : null}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sticky Bottom Save Floating Bar */}
          {canMark && stagedCount > 0 && (
            <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50/95 p-3.5 shadow-lg backdrop-blur-md dark:border-amber-800 dark:bg-amber-950/90 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-medium">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>{stagedCount}</strong> unsaved attendance change{stagedCount === 1 ? '' : 's'} for{' '}
                  <strong>{formatDateDisplay(selectedDate)}</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStagedChanges({})}
                  className="h-8 text-xs border-amber-300 dark:border-amber-700"
                >
                  Discard all
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => saveBulkMutation.mutate()}
                  disabled={saveBulkMutation.isPending}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCheck className="size-3.5" />
                  <span>{saveBulkMutation.isPending ? 'Saving…' : `Save All Changes (${stagedCount})`}</span>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SELF-SERVICE QUICK PUNCH CLOCK */}
        <TabsContent value="clock" className="space-y-6 outline-none">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Live Clock Card */}
            <Card className="rounded-2xl border bg-gradient-to-br from-card to-muted/30 shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="size-5 text-primary" />
                  <span>Punch clock</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Big Digital Clock */}
                <div className="flex flex-col items-center justify-center rounded-2xl border bg-background/80 p-6 text-center shadow-xs">
                  <span className="text-4xl font-extrabold tracking-tight font-mono text-foreground sm:text-5xl">
                    {currentTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="mt-2 text-xs font-medium text-muted-foreground">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Current User Status */}
                {myProfileQuery.isPending ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : myProfileQuery.data ? (
                  (() => {
                    const myId = myProfileQuery.data.id
                    const myTodayRecord = attendanceMap.get(myId)
                    const nowTimeStr = `${pad(currentTime.getHours())}:${pad(currentTime.getMinutes())}`

                    return (
                      <div className="space-y-4">
                        <div className="rounded-xl border bg-card p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Your status today</span>
                            <span className="font-mono text-foreground font-semibold">
                              {myProfileQuery.data.employeeCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {myTodayRecord ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2.5 py-1">
                                <Check className="size-3 mr-1" />
                                Marked {ATTENDANCE_CONFIG[myTodayRecord.type]?.label ?? myTodayRecord.type}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Not clocked in
                              </Badge>
                            )}
                            {myTodayRecord?.checkIn && (
                              <span className="text-xs text-muted-foreground">
                                Check in: <strong className="text-foreground">{myTodayRecord.checkIn}</strong>
                              </span>
                            )}
                            {myTodayRecord?.checkOut && (
                              <span className="text-xs text-muted-foreground">
                                Check out: <strong className="text-foreground">{myTodayRecord.checkOut}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            size="lg"
                            variant="default"
                            disabled={singleMarkMutation.isPending}
                            onClick={() =>
                              singleMarkMutation.mutate({
                                employeeId: myId,
                                type: 'PRESENT',
                                checkIn: myTodayRecord?.checkIn || nowTimeStr,
                                checkOut: myTodayRecord ? nowTimeStr : undefined,
                              })
                            }
                            className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-xs"
                          >
                            <Building2 className="size-4" />
                            <span>{myTodayRecord ? 'Clock out (office)' : 'Clock in (office)'}</span>
                          </Button>

                          <Button
                            size="lg"
                            variant="outline"
                            disabled={singleMarkMutation.isPending}
                            onClick={() =>
                              singleMarkMutation.mutate({
                                employeeId: myId,
                                type: 'WORK_FROM_HOME',
                                checkIn: myTodayRecord?.checkIn || nowTimeStr,
                                checkOut: myTodayRecord ? nowTimeStr : undefined,
                              })
                            }
                            className="h-12 border-violet-300 text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 font-semibold gap-2 shadow-xs"
                          >
                            <Home className="size-4 text-violet-600" />
                            <span>Clock in (WFH)</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    No employee profile linked for punching. Link your user account in Workforce Management.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Attendance Rules & Guidelines Card */}
            <Card className="rounded-xl border bg-card shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground">
                <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                  <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-foreground">Standard hours</h5>
                    <p className="mt-0.5">09:00 AM – 06:00 PM (8.5 hours active + 30 min meal break).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                  <SunMedium className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-foreground">Half-day rule</h5>
                    <p className="mt-0.5">Half-day credit needs at least 4.5 hours before punch-out.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                  <Coffee className="size-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-foreground">Leave requests</h5>
                    <p className="mt-0.5">Submit planned leave to HR at least 24 hours ahead.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: MONTHLY SHEET & REPORTS */}
        <TabsContent value="calendar" className="space-y-6 outline-none">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Select employee</Label>
                <Select value={monthlyEmployeeId} onValueChange={setMonthlyEmployeeId}>
                  <SelectTrigger className="h-9 w-60 text-xs">
                    <SelectValue placeholder="Choose employee…" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName || emp.designation} ({emp.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Navigation */}
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Month & year</Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-2"
                    onClick={() => {
                      if (monthlyMonth === 1) {
                        setMonthlyYear((y) => y - 1)
                        setMonthlyMonth(12)
                      } else {
                        setMonthlyMonth((m) => m - 1)
                      }
                    }}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-[120px] text-center font-semibold text-xs text-foreground">
                    {new Date(monthlyYear, monthlyMonth - 1, 1).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-2"
                    onClick={() => {
                      if (monthlyMonth === 12) {
                        setMonthlyYear((y) => y + 1)
                        setMonthlyMonth(1)
                      } else {
                        setMonthlyMonth((m) => m + 1)
                      }
                    }}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportMonthlyCsv}
              disabled={!monthlyEmployeeId || (monthlyAttendanceQuery.data || []).length === 0}
              className="h-9 gap-1.5 text-xs"
            >
              <Download className="size-4" />
              <span>Export monthly report</span>
            </Button>
          </div>

          {/* Monthly Summary & Calendar Grid */}
          {monthlySummaryQuery.data && (
            <AttendanceSummaryCard summary={monthlySummaryQuery.data} />
          )}

          {monthlyAttendanceQuery.isPending ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : monthlyAttendanceQuery.isError ? (
            <ErrorState message="Could not load the monthly attendance sheet." />
          ) : (
            <AttendanceCalendar
              year={monthlyYear}
              month={monthlyMonth}
              records={monthlyAttendanceQuery.data || []}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
