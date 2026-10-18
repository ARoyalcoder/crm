-- Document Management: file attachments for any business entity.
--
-- Supports:
--   - Attaching documents (PDF, images, Office files, etc.) to customers, projects, invoices,
--     leads, orders, quotations, tickets, vendors, employees, AMC contracts, and warranties.
--   - Full version history: each time a new file is uploaded the previous storage key and
--     metadata are archived in document_versions.
--   - Soft delete: deleted_at is set; the S3/MinIO object is NOT removed immediately.
--   - Multi-tenant isolation: every query must include organization_id.
--
-- Tables:
--   document_records   - current file metadata
--   document_versions  - archived previous versions

CREATE TABLE document_records (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    entity_type         varchar(30)   NOT NULL,
    entity_id           uuid          NOT NULL,
    category            varchar(30)   NOT NULL,
    title               varchar(255)  NOT NULL,
    description         text,
    storage_key         varchar(500)  NOT NULL,
    original_file_name  varchar(255)  NOT NULL,
    mime_type           varchar(100)  NOT NULL,
    file_size_bytes     bigint        NOT NULL,
    document_version    integer       NOT NULL DEFAULT 1,
    uploaded_by         uuid          NOT NULL,
    tags                text,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    created_by          varchar(100)  NOT NULL DEFAULT '',
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    updated_by          varchar(100)  NOT NULL DEFAULT '',
    version             bigint        NOT NULL DEFAULT 0,
    deleted_at          timestamptz,
    CONSTRAINT pk_document_records PRIMARY KEY (id),
    CONSTRAINT fk_document_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id),
    CONSTRAINT ck_document_entity_type CHECK (entity_type IN (
        'CUSTOMER', 'LEAD', 'QUOTATION', 'ORDER', 'PROJECT', 'INVOICE',
        'TICKET', 'VENDOR', 'EMPLOYEE', 'AMC_CONTRACT', 'WARRANTY'
    )),
    CONSTRAINT ck_document_category CHECK (category IN (
        'CONTRACT', 'PROPOSAL', 'REPORT', 'CERTIFICATE', 'INVOICE_DOCUMENT',
        'PHOTO', 'IDENTITY', 'TECHNICAL', 'LEGAL', 'OTHER'
    )),
    CONSTRAINT ck_document_version_positive CHECK (document_version >= 1),
    CONSTRAINT ck_document_file_size_positive CHECK (file_size_bytes > 0)
);

-- Fast lookup: all documents for a specific entity (the main read path)
CREATE INDEX ix_document_entity ON document_records (organization_id, entity_type, entity_id)
    WHERE deleted_at IS NULL;

-- Organisation-wide document browser
CREATE INDEX ix_document_org ON document_records (organization_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Documents uploaded by a user (My Documents page)
CREATE INDEX ix_document_uploader ON document_records (organization_id, uploaded_by, created_at DESC)
    WHERE deleted_at IS NULL;

-- -------------------------------------------------------------------------

CREATE TABLE document_versions (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    document_id         uuid          NOT NULL,
    version_number      integer       NOT NULL,
    storage_key         varchar(500)  NOT NULL,
    original_file_name  varchar(255)  NOT NULL,
    file_size_bytes     bigint        NOT NULL,
    uploaded_by         uuid          NOT NULL,
    uploaded_at         timestamptz   NOT NULL DEFAULT now(),
    notes               text,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_document_versions PRIMARY KEY (id),
    CONSTRAINT fk_document_version_document FOREIGN KEY (document_id) REFERENCES document_records (id),
    CONSTRAINT fk_document_version_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id),
    CONSTRAINT uq_document_version UNIQUE (document_id, version_number),
    CONSTRAINT ck_document_version_number_positive CHECK (version_number >= 1)
);

CREATE INDEX ix_document_version_document ON document_versions (document_id, version_number ASC);

-- -------------------------------------------------------------------------
-- Permissions
-- -------------------------------------------------------------------------

INSERT INTO permissions (code, name) VALUES
    ('DOCUMENT_VIEW',   'View document metadata and download documents'),
    ('DOCUMENT_UPLOAD', 'Upload new documents and upload new versions of existing documents'),
    ('DOCUMENT_DELETE', 'Soft-delete documents');

-- Grant to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'DOCUMENT_VIEW'   AND r.code IN (
    'SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'PROJECT_MANAGER',
    'HR', 'TECHNICIAN', 'SUPPORT_AGENT'))
   OR (p.code = 'DOCUMENT_UPLOAD' AND r.code IN (
    'SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'PROJECT_MANAGER',
    'HR', 'TECHNICIAN', 'SUPPORT_AGENT'))
   OR (p.code = 'DOCUMENT_DELETE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'));
