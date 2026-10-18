-- Employee Performance: targets, commission rules and commission records.
--
-- Supports:
--   - Per-employee numeric targets (revenue, order count, follow-up count, etc.) per period
--   - Commission rules (percentage or fixed) matched by service and/or role
--   - Commission records tracking earned commissions through their lifecycle (PENDING → APPROVED → PAID)
--
-- Tables:
--   performance_targets
--   commission_rules
--   commission_records

-- ------------------------------------------------------------------ performance_targets

CREATE TABLE performance_targets (
    id                  uuid           NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid           NOT NULL,
    employee_id         uuid           NOT NULL,
    target_type         varchar(40)    NOT NULL,
    period              varchar(20)    NOT NULL,
    period_year         integer        NOT NULL,
    -- 1-12 for MONTHLY; NULL for QUARTERLY/YEARLY
    period_month        integer,
    -- 1-4 for QUARTERLY; NULL for MONTHLY/YEARLY
    period_quarter      integer,
    target_value        numeric(15,2)  NOT NULL,
    notes               text,
    created_at          timestamptz    NOT NULL DEFAULT now(),
    created_by          varchar(100)   NOT NULL,
    updated_at          timestamptz    NOT NULL DEFAULT now(),
    updated_by          varchar(100)   NOT NULL,
    version             bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_performance_targets PRIMARY KEY (id),
    CONSTRAINT fk_perf_target_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles (id),
    CONSTRAINT uq_perf_target_employee_period UNIQUE (employee_id, target_type, period, period_year, period_month, period_quarter),
    CONSTRAINT ck_perf_target_type CHECK (target_type IN (
        'SALES_REVENUE', 'COLLECTION_AMOUNT', 'PROJECT_COMPLETION',
        'FOLLOW_UP_COUNT', 'CUSTOMER_SATISFACTION', 'ORDER_COUNT', 'LEAD_CONVERSION'
    )),
    CONSTRAINT ck_perf_period CHECK (period IN ('MONTHLY', 'QUARTERLY', 'YEARLY')),
    CONSTRAINT ck_perf_period_month CHECK (period_month IS NULL OR (period_month BETWEEN 1 AND 12)),
    CONSTRAINT ck_perf_period_quarter CHECK (period_quarter IS NULL OR (period_quarter BETWEEN 1 AND 4)),
    CONSTRAINT ck_perf_target_value_positive CHECK (target_value >= 0)
);

CREATE INDEX ix_perf_target_org ON performance_targets (organization_id);
CREATE INDEX ix_perf_target_employee ON performance_targets (employee_id, period_year);
CREATE INDEX ix_perf_target_org_year ON performance_targets (organization_id, period_year);

-- ------------------------------------------------------------------ commission_rules

CREATE TABLE commission_rules (
    id                  uuid           NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid           NOT NULL,
    name                varchar(150)   NOT NULL,
    -- FK → services.id; NULL means the rule applies to all services
    service_id          uuid,
    -- Role code, e.g. SALES_MANAGER; NULL means all roles are eligible
    eligible_role_code  varchar(50),
    commission_type     varchar(20)    NOT NULL,
    -- Percentage (e.g. 5.0000 = 5%) or fixed amount depending on commission_type
    value               numeric(10,4)  NOT NULL,
    min_order_value     numeric(15,2),
    active              boolean        NOT NULL DEFAULT true,
    created_at          timestamptz    NOT NULL DEFAULT now(),
    created_by          varchar(100)   NOT NULL,
    updated_at          timestamptz    NOT NULL DEFAULT now(),
    updated_by          varchar(100)   NOT NULL,
    version             bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_commission_rules PRIMARY KEY (id),
    CONSTRAINT fk_commission_rule_service FOREIGN KEY (service_id) REFERENCES services (id),
    CONSTRAINT ck_commission_type CHECK (commission_type IN ('PERCENTAGE', 'FIXED')),
    CONSTRAINT ck_commission_value_positive CHECK (value > 0)
);

CREATE INDEX ix_commission_rule_org ON commission_rules (organization_id);
CREATE INDEX ix_commission_rule_org_active ON commission_rules (organization_id, active);
CREATE INDEX ix_commission_rule_service ON commission_rules (organization_id, service_id) WHERE service_id IS NOT NULL;

-- ------------------------------------------------------------------ commission_records

CREATE TABLE commission_records (
    id                  uuid           NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid           NOT NULL,
    employee_id         uuid           NOT NULL,
    rule_id             uuid           NOT NULL,
    -- "ORDER", "INVOICE", or "PAYMENT"
    source_type         varchar(20)    NOT NULL,
    source_id           uuid           NOT NULL,
    base_amount         numeric(15,2)  NOT NULL,
    commission_amount   numeric(15,2)  NOT NULL,
    status              varchar(20)    NOT NULL DEFAULT 'PENDING',
    period_month        integer        NOT NULL,
    period_year         integer        NOT NULL,
    notes               text,
    -- populated when status moves to APPROVED
    approved_by         uuid,
    approved_at         timestamptz,
    paid_at             timestamptz,
    created_at          timestamptz    NOT NULL DEFAULT now(),
    updated_at          timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT pk_commission_records PRIMARY KEY (id),
    CONSTRAINT fk_commission_record_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles (id),
    CONSTRAINT fk_commission_record_rule     FOREIGN KEY (rule_id)     REFERENCES commission_rules (id),
    CONSTRAINT fk_commission_record_approver FOREIGN KEY (approved_by) REFERENCES users (id),
    CONSTRAINT ck_commission_status CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED')),
    CONSTRAINT ck_commission_period_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT ck_commission_period_year CHECK (period_year > 2000),
    -- Prevent duplicate records for the same source event per employee
    CONSTRAINT uq_commission_record_source UNIQUE (organization_id, employee_id, source_type, source_id)
);

CREATE INDEX ix_commission_record_org ON commission_records (organization_id);
CREATE INDEX ix_commission_record_employee ON commission_records (employee_id, period_year, period_month);
CREATE INDEX ix_commission_record_org_period ON commission_records (organization_id, period_year, period_month);
CREATE INDEX ix_commission_record_status ON commission_records (organization_id, status);

-- ------------------------------------------------------------------ permissions

INSERT INTO permissions (code, name) VALUES
    ('PERFORMANCE_VIEW',   'View performance targets and actual-vs-target summaries'),
    ('PERFORMANCE_MANAGE', 'Set and update performance targets for employees'),
    ('COMMISSION_VIEW',    'View commission rules and commission records'),
    ('COMMISSION_MANAGE',  'Manage commission rules; approve, pay and cancel commission records');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'PERFORMANCE_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HR', 'SALES_MANAGER', 'PROJECT_MANAGER'))
   OR (p.code = 'PERFORMANCE_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HR', 'SALES_MANAGER'))
   OR (p.code = 'COMMISSION_VIEW'    AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HR', 'FINANCE', 'SALES_MANAGER'))
   OR (p.code = 'COMMISSION_MANAGE'  AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HR', 'FINANCE'));
