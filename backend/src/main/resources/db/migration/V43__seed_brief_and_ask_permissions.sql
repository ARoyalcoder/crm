-- V43: Seed permissions for AI Daily Brief and Ask Pawan

INSERT INTO permissions (code, name) VALUES
    ('BRIEF_VIEW', 'View the AI Daily Brief personalised to the user''s role'),
    ('ASK_VIEW',   'Use the Ask PAWAN AI natural-language query interface');

-- SUPER_ADMIN holds all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE p.code IN ('BRIEF_VIEW', 'ASK_VIEW')
  AND r.code = 'SUPER_ADMIN';

-- Management and operations roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE p.code IN ('BRIEF_VIEW', 'ASK_VIEW')
  AND r.code IN ('ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'PROJECT_MANAGER');
