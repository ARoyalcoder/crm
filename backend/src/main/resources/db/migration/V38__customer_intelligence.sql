-- Customer Intelligence: health scores, CLV, segments and transparent score breakdowns.
--
-- One snapshot per customer per organisation. Recomputed nightly by CustomerIntelligenceRefreshJob
-- and on demand via the API. Every scoring decision is stored in score_breakdown (JSON), so
-- the reason for any segment classification can be read directly from the database.
--
-- Tables:
--   customer_intelligence_snapshots

CREATE TABLE customer_intelligence_snapshots (
    id                       uuid           NOT NULL DEFAULT gen_random_uuid(),
    customer_id              uuid           NOT NULL,
    organization_id          uuid           NOT NULL,
    health_score             integer        NOT NULL CHECK (health_score BETWEEN 0 AND 100),
    segment                  varchar(20)    NOT NULL,
    clv                      numeric(15, 2) NOT NULL DEFAULT 0,
    total_revenue            numeric(15, 2) NOT NULL DEFAULT 0,
    purchase_count           integer        NOT NULL DEFAULT 0,
    avg_purchase_value       numeric(15, 2) NOT NULL DEFAULT 0,
    active_projects          integer        NOT NULL DEFAULT 0,
    open_tickets             integer        NOT NULL DEFAULT 0,
    overdue_invoices         integer        NOT NULL DEFAULT 0,
    has_active_amc           boolean        NOT NULL DEFAULT false,
    last_interaction_date    timestamptz,
    days_since_last_purchase integer,
    score_breakdown          text,
    computed_at              timestamptz    NOT NULL,
    created_at               timestamptz    NOT NULL DEFAULT now(),
    updated_at               timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT pk_customer_intelligence_snapshots PRIMARY KEY (id),
    CONSTRAINT uq_customer_intelligence_customer_org UNIQUE (customer_id, organization_id),
    CONSTRAINT fk_customer_intelligence_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT ck_customer_intelligence_segment CHECK (segment IN (
        'HEALTHY', 'AT_RISK', 'INACTIVE', 'HIGH_VALUE', 'NEW'
    ))
);

CREATE INDEX ix_customer_intelligence_org        ON customer_intelligence_snapshots (organization_id);
CREATE INDEX ix_customer_intelligence_segment    ON customer_intelligence_snapshots (organization_id, segment);
CREATE INDEX ix_customer_intelligence_score      ON customer_intelligence_snapshots (organization_id, health_score DESC);
CREATE INDEX ix_customer_intelligence_computed   ON customer_intelligence_snapshots (organization_id, computed_at DESC);

-- Permission
INSERT INTO permissions (code, name) VALUES
    ('INTELLIGENCE_VIEW', 'View customer intelligence: health scores, CLV, segments and score explanations');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE p.code = 'INTELLIGENCE_VIEW'
  AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'PROJECT_MANAGER');
