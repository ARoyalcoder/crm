-- Analytics Module: audit log for dashboard exports, plus permission grants.
--
-- The analytics dashboards query existing tables; no new data tables are needed.
-- This migration adds only:
--   - analytics_export_log  (audit trail for dashboard exports)
--   - ANALYTICS_VIEW permission granted to the relevant roles

CREATE TABLE analytics_export_log (
    id              uuid          NOT NULL DEFAULT gen_random_uuid(),
    org_id          uuid          NOT NULL,
    user_id         uuid          NOT NULL,
    dashboard_type  varchar(50)   NOT NULL,
    exported_at     timestamptz   NOT NULL DEFAULT now(),
    filters         text,
    CONSTRAINT pk_analytics_export_log PRIMARY KEY (id),
    CONSTRAINT ck_analytics_dashboard_type CHECK (dashboard_type IN (
        'EXECUTIVE', 'SALES', 'PROJECTS', 'FINANCE', 'SERVICE', 'WORKFORCE'
    ))
);

CREATE INDEX ix_analytics_export_log_org ON analytics_export_log (org_id, exported_at DESC);
CREATE INDEX ix_analytics_export_log_user ON analytics_export_log (user_id, exported_at DESC);

-- Permission
INSERT INTO permissions (code, name) VALUES
    ('ANALYTICS_VIEW', 'View analytics dashboards across all business domains');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE p.code = 'ANALYTICS_VIEW'
  AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'FINANCE', 'SALES_MANAGER');
