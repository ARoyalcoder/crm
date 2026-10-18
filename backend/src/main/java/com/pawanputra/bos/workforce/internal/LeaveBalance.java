package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.workforce.api.LeaveType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Annual leave allocation and usage for one employee and leave type.
 * {@code remaining} is always derived: allocated − used.
 */
@Entity
@Table(name = "leave_balances")
public class LeaveBalance {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "year", nullable = false)
    private int year;

    @Enumerated(EnumType.STRING)
    @Column(name = "leave_type", nullable = false, length = 20)
    private LeaveType leaveType;

    @Column(name = "allocated", nullable = false)
    private int allocated;

    @Column(name = "used", nullable = false)
    private int used;

    protected LeaveBalance() {
        // for JPA
    }

    public LeaveBalance(UUID organizationId, UUID employeeId, int year, LeaveType leaveType, int allocated) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.employeeId = employeeId;
        this.year = year;
        this.leaveType = leaveType;
        this.allocated = allocated;
        this.used = 0;
    }

    /** Remaining leave: allocated minus used. */
    public int getRemaining() {
        return Math.max(0, allocated - used);
    }

    public void setAllocated(int allocated) { this.allocated = allocated; }
    public void setUsed(int used) { this.used = Math.max(0, used); }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getEmployeeId() { return employeeId; }
    public int getYear() { return year; }
    public LeaveType getLeaveType() { return leaveType; }
    public int getAllocated() { return allocated; }
    public int getUsed() { return used; }
}
