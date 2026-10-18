import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  departmentValues,
  employmentStatusValues,
  workforceApi,
  type EmploymentStatus,
  type WorkforceDepartment,
} from '../api'

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({ ...workforceApi.detailQuery(id!), enabled: isEdit })

  const [userId, setUserId] = useState('')
  const [department, setDepartment] = useState<WorkforceDepartment>('TECHNICAL')
  const [designation, setDesignation] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [managerId, setManagerId] = useState('')
  const [skills, setSkills] = useState('')
  const [status, setStatus] = useState<EmploymentStatus>('PROBATION')
  const [error, setError] = useState<string | null>(null)

  const [syncedData, setSyncedData] = useState(existing.data)
  if (existing.data && existing.data !== syncedData) {
    const e = existing.data
    setSyncedData(e)
    setDepartment(e.department)
    setDesignation(e.designation)
    setJoiningDate(e.joiningDate)
    setManagerId(e.managerId ?? '')
    setSkills(e.skills ?? '')
    setStatus(e.employmentStatus)
  }

  const createMut = useMutation({
    mutationFn: () =>
      workforceApi.createEmployee({
        userId,
        department,
        designation,
        joiningDate: joiningDate || undefined,
        managerId: managerId || undefined,
        skills: skills || undefined,
        employmentStatus: status,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate(`/workforce/employees/${data.id}`)
    },
    onError: () => setError('Could not create employee profile.'),
  })

  const updateMut = useMutation({
    mutationFn: () =>
      workforceApi.updateEmployee(id!, {
        department,
        designation,
        joiningDate: joiningDate || undefined,
        managerId: managerId || undefined,
        skills: skills || undefined,
        employmentStatus: status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate(`/workforce/employees/${id}`)
    },
    onError: () => setError('Could not update employee profile.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (isEdit) updateMut.mutate()
    else createMut.mutate()
  }

  if (isEdit && existing.isPending) return <Skeleton className="h-64 rounded-lg" />
  if (isEdit && existing.isError) return <ErrorState message="Could not load employee." />

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="grid gap-4">
      <PageHeader
        title={isEdit ? 'Edit employee profile' : 'Add employee profile'}
        description={isEdit ? 'Update work-specific details for this employee.' : 'Link an existing user to an employee profile.'}
        action={
          <Button variant="ghost" asChild>
            <Link to={isEdit ? `/workforce/employees/${id}` : '/workforce/employees'}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="grid max-w-lg gap-5">
        {!isEdit && (
          <div className="grid gap-1.5">
            <Label htmlFor="userId">User ID *</Label>
            <Input
              id="userId"
              placeholder="UUID of existing user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="designation">Designation *</Label>
          <Input
            id="designation"
            placeholder="e.g. Senior Technician"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            required
            maxLength={150}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Department *</Label>
          {(() => {
            const deptItems = departmentValues.map((d) => ({
              label: d.charAt(0) + d.slice(1).toLowerCase().replace('_', ' '),
              value: d,
            }))
            return (
              <Select
                items={deptItems}
                value={department}
                onValueChange={(v) => setDepartment(v as WorkforceDepartment)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {deptItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )
          })()}
        </div>

        <div className="grid gap-1.5">
          <Label>Employment status</Label>
          {(() => {
            const statusItems = employmentStatusValues.map((s) => ({
              label: s.replace('_', ' '),
              value: s,
            }))
            return (
              <Select
                items={statusItems}
                value={status}
                onValueChange={(v) => setStatus(v as EmploymentStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statusItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )
          })()}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="joiningDate">Joining date</Label>
          <Input
            id="joiningDate"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="managerId">Manager employee ID</Label>
          <Input
            id="managerId"
            placeholder="UUID of manager's employee profile (optional)"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="skills">Skills</Label>
          <Input
            id="skills"
            placeholder="Comma-separated, e.g. React, Java, Sales"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create profile'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={isEdit ? `/workforce/employees/${id}` : '/workforce/employees'}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
