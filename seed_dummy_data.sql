-- ==============================================================================
-- PAWAN PUTRA BUSINESS OS CRM: COMPLETE COMPREHENSIVE DUMMY DATA SEED
-- Covers all 13 Roles, all 6 Service Verticals, and complete interconnected workflows.
-- Fully synthetic, safe, repeatable, and idempotent (ON CONFLICT DO NOTHING / UPDATE).
-- Zero Real Estate data.
-- Standard password for all testing users: Password@123
-- Password BCrypt Hash: {bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W
-- ==============================================================================

-- 1. ORGANIZATION
INSERT INTO organizations (id, code, name, legal_name, tax_id, email, phone, status, created_by, updated_by)
VALUES (
  '32fb34a6-d1b7-4533-ba6a-0a94c8015329',
  'PPO-HQ',
  'Pawan Putra Enterprises',
  'Pawan Putra Business OS Private Limited',
  '27AAACP0123P1Z5',
  'contact@pawanputra.com',
  '+91 22 4912 3456',
  'ACTIVE',
  'system',
  'system'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  tax_id = EXCLUDED.tax_id;

-- 2. BRANCHES
INSERT INTO branches (id, organization_id, code, name, city, state, postal_code, address_line1, head_office, active, created_by, updated_by)
VALUES
  ('a1000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'HQ-MUM', 'Mumbai Head Office', 'Mumbai', 'Maharashtra', '400001', 'Nariman Point, 10th Floor, Express Towers', true, true, 'system', 'system'),
  ('a1000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'BR-DEL', 'Delhi NCR Branch', 'New Delhi', 'Delhi', '110001', 'Connaught Place, Outer Circle, Block C', false, true, 'system', 'system'),
  ('a1000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'BR-BLR', 'Bengaluru Branch', 'Bengaluru', 'Karnataka', '560001', 'Indiranagar, 100ft Road, Metro Pillar 42', false, true, 'system', 'system'),
  ('a1000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'BR-PUN', 'Pune West Branch', 'Pune', 'Maharashtra', '411001', 'Senapati Bapat Road, ICC Tech Park', false, true, 'system', 'system')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state = EXCLUDED.state;

-- 3. SERVICE CATALOG: CATEGORIES & SERVICES ACROSS 6 VERTICALS (ZERO REAL ESTATE)
INSERT INTO service_categories (id, vertical_id, code, name, description, display_order, active, created_by, updated_by)
SELECT
  t.id, v.id, t.code, t.name, t.description, t.display_order, true, 'system', 'system'
FROM (VALUES
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'CCTV_SECURITY',     'CAT_CCTV',     'Surveillance & Access', 'Commercial IP CCTV, Access Control and Perimeter Alarm', 1),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'DIGITAL_MARKETING', 'CAT_DIGITAL',  'Growth & Performance',  'SEO, PPC Advertising, and Content Growth Marketing', 2),
  ('b1000000-0000-0000-0000-000000000003'::uuid, 'INTERIOR_DESIGN',   'CAT_INTERIOR', 'Commercial Fitouts',    'Turnkey Office Fitout, Retail Design and Acoustics', 3),
  ('b1000000-0000-0000-0000-000000000004'::uuid, 'ARCHITECTURE_TECH', 'CAT_ARCH',     'BIM & Smart BMS',       'Architectural 3D BIM, CAD Planning and Smart BMS', 4),
  ('b1000000-0000-0000-0000-000000000005'::uuid, 'SOLAR',             'CAT_SOLAR',    'Solar Power Plants',    'Rooftop On-Grid Solar PV Systems and Net Metering', 5),
  ('b1000000-0000-0000-0000-000000000006'::uuid, 'IT_SUPPORT',        'CAT_IT',       'Managed IT & Cloud',    'Enterprise Networking, Server Infra and 24x7 Helpdesk', 6)
) AS t (id, vertical_code, code, name, description, display_order)
JOIN service_verticals v ON v.code = t.vertical_code
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, category_id, code, name, description, billing_type, base_price, requires_site_visit, estimated_duration_days, display_order, active, created_by, updated_by)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'SRV_CCTV_IP',        'Commercial IP CCTV System',        'High-definition NVR and IP camera surveillance setup', 'QUOTE_BASED', 45000.00,  true,  5, 1, true, 'system', 'system'),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'SRV_PERF_MARKETING', 'Performance Growth Marketing',     'Meta & Google Ads targeted customer acquisition',     'RECURRING',   35000.00,  false, 30, 2, true, 'system', 'system'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'SRV_OFFICE_INTERIOR','Corporate Turnkey Office Fitout',  'End-to-end interior design, partitions, and lighting', 'QUOTE_BASED', 250000.00, true,  45, 3, true, 'system', 'system'),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'SRV_BIM_MODELING',   'Architectural BIM 3D Modeling',    'LOD 350 BIM modeling and clash detection report',     'QUOTE_BASED', 120000.00, true,  20, 4, true, 'system', 'system'),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'SRV_SOLAR_ONGRID',   'Commercial On-Grid Solar Plant',   'Tier-1 Solar PV modules with net-metering approval',  'QUOTE_BASED', 450000.00, true,  15, 5, true, 'system', 'system'),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', 'SRV_IT_INFRA',       'Managed IT Infrastructure & NOC',  'Firewall, server maintenance, backup and 24x7 NOC',   'RECURRING',   25000.00,  true,  30, 6, true, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 4. ALL 13 TEST USERS (PASSWORD: Password@123)
INSERT INTO users (id, organization_id, branch_id, email, full_name, phone, password_hash, status, created_by, updated_by)
VALUES
  ('10000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'superadmin@pawanputra.com',    'Vijay Sharma (Super Admin)',     '+91 98000 00001', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'admin@pawanputra.com',         'Sunita Rao (Admin)',             '+91 98000 00002', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'director@pawanputra.com',      'Aditya Vikram (Director)',       '+91 98000 00003', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'sales.manager@pawanputra.com', 'Rajesh Mehta (Sales Manager)',   '+91 98000 00004', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000005', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'sales.exec@pawanputra.com',    'Kavita Nair (Sales Exec)',       '+91 98000 00005', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000006', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000002', 'project.manager@pawanputra.com','Amit Saxena (Project Manager)', '+91 98000 00006', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000007', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000003', 'designer@pawanputra.com',       'Neha Kulkarni (Designer)',       '+91 98000 00007', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000008', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'technician@pawanputra.com',     'Ramesh Yadav (Technician)',      '+91 98000 00008', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000009', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'finance@pawanputra.com',        'Pooja Agarwal (Finance)',        '+91 98000 00009', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000010', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'hr@pawanputra.com',             'Deepak Joshi (HR)',              '+91 98000 00010', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000011', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'support@pawanputra.com',        'Siddharth Sen (Support Agent)',  '+91 98000 00011', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000012', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'vendor@securetech.in',          'Vipin Gujral (Vendor Partner)',  '+91 98000 00012', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system'),
  ('10000000-0000-0000-0000-000000000013', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'a1000000-0000-0000-0000-000000000001', 'partner@apexalliances.com',    'Karan Chawla (Channel Partner)', '+91 98000 00013', '{bcrypt}$2a$10$IwIBRWnlFbIWdYuPq73eBOPMrQ5ht1EYiyJcZBZXN0W2oODxbDQ/W', 'ACTIVE', 'system', 'system')
