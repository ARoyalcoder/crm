package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.workforce.api.EmploymentStatus;
import com.pawanputra.bos.workforce.api.WorkforceDepartment;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EmployeeProfileService {

    private final EmployeeProfileRepository employees;
    private final LeaveBalanceService leaveBalances;

    public EmployeeProfileService(EmployeeProfileRepository employees, LeaveBalanceService leaveBalances) {
        this.employees = employees;
        this.leaveBalances = leaveBalances;
    }

    // --- Command records ---

    public record CreateProfileCmd(
            UUID userId,
            WorkforceDepartment department,
            String designation,
            LocalDate joiningDate,
            UUID managerId,
            String skills,
            EmploymentStatus employmentStatus) {
    }

    public record UpdateProfileCmd(
            WorkforceDepartment department,
            String designation,
            LocalDate joiningDate,
            UUID managerId,
            String skills,
            EmploymentStatus employmentStatus) {
    }

    // --- Queries ---

    @Transactional(readOnly = true)
    public EmployeeProfile getById(UUID organizationId, UUID id) {
        return employees.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeProfile", id));
    }

    @Transactional(readOnly = true)
    public EmployeeProfile getByUserId(UUID organizationId, UUID userId) {
        return employees.findByUserIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeProfile for user", userId));
    }

    public EmployeeProfile getOrCreateByUserId(UUID organizationId, UUID userId, String userEmail) {
        return employees.findByUserIdAndOrganizationId(userId, organizationId)
                .orElseGet(() -> {
                    String code = generateEmployeeCode(organizationId);
                    WorkforceDepartment dept = WorkforceDepartment.MANAGEMENT;
                    String designation = "Team Member";
                    if (userEmail != null) {
                        String lower = userEmail.toLowerCase();
                        if (lower.contains("superadmin") || lower.contains("admin")) {
                            dept = WorkforceDepartment.MANAGEMENT;
                            designation = "Super Administrator";
                        } else if (lower.contains("sales")) {
                            dept = WorkforceDepartment.SALES;
                            designation = "Sales Specialist";
                        } else if (lower.contains("design")) {
                            dept = WorkforceDepartment.DESIGN;
                            designation = "Designer";
                        } else if (lower.contains("tech")) {
                            dept = WorkforceDepartment.TECHNICAL;
                            designation = "Technical Specialist";
                        } else if (lower.contains("finance")) {
                            dept = WorkforceDepartment.FINANCE;
                            designation = "Finance Executive";
                        } else if (lower.contains("hr")) {
                            dept = WorkforceDepartment.HR;
                            designation = "HR Executive";
                        } else if (lower.contains("support")) {
                            dept = WorkforceDepartment.OPERATIONS;
                            designation = "Support Specialist";
                        } else if (lower.contains("director")) {
                            dept = WorkforceDepartment.MANAGEMENT;
                            designation = "Director";
                        }
                    }
                    EmployeeProfile profile = new EmployeeProfile(
                            organizationId,
                            userId,
                            code,
                            dept,
                            designation,
                            LocalDate.now(),
                            null,
                            "Business Operations",
                            EmploymentStatus.ACTIVE,
                            "system");
                    EmployeeProfile saved = employees.save(profile);
                    try {
                        leaveBalances.initializeLeaveBalances(organizationId, saved.getId(), LocalDate.now().getYear());
                    } catch (Exception ignored) {
                    }
                    return saved;
                });
    }

    @Transactional(readOnly = true)
    public List<EmployeeProfile> listAll(UUID organizationId) {
        return employees.findAllByOrganizationIdOrderByEmployeeCodeAsc(organizationId);
    }

    @Transactional(readOnly = true)
    public List<EmployeeProfile> listByDepartment(UUID organizationId, WorkforceDepartment department) {
        return employees.findAllByOrganizationIdAndDepartmentOrderByEmployeeCodeAsc(organizationId, department);
    }

    @Transactional(readOnly = true)
    public List<EmployeeProfile> listByStatus(UUID organizationId, EmploymentStatus status) {
        return employees.findAllByOrganizationIdAndEmploymentStatusOrderByEmployeeCodeAsc(organizationId, status);
    }

    @Transactional(readOnly = true)
    public List<EmployeeProfile> listByManager(UUID managerId) {
        return employees.findAllByManagerIdOrderByEmployeeCodeAsc(managerId);
    }

    @Transactional(readOnly = true)
    public List<EmployeeProfile> getEmployeeTeam(UUID managerId) {
        return employees.findAllByManagerIdOrderByEmployeeCodeAsc(managerId);
    }

    // --- Mutations ---

    public EmployeeProfile createProfile(UUID organizationId, CreateProfileCmd cmd, String actor) {
        if (employees.existsByUserId(cmd.userId())) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "An employee profile already exists for user " + cmd.userId());
        }
        String code = generateEmployeeCode(organizationId);
        EmployeeProfile profile = new EmployeeProfile(
                organizationId,
                cmd.userId(),
                code,
                cmd.department(),
                cmd.designation(),
                cmd.joiningDate() != null ? cmd.joiningDate() : LocalDate.now(),
                cmd.managerId(),
                cmd.skills(),
                cmd.employmentStatus(),
                actor);
        return employees.save(profile);
    }

    public EmployeeProfile updateProfile(UUID organizationId, UUID id, UpdateProfileCmd cmd, String actor) {
        EmployeeProfile profile = getById(organizationId, id);
        profile.setDepartment(cmd.department());
        profile.setDesignation(cmd.designation());
        if (cmd.joiningDate() != null) {
            profile.setJoiningDate(cmd.joiningDate());
        }
        profile.setManagerId(cmd.managerId());
        profile.setSkills(cmd.skills());
        if (cmd.employmentStatus() != null) {
            profile.setEmploymentStatus(cmd.employmentStatus());
        }
        profile.setUpdatedAt(java.time.Instant.now());
        profile.setUpdatedBy(actor);
        return employees.save(profile);
    }

    private String generateEmployeeCode(UUID organizationId) {
        List<String> codes = employees.findAllEmployeeCodesByOrgId(organizationId);
        int next = 1;
        for (String code : codes) {
            if (code != null && code.startsWith("EMP-")) {
                try {
                    int num = Integer.parseInt(code.substring(4));
                    if (num >= next) {
                        next = num + 1;
                    }
                } catch (NumberFormatException ignored) {
                    // skip malformed codes
                }
            }
        }
        return "EMP-%03d".formatted(next);
    }
}
