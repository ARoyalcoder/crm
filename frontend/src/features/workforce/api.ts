import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

// Enums
export const employmentStatusValues = ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED', 'PROBATION'] as const
export type EmploymentStatus = (typeof employmentStatusValues)[number]

export const attendanceTypeValues = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WORK_FROM_HOME'] as const
export type AttendanceType = (typeof attendanceTypeValues)[number]

export const leaveTypeValues = ['ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'COMPENSATORY'] as const
export type LeaveType = (typeof leaveTypeValues)[number]

export const departmentValues = [
  'SALES',
  'MARKETING',
  'TECHNICAL',
  'DESIGN',
  'MANAGEMENT',
  'FINANCE',
  'HR',
  'OPERATIONS',
  'OTHER',
] as const
export type WorkforceDepartment = (typeof departmentValues)[number]

// Schemas
export const employeeProfileSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  fullName: z.string().nullish(),
  email: z.string().nullish(),
  employeeCode: z.string(),
  department: z.enum(departmentValues),
  designation: z.string(),
  joiningDate: z.string(),
  managerId: z.string().nullish(),
  skills: z.string().nullish(),
  employmentStatus: z.enum(employmentStatusValues),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
})
export type EmployeeProfile = z.infer<typeof employeeProfileSchema>

export const attendanceRecordSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  attendanceDate: z.string(),
  type: z.enum(attendanceTypeValues),
  checkIn: z.string().nullish(),
  checkOut: z.string().nullish(),
  workingHours: z.number().nullish(),
  leaveType: z.enum(leaveTypeValues).nullish(),
  notes: z.string().nullish(),
  markedBy: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>

export const attendanceSummarySchema = z.object({
  presentDays: z.number(),
  absentDays: z.number(),
  leaveDays: z.number(),
  halfDays: z.number(),
  holidayDays: z.number(),
  workFromHomeDays: z.number(),
  totalWorkingHours: z.number(),
})
export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>

export const leaveBalanceSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  year: z.number(),
  leaveType: z.enum(leaveTypeValues),
  allocated: z.number(),
  used: z.number(),
  remaining: z.number(),
})
export type LeaveBalance = z.infer<typeof leaveBalanceSchema>

// Query Options
export const workforceApi = {
  listQuery: (params: {
    department?: WorkforceDepartment
    status?: EmploymentStatus
    managerId?: string
  } = {}) =>
    queryOptions({
      queryKey: ['employees', params],
      queryFn: () => {
        const parts: string[] = []
        if (params.department) parts.push(`department=${params.department}`)
        if (params.status) parts.push(`status=${params.status}`)
        if (params.managerId) parts.push(`managerId=${params.managerId}`)
        const qs = parts.length ? `?${parts.join('&')}` : ''
        return apiRequest(`/api/v1/employees${qs}`, z.array(employeeProfileSchema))
      },
    }),

  detailQuery: (id: string) =>
    queryOptions({
      queryKey: ['employees', id],
      queryFn: () => apiRequest(`/api/v1/employees/${id}`, employeeProfileSchema),
      enabled: Boolean(id),
    }),

  meQuery: () =>
    queryOptions({
      queryKey: ['employees', 'me'],
      queryFn: () => apiRequest('/api/v1/employees/me', employeeProfileSchema),
    }),

  teamQuery: (id: string) =>
    queryOptions({
      queryKey: ['employees', id, 'team'],
      queryFn: () => apiRequest(`/api/v1/employees/${id}/team`, z.array(employeeProfileSchema)),
      enabled: Boolean(id),
    }),

  attendanceQuery: (id: string, year: number, month: number) =>
    queryOptions({
      queryKey: ['employees', id, 'attendance', year, month],
      queryFn: () =>
        apiRequest(
          `/api/v1/employees/${id}/attendance?year=${year}&month=${month}`,
          z.array(attendanceRecordSchema),
        ),
      enabled: Boolean(id),
    }),

  attendanceSummaryQuery: (id: string, fromDate: string, toDate: string) =>
    queryOptions({
      queryKey: ['employees', id, 'attendance', 'summary', fromDate, toDate],
      queryFn: () =>
        apiRequest(
          `/api/v1/employees/${id}/attendance/summary?fromDate=${fromDate}&toDate=${toDate}`,
          attendanceSummarySchema,
        ),
      enabled: Boolean(id) && Boolean(fromDate) && Boolean(toDate),
    }),

  myAttendanceQuery: (year: number, month: number) =>
    queryOptions({
      queryKey: ['employees', 'me', 'attendance', year, month],
      queryFn: () =>
        apiRequest(`/api/v1/employees/me/attendance?year=${year}&month=${month}`, z.array(attendanceRecordSchema)),
    }),

  leaveBalancesQuery: (id: string, year: number) =>
    queryOptions({
      queryKey: ['employees', id, 'leave-balances', year],
      queryFn: () =>
        apiRequest(`/api/v1/employees/${id}/leave-balances?year=${year}`, z.array(leaveBalanceSchema)),
      enabled: Boolean(id),
    }),

  todayAttendanceQuery: (date?: string) =>
    queryOptions({
      queryKey: ['attendance', 'today', date],
      queryFn: () => {
        const qs = date ? `?date=${date}` : ''
        return apiRequest(`/api/v1/attendance/today${qs}`, z.array(attendanceRecordSchema))
      },
    }),

  teamAttendanceQuery: (managerId?: string, date?: string) =>
    queryOptions({
      queryKey: ['attendance', 'team', managerId, date],
      queryFn: () => {
        const parts: string[] = []
        if (managerId) parts.push(`managerId=${managerId}`)
        if (date) parts.push(`date=${date}`)
        const qs = parts.length ? `?${parts.join('&')}` : ''
        return apiRequest(`/api/v1/attendance/team${qs}`, z.array(attendanceRecordSchema))
      },
    }),

  // Mutations
  createEmployee: async (data: {
    userId: string
    department: WorkforceDepartment
    designation: string
    joiningDate?: string
    managerId?: string
    skills?: string
    employmentStatus?: EmploymentStatus
  }) => {
    return apiRequest('/api/v1/employees', employeeProfileSchema, {
      method: 'POST',
      body: data,
    })
  },

  updateEmployee: async (
    id: string,
    data: {
      department: WorkforceDepartment
      designation: string
      joiningDate?: string
      managerId?: string
      skills?: string
      employmentStatus?: EmploymentStatus
    },
  ) => {
    return apiRequest(`/api/v1/employees/${id}`, employeeProfileSchema, {
      method: 'PUT',
      body: data,
    })
  },

  markAttendance: async (
    employeeId: string,
    data: {
      date: string
      type: AttendanceType
      checkIn?: string
      checkOut?: string
      leaveType?: LeaveType
      notes?: string
    },
  ) => {
    return apiRequest(`/api/v1/attendance?employeeId=${employeeId}`, attendanceRecordSchema, {
      method: 'POST',
      body: data,
    })
  },

  bulkMarkAttendance: async (data: {
    date: string
    records: Array<{
      employeeId: string
      type: AttendanceType
      checkIn?: string
      checkOut?: string
      leaveType?: LeaveType
      notes?: string
    }>
  }) => {
    return apiRequest('/api/v1/attendance/bulk', z.array(attendanceRecordSchema), {
      method: 'POST',
      body: data,
    })
  },

  updateLeaveBalance: async (
    employeeId: string,
    leaveType: LeaveType,
    data: { allocated: number; used: number },
  ) => {
    return apiRequest(`/api/v1/employees/${employeeId}/leave-balances/${leaveType}`, leaveBalanceSchema, {
      method: 'PUT',
      body: data,
    })
  },
}
