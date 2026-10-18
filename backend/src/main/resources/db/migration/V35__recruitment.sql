-- Recruitment Module: job openings, candidates, applications, and interviews.
--
-- Supports:
--   - Job openings with status lifecycle (DRAFT → OPEN → PAUSED/CLOSED)
--   - Candidate profiles with resume storage reference
--   - Applications tracking the recruitment funnel stage
--   - Interviews scheduled against applications
--
-- Tables:
--   job_openings
--   candidates
--   applications
--   interviews

CREATE TABLE job_openings (
    id                      uuid            NOT NULL DEFAULT gen_random_uuid(),
    organization_id         uuid            NOT NULL,
    title                   varchar(200)    NOT NULL,
    department              varchar(100)    NOT NULL,
    location                varchar(200),
    description             text            NOT NULL,
    requirements            text,
    min_experience_years    integer,
    min_salary              numeric(15, 2),
    max_salary              numeric(15, 2),
    status                  varchar(20)     NOT NULL DEFAULT 'DRAFT',
    posted_date             date,
    closing_date            date,
    created_at              timestamptz     NOT NULL DEFAULT now(),
    created_by              varchar(100)    NOT NULL,
    updated_at              timestamptz     NOT NULL DEFAULT now(),
    updated_by              varchar(100)    NOT NULL,
    version                 bigint          NOT NULL DEFAULT 0,
    CONSTRAINT pk_job_openings PRIMARY KEY (id),
    CONSTRAINT ck_job_status CHECK (status IN ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED')),
    CONSTRAINT ck_job_salary_range CHECK (min_salary IS NULL OR max_salary IS NULL OR min_salary <= max_salary)
);

CREATE INDEX ix_job_openings_org ON job_openings (organization_id);
CREATE INDEX ix_job_openings_org_status ON job_openings (organization_id, status);
CREATE INDEX ix_job_openings_org_created ON job_openings (organization_id, created_at DESC);

CREATE TABLE candidates (
    id                      uuid            NOT NULL DEFAULT gen_random_uuid(),
    organization_id         uuid            NOT NULL,
    first_name              varchar(100)    NOT NULL,
    last_name               varchar(100)    NOT NULL,
    email                   varchar(254)    NOT NULL,
    phone                   varchar(30),
    location                varchar(200),
    experience_years        integer,
    current_salary          numeric(15, 2),
    expected_salary         numeric(15, 2),
    notice_period_days      integer,
    resume_storage_key      varchar(500),
    resume_file_name        varchar(255),
    linked_in_url           varchar(500),
    notes                   text,
    created_at              timestamptz     NOT NULL DEFAULT now(),
    created_by              varchar(100)    NOT NULL,
    updated_at              timestamptz     NOT NULL DEFAULT now(),
    updated_by              varchar(100)    NOT NULL,
    version                 bigint          NOT NULL DEFAULT 0,
    CONSTRAINT pk_candidates PRIMARY KEY (id),
    CONSTRAINT uq_candidate_org_email UNIQUE (organization_id, email)
);

CREATE INDEX ix_candidates_org ON candidates (organization_id);
CREATE INDEX ix_candidates_org_name ON candidates (organization_id, last_name, first_name);

CREATE TABLE applications (
    id                      uuid            NOT NULL DEFAULT gen_random_uuid(),
    organization_id         uuid            NOT NULL,
    job_id                  uuid            NOT NULL,
    candidate_id            uuid            NOT NULL,
    stage                   varchar(20)     NOT NULL DEFAULT 'APPLIED',
    applied_date            date            NOT NULL,
    assigned_to_user_id     uuid,
    stage_notes             text,
    rejection_reason        text,
    offer_salary            numeric(15, 2),
    created_at              timestamptz     NOT NULL DEFAULT now(),
    created_by              varchar(100)    NOT NULL,
    updated_at              timestamptz     NOT NULL DEFAULT now(),
    updated_by              varchar(100)    NOT NULL,
    version                 bigint          NOT NULL DEFAULT 0,
    CONSTRAINT pk_applications PRIMARY KEY (id),
    CONSTRAINT uq_application_job_candidate UNIQUE (job_id, candidate_id),
    CONSTRAINT fk_application_job FOREIGN KEY (job_id) REFERENCES job_openings (id),
    CONSTRAINT fk_application_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id),
    CONSTRAINT ck_application_stage CHECK (stage IN (
        'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'HIRED'
    ))
);

CREATE INDEX ix_applications_org ON applications (organization_id);
CREATE INDEX ix_applications_job ON applications (job_id, applied_date DESC);
CREATE INDEX ix_applications_candidate ON applications (candidate_id, applied_date DESC);
CREATE INDEX ix_applications_job_stage ON applications (job_id, stage);
CREATE INDEX ix_applications_assigned ON applications (assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;

CREATE TABLE interviews (
    id                      uuid            NOT NULL DEFAULT gen_random_uuid(),
    organization_id         uuid            NOT NULL,
    application_id          uuid            NOT NULL,
    interview_type          varchar(20)     NOT NULL,
    scheduled_at            timestamptz     NOT NULL,
    duration_minutes        integer,
    interviewer_user_id     uuid            NOT NULL,
    location                varchar(500),
    notes                   text,
    feedback                text,
    rating                  integer,
    completed               boolean         NOT NULL DEFAULT false,
    created_at              timestamptz     NOT NULL DEFAULT now(),
    updated_at              timestamptz     NOT NULL DEFAULT now(),
    CONSTRAINT pk_interviews PRIMARY KEY (id),
    CONSTRAINT fk_interview_application FOREIGN KEY (application_id) REFERENCES applications (id),
    CONSTRAINT ck_interview_type CHECK (interview_type IN (
        'PHONE', 'VIDEO', 'IN_PERSON', 'TECHNICAL', 'HR'
    )),
    CONSTRAINT ck_interview_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX ix_interviews_application ON interviews (application_id, scheduled_at ASC);
CREATE INDEX ix_interviews_org ON interviews (organization_id);
CREATE INDEX ix_interviews_interviewer ON interviews (interviewer_user_id);

-- Permissions

INSERT INTO permissions (code, name) VALUES
    ('RECRUITMENT_VIEW',   'View job openings, candidates, applications and interviews'),
    ('RECRUITMENT_MANAGE', 'Create and manage job openings, candidates, applications and interviews');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'RECRUITMENT_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HR'))
   OR (p.code = 'RECRUITMENT_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'HR'));
