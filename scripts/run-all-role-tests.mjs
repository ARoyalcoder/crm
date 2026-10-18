import fs from 'node:fs';

const BASE_URL = 'http://localhost:8085';

const ROLES = [
  { role: 'SUPER_ADMIN', email: 'superadmin@pawanputra.com', name: 'Vijay Sharma (Super Admin)' },
  { role: 'ADMIN', email: 'admin@pawanputra.com', name: 'Sunita Rao (Admin)' },
  { role: 'DIRECTOR', email: 'director@pawanputra.com', name: 'Aditya Vikram (Director)' },
  { role: 'SALES_MANAGER', email: 'sales.manager@pawanputra.com', name: 'Rajesh Mehta (Sales Manager)' },
  { role: 'SALES_EXECUTIVE', email: 'sales.exec@pawanputra.com', name: 'Kavita Nair (Sales Exec)' },
  { role: 'PROJECT_MANAGER', email: 'project.manager@pawanputra.com', name: 'Amit Saxena (Project Manager)' },
  { role: 'DESIGNER', email: 'designer@pawanputra.com', name: 'Neha Kulkarni (Designer)' },
  { role: 'TECHNICIAN', email: 'technician@pawanputra.com', name: 'Ramesh Yadav (Technician)' },
  { role: 'FINANCE', email: 'finance@pawanputra.com', name: 'Pooja Agarwal (Finance)' },
  { role: 'HR', email: 'hr@pawanputra.com', name: 'Deepak Joshi (HR)' },
  { role: 'SUPPORT_AGENT', email: 'support@pawanputra.com', name: 'Siddharth Sen (Support Agent)' },
  { role: 'VENDOR', email: 'vendor@securetech.in', name: 'Vipin Gujral (Vendor Partner)' },
  { role: 'PARTNER', email: 'partner@apexalliances.com', name: 'Karan Chawla (Channel Partner)' },
];

const testResults = [];

