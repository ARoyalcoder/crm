-- AMC (Annual Maintenance Contract) and Warranty module
--
-- Supports:
--   - Customer warranty tracking with status lifecycle (ACTIVE → EXPIRED/CLAIMED/VOIDED)
--   - AMC contracts with auto-generated numbers (AMC-YYYY-NNNN)
--   - Service visit scheduling and completion tracking
--   - Renewal tracking with due-soon/overdue alerts
--   - Contract renewal chain via renewed_from_id
--
-- Tables:
--   warranties
--   amc_contracts ──< amc_service_visits

CREATE TABLE warranties (
    id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id      uuid          NOT NULL,
    customer_id          uuid          NOT NULL,
    order_id             uuid,
    project_id           uuid,
    service_offering_id  uuid,
    description          varchar(500)  NOT NULL,
    terms                text,
    start_date           date          NOT NULL,
    end_date             date          NOT NULL,
    status               varchar(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at           timestamptz   NOT NULL DEFAULT now(),
    created_by           varchar(100)  NOT NULL,
    updated_at           timestamptz   NOT NULL DEFAULT now(),
    updated_by           varchar(100)  NOT NULL,
    version              bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_warranties PRIMARY KEY (id),
    CONSTRAINT ck_warranty_status CHECK (status IN ('ACTIVE', 'EXPIRED', 'CLAIMED', 'VOIDED'))
);

CREATE INDEX ix_warranties_customer ON warranties (organization_id, customer_id);
CREATE INDEX ix_warranties_org_status ON warranties (organization_id, status);
CREATE INDEX ix_warranties_end_date ON warranties (organization_id, end_date) WHERE status = 'ACTIVE';

CREATE TABLE amc_contracts (
    id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id      uuid          NOT NULL,
    contract_number      varchar(50)   NOT NULL,
    customer_id          uuid          NOT NULL,
    service_offering_id  uuid,
    project_id           uuid,
    contract_value       numeric(14,2) NOT NULL DEFAULT 0,
    currency             varchar(10)   NOT NULL DEFAULT 'INR',
    start_date           date          NOT NULL,
    end_date             date          NOT NULL,
    frequency            varchar(20)   NOT NULL,
    assigned_employee_id uuid,
    sla_id               uuid,
    status               varchar(20)   NOT NULL DEFAULT 'DRAFT',
    renewal_status       varchar(20)   NOT NULL DEFAULT 'NOT_DUE',
    terms                text,
    notes                text,
    renewed_from_id      uuid,
    created_at           timestamptz   NOT NULL DEFAULT now(),
    created_by           varchar(100)  NOT NULL,
    updated_at           timestamptz   NOT NULL DEFAULT now(),
    updated_by           varchar(100)  NOT NULL,
    version              bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_amc_contracts PRIMARY KEY (id),
    CONSTRAINT uq_amc_contracts_number UNIQUE (organization_id, contract_number),
    CONSTRAINT fk_amc_renewed_from FOREIGN KEY (renewed_from_id) REFERENCES amc_contracts (id),
    CONSTRAINT ck_amc_status CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'RENEWAL_PENDING')),
    CONSTRAINT ck_amc_renewal_status CHECK (renewal_status IN ('NOT_DUE', 'DUE_SOON', 'OVERDUE', 'RENEWED', 'LAPSED')),
    CONSTRAINT ck_amc_frequency CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'))
);

CREATE INDEX ix_amc_contracts_customer ON amc_contracts (organization_id, customer_id);
CREATE INDEX ix_amc_contracts_org_status ON amc_contracts (organization_id, status);
CREATE INDEX ix_amc_contracts_end_date ON amc_contracts (organization_id, end_date) WHERE status IN ('ACTIVE', 'RENEWAL_PENDING');
CREATE UNIQUE INDEX uq_amc_contracts_number_idx ON amc_contracts (organization_id, contract_number);

CREATE TABLE amc_service_visits (
    id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
    contract_id          uuid          NOT NULL,
    scheduled_date       date          NOT NULL,
    completed_date       date,
    visit_type           varchar(20)   NOT NULL DEFAULT 'SCHEDULED',
    assigned_employee_id uuid,
    notes                text,
    outcome              text,
    status               varchar(20)   NOT NULL DEFAULT 'SCHEDULED',
    created_at           timestamptz   NOT NULL DEFAULT now(),
    updated_at           timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_amc_service_visits PRIMARY KEY (id),
    CONSTRAINT fk_amc_visits_contract FOREIGN KEY (contract_id) REFERENCES amc_contracts (id) ON DELETE CASCADE,
    CONSTRAINT ck_amc_visit_type CHECK (visit_type IN ('SCHEDULED', 'EMERGENCY', 'INSPECTION')),
    CONSTRAINT ck_amc_visit_status CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'))
);

CREATE INDEX ix_amc_visits_contract ON amc_service_visits (contract_id, scheduled_date ASC);
CREATE INDEX ix_amc_visits_status ON amc_service_visits (status, scheduled_date ASC) WHERE status = 'SCHEDULED';

-- Permissions
INSERT INTO permissions (code, name) VALUES
    ('WARRANTY_VIEW',   'View warranty records and their status'),
    ('WARRANTY_MANAGE', 'Create, update and void warranty records'),
    ('AMC_VIEW',        'View AMC contracts, service visits and renewal status'),
    ('AMC_MANAGE',      'Create, edit and renew AMC contracts; schedule and complete service visits');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'WARRANTY_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'SUPPORT_AGENT'))
   OR (p.code = 'WARRANTY_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'))
   OR (p.code = 'AMC_VIEW'        AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'SUPPORT_AGENT', 'TECHNICIAN'))
   OR (p.code = 'AMC_MANAGE'      AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'));
