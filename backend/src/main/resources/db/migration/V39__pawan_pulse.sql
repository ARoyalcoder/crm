-- PAWAN PULSE: AI Insight Feed
--
-- Four engines generate structured insights from existing CRM records:
--   Achievement Engine  — celebrates successes (project completions, AMC renewals, big payments)
--   Opportunity Engine  — surfaces revenue opportunities (AMC renewal, cross-sell, inactive customers)
--   Risk Engine         — flags risks (overdue invoices, delayed projects, SLA breaches, AMC expiry)
--   Next Best Action    — recommends a single concrete action per entity
--
-- Table:
--   pulse_insights  — one row per generated insight

CREATE TABLE pulse_insights (
    id                      uuid            NOT NULL DEFAULT gen_random_uuid(),
    organization_id         uuid            NOT NULL,
    type                    varchar(30)     NOT NULL,
    category                varchar(40)     NOT NULL,
    status                  varchar(20)     NOT NULL DEFAULT 'ACTIVE',
    title                   varchar(255)    NOT NULL,
    what_happened           text            NOT NULL,
    why_it_matters          text            NOT NULL,
    who_should_act          uuid,
    who_should_act_label    varchar(200),
    what_to_do              text            NOT NULL,
    expected_impact         text,
    entity_type             varchar(50),
    entity_id               uuid,
    entity_label            varchar(255),
    score                   integer         NOT NULL DEFAULT 50,
    generated_at            timestamptz     NOT NULL DEFAULT now(),
    expires_at              timestamptz,
    dismissed_at            timestamptz,
    dismissed_by            uuid,
    created_at              timestamptz     NOT NULL DEFAULT now(),
    updated_at              timestamptz     NOT NULL DEFAULT now(),
    CONSTRAINT pk_pulse_insights PRIMARY KEY (id),
    CONSTRAINT ck_pulse_type CHECK (type IN (
        'ACHIEVEMENT', 'OPPORTUNITY', 'RISK', 'NEXT_BEST_ACTION'
    )),
    CONSTRAINT ck_pulse_category CHECK (category IN (
        'FIRST_ORDER', 'TARGET_ACHIEVED', 'PERSONAL_BEST', 'PROJECT_COMPLETED',
        'AMC_RENEWED', 'CUSTOMER_APPRECIATION',
        'AMC_RENEWAL', 'CROSS_SELL', 'UPSELL', 'INACTIVE_CUSTOMER', 'HIGH_VALUE_LEAD',
        'UNTOUCHED_LEAD', 'OVERDUE_PAYMENT', 'DELAYED_PROJECT', 'SLA_BREACH', 'AMC_EXPIRY',
        'CALL_CUSTOMER', 'SEND_QUOTATION', 'SCHEDULE_VISIT', 'COLLECT_PAYMENT',
        'RESOLVE_TICKET', 'CONTACT_INACTIVE'
    )),
    CONSTRAINT ck_pulse_status CHECK (status IN ('ACTIVE', 'DISMISSED', 'ACTIONED')),
    CONSTRAINT ck_pulse_score CHECK (score BETWEEN 0 AND 100)
);

-- Primary feed index: org + status sorted by urgency
CREATE INDEX ix_pulse_org_status_score
    ON pulse_insights (organization_id, status, score DESC, generated_at DESC);

-- Engine type feed
CREATE INDEX ix_pulse_type_org
    ON pulse_insights (type, organization_id, status);

-- Entity lookup (find all insights for a specific CRM record)
CREATE INDEX ix_pulse_entity
    ON pulse_insights (entity_type, entity_id, organization_id, status);

-- Personal action feed (assigned to a specific user)
CREATE INDEX ix_pulse_who_should_act
    ON pulse_insights (who_should_act, organization_id, status, score DESC);

-- Expiry job
CREATE INDEX ix_pulse_generated_at
    ON pulse_insights (organization_id, status, generated_at);

-- ---- Permission -----------------------------------------------------------------

INSERT INTO permissions (code, name) VALUES
    ('PULSE_VIEW', 'View the PAWAN PULSE AI insight feed');

-- Grant to all roles that interact with customers or have management responsibilities
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE p.code = 'PULSE_VIEW'
  AND r.code IN (
      'SUPER_ADMIN', 'ADMIN', 'DIRECTOR',
      'SALES_MANAGER', 'PROJECT_MANAGER',
      'SUPPORT_AGENT', 'FINANCE_MANAGER',
      'TECHNICIAN', 'HR'
  );