function recordTest(category, role, testName, expected, actual, pass, detail = '') {
  testResults.push({
    category,
    role,
    testName,
    expected,
    actual,
    pass,
    detail
  });
  const symbol = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] [${category}] [${role}] ${testName} (Expected: ${expected}, Got: ${actual}) ${detail ? '-> ' + detail : ''}`);
}

async function login(email, password = 'Password@123') {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const status = res.status;
    const body = await res.json().catch(() => null);
    return { status, body, token: body?.accessToken };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

async function apiRequest(endpoint, token, method = 'GET', data = null) {
  try {
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    const status = res.status;
    const body = await res.json().catch(() => null);
    return { status, body };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

async function runAllTests() {
  console.log('='.repeat(90));
  console.log('STARTING EXHAUSTIVE MULTI-ROLE QA TESTING SUITE FOR PAWAN PUTRA BUSINESS OS CRM');
  console.log('='.repeat(90));

  const tokens = {};

  // -------------------------------------------------------------
  // 1. AUTHENTICATION & IDENTITY TESTING (ALL 13 ROLES)
  // -------------------------------------------------------------
  console.log('\n>>> PHASE 1: Authentication & Identity Claims Verification (All 13 Roles)');
  for (const item of ROLES) {
    const loginRes = await login(item.email);
    const pass = loginRes.status === 200 && !!loginRes.token;
    recordTest(
      'AUTH',
      item.role,
      `Login authentication for ${item.email}`,
      'HTTP 200 + JWT',
      `HTTP ${loginRes.status}`,
      pass,
      `Permissions: ${loginRes.body?.user?.permissions?.length ?? 0}`
    );

    if (pass) {
      tokens[item.role] = loginRes.token;

      // Verify /auth/me
      const meRes = await apiRequest('/api/v1/auth/me', loginRes.token);
      const mePass = meRes.status === 200 && meRes.body?.email === item.email;
      recordTest(
        'IDENTITY',
        item.role,
        'Profile retrieval via GET /api/v1/auth/me',
        'HTTP 200 + matching email',
        `HTTP ${meRes.status}`,
        mePass,
        `User ID: ${meRes.body?.id}`
      );
    }
  }

  // -------------------------------------------------------------
  // 2. POSITIVE RBAC TESTS (Authorized Endpoints Per Role)
  // -------------------------------------------------------------
  console.log('\n>>> PHASE 2: Positive Authorization Checks (Role Capabilities)');

  // SUPER_ADMIN
  if (tokens.SUPER_ADMIN) {
    const resUsers = await apiRequest('/api/v1/users', tokens.SUPER_ADMIN);
    recordTest('RBAC_POS', 'SUPER_ADMIN', 'Access Users Directory (/api/v1/users)', 200, resUsers.status, resUsers.status === 200, `Found ${resUsers.body?.length ?? 0} users`);

    const resAudit = await apiRequest('/api/v1/audit/logs', tokens.SUPER_ADMIN);
    recordTest('RBAC_POS', 'SUPER_ADMIN', 'Access Audit Logs (/api/v1/audit/logs)', 200, resAudit.status, resAudit.status === 200);

    const resOrg = await apiRequest('/api/v1/organization', tokens.SUPER_ADMIN);
    recordTest('RBAC_POS', 'SUPER_ADMIN', 'Access Organization Profile (/api/v1/organization)', 200, resOrg.status, resOrg.status === 200);
  }

  // ADMIN
  if (tokens.ADMIN) {
    const resUsers = await apiRequest('/api/v1/users', tokens.ADMIN);
    recordTest('RBAC_POS', 'ADMIN', 'Access Users Directory (/api/v1/users)', 200, resUsers.status, resUsers.status === 200);

    const resBranches = await apiRequest('/api/v1/branches', tokens.ADMIN);
    recordTest('RBAC_POS', 'ADMIN', 'Access Branch Management (/api/v1/branches)', 200, resBranches.status, resBranches.status === 200);
  }

  // DIRECTOR
  if (tokens.DIRECTOR) {
    const resExec = await apiRequest('/api/v1/analytics/my-work', tokens.DIRECTOR);
    recordTest('RBAC_POS', 'DIRECTOR', 'Access Executive Work Analytics (/api/v1/analytics/my-work)', 200, resExec.status, resExec.status === 200);

    const resCust = await apiRequest('/api/v1/customers', tokens.DIRECTOR);
    recordTest('RBAC_POS', 'DIRECTOR', 'Access 360 Customers List (/api/v1/customers)', 200, resCust.status, resCust.status === 200);

    const resInv = await apiRequest('/api/v1/invoices', tokens.DIRECTOR);
    recordTest('RBAC_POS', 'DIRECTOR', 'Access Financial Invoices (/api/v1/invoices)', 200, resInv.status, resInv.status === 200);
  }

  // SALES_MANAGER
  if (tokens.SALES_MANAGER) {
    const resLeads = await apiRequest('/api/v1/leads', tokens.SALES_MANAGER);
    recordTest('RBAC_POS', 'SALES_MANAGER', 'Access Sales Pipeline Leads (/api/v1/leads)', 200, resLeads.status, resLeads.status === 200);

    const resOpps = await apiRequest('/api/v1/opportunities', tokens.SALES_MANAGER);
    recordTest('RBAC_POS', 'SALES_MANAGER', 'Access Opportunities (/api/v1/opportunities)', 200, resOpps.status, resOpps.status === 200);

    const resQuotes = await apiRequest('/api/v1/quotations', tokens.SALES_MANAGER);
    recordTest('RBAC_POS', 'SALES_MANAGER', 'Access Quotations (/api/v1/quotations)', 200, resQuotes.status, resQuotes.status === 200);
  }

  // SALES_EXECUTIVE
  if (tokens.SALES_EXECUTIVE) {
    const resLeads = await apiRequest('/api/v1/leads', tokens.SALES_EXECUTIVE);
    recordTest('RBAC_POS', 'SALES_EXECUTIVE', 'Access Assigned Leads (/api/v1/leads)', 200, resLeads.status, resLeads.status === 200);

    const resCust = await apiRequest('/api/v1/customers', tokens.SALES_EXECUTIVE);
    recordTest('RBAC_POS', 'SALES_EXECUTIVE', 'Access Customer Records (/api/v1/customers)', 200, resCust.status, resCust.status === 200);
  }

  // PROJECT_MANAGER
  if (tokens.PROJECT_MANAGER) {
    const resProjects = await apiRequest('/api/v1/projects', tokens.PROJECT_MANAGER);
    recordTest('RBAC_POS', 'PROJECT_MANAGER', 'Access Projects Board (/api/v1/projects)', 200, resProjects.status, resProjects.status === 200);

    const resTemplates = await apiRequest('/api/v1/project-templates', tokens.PROJECT_MANAGER);
    recordTest('RBAC_POS', 'PROJECT_MANAGER', 'Access Project Templates (/api/v1/project-templates)', 200, resTemplates.status, resTemplates.status === 200);
  }

  // DESIGNER
  if (tokens.DESIGNER) {
    const resProjects = await apiRequest('/api/v1/projects', tokens.DESIGNER);
    recordTest('RBAC_POS', 'DESIGNER', 'Access Design Projects (/api/v1/projects)', 200, resProjects.status, resProjects.status === 200);
  }

  // TECHNICIAN
  if (tokens.TECHNICIAN) {
    const resJobs = await apiRequest('/api/v1/field-jobs/my', tokens.TECHNICIAN);
    recordTest('RBAC_POS', 'TECHNICIAN', 'Access My Field Operations Jobs (/api/v1/field-jobs/my)', 200, resJobs.status, resJobs.status === 200);

    const resAtt = await apiRequest('/api/v1/attendance/today', tokens.TECHNICIAN);
    recordTest('RBAC_POS', 'TECHNICIAN', 'Access Daily Attendance (/api/v1/attendance/today)', 200, resAtt.status, resAtt.status === 200);
  }

  // FINANCE
  if (tokens.FINANCE) {
    const resInv = await apiRequest('/api/v1/invoices', tokens.FINANCE);
    recordTest('RBAC_POS', 'FINANCE', 'Access Invoices Ledger (/api/v1/invoices)', 200, resInv.status, resInv.status === 200);

    const resPay = await apiRequest('/api/v1/payments', tokens.FINANCE);
    recordTest('RBAC_POS', 'FINANCE', 'Access Payments (/api/v1/payments)', 200, resPay.status, resPay.status === 200);

    const resRec = await apiRequest('/api/v1/receivables/dashboard', tokens.FINANCE);
    recordTest('RBAC_POS', 'FINANCE', 'Access Aged Receivables Dashboard (/api/v1/receivables/dashboard)', 200, resRec.status, resRec.status === 200);
  }

  // HR
  if (tokens.HR) {
    const resEmp = await apiRequest('/api/v1/employees', tokens.HR);
    recordTest('RBAC_POS', 'HR', 'Access Workforce Employees (/api/v1/employees)', 200, resEmp.status, resEmp.status === 200);

    const resAtt = await apiRequest('/api/v1/attendance/today', tokens.HR);
    recordTest('RBAC_POS', 'HR', 'Access Staff Attendance (/api/v1/attendance/today)', 200, resAtt.status, resAtt.status === 200);
  }

  // SUPPORT_AGENT
  if (tokens.SUPPORT_AGENT) {
    const resTickets = await apiRequest('/api/v1/tickets', tokens.SUPPORT_AGENT);
    recordTest('RBAC_POS', 'SUPPORT_AGENT', 'Access Support Tickets Desk (/api/v1/tickets)', 200, resTickets.status, resTickets.status === 200);

    const resCust = await apiRequest('/api/v1/customers', tokens.SUPPORT_AGENT);
    recordTest('RBAC_POS', 'SUPPORT_AGENT', 'Access Customer Support History (/api/v1/customers)', 200, resCust.status, resCust.status === 200);
  }

  // VENDOR & PARTNER
  if (tokens.VENDOR) {
    const res = await apiRequest('/api/v1/auth/me', tokens.VENDOR);
    recordTest('RBAC_POS', 'VENDOR', 'Access Vendor Self Account (/api/v1/auth/me)', 200, res.status, res.status === 200);
  }
  if (tokens.PARTNER) {
    const res = await apiRequest('/api/v1/auth/me', tokens.PARTNER);
    recordTest('RBAC_POS', 'PARTNER', 'Access Partner Self Account (/api/v1/auth/me)', 200, res.status, res.status === 200);
  }

  // -------------------------------------------------------------
  // 3. NEGATIVE RBAC & SECURITY ISOLATION TESTS (403 FORBIDDEN)
  // -------------------------------------------------------------
  console.log('\n>>> PHASE 3: Negative Security Enforcement (Access Denied / HTTP 403 Forbidden)');

  const negativeChecks = [
    { role: 'TECHNICIAN', endpoint: '/api/v1/invoices', desc: 'Technician blocked from viewing invoices' },
    { role: 'TECHNICIAN', endpoint: '/api/v1/leads', desc: 'Technician blocked from viewing sales leads' },
    { role: 'TECHNICIAN', endpoint: '/api/v1/users', desc: 'Technician blocked from user management' },
    { role: 'SALES_EXECUTIVE', endpoint: '/api/v1/employees', desc: 'Sales Exec blocked from HR workforce records' },
    { role: 'SALES_EXECUTIVE', endpoint: '/api/v1/audit/logs', desc: 'Sales Exec blocked from system audit logs' },
    { role: 'SALES_EXECUTIVE', endpoint: '/api/v1/invoices', desc: 'Sales Exec blocked from finance invoices' },
    { role: 'DESIGNER', endpoint: '/api/v1/invoices', desc: 'Designer blocked from finance invoices' },
    { role: 'DESIGNER', endpoint: '/api/v1/leads', desc: 'Designer blocked from sales leads' },
    { role: 'DESIGNER', endpoint: '/api/v1/users', desc: 'Designer blocked from user administration' },
    { role: 'FINANCE', endpoint: '/api/v1/employees', desc: 'Finance blocked from HR employee records' },
    { role: 'FINANCE', endpoint: '/api/v1/leads', desc: 'Finance blocked from sales pipeline leads' },
    { role: 'HR', endpoint: '/api/v1/invoices', desc: 'HR blocked from financial invoices' },
    { role: 'HR', endpoint: '/api/v1/leads', desc: 'HR blocked from customer sales leads' },
    { role: 'SUPPORT_AGENT', endpoint: '/api/v1/invoices', desc: 'Support Agent blocked from finance invoices' },
    { role: 'SUPPORT_AGENT', endpoint: '/api/v1/audit/logs', desc: 'Support Agent blocked from audit logs' },
    { role: 'VENDOR', endpoint: '/api/v1/leads', desc: 'External Vendor blocked from sales leads' },
    { role: 'VENDOR', endpoint: '/api/v1/invoices', desc: 'External Vendor blocked from internal finance' },
    { role: 'VENDOR', endpoint: '/api/v1/users', desc: 'External Vendor blocked from user management' },
    { role: 'PARTNER', endpoint: '/api/v1/employees', desc: 'External Partner blocked from internal HR employees' },
    { role: 'PARTNER', endpoint: '/api/v1/audit/logs', desc: 'External Partner blocked from audit logs' },
  ];

  for (const check of negativeChecks) {
    const token = tokens[check.role];
    if (token) {
      const res = await apiRequest(check.endpoint, token);
      const pass = res.status === 403;
      recordTest(
        'RBAC_NEG',
        check.role,
        check.desc,
        'HTTP 403 Forbidden',
        `HTTP ${res.status}`,
        pass,
        pass ? 'Strictly Blocked by Security Proxy' : 'SECURITY LEAK DETECTED'
      );
    }
  }

  // -------------------------------------------------------------
  // 4. AI CAPABILITY & PERMISSION TESTS (Brief & Ask Pawan AI)
  // -------------------------------------------------------------
  console.log('\n>>> PHASE 4: AI Engine Security & Functionality Verification');

  // Daily Brief: Allowed for SUPER_ADMIN, ADMIN, DIRECTOR, SALES_MANAGER, PROJECT_MANAGER
  const briefAllowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'PROJECT_MANAGER'];
  for (const role of briefAllowedRoles) {
    if (tokens[role]) {
      const res = await apiRequest('/api/v1/brief/daily', tokens[role]);
      const pass = res.status === 200;
      recordTest('AI_BRIEF', role, 'Generate Role-Tailored Daily Morning Brief', 200, res.status, pass, res.body?.summary ? `Brief: ${res.body.summary.substring(0, 60)}...` : '');
    }
  }

  // Daily Brief: Blocked for non-management (e.g. TECHNICIAN, VENDOR, PARTNER)
  const briefBlockedRoles = ['TECHNICIAN', 'VENDOR', 'PARTNER'];
  for (const role of briefBlockedRoles) {
    if (tokens[role]) {
      const res = await apiRequest('/api/v1/brief/daily', tokens[role]);
      const pass = res.status === 403;
      recordTest('AI_BRIEF_RESTRICT', role, 'Daily Brief restricted for non-management', 'HTTP 403', `HTTP ${res.status}`, pass);
    }
  }

  // Ask Pawan AI: Positive query by SUPER_ADMIN
  if (tokens.SUPER_ADMIN) {
    const askRes = await apiRequest('/api/v1/ask', tokens.SUPER_ADMIN, 'POST', {
      question: 'How many invoices are overdue?'
    });
    const pass = askRes.status === 200 && !!askRes.body?.answer;
    recordTest(
      'AI_ASK',
      'SUPER_ADMIN',
      'Ask Pawan AI natural-language query ("How many invoices are overdue?")',
      200,
      askRes.status,
      pass,
      `AI Response: ${askRes.body?.answer?.substring(0, 80)}...`
    );
  }

  // Ask Pawan AI: Blocked for non-permitted roles (e.g. TECHNICIAN)
  if (tokens.TECHNICIAN) {
    const askRes = await apiRequest('/api/v1/ask', tokens.TECHNICIAN, 'POST', {
      question: 'Show all financial records'
    });
    const pass = askRes.status === 403;
    recordTest('AI_ASK_RESTRICT', 'TECHNICIAN', 'Ask Pawan AI blocked without ASK_VIEW permission', 'HTTP 403', `HTTP ${askRes.status}`, pass);
  }

  // -------------------------------------------------------------
  // 5. DATA WORKFLOW INTEGRITY CHECKS
  // -------------------------------------------------------------
  console.log('\n>>> PHASE 5: Live Database Record Lifecycle Verification');

  if (tokens.SUPER_ADMIN) {
    const endpoints = [
      { path: '/api/v1/customers', label: 'Customers' },
      { path: '/api/v1/leads', label: 'Leads' },
      { path: '/api/v1/opportunities', label: 'Opportunities' },
      { path: '/api/v1/quotations', label: 'Quotations' },
      { path: '/api/v1/orders', label: 'Orders' },
      { path: '/api/v1/projects', label: 'Projects' },
      { path: '/api/v1/invoices', label: 'Invoices' },
      { path: '/api/v1/payments', label: 'Payments' },
      { path: '/api/v1/tickets', label: 'Support Tickets' },
      { path: '/api/v1/field-jobs', label: 'Field Jobs' },
      { path: '/api/v1/vendors', label: 'Vendors' },
      { path: '/api/v1/partners', label: 'Partners' },
      { path: '/api/v1/amc-contracts', label: 'AMC Contracts' },
      { path: '/api/v1/warranties', label: 'Warranties' },
      { path: '/api/v1/pulse/feed', label: 'Pawan Pulse Insights Feed' }
    ];

    for (const ep of endpoints) {
      const res = await apiRequest(ep.path, tokens.SUPER_ADMIN);
      const count = Array.isArray(res.body) ? res.body.length : (res.body?.content?.length ?? (res.body?.items?.length ?? (res.body ? 1 : 0)));
      const pass = res.status === 200;
      recordTest('DATA_WORKFLOW', 'SUPER_ADMIN', `Fetch live ${ep.label} (${ep.path})`, 200, res.status, pass, `Records count: ${count}`);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  const total = testResults.length;
  const passed = testResults.filter(t => t.pass).length;
  const failed = testResults.filter(t => !t.pass).length;

  console.log('\n' + '='.repeat(90));
  console.log(`TEST RUN COMPLETED: ${total} Total Tests | ${passed} Passed | ${failed} Failed`);
  console.log('='.repeat(90));

  fs.writeFileSync('qa-test-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    results: testResults
  }, null, 2));

  console.log('Results saved to qa-test-results.json');
}

runAllTests().catch(console.error);
