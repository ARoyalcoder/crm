-- Vendor and Partner Management: vendor profiles, contacts, documents, scorecards, and partner accounts.
--
-- Supports:
--   - Vendor profiles with status lifecycle (ACTIVE, INACTIVE, BLOCKED, UNDER_REVIEW)
--   - Vendor contacts (multiple per vendor, one marked primary)
--   - Vendor document metadata (file upload handled separately)
--   - Vendor scorecards by category (QUALITY, COST, DELIVERY, RESPONSE, CUSTOMER_FEEDBACK)
--   - Partner organisations with restricted access levels
--
-- Tables:
--   vendors
--   vendor_contacts
--   vendor_documents
--   vendor_scores
--   partners

CREATE TABLE vendors (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    company_name        varchar(200)  NOT NULL,
    contact_email       varchar(254)  NOT NULL,
    contact_phone       varchar(30)   NOT NULL,
    address             text,
    services            text,
    payment_terms_days  integer,
    status              varchar(20)   NOT NULL DEFAULT 'ACTIVE',
    notes               text,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    created_by          varchar(100)  NOT NULL,
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    updated_by          varchar(100)  NOT NULL,
    version             bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_vendors PRIMARY KEY (id),
    CONSTRAINT ck_vendor_status CHECK (status IN (
        'ACTIVE', 'INACTIVE', 'BLOCKED', 'UNDER_REVIEW'
    ))
);

CREATE INDEX ix_vendor_org        ON vendors (organization_id);
CREATE INDEX ix_vendor_status     ON vendors (organization_id, status);

CREATE TABLE vendor_contacts (
    id              uuid          NOT NULL DEFAULT gen_random_uuid(),
    vendor_id       uuid          NOT NULL,
    name            varchar(200)  NOT NULL,
    email           varchar(254)  NOT NULL,
    phone           varchar(30)   NOT NULL,
    designation     varchar(150),
    primary_contact boolean       NOT NULL DEFAULT false,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_vendor_contacts PRIMARY KEY (id),
    CONSTRAINT fk_vendor_contacts_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

CREATE INDEX ix_vendor_contacts_vendor ON vendor_contacts (vendor_id);

CREATE TABLE vendor_documents (
    id              uuid          NOT NULL DEFAULT gen_random_uuid(),
    vendor_id       uuid          NOT NULL,
    document_type   varchar(30)   NOT NULL DEFAULT 'OTHER',
    file_name       varchar(300)  NOT NULL,
    storage_key     varchar(500)  NOT NULL,
    mime_type       varchar(100),
    file_size       bigint,
    uploaded_by     varchar(100)  NOT NULL,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_vendor_documents PRIMARY KEY (id),
    CONSTRAINT fk_vendor_documents_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE,
    CONSTRAINT ck_vendor_document_type CHECK (document_type IN (
        'CONTRACT', 'CERTIFICATE', 'INVOICE', 'OTHER'
    ))
);

CREATE INDEX ix_vendor_documents_vendor ON vendor_documents (vendor_id);

CREATE TABLE vendor_scores (
    id              uuid          NOT NULL DEFAULT gen_random_uuid(),
    vendor_id       uuid          NOT NULL,
    organization_id uuid          NOT NULL,
    category        varchar(30)   NOT NULL,
    score           integer       NOT NULL,
    reviewed_by     uuid          NOT NULL,
    notes           text,
    scored_at       timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_vendor_scores PRIMARY KEY (id),
    CONSTRAINT uq_vendor_score_category UNIQUE (vendor_id, category),
    CONSTRAINT fk_vendor_scores_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE,
    CONSTRAINT ck_vendor_score_range CHECK (score BETWEEN 1 AND 10),
    CONSTRAINT ck_vendor_score_category CHECK (category IN (
        'QUALITY', 'COST', 'DELIVERY', 'RESPONSE', 'CUSTOMER_FEEDBACK'
    ))
);

CREATE INDEX ix_vendor_scores_vendor ON vendor_scores (vendor_id);

CREATE TABLE partners (
    id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id      uuid          NOT NULL,
    organization_name    varchar(200)  NOT NULL,
    contact_email        varchar(254)  NOT NULL,
    contact_phone        varchar(30)   NOT NULL,
    access_level         varchar(30)   NOT NULL DEFAULT 'READ_ONLY',
    assigned_project_ids text,
    services             text,
    active               boolean       NOT NULL DEFAULT true,
    user_id              uuid,
    notes                text,
    created_at           timestamptz   NOT NULL DEFAULT now(),
    created_by           varchar(100)  NOT NULL,
    updated_at           timestamptz   NOT NULL DEFAULT now(),
    updated_by           varchar(100)  NOT NULL,
    version              bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_partners PRIMARY KEY (id),
    CONSTRAINT ck_partner_access_level CHECK (access_level IN (
        'READ_ONLY', 'ASSIGNED_PROJECTS', 'LIMITED_OPERATIONS'
    ))
);

CREATE INDEX ix_partner_org        ON partners (organization_id, active);

-- Permissions
INSERT INTO permissions (code, name) VALUES
    ('VENDOR_VIEW',    'View vendors, contacts, documents and scorecards'),
    ('VENDOR_CREATE',  'Create vendor profiles'),
    ('VENDOR_UPDATE',  'Update vendor profiles, contacts and documents'),
    ('VENDOR_DELETE',  'Delete vendor profiles'),
    ('VENDOR_SCORE',   'Add or update vendor scorecard ratings'),
    ('PARTNER_VIEW',   'View partner organisations'),
    ('PARTNER_MANAGE', 'Create, edit and delete partner organisations');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'VENDOR_VIEW'    AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER'))
   OR (p.code = 'VENDOR_CREATE'  AND r.code IN ('SUPER_ADMIN', 'ADMIN'))
   OR (p.code = 'VENDOR_UPDATE'  AND r.code IN ('SUPER_ADMIN', 'ADMIN'))
   OR (p.code = 'VENDOR_DELETE'  AND r.code IN ('SUPER_ADMIN', 'ADMIN'))
   OR (p.code = 'VENDOR_SCORE'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'))
   OR (p.code = 'PARTNER_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER'))
   OR (p.code = 'PARTNER_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN'));
