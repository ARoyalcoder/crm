-- Business Event Engine: persisted record of every named business event.
--
-- Other modules call BusinessEventPublisher.record() when key actions occur.
-- The table provides an auditable, cross-module event log that can be queried
-- by entity, by event type, or by recency across an organisation.
--
-- Tables:
--   business_events

CREATE TABLE business_events (
    id               uuid          NOT NULL DEFAULT gen_random_uuid(),
    event_type       varchar(50)   NOT NULL,
    entity_type      varchar(100)  NOT NULL,
    entity_id        uuid          NOT NULL,
    organization_id  uuid          NOT NULL,
    actor_id         uuid,
    payload          text,
    occurred_at      timestamptz   NOT NULL DEFAULT now(),
    created_at       timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_business_events PRIMARY KEY (id)
);

-- Most-common query: recent events for an organisation.
CREATE INDEX ix_business_events_org_occurred ON business_events (organization_id, occurred_at DESC);

-- Entity history: all events attached to one business record.
CREATE INDEX ix_business_events_entity ON business_events (entity_type, entity_id);

-- Type queries: events of a specific type within a date range.
CREATE INDEX ix_business_events_type_org ON business_events (event_type, organization_id);
