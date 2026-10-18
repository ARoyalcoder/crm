-- The ticket entities extend BaseEntity (id, created_at, updated_at) but V25 created these tables
-- without the audit columns. With `spring.jpa.hibernate.ddl-auto: validate` (every profile except
-- `local`) a fresh database therefore refused to start:
--     Schema validation: missing column [updated_at] in table [ticket_attachments]
-- The `local` profile hid it by letting Hibernate alter the schema itself.
--
-- Idempotent on purpose: a database that Hibernate already patched in `local` mode keeps its
-- columns and its rows are not touched.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                     AND table_name = 'ticket_attachments' AND column_name = 'updated_at') THEN
        ALTER TABLE ticket_attachments ADD COLUMN updated_at timestamptz;
        UPDATE ticket_attachments SET updated_at = created_at;
        ALTER TABLE ticket_attachments
            ALTER COLUMN updated_at SET NOT NULL,
            ALTER COLUMN updated_at SET DEFAULT now();
    END IF;

    -- History rows describe a past change: their creation time is when the change happened.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                     AND table_name = 'ticket_status_history' AND column_name = 'created_at') THEN
        ALTER TABLE ticket_status_history ADD COLUMN created_at timestamptz;
        UPDATE ticket_status_history SET created_at = changed_at;
        ALTER TABLE ticket_status_history
            ALTER COLUMN created_at SET NOT NULL,
            ALTER COLUMN created_at SET DEFAULT now();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                     AND table_name = 'ticket_status_history' AND column_name = 'updated_at') THEN
        ALTER TABLE ticket_status_history ADD COLUMN updated_at timestamptz;
        UPDATE ticket_status_history SET updated_at = changed_at;
        ALTER TABLE ticket_status_history
            ALTER COLUMN updated_at SET NOT NULL,
            ALTER COLUMN updated_at SET DEFAULT now();
    END IF;
END $$;
