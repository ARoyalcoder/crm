-- Global Search: PostgreSQL full-text search indexes and recent search history.
--
-- Adds GIN indexes on tsvector expressions for all searchable entities so
-- plainto_tsquery searches can use the indexes rather than seq-scanning.
-- Creates the recent_searches table for per-user search history.
--
-- Tables created:
--   recent_searches

-- ------------------------------------------------------------------ customers
CREATE INDEX idx_customers_fts ON customers
  USING GIN (to_tsvector('english',
    coalesce(display_name, '') || ' ' ||
    coalesce(email, '')        || ' ' ||
    coalesce(phone, '')        || ' ' ||
    coalesce(company_name, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ leads
CREATE INDEX idx_leads_fts ON leads
  USING GIN (to_tsvector('english',
    coalesce(contact_name, '') || ' ' ||
    coalesce(company_name, '') || ' ' ||
    coalesce(email, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ opportunities
CREATE INDEX idx_opportunities_fts ON opportunities
  USING GIN (to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(customer_name, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ quotations
CREATE INDEX idx_quotations_fts ON quotations
  USING GIN (to_tsvector('english',
    coalesce(quotation_number, '') || ' ' ||
    coalesce(title, '')            || ' ' ||
    coalesce(customer_name, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ orders
CREATE INDEX idx_orders_fts ON orders
  USING GIN (to_tsvector('english',
    coalesce(order_number, '') || ' ' ||
    coalesce(title, '')        || ' ' ||
    coalesce(customer_name, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ projects
CREATE INDEX idx_projects_fts ON projects
  USING GIN (to_tsvector('english',
    coalesce(title, '')       || ' ' ||
    coalesce(description, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ tickets (no deleted_at column)
CREATE INDEX idx_tickets_fts ON tickets
  USING GIN (to_tsvector('english',
    coalesce(ticket_number, '') || ' ' ||
    coalesce(subject, '')       || ' ' ||
    coalesce(description, '')
  ));

-- ------------------------------------------------------------------ invoices
CREATE INDEX idx_invoices_fts ON invoices
  USING GIN (to_tsvector('english',
    coalesce(invoice_number, '') || ' ' ||
    coalesce(customer_name, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ employee_profiles
-- (no deleted_at; join with users is done at query time, so we index user fields on the users table)
CREATE INDEX idx_users_fts ON users
  USING GIN (to_tsvector('english',
    coalesce(full_name, '') || ' ' ||
    coalesce(email, '')
  ))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------ vendors (no deleted_at column)
CREATE INDEX idx_vendors_fts ON vendors
  USING GIN (to_tsvector('english',
    coalesce(company_name, '')  || ' ' ||
    coalesce(contact_email, '')
  ));

-- ------------------------------------------------------------------ recent_searches
CREATE TABLE recent_searches (
    id              uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL,
    organization_id uuid        NOT NULL,
    query           text        NOT NULL,
    searched_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_recent_searches PRIMARY KEY (id),
    CONSTRAINT fk_recent_searches_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_recent_searches_user_org_time
    ON recent_searches (user_id, organization_id, searched_at DESC);
