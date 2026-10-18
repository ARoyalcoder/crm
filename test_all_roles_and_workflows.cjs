const http = require('http');

const BASE_URL = 'http://localhost:8085';
const PASSWORD = 'Password@123';

const ROLES_TO_TEST = [
  { role: 'SUPER_ADMIN', email: 'superadmin@pawanputra.com' },
  { role: 'ADMIN', email: 'admin@pawanputra.com' },
  { role: 'DIRECTOR', email: 'director@pawanputra.com' },
  { role: 'SALES_MANAGER', email: 'sales.manager@pawanputra.com' },
  { role: 'SALES_EXECUTIVE', email: 'sales.exec@pawanputra.com' },
  { role: 'PROJECT_MANAGER', email: 'project.manager@pawanputra.com' },
  { role: 'DESIGNER', email: 'designer@pawanputra.com' },
  { role: 'TECHNICIAN', email: 'technician@pawanputra.com' },
  { role: 'FINANCE', email: 'finance@pawanputra.com' },
  { role: 'HR', email: 'hr@pawanputra.com' },
  { role: 'SUPPORT_AGENT', email: 'support@pawanputra.com' },
  { role: 'VENDOR', email: 'vendor@securetech.in' },
  { role: 'PARTNER', email: 'partner@apexalliances.com' }
];

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('PAWAN PUTRA BUSINESS OS - 13 ROLES & QA WORKFLOW AUDIT SUITE');
  console.log('================================================================\n');

  const results = {
    rolesAuth: [],
    rbacChecks: [],
    pulseAiChecks: [],
    workflowChecks: []
  };

  const tokens = {};

  // 1. AUTHENTICATE ALL 13 ROLES
  console.log('--- 1. AUTHENTICATION & IDENTITY TEST (ALL 13 ROLES) ---');
  for (const { role, email } of ROLES_TO_TEST) {
    try {
      const res = await request('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password: PASSWORD }
      });

      if (res.status === 200 && res.data.accessToken) {
        tokens[role] = res.data.accessToken;
        
        // Call /auth/me
        const meRes = await request('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${res.data.accessToken}` }
        });

        const activeRoles = meRes.data?.roles || [];
        const permissionsCount = meRes.data?.permissions?.length || 0;
        console.log(`[PASS] ${role.padEnd(16)} | Email: ${email.padEnd(28)} | Roles: [${activeRoles.join(', ')}] | Permissions: ${permissionsCount}`);
        results.rolesAuth.push({ role, email, status: 'PASS', permissionsCount });
      } else {
        console.error(`[FAIL] ${role.padEnd(16)} | Email: ${email.padEnd(28)} | HTTP ${res.status}: ${JSON.stringify(res.data)}`);
        results.rolesAuth.push({ role, email, status: 'FAIL', error: res.data });
      }
    } catch (err) {
      console.error(`[ERR]  ${role.padEnd(16)} | ${err.message}`);
      results.rolesAuth.push({ role, email, status: 'ERROR', error: err.message });
    }
  }

  // 2. RBAC ISOLATION CHECKS
  console.log('\n--- 2. RBAC & DATA ISOLATION PERMISSION CHECKS ---');
  // Check Finance Invoice Access: Finance should succeed, Technician should be 403 Forbidden
  if (tokens['FINANCE'] && tokens['TECHNICIAN']) {
    const finRes = await request('/api/v1/invoices', {
      headers: { Authorization: `Bearer ${tokens['FINANCE']}` }
    });
    const techRes = await request('/api/v1/invoices', {
      headers: { Authorization: `Bearer ${tokens['TECHNICIAN']}` }
    });

    console.log(`Finance accessing /api/v1/invoices: HTTP ${finRes.status} (Expected: 200) -> ${finRes.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`Technician accessing /api/v1/invoices: HTTP ${techRes.status} (Expected: 403) -> ${techRes.status === 403 ? 'PASS' : 'FAIL'}`);
    results.rbacChecks.push({ check: 'Finance invoice access', result: finRes.status === 200 ? 'PASS' : 'FAIL' });
    results.rbacChecks.push({ check: 'Technician invoice access blocked', result: techRes.status === 403 ? 'PASS' : 'FAIL' });
  }

  // Check Leads: Sales Executive can access, Technician should be 403
  if (tokens['SALES_EXECUTIVE'] && tokens['TECHNICIAN']) {
    const salesRes = await request('/api/v1/leads', {
      headers: { Authorization: `Bearer ${tokens['SALES_EXECUTIVE']}` }
    });
    const techLeadRes = await request('/api/v1/leads', {
      headers: { Authorization: `Bearer ${tokens['TECHNICIAN']}` }
    });
    console.log(`Sales Exec accessing /api/v1/leads: HTTP ${salesRes.status} (Expected: 200) -> ${salesRes.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`Technician accessing /api/v1/leads: HTTP ${techLeadRes.status} (Expected: 403) -> ${techLeadRes.status === 403 ? 'PASS' : 'FAIL'}`);
    results.rbacChecks.push({ check: 'Sales Exec lead access', result: salesRes.status === 200 ? 'PASS' : 'FAIL' });
    results.rbacChecks.push({ check: 'Technician lead access blocked', result: techLeadRes.status === 403 ? 'PASS' : 'FAIL' });
  }

  // Check HR Employees: HR can access, Sales Exec cannot
  if (tokens['HR'] && tokens['SALES_EXECUTIVE']) {
    const hrEmpRes = await request('/api/v1/employees', {
      headers: { Authorization: `Bearer ${tokens['HR']}` }
    });
    const salesEmpRes = await request('/api/v1/employees', {
      headers: { Authorization: `Bearer ${tokens['SALES_EXECUTIVE']}` }
    });
    console.log(`HR accessing /api/v1/employees: HTTP ${hrEmpRes.status} (Expected: 200) -> ${hrEmpRes.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`Sales Exec accessing /api/v1/employees: HTTP ${salesEmpRes.status} (Expected: 403) -> ${salesEmpRes.status === 403 ? 'PASS' : 'FAIL'}`);
    results.rbacChecks.push({ check: 'HR employee access', result: hrEmpRes.status === 200 ? 'PASS' : 'FAIL' });
    results.rbacChecks.push({ check: 'Sales Exec employee access blocked', result: salesEmpRes.status === 403 ? 'PASS' : 'FAIL' });
  }

  // 3. PAWAN PULSE AI ENGINE CHECKS
  console.log('\n--- 3. PAWAN PULSE AI ENGINE TESTS ---');
  if (tokens['DIRECTOR']) {
    // 3a. Pulse Insights Feed
    const pulseRes = await request('/api/v1/pulse/feed', {
      headers: { Authorization: `Bearer ${tokens['DIRECTOR']}` }
    });
    const insightsCount = Array.isArray(pulseRes.data?.data) ? pulseRes.data.data.length : (Array.isArray(pulseRes.data) ? pulseRes.data.length : (pulseRes.data?.items ? pulseRes.data.items.length : 0));
    console.log(`Director /api/v1/pulse/feed: HTTP ${pulseRes.status} | Insights count: ${insightsCount}`);
    results.pulseAiChecks.push({ check: 'Pulse Insights Feed', status: pulseRes.status === 200 ? 'PASS' : 'FAIL', count: insightsCount });

    // 3b. Daily Brief
    const briefRes = await request('/api/v1/brief/daily', {
      headers: { Authorization: `Bearer ${tokens['DIRECTOR']}` }
    });
    console.log(`Director /api/v1/brief/daily: HTTP ${briefRes.status} | Date: ${briefRes.data?.date} | Role: ${briefRes.data?.role}`);
    results.pulseAiChecks.push({ check: 'Daily Brief today', status: briefRes.status === 200 ? 'PASS' : 'FAIL' });

    // 3c. Ask Pawan AI natural language questions
    const testQuestions = [
      "How many invoices are overdue?",
      "Which projects are delayed?",
      "Show all open leads",
      "Which AMC contracts are expiring soon?"
    ];

    for (const q of testQuestions) {
      const askRes = await request('/api/v1/ask', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens['DIRECTOR']}` },
        body: { question: q }
      });
      console.log(`Ask AI: "${q}" -> HTTP ${askRes.status} | Answer: ${askRes.data?.answer?.substring(0, 80)}...`);
      results.pulseAiChecks.push({
        question: q,
        status: askRes.status === 200 && askRes.data?.answer ? 'PASS' : 'FAIL',
        recordsCount: askRes.data?.supportingRecords?.length || 0
      });
    }
  }

  // 4. MODULE END-TO-END WORKFLOW VERIFICATION
  console.log('\n--- 4. END-TO-END CORE CRM WORKFLOW MODULE CHECKS ---');
  const superToken = tokens['SUPER_ADMIN'] || tokens['ADMIN'] || tokens['DIRECTOR'];
  const testEndpoints = [
    { name: 'Customers', path: '/api/v1/customers' },
    { name: 'Leads', path: '/api/v1/leads' },
    { name: 'Opportunities', path: '/api/v1/opportunities' },
    { name: 'Quotations', path: '/api/v1/quotations' },
    { name: 'Orders', path: '/api/v1/orders' },
    { name: 'Projects', path: '/api/v1/projects' },
    { name: 'Invoices', path: '/api/v1/invoices' },
    { name: 'Payments', path: '/api/v1/payments' },
    { name: 'Warranties', path: '/api/v1/warranties' },
    { name: 'AMC Contracts', path: '/api/v1/amc-contracts' },
    { name: 'Support Tickets', path: '/api/v1/tickets' },
    { name: 'Vendors', path: '/api/v1/vendors' },
    { name: 'Partners', path: '/api/v1/partners' },
    { name: 'Attendance Today', path: '/api/v1/attendance/today' },
    { name: 'Notifications', path: '/api/v1/notifications' }
  ];

  for (const ep of testEndpoints) {
    const res = await request(ep.path, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    const count = Array.isArray(res.data?.data) ? res.data.data.length : (Array.isArray(res.data) ? res.data.length : (res.data?.items ? res.data.items.length : (res.status === 200 ? 'OK' : 'ERR')));
    console.log(`Module [${ep.name.padEnd(16)}] -> HTTP ${res.status} | Count/Status: ${count}`);
    results.workflowChecks.push({ module: ep.name, path: ep.path, status: res.status === 200 ? 'PASS' : 'FAIL', count });
  }

  console.log('\n================================================================');
  console.log('AUDIT RUN COMPLETED');
  console.log('================================================================');
}

run().catch(console.error);
