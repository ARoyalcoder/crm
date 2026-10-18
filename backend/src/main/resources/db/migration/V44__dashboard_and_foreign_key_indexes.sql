-- V44: indexes for the dashboards, and for the foreign keys that had no index of their own.
--
-- Purely additive and idempotent (IF NOT EXISTS): no table, column or row changes, nothing to roll back,
-- safe to apply to a database that already holds data. Each index serves a query that exists today:
-- the dashboards filter a period of dates inside one organization.

-- Foreign keys that were not the leading column of any index (SchemaMigrationIT enforces this for every
-- foreign key). Without one, deleting or updating the parent row scans the whole child table.
CREATE INDEX IF NOT EXISTS ix_amc_contracts_renewed_from ON amc_contracts (renewed_from_id);
CREATE INDEX IF NOT EXISTS ix_commission_records_approved_by ON commission_records (approved_by);
CREATE INDEX IF NOT EXISTS ix_commission_records_rule ON commission_records (rule_id);
CREATE INDEX IF NOT EXISTS ix_commission_rules_service ON commission_rules (service_id);
CREATE INDEX IF NOT EXISTS ix_document_records_uploaded_by ON document_records (uploaded_by);
CREATE INDEX IF NOT EXISTS ix_document_versions_uploaded_by ON document_versions (uploaded_by);
CREATE INDEX IF NOT EXISTS ix_tickets_sla ON tickets (sla_id);

-- Period filters used by the analytics dashboards.
-- Invoiced in a period: issued invoices by issue date.
CREATE INDEX IF NOT EXISTS ix_invoices_org_issue_date ON invoices (organization_id, issue_date)
    WHERE deleted_at IS NULL AND issue_date IS NOT NULL;
-- Leads closed (won or lost) in a period.
CREATE INDEX IF NOT EXISTS ix_leads_org_closed_at ON leads (organization_id, closed_at)
    WHERE deleted_at IS NULL AND closed_at IS NOT NULL;
-- Deals won in a period.
CREATE INDEX IF NOT EXISTS ix_opportunities_org_won_at ON opportunities (organization_id, won_at)
    WHERE deleted_at IS NULL AND status = 'WON';
-- Orders created in a period.
CREATE INDEX IF NOT EXISTS ix_orders_org_created_at ON orders (organization_id, created_at)
    WHERE deleted_at IS NULL;
-- Projects completed in a period.
CREATE INDEX IF NOT EXISTS ix_projects_org_completed ON projects (organization_id, actual_completion_date)
    WHERE deleted_at IS NULL AND actual_completion_date IS NOT NULL;
-- Tickets resolved in a period, and open tickets by SLA due time (the breach count).
CREATE INDEX IF NOT EXISTS ix_tickets_org_resolved_at ON tickets (organization_id, resolved_at)
    WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_tickets_org_open_due ON tickets (organization_id, due_at)
    WHERE due_at IS NOT NULL AND status NOT IN ('RESOLVED', 'CLOSED');