ON CONFLICT (id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  status = 'ACTIVE',
  full_name = EXCLUDED.full_name;

-- Map users to roles
INSERT INTO user_roles (user_id, role_id, created_by)
SELECT u.id, r.id, 'system'
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'SUPER_ADMIN'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'ADMIN'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'DIRECTOR'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'SALES_MANAGER'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'SALES_EXECUTIVE'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'PROJECT_MANAGER'),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'DESIGNER'),
  ('10000000-0000-0000-0000-000000000008'::uuid, 'TECHNICIAN'),
  ('10000000-0000-0000-0000-000000000009'::uuid, 'FINANCE'),
  ('10000000-0000-0000-0000-000000000010'::uuid, 'HR'),
  ('10000000-0000-0000-0000-000000000011'::uuid, 'SUPPORT_AGENT'),
  ('10000000-0000-0000-0000-000000000012'::uuid, 'VENDOR'),
  ('10000000-0000-0000-0000-000000000013'::uuid, 'PARTNER')
) AS mapping(user_id, role_code)
JOIN users u ON u.id = mapping.user_id
JOIN roles r ON r.code = mapping.role_code
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 5. REALISTIC CUSTOMERS (ACROSS MUMBAI, DELHI, BENGALURU, PUNE)
INSERT INTO customers (id, organization_id, customer_number, type, display_name, company_name, company_name_key, tax_id, email, phone, phone_key, status, source, assigned_user_id, created_by, updated_by)
VALUES
  ('d1000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001001', 'BUSINESS', 'Reliance Retail Ltd',         'Reliance Retail Ltd',         'relianceretail',         '27AAACR1234F1Z1', 'procurement@relianceretail.com', '+91 22 2288 1100', '912222881100', 'ACTIVE', 'REFERRAL',    '10000000-0000-0000-0000-000000000004', 'system', 'system'),
  ('d1000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001002', 'BUSINESS', 'Tata Consultancy Services',   'Tata Consultancy Services',   'tataconsultancyservices','27AAACT0414G1ZW', 'facilities@tcs.com',              '+91 22 6778 2000', '912267782000', 'ACTIVE', 'PARTNER',     '10000000-0000-0000-0000-000000000005', 'system', 'system'),
  ('d1000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001003', 'BUSINESS', 'HDFC Bank Corporate Office',  'HDFC Bank Corporate Office',  'hdfcbankcorporate',      '27AAACH2702H1Z2', 'infra@hdfcbank.com',            '+91 22 6631 6000', '912266316000', 'ACTIVE', 'WEBSITE',     '10000000-0000-0000-0000-000000000004', 'system', 'system'),
  ('d1000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001004', 'BUSINESS', 'Greenfield Warehousing',      'Greenfield Warehousing',      'greenfieldwarehousing',  '27AABCG5512J1Z8', 'ops@greenfieldlogistics.in',    '+91 98200 44556', '919820044556', 'ACTIVE', 'SOCIAL_MEDIA','10000000-0000-0000-0000-000000000005', 'system', 'system'),
  ('d1000000-0000-0000-0000-000000000005', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001005', 'BUSINESS', 'Apex FinTech Solutions',      'Apex FinTech Solutions',      'apexfintechsolutions',   '29AAACA9921K1Z4', 'tech@apexfintech.com',          '+91 80 4112 8899', '918041128899', 'ACTIVE', 'PHONE_CALL',   '10000000-0000-0000-0000-000000000005', 'system', 'system'),
  ('d1000000-0000-0000-0000-000000000006', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001006', 'BUSINESS', 'Kaveri Spinning Mills',       'Kaveri Spinning Mills',       'kaverispinningmills',    '33AAACK4490L1ZO', 'factory@kaverispun.com',        '+91 42 2256 7890', '914222567890', 'ACTIVE', 'REFERRAL',    '10000000-0000-0000-0000-000000000004', 'system', 'system'),
  ('d1000000-0000-0000-0000-000000000007', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001007', 'BUSINESS', 'Verma Dental Clinics Chain',  'Verma Dental Clinics Chain',  'vermadentalclinics',     '07AABCV8810M1Z3', 'drverma@vermadental.in',        '+91 11 2654 3322', '911126543322', 'ACTIVE', 'WALK_IN',     '10000000-0000-0000-0000-000000000005', 'system', 'system'),
  ('d1000000-0000-0000-0000-000000000008', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'CUS-001008', 'BUSINESS', 'Urban Logistics Hub',         'Urban Logistics Hub',         'urbanlogisticshub',      '27AAACU1122N1Z6', 'admin@urbanlogistics.co.in',    '+91 20 2567 1144', '912025671144', 'ACTIVE', 'ADVERTISEMENT','10000000-0000-0000-0000-000000000005', 'system', 'system')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  company_name = EXCLUDED.company_name;

-- 6. SALES PIPELINES & STAGES
INSERT INTO pipelines (id, organization_id, name, code, description, is_default, active, created_by, updated_by)
VALUES (
  '11000000-0000-0000-0000-000000000001',
  '32fb34a6-d1b7-4533-ba6a-0a94c8015329',
  'Standard Sales Pipeline',
  'PIPE_STANDARD',
  'Default pipeline for commercial quotes and deals',
  true,
  true,
  'system',
  'system'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, pipeline_id, name, code, display_order, default_probability, is_won, is_lost, color, created_by, updated_by)
VALUES
  ('12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Lead Prospecting',     'STAGE_PROSPECT',   1, 15,  false, false, 'blue',   'system', 'system'),
  ('12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Needs Qualification', 'STAGE_QUALIFY',    2, 35,  false, false, 'cyan',   'system', 'system'),
  ('12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'Quotation Proposed',  'STAGE_PROPOSAL',   3, 60,  false, false, 'amber',  'system', 'system'),
  ('12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'Contract Negotiation', 'STAGE_NEGOTIATE',  4, 85,  false, false, 'purple', 'system', 'system'),
  ('12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', 'Closed Won',          'STAGE_WON',        5, 100, true,  false, 'emerald','system', 'system'),
  ('12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000001', 'Closed Lost',         'STAGE_LOST',       6, 0,   false, true,  'rose',   'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 7. LEADS (HOT, UNTOUCHED/RISK, DISQUALIFIED)
INSERT INTO leads (id, organization_id, lead_number, contact_name, company_name, email, phone, service_id, estimated_value, status, priority, health, qualification_status, score, created_by, updated_by)
VALUES
  ('e1000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'LD-001001', 'Vikram Malhotra', 'Greenfield Warehousing',     'vikram@greenfieldlogistics.in', '+91 99001 12233', 'c1000000-0000-0000-0000-000000000001', 350000.00, 'OPEN', 'HIGH',   'GOOD', 'QUALIFIED',    85, 'system', 'system'),
  ('e1000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'LD-001002', 'Ananya Deshmukh', 'Apex FinTech Solutions',     'ananya@apexfintech.com',        '+91 99002 23344', 'c1000000-0000-0000-0000-000000000006', 180000.00, 'OPEN', 'HIGH',   'GOOD', 'QUALIFIED',    92, 'system', 'system'),
  ('e1000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'LD-001003', 'Suresh Kumar',    'Kaveri Spinning Mills',      'suresh@kaverispun.com',         '+91 99003 34455', 'c1000000-0000-0000-0000-000000000005', 2100000.00,'OPEN', 'HIGH',   'GOOD', 'QUALIFIED',    95, 'system', 'system'),
  ('e1000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'LD-001004', 'Pooja Verma',     'Verma Dental Clinics Chain', 'pooja@vermadental.in',          '+91 99004 45566', 'c1000000-0000-0000-0000-000000000003', 450000.00, 'OPEN', 'MEDIUM', 'NEEDS_ATTENTION', 'IN_PROGRESS', 55, 'system', 'system'),
  ('e1000000-0000-0000-0000-000000000005', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'LD-001005', 'Rohan Mehra',     'Urban Logistics Hub',        'rohan@urbanlogistics.co.in',    '+91 99005 56677', 'c1000000-0000-0000-0000-000000000004', 150000.00, 'OPEN', 'LOW',    'AT_RISK',         'DISQUALIFIED', 25, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 8. OPPORTUNITIES
INSERT INTO opportunities (id, organization_id, title, customer_id, customer_name, service_id, service_name, vertical_code, value, probability, expected_close_date, owner_id, owner_name, pipeline_id, stage_id, status, created_by, updated_by)
VALUES
  ('f1000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'Reliance 50-Store CCTV Upgrade',       'd1000000-0000-0000-0000-000000000001', 'Reliance Retail Ltd',        'c1000000-0000-0000-0000-000000000001', 'Commercial IP CCTV System',       'CCTV_SECURITY',     850000.00,  85, CURRENT_DATE + INTERVAL '10 days', '10000000-0000-0000-0000-000000000005', 'Kavita Nair', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000004', 'OPEN', 'system', 'system'),
  ('f1000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'TCS Hinjawadi 100kW Solar Plant',      'd1000000-0000-0000-0000-000000000002', 'Tata Consultancy Services',  'c1000000-0000-0000-0000-000000000005', 'Commercial On-Grid Solar Plant',  'SOLAR',             2400000.00, 100, CURRENT_DATE - INTERVAL '5 days',  '10000000-0000-0000-0000-000000000004', 'Rajesh Mehta','11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000005', 'WON',  'system', 'system'),
  ('f1000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'Apex FinTech Server Room Fitout',       'd1000000-0000-0000-0000-000000000005', 'Apex FinTech Solutions',     'c1000000-0000-0000-0000-000000000003', 'Corporate Turnkey Office Fitout', 'INTERIOR_DESIGN',   620000.00,  60, CURRENT_DATE + INTERVAL '25 days', '10000000-0000-0000-0000-000000000005', 'Kavita Nair', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000003', 'OPEN', 'system', 'system'),
  ('f1000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'Kaveri Mills Old Mill Automation (Lost)','d1000000-0000-0000-0000-000000000006', 'Kaveri Spinning Mills',      'c1000000-0000-0000-0000-000000000004', 'Architectural BIM 3D Modeling',   'ARCHITECTURE_TECH', 350000.00,  0,   CURRENT_DATE - INTERVAL '12 days', '10000000-0000-0000-0000-000000000005', 'Kavita Nair', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000006', 'LOST', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 9. QUOTATIONS & APPROVAL WORKFLOW
INSERT INTO quotations (id, organization_id, quotation_number, title, customer_id, customer_name, opportunity_id, opportunity_title, status, valid_until, owner_id, owner_name, subtotal, discount_amount, tax_amount, final_amount, approval_required, approved_by, created_by, updated_by)
VALUES
  ('71000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'QT-2627-001', 'Quotation for Reliance 50-Store CCTV', 'd1000000-0000-0000-0000-000000000001', 'Reliance Retail Ltd', 'f1000000-0000-0000-0000-000000000001', 'Reliance 50-Store CCTV Upgrade', 'APPROVED', CURRENT_DATE + INTERVAL '30 days', '10000000-0000-0000-0000-000000000005', 'Kavita Nair', 720000.00, 20000.00, 126000.00, 826000.00, true, 'Rajesh Mehta', 'system', 'system'),
  ('71000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'QT-2627-002', 'TCS Hinjawadi Solar Plant Turnkey Quote', 'd1000000-0000-0000-0000-000000000002', 'Tata Consultancy Services', 'f1000000-0000-0000-0000-000000000002', 'TCS Hinjawadi 100kW Solar Plant', 'ACCEPTED', CURRENT_DATE + INTERVAL '15 days', '10000000-0000-0000-0000-000000000004', 'Rajesh Mehta', 2033898.31, 0.00, 366101.69, 2400000.00, false, null, 'system', 'system'),
  ('71000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'QT-2627-003', 'Apex FinTech Server Room Interior Fitout', 'd1000000-0000-0000-0000-000000000005', 'Apex FinTech Solutions', 'f1000000-0000-0000-0000-000000000003', 'Apex FinTech Server Room Fitout', 'PENDING_APPROVAL', CURRENT_DATE + INTERVAL '20 days', '10000000-0000-0000-0000-000000000005', 'Kavita Nair', 550000.00, 50000.00, 90000.00, 590000.00, true, null, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 10. ORDERS
INSERT INTO orders (id, organization_id, order_number, title, customer_id, customer_name, quotation_id, quotation_number, status, subtotal, discount_amount, tax_amount, final_amount, owner_id, owner_name, delivery_date, created_by, updated_by)
VALUES
  ('61000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ORD-2627-001', 'TCS 100kW Rooftop Solar Installation', 'd1000000-0000-0000-0000-000000000002', 'Tata Consultancy Services', '71000000-0000-0000-0000-000000000002', 'QT-2627-002', 'COMPLETED', 2033898.31, 0.00, 366101.69, 2400000.00, '10000000-0000-0000-0000-000000000004', 'Rajesh Mehta', CURRENT_DATE - INTERVAL '15 days', 'system', 'system'),
  ('61000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ORD-2627-002', 'Reliance Bandra Flagship CCTV & Security', 'd1000000-0000-0000-0000-000000000001', 'Reliance Retail Ltd', '71000000-0000-0000-0000-000000000001', 'QT-2627-001', 'IN_PROGRESS', 720000.00, 20000.00, 126000.00, 826000.00, '10000000-0000-0000-0000-000000000005', 'Kavita Nair', CURRENT_DATE + INTERVAL '10 days', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 11. PROJECTS
INSERT INTO projects (id, organization_id, project_number, title, customer_id, customer_name, order_id, order_number, service_id, service_name, project_manager_id, project_manager_name, start_date, expected_completion_date, actual_completion_date, status, priority, budget, revenue, cost, progress_percentage, created_by, updated_by)
VALUES
  ('41000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'PRJ-2627-001', 'TCS Hinjawadi 100kW Solar Installation', 'd1000000-0000-0000-0000-000000000002', 'Tata Consultancy Services', '61000000-0000-0000-0000-000000000001', 'ORD-2627-001', 'c1000000-0000-0000-0000-000000000005', 'Commercial On-Grid Solar Plant', '10000000-0000-0000-0000-000000000006', 'Amit Saxena', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '14 days', 'COMPLETED', 'HIGH', 1800000.00, 2400000.00, 1650000.00, 100, 'system', 'system'),
  ('41000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'PRJ-2627-002', 'Reliance Bandra Flagship CCTV & Access', 'd1000000-0000-0000-0000-000000000001', 'Reliance Retail Ltd', '61000000-0000-0000-0000-000000000002', 'ORD-2627-002', 'c1000000-0000-0000-0000-000000000001', 'Commercial IP CCTV System', '10000000-0000-0000-0000-000000000006', 'Amit Saxena', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days',  null, 'IN_PROGRESS', 'URGENT', 600000.00, 826000.00, 580000.00, 65, 'system', 'system'),
  ('41000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'PRJ-2627-003', 'Apex FinTech Commercial Interior Fitout', 'd1000000-0000-0000-0000-000000000005', 'Apex FinTech Solutions', null, null, 'c1000000-0000-0000-0000-000000000003', 'Corporate Turnkey Office Fitout', '10000000-0000-0000-0000-000000000006', 'Amit Saxena', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '30 days', null, 'IN_PROGRESS', 'MEDIUM', 450000.00, 620000.00, 310000.00, 40, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 12. PROJECT TASKS
INSERT INTO project_tasks (id, project_id, title, description, assigned_to_id, assigned_to_name, status, priority, due_date, completed_at, display_order, created_by, updated_by)
VALUES
  ('51000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', 'Core Conduit & Optical Cabling', 'Run cat6 shielded cabling from server rack to floor cameras', '10000000-0000-0000-0000-000000000008', 'Ramesh Yadav', 'COMPLETED', 'HIGH', CURRENT_DATE - INTERVAL '10 days', now() - INTERVAL '10 days', 1, 'system', 'system'),
  ('51000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002', 'Camera Mounting & NVR IP Configuration', 'Mount 32 4K bullet cameras, configure IP subnet & test streaming', '10000000-0000-0000-0000-000000000008', 'Ramesh Yadav', 'IN_PROGRESS', 'URGENT', CURRENT_DATE - INTERVAL '2 days', null, 2, 'system', 'system'),
  ('51000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000003', '3D Acoustic Layout CAD Drawings', 'Draft ergonomic floor layout and false-ceiling acoustic plans', '10000000-0000-0000-0000-000000000007', 'Neha Kulkarni', 'COMPLETED', 'MEDIUM', CURRENT_DATE - INTERVAL '5 days', now() - INTERVAL '5 days', 1, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 14. INVOICES (PAID, PARTIALLY_PAID, OVERDUE)
INSERT INTO invoices (id, organization_id, invoice_number, status, customer_id, customer_name, issue_date, due_date, subtotal, discount_total, tax_total, total, amount_paid, issued_at, issued_by_name, created_by, updated_by)
VALUES
  ('91000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'INV-2627-000001', 'PAID',           'd1000000-0000-0000-0000-000000000002', 'Tata Consultancy Services', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '10 days', 2033898.31, 0, 366101.69, 2400000.00, 2400000.00, now() - INTERVAL '40 days', 'Pooja Agarwal', 'system', 'system'),
  ('91000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'INV-2627-000002', 'PARTIALLY_PAID', 'd1000000-0000-0000-0000-000000000001', 'Reliance Retail Ltd',       CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '10 days', 700000.00,   0, 126000.00,  826000.00,  400000.00, now() - INTERVAL '25 days', 'Pooja Agarwal', 'system', 'system'),
  ('91000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'INV-2627-000003', 'ISSUED',         'd1000000-0000-0000-0000-000000000004', 'Greenfield Warehousing',    CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '15 days', 296610.17,   0,  53389.83,  350000.00,          0.00, now() - INTERVAL '35 days', 'Pooja Agarwal', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 15. PAYMENTS & ALLOCATIONS
INSERT INTO payments (id, organization_id, payment_number, customer_id, customer_name, received_on, amount, method_id, method_name, reference, allocated_amount, recorded_by_name, created_by, updated_by)
VALUES
  ('21000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'PAY-2627-000001', 'd1000000-0000-0000-0000-000000000002', 'Tata Consultancy Services', CURRENT_DATE - INTERVAL '15 days', 2400000.00, 'ba888e0b-fb94-4541-8dc8-1331b241742b', 'Bank transfer', 'HDFCN26270081299', 2400000.00, 'Pooja Agarwal', 'system', 'system'),
  ('21000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'PAY-2627-000002', 'd1000000-0000-0000-0000-000000000001', 'Reliance Retail Ltd',       CURRENT_DATE - INTERVAL '5 days',   400000.00, 'ba888e0b-fb94-4541-8dc8-1331b241742b', 'Bank transfer', 'SBIN00293817291',  400000.00, 'Pooja Agarwal', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_allocations (id, organization_id, payment_id, invoice_id, amount, allocated_by_name)
VALUES
  ('22000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '21000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 2400000.00, 'Pooja Agarwal'),
  ('22000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '21000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000002',  400000.00, 'Pooja Agarwal')
ON CONFLICT (id) DO NOTHING;

-- 16. RECEIVABLES & OVERDUE COLLECTION TASKS
INSERT INTO receivables_config (id, organization_id, overdue_days_1, overdue_days_2, collection_task_enabled, escalation_enabled, escalation_user_id)
VALUES (
  '82000000-0000-0000-0000-000000000001',
  '32fb34a6-d1b7-4533-ba6a-0a94c8015329',
  3,
  15,
  true,
  true,
  '10000000-0000-0000-0000-000000000009'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO collection_tasks (id, organization_id, invoice_id, customer_id, assigned_to_user_id, priority, status, due_date, notes, created_by, updated_by)
VALUES (
  '83000000-0000-0000-0000-000000000001',
  '32fb34a6-d1b7-4533-ba6a-0a94c8015329',
  '91000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000009',
  'HIGH',
  'OPEN',
  CURRENT_DATE + INTERVAL '2 days',
  'Invoice INV-2627-000003 is 15 days overdue. Follow up with Greenfield finance desk.',
  'system',
  'system'
)
ON CONFLICT (id) DO NOTHING;

-- 17. WARRANTIES & AMC CONTRACTS
INSERT INTO warranties (id, organization_id, customer_id, order_id, project_id, description, terms, start_date, end_date, status, created_by, updated_by)
VALUES (
  '13000000-0000-0000-0000-000000000001',
  '32fb34a6-d1b7-4533-ba6a-0a94c8015329',
  'd1000000-0000-0000-0000-000000000002',
  '61000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '5-Year Comprehensive Solar Inverter & Module Performance Warranty',
  'Covers manufacturing defects and power output degradation below 80% capacity.',
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '1810 days',
  'ACTIVE',
  'system',
  'system'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO amc_contracts (id, organization_id, contract_number, customer_id, contract_value, currency, start_date, end_date, frequency, assigned_employee_id, status, renewal_status, notes, created_by, updated_by)
VALUES
  ('14000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'AMC-2627-001', 'd1000000-0000-0000-0000-000000000003', 180000.00, 'INR', CURRENT_DATE - INTERVAL '345 days', CURRENT_DATE + INTERVAL '20 days', 'QUARTERLY', '10000000-0000-0000-0000-000000000008', 'ACTIVE', 'DUE_SOON', 'HDFC Bank biometric controllers preventive AMC. Expires in 20 days - prime renewal target.', 'system', 'system'),
  ('14000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'AMC-2627-002', 'd1000000-0000-0000-0000-000000000001', 240000.00, 'INR', CURRENT_DATE - INTERVAL '60 days',  CURRENT_DATE + INTERVAL '305 days', 'BI_MONTHLY','10000000-0000-0000-0000-000000000008', 'ACTIVE', 'NOT_DUE',  'Reliance Retail NVR maintenance and camera lens cleaning.', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 18. SUPPORT DESK: SLA & TICKETS
INSERT INTO sla_definitions (id, organization_id, name, response_time_hours, resolution_time_hours, priority, active, created_by, updated_by)
VALUES
  ('ba000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'Critical Mission SLA',     1, 4,  'CRITICAL', true, 'system', 'system'),
  ('ba000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'Standard Enterprise SLA', 4, 24, 'MEDIUM',   true, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tickets (id, organization_id, ticket_number, customer_id, customer_name, subject, description, priority, status, assigned_user_id, assigned_user_name, sla_id, due_at, created_by, updated_by)
VALUES
  ('bb000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'TKT-0001', 'd1000000-0000-0000-0000-000000000001', 'Reliance Retail Ltd',        'Camera #4 Signal Loss at Bandra Store', 'Channel 4 PTZ camera offline since 8 AM. Needs onsite technician cable test.', 'HIGH',     'IN_PROGRESS', '10000000-0000-0000-0000-000000000008', 'Ramesh Yadav', 'ba000000-0000-0000-0000-000000000002', now() + INTERVAL '8 hours', 'system', 'system'),
  ('bb000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'TKT-0002', 'd1000000-0000-0000-0000-000000000003', 'HDFC Bank Corporate Office', 'Quarterly Biometric Controller Health Check', 'Regular scheduled check of turnstiles and server room access cards.',   'MEDIUM',   'OPEN',        '10000000-0000-0000-0000-000000000011', 'Siddharth Sen','ba000000-0000-0000-0000-000000000002', now() + INTERVAL '24 hours','system', 'system'),
  ('bb000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'TKT-0003', 'd1000000-0000-0000-0000-000000000002', 'Tata Consultancy Services', 'Solar Inverter Gateway Reconnection',  'RS-485 Modbus logger restored successfully after network switch reboot.',  'CRITICAL', 'RESOLVED',    '10000000-0000-0000-0000-000000000008', 'Ramesh Yadav', 'ba000000-0000-0000-0000-000000000001', now() - INTERVAL '2 hours', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 19. VENDORS & PARTNERS
INSERT INTO vendors (id, organization_id, company_name, contact_email, contact_phone, services, payment_terms_days, status, notes, created_by, updated_by)
VALUES
  ('15000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'SecureTech Hardware Supplies', 'vendor@securetech.in', '+91 22 2844 5511', 'Hikvision & Dahua 4K Cameras, Cat6 Drums', 30, 'ACTIVE', 'Primary CCTV equipment distributor.', 'system', 'system'),
  ('15000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'SunPower PV Inverters Ltd',    'sales@sunpowerinverters.com', '+91 20 6611 2233', 'On-Grid String Inverters, DC Distribution Boxes', 45, 'ACTIVE', 'Tier-1 Solar components supplier.', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, organization_id, organization_name, contact_email, contact_phone, access_level, services, active, user_id, notes, created_by, updated_by)
VALUES (
  '16000000-0000-0000-0000-000000000001',
  '32fb34a6-d1b7-4533-ba6a-0a94c8015329',
  'Apex Alliance Consultants',
  'partner@apexalliances.com',
  '+91 80 4455 6677',
  'READ_ONLY',
  'Commercial IT & Security Lead Generation',
  true,
  '10000000-0000-0000-0000-000000000013',
  'Authorized referral alliance partner in Karnataka.',
  'system',
  'system'
)
ON CONFLICT (id) DO NOTHING;

-- 20. WORKFORCE: EMPLOYEE PROFILES & ATTENDANCE
INSERT INTO employee_profiles (id, organization_id, user_id, employee_code, department, designation, joining_date, employment_status, created_by, updated_by)
VALUES
  ('ea000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000004', 'EMP-001', 'SALES',       'Senior Sales Manager',        '2024-01-15', 'ACTIVE', 'system', 'system'),
  ('ea000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000005', 'EMP-002', 'SALES',       'Key Account Executive',       '2024-06-01', 'ACTIVE', 'system', 'system'),
  ('ea000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000006', 'EMP-003', 'OPERATIONS',  'Lead Project Delivery Lead',  '2024-02-10', 'ACTIVE', 'system', 'system'),
  ('ea000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000007', 'EMP-004', 'DESIGN',      'Principal Spatial Designer',  '2024-07-15', 'ACTIVE', 'system', 'system'),
  ('ea000000-0000-0000-0000-000000000005', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000008', 'EMP-005', 'TECHNICAL',   'Senior Field Technician',     '2024-03-20', 'ACTIVE', 'system', 'system'),
  ('ea000000-0000-0000-0000-000000000006', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000009', 'EMP-006', 'FINANCE',     'Financial Controller',        '2024-01-10', 'ACTIVE', 'system', 'system'),
  ('ea000000-0000-0000-0000-000000000007', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000010', 'EMP-007', 'HR',          'People Operations Lead',      '2024-01-05', 'ACTIVE', 'system', 'system'),
  ('ea000000-0000-0000-0000-000000000008', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000011', 'EMP-008', 'OPERATIONS',  'Helpdesk Support Lead',       '2024-05-12', 'ACTIVE', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO attendance_records (id, organization_id, employee_id, attendance_date, type, check_in, check_out, working_hours, created_at, updated_at)
VALUES
  ('eb000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ea000000-0000-0000-0000-000000000002', CURRENT_DATE, 'PRESENT', '09:02:00', '18:15:00', 9.2, now(), now()),
  ('eb000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ea000000-0000-0000-0000-000000000005', CURRENT_DATE, 'PRESENT', '08:45:00', '17:30:00', 8.75, now(), now()),
  ('eb000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ea000000-0000-0000-0000-000000000003', CURRENT_DATE, 'PRESENT', '09:10:00', '18:00:00', 8.8, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 21. PERFORMANCE TARGETS
INSERT INTO performance_targets (id, organization_id, employee_id, target_type, period, period_year, period_month, target_value, notes, created_by, updated_by)
VALUES
  ('17000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ee100000-0000-0000-0000-000000000004', 'SALES_REVENUE',       'MONTHLY', 2026, 10, 1500000.00, 'Q3 Sales target for corporate CCTV and IT deals', 'system', 'system'),
  ('17000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ee100000-0000-0000-0000-000000000008', 'COLLECTION_AMOUNT',   'MONTHLY', 2026, 10, 2500000.00, 'Monthly collection recovery target', 'system', 'system'),
  ('17000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ee100000-0000-0000-0000-000000000005', 'PROJECT_COMPLETION', 'MONTHLY', 2026, 10, 3.00,       'Complete TCS solar and Reliance initial milestone', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 22. PAWAN REWARDS & CUSTOMER LOYALTY
INSERT INTO achievement_rules (id, organization_id, name, description, category, trigger_event_type, trigger_threshold, employee_points, badge_level, active, created_by, updated_by)
VALUES
  ('18000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'First Mega Project Delivered', 'Delivered a turnkey project exceeding 20 Lakhs INR', 'COMPLETION', 'PROJECT_COMPLETED', 1, 500, 'GOLD', true, 'system', 'system'),
  ('18000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'Zero Defect Field PoW',        '10 Consecutive Field Jobs verified without rework', 'CUSTOMER_FEEDBACK', 'FIELD_JOB_VERIFIED', 10, 250, 'SILVER', true, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_rewards (id, organization_id, customer_id, total_points, tier, last_activity_at, created_at, updated_at)
VALUES
  ('19000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'd1000000-0000-0000-0000-000000000002', 2400, 'PLATINUM', now(), now(), now()),
  ('19000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'd1000000-0000-0000-0000-000000000001', 820,  'GOLD',     now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 23. PAWAN PULSE AI INSIGHT FEED (ACHIEVEMENT, OPPORTUNITY, RISK, NEXT_BEST_ACTION)
INSERT INTO pulse_insights (id, organization_id, type, category, status, title, what_happened, why_it_matters, who_should_act, who_should_act_label, what_to_do, expected_impact, entity_type, entity_id, entity_label, score, created_at, updated_at)
VALUES
  ('1a000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'ACHIEVEMENT', 'PROJECT_COMPLETED', 'ACTIVE', 'TCS 100kW Solar Installation Finished Ahead of Schedule', 'Project PRJ-2627-001 completed in 31 days against 45 days budget.', 'Strengthens client relationship and unlocks 24 Lakh INR revenue recognition.', '10000000-0000-0000-0000-000000000006', 'Amit Saxena', 'Issue final performance warranty certificate and pitch annual solar AMC contract.', '+4.2 Lakh INR AMC pipeline addition', 'PROJECT', '41000000-0000-0000-0000-000000000001', 'PRJ-2627-001', 95, now(), now()),
  ('1a000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'OPPORTUNITY',  'AMC_RENEWAL',     'ACTIVE', 'HDFC Bank Biometric AMC Expiring in 20 Days',        'AMC contract AMC-2627-001 is due for renewal on ' || (CURRENT_DATE + INTERVAL '20 days')::text, 'Critical recurring revenue stream with 100% historical uptime.', '10000000-0000-0000-0000-000000000004', 'Rajesh Mehta', 'Send renewal proposal quotation with optional 3-year multi-year discount.', 'Protects 1.8 Lakh INR ARR and retains corporate account', 'AMC_CONTRACT', '14000000-0000-0000-0000-000000000001', 'AMC-2627-001', 88, now(), now()),
  ('1a000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'RISK',         'DELAYED_PROJECT', 'ACTIVE', 'Reliance Bandra CCTV Project Delayed by 5 Days',    'Project PRJ-2627-002 expected completion date passed with task mounting pending.', 'Retail client opening may be impacted, risking SLA penalty.', '10000000-0000-0000-0000-000000000006', 'Amit Saxena', 'Reassign extra technician to assist Ramesh Yadav for immediate 2-day push.', 'Prevents store opening delay and contract dispute', 'PROJECT', '41000000-0000-0000-0000-000000000002', 'PRJ-2627-002', 92, now(), now()),
  ('1a000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', 'NEXT_BEST_ACTION','COLLECT_PAYMENT','ACTIVE', 'Collect 3.5 Lakh INR Overdue from Greenfield Warehousing', 'Invoice INV-2627-000003 is 15 days overdue with zero payment recorded.', 'Affects weekly cash flow and receivables turnover.', '10000000-0000-0000-0000-000000000009', 'Pooja Agarwal', 'Call Greenfield accounting desk and log collection task follow-up.', 'Immediate recovery of 350,000 INR cash', 'INVOICE', '91000000-0000-0000-0000-000000000003', 'INV-2627-000003', 90, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 24. IN-APP NOTIFICATIONS
INSERT INTO notifications (id, organization_id, recipient_user_id, type, title, message, entity_type, entity_id, read, created_at)
VALUES
  ('1b000000-0000-0000-0000-000000000001', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000004', 'OPPORTUNITY',  'High-Value Solar Lead Qualified', 'Kaveri Spinning Mills lead LD-001003 qualified with 21 Lakh INR estimate.', 'LEAD', 'e1000000-0000-0000-0000-000000000003', false, now()),
  ('1b000000-0000-0000-0000-000000000002', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000006', 'RISK',         'Project Delayed Warning',         'Reliance Bandra CCTV Project PRJ-2627-002 has passed its estimated completion date.', 'PROJECT', '41000000-0000-0000-0000-000000000002', false, now()),
  ('1b000000-0000-0000-0000-000000000003', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000009', 'WARNING',      'Invoice Overdue Escalation',      'Invoice INV-2627-000003 for Greenfield Warehousing is now 15 days past due date.', 'INVOICE', '91000000-0000-0000-0000-000000000003', false, now()),
  ('1b000000-0000-0000-0000-000000000004', '32fb34a6-d1b7-4533-ba6a-0a94c8015329', '10000000-0000-0000-0000-000000000008', 'INFO',         'Field Job Assigned to You',       'Ticket TKT-0001 Camera #4 signal loss at Reliance Bandra store assigned for immediate visit.', 'TICKET', 'bb000000-0000-0000-0000-000000000001', false, now())
ON CONFLICT (id) DO NOTHING;

-- Done!
