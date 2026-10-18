-- Pawan Rewards: employee achievement rules, user achievement records,
-- customer loyalty points and transaction history.
--
-- Employee recognition:
--   - AchievementRule  – configures WHEN an achievement fires and what it awards
--   - UserAchievement  – records when a user earns an achievement
--
-- Customer loyalty:
--   - CustomerReward      – per-customer point balance and tier
--   - RewardTransaction   – individual point events (earned / redeemed / adjusted / expired)

-- ---- achievement_rules -------------------------------------------------------

CREATE TABLE achievement_rules (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    name                varchar(255)  NOT NULL,
    description         text,
    category            varchar(30)   NOT NULL,
    trigger_event_type  varchar(100)  NOT NULL,
    trigger_threshold   integer,
    employee_points     integer       NOT NULL DEFAULT 0,
    badge_level         varchar(20),
    active              boolean       NOT NULL DEFAULT true,
    created_by          varchar(100)  NOT NULL,
    updated_by          varchar(100)  NOT NULL,
    version             bigint        NOT NULL DEFAULT 0,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_achievement_rules PRIMARY KEY (id),
    CONSTRAINT ck_achievement_category CHECK (category IN (
        'FIRST_MILESTONE', 'COUNT_MILESTONE', 'TARGET_ACHIEVEMENT',
        'PERSONAL_BEST', 'CUSTOMER_FEEDBACK', 'RENEWAL', 'COMPLETION'
    )),
    CONSTRAINT ck_achievement_badge_level CHECK (badge_level IS NULL OR badge_level IN (
        'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'
    )),
    CONSTRAINT ck_achievement_employee_points CHECK (employee_points >= 0),
    CONSTRAINT ck_achievement_threshold CHECK (trigger_threshold IS NULL OR trigger_threshold > 0)
);

CREATE INDEX ix_achievement_rules_org ON achievement_rules (organization_id);
CREATE INDEX ix_achievement_rules_event ON achievement_rules (organization_id, trigger_event_type) WHERE active = true;

-- ---- user_achievements -------------------------------------------------------

CREATE TABLE user_achievements (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    user_id             uuid          NOT NULL,
    rule_id             uuid          NOT NULL,
    earned_at           timestamptz   NOT NULL DEFAULT now(),
    context             text,
    CONSTRAINT pk_user_achievements PRIMARY KEY (id),
    CONSTRAINT fk_user_achievement_rule FOREIGN KEY (rule_id) REFERENCES achievement_rules (id)
);

CREATE INDEX ix_user_achievements_user ON user_achievements (user_id, organization_id);
CREATE INDEX ix_user_achievements_rule ON user_achievements (rule_id);
CREATE INDEX ix_user_achievements_org  ON user_achievements (organization_id);

-- ---- customer_rewards --------------------------------------------------------

CREATE TABLE customer_rewards (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    customer_id         uuid          NOT NULL,
    total_points        integer       NOT NULL DEFAULT 0,
    tier                varchar(20)   NOT NULL DEFAULT 'STANDARD',
    last_activity_at    timestamptz,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_customer_rewards PRIMARY KEY (id),
    CONSTRAINT uq_customer_reward_customer UNIQUE (customer_id, organization_id),
    CONSTRAINT ck_customer_reward_tier CHECK (tier IN ('STANDARD', 'SILVER', 'GOLD', 'PLATINUM')),
    CONSTRAINT ck_customer_reward_points CHECK (total_points >= 0)
);

CREATE INDEX ix_customer_rewards_org ON customer_rewards (organization_id);
CREATE INDEX ix_customer_rewards_tier ON customer_rewards (organization_id, tier);

-- ---- reward_transactions -----------------------------------------------------

CREATE TABLE reward_transactions (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    customer_id         uuid          NOT NULL,
    transaction_type    varchar(20)   NOT NULL,
    points              integer       NOT NULL,
    reason              varchar(255)  NOT NULL,
    reference_type      varchar(50),
    reference_id        uuid,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_reward_transactions PRIMARY KEY (id),
    CONSTRAINT ck_reward_transaction_type CHECK (transaction_type IN (
        'EARNED', 'REDEEMED', 'ADJUSTED', 'EXPIRED'
    ))
);

CREATE INDEX ix_reward_transactions_customer ON reward_transactions (customer_id, organization_id, created_at DESC);
CREATE INDEX ix_reward_transactions_org      ON reward_transactions (organization_id, created_at DESC);

-- ---- Permissions -------------------------------------------------------------

INSERT INTO permissions (code, name) VALUES
    ('REWARDS_VIEW',   'View achievement rules, user achievements, leaderboard and customer reward balances'),
    ('REWARDS_MANAGE', 'Create/update achievement rules; add, adjust and redeem customer points');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'REWARDS_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'PROJECT_MANAGER', 'HR'))
   OR (p.code = 'REWARDS_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'));
