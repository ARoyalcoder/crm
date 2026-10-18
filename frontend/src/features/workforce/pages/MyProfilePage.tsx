import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { User } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { workforceApi } from '../api'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import { AttendanceSummaryCard } from '../components/AttendanceSummaryCard'
import { DepartmentBadge } from '../components/DepartmentBadge'
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge'
import { LeaveBalanceCard } from '../components/LeaveBalanceCard'

export function MyProfilePage() {
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1)

  const profile = useQuery(workforceApi.meQuery())
  const attendance = useQuery(workforceApi.myAttendanceQuery(calYear, calMonth))
  const leaveBalances = useQuery(
    workforceApi.leaveBalancesQuery(profile.data?.id ?? '', calYear),
  )
  const summary = useQuery(
    workforceApi.attendanceSummaryQuery(
      profile.data?.id ?? '',
      `${calYear}-01-01`,
      `${calYear}-12-31`,
    ),
  )

  if (profile.isPending) return <Skeleton className="h-64 rounded-lg" />
  if (profile.isError || !profile.data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl border bg-card text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="size-14 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2B66FE] flex items-center justify-center mb-4">
          <User className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Employee not found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No employee profile is linked to your account. Contact HR to set up your details.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => profile.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const emp = profile.data
  const monthName = new Date(calYear, calMonth - 1, 1).toLocaleString('default', { month: 'long' })

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12) }
    else setCalMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1) }
    else setCalMonth((m) => m + 1)
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="My profile"
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-sm">{emp.employeeCode}</span>
            <DepartmentBadge department={emp.department} />
            <EmployeeStatusBadge status={emp.employmentStatus} />
          </span>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 text-sm font-medium text-muted-foreground">Profile details</div>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Employee code</dt>
                  <dd className="font-mono font-medium">{emp.employeeCode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd><DepartmentBadge department={emp.department} /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Designation</dt>
                  <dd className="font-medium">{emp.designation}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><EmployeeStatusBadge status={emp.employmentStatus} /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Joining date</dt>
                  <dd>{new Date(emp.joiningDate).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
            {emp.skills && (
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-3 text-sm font-medium text-muted-foreground">Skills</div>
                <div className="flex flex-wrap gap-2">
                  {emp.skills.split(',').map((s) => s.trim()).filter(Boolean).map((skill) => (
                    <span key={skill} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 grid gap-4">
          {summary.data && <AttendanceSummaryCard summary={summary.data} />}

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prevMonth}>&#8249;</Button>
            <span className="text-sm font-medium">{monthName} {calYear}</span>
            <Button variant="outline" size="sm" onClick={nextMonth}>&#8250;</Button>
          </div>

          {attendance.isPending ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : attendance.isError ? (
            <ErrorState message="Could not load attendance." />
          ) : (
            <AttendanceCalendar year={calYear} month={calMonth} records={attendance.data ?? []} />
          )}
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          {leaveBalances.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : leaveBalances.isError ? (
            <ErrorState message="Could not load leave balances." />
          ) : (leaveBalances.data?.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No leave balances for {calYear}.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leaveBalances.data!.map((lb) => (
                <LeaveBalanceCard key={lb.id} balance={lb} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
