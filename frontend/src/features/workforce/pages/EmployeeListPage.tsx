import { useQuery } from '@tanstack/react-query'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/features/auth/auth-context'
import {
  departmentValues,
  employmentStatusValues,
  workforceApi,
  type WorkforceDepartment,
  type EmploymentStatus,
} from '../api'
import { DepartmentBadge } from '../components/DepartmentBadge'
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge'

export function EmployeeListPage() {
  const canCreate = useHasPermission('WORKFORCE_CREATE')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<WorkforceDepartment | ''>('')
  const [status, setStatus] = useState<EmploymentStatus | ''>('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')

  const employees = useQuery(
    workforceApi.listQuery({
      department: department || undefined,
      status: status || undefined,
    }),
  )

  const filtered =
    employees.data?.filter((e) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        e.employeeCode.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      )
    }) ?? []

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Employees"
        description="Profiles, departments and employment status."
        action={
          canCreate ? (
            <Button asChild>
              <Link to="/workforce/employees/new">
                <Plus aria-hidden="true" />
                Add employee
              </Link>
            </Button>
          ) : null
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search employees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {(() => {
          const deptItems = [
            { label: 'All departments', value: '' },
            ...departmentValues.map((d) => ({
              label: d.charAt(0) + d.slice(1).toLowerCase(),
              value: d,
            })),
          ]
          return (
            <Select
              items={deptItems}
              value={department}
              onValueChange={(v) => setDepartment(v as WorkforceDepartment | '')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {deptItems.map((item) => (
                    <SelectItem key={item.value || '__all'} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )
        })()}

        {(() => {
          const statusItems = [
            { label: 'Any status', value: '' },
            ...employmentStatusValues.map((s) => ({
              label: s.replace('_', ' '),
              value: s,
            })),
          ]
          return (
            <Select
              items={statusItems}
              value={status}
              onValueChange={(v) => setStatus(v as EmploymentStatus | '')}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value || '__any'} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )
        })()}
        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('card')}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {employees.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : employees.isError ? (
        <ErrorState message="Could not load employees." onRetry={() => employees.refetch()} />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No employees found.</div>
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <Link
              key={emp.id}
              to={`/workforce/employees/${emp.id}`}
              className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">{emp.employeeCode}</div>
                  <div className="font-medium leading-tight">{emp.designation}</div>
                </div>
                <EmployeeStatusBadge status={emp.employmentStatus} />
              </div>
              <div className="flex items-center gap-2">
                <DepartmentBadge department={emp.department} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Joined {new Date(emp.joiningDate).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-left font-medium">Designation</th>
                <th className="px-4 py-2 text-left font-medium">Department</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{emp.employeeCode}</td>
                  <td className="px-4 py-2">
                    <Link to={`/workforce/employees/${emp.id}`} className="font-medium hover:underline">
                      {emp.designation}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <DepartmentBadge department={emp.department} />
                  </td>
                  <td className="px-4 py-2">
                    <EmployeeStatusBadge status={emp.employmentStatus} />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(emp.joiningDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
