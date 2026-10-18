-- Workforce Management: employee profiles, attendance tracking, and leave balances.
--
-- Supports:
--   - Employee profiles linked to existing users (extends User with work-specific data)
--   - Daily attendance records with check-in/check-out and working hours
--   - Leave balances per employee per year per leave type
--
-- Tables:
--   employee_profiles
--   attendance_records
--   leave_balances

CREATE TABLE employee_profiles (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    user_id             uuid          NOT NULL,
    employee_code       varchar(20)   NOT NULL,
    department          varchar(30)   NOT NULL,
    designation         varchar(150)  NOT NULL,
    joining_date        date          NOT NULL,
    manager_id          uuid,
    skills              text,
    employment_status   varchar(20)   NOT NULL DEFAULT 'PROBATION',
    created_at          timestamptz   NOT NULL DEFAULT now(),
    created_by          varchar(100)  NOT NULL,
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    updated_by          varchar(100)  NOT NULL,
    version             bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_employee_profiles PRIMARY KEY (id),
    CONSTRAINT uq_employee_user UNIQUE (user_id),
    CONSTRAINT uq_employee_code UNIQUE (organization_id, employee_code),
    CONSTRAINT fk_employee_manager FOREIGN KEY (manager_id) REFERENCES employee_profiles (id),
    CONSTRAINT ck_employment_status CHECK (employment_status IN (
        'ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED', 'PROBATION'
    )),
    CONSTRAINT ck_department CHECK (department IN (
        'SALES', 'MARKETING', 'TECHNICAL', 'DESIGN', 'MANAGEMENT',
        'FINANCE', 'HR', 'OPERATIONS', 'OTHER'
    ))
);

CREATE INDEX ix_employee_org ON employee_profiles (organization_id);
CREATE INDEX ix_employee_department ON employee_profiles (organization_id, department);
CREATE INDEX ix_employee_manager ON employee_profiles (manager_id);
CREATE INDEX ix_employee_status ON employee_profiles (organization_id, employment_status);

CREATE TABLE attendance_records (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    employee_id         uuid          NOT NULL,
    attendance_date     date          NOT NULL,
    type                varchar(20)   NOT NULL,
    check_in            time,
    check_out           time,
    working_hours       double precision,
    leave_type          varchar(20),
    notes               text,
    marked_by           uuid,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_attendance_records PRIMARY KEY (id),
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, attendance_date),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles (id),
    CONSTRAINT ck_attendance_type CHECK (type IN (
        'PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WORK_FROM_HOME'
    )),
    CONSTRAINT ck_leave_type CHECK (leave_type IS NULL OR leave_type IN (
        'ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'COMPENSATORY'
    ))
);

CREATE INDEX ix_attendance_org_date ON attendance_records (organization_id, attendance_date DESC);
CREATE INDEX ix_attendance_employee ON attendance_records (employee_id, attendance_date DESC);

CREATE TABLE leave_balances (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    employee_id         uuid          NOT NULL,
    year                integer       NOT NULL,
    leave_type          varchar(20)   NOT NULL,
    allocated           integer       NOT NULL DEFAULT 0,
    used                integer       NOT NULL DEFAULT 0,
    CONSTRAINT pk_leave_balances PRIMARY KEY (id),
    CONSTRAINT uq_leave_balance_employee_year_type UNIQUE (employee_id, year, leave_type),
    CONSTRAINT fk_leave_balance_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles (id),
    CONSTRAINT ck_leave_balance_type CHECK (leave_type IN (
        'ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'COMPENSATORY'
    )),
    CONSTRAINT ck_leave_allocated_positive CHECK (allocated >= 0),
    CONSTRAINT ck_leave_used_positive CHECK (used >= 0)
);

CREATE INDEX ix_leave_balance_employee ON leave_balances (employee_id, year);

-- Permissions
INSERT INTO permissions (code, name) VALUES
    ('WORKFORCE_VIEW',   'View employee profiles, attendance and leave balances'),
    ('WORKFORCE_CREATE', 'Create employee profiles and mark attendance'),
    ('WORKFORCE_UPDATE', 'Update employee profiles and attendance records'),
    ('WORKFORCE_DELETE', 'Delete employee profiles and attendance records');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'WORKFORCE_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HR', 'PROJECT_MANAGER', 'SALES_MANAGER', 'TECHNICIAN', 'SUPPORT_AGENT'))
   OR (p.code = 'WORKFORCE_CREATE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'HR'))
   OR (p.code = 'WORKFORCE_UPDATE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'HR'))
   OR (p.code = 'WORKFORCE_DELETE' AND r.code IN ('SUPER_ADMIN', 'ADMIN'));
