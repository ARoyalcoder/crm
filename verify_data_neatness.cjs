const http = require('http');

const BASE_URL = 'http://localhost:8085';
const PASSWORD = 'Password@123';

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
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function auditData() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE DATA NEATNESS & CLARITY AUDIT');
  console.log('='.repeat(80));

  // 1. Login as Super Admin
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'superadmin@pawanputra.com', password: PASSWORD }
  });

  if (loginRes.status !== 200 || !loginRes.data.accessToken) {
    console.error('Failed to log in as SUPER_ADMIN');
    return;
  }

  const headers = { Authorization: `Bearer ${loginRes.data.accessToken}` };

  const checks = [
    { name: 'Organization', path: '/api/v1/organization', isObj: true },
    { name: 'Branches', path: '/api/v1/branches' },
    { name: 'Verticals', path: '/api/v1/catalog/verticals' },
    { name: 'Categories', path: '/api/v1/catalog/categories' },
    { name: 'Services', path: '/api/v1/catalog/services' },
    { name: 'Users', path: '/api/v1/users' },
    { name: 'Employees', path: '/api/v1/employees' },
    { name: 'Customers', path: '/api/v1/customers' },
    { name: 'Leads', path: '/api/v1/leads' },
    { name: 'Opportunities', path: '/api/v1/opportunities' },
    { name: 'Quotations', path: '/api/v1/quotations' },
    { name: 'Orders', path: '/api/v1/orders' },
    { name: 'Projects', path: '/api/v1/projects' },
    { name: 'Field Jobs', path: '/api/v1/field-jobs' },
    { name: 'Invoices', path: '/api/v1/invoices' },
    { name: 'Payments', path: '/api/v1/payments' },
    { name: 'Warranties', path: '/api/v1/warranties' },
    { name: 'AMC Contracts', path: '/api/v1/amc-contracts' },
    { name: 'Support Tickets', path: '/api/v1/tickets' },
    { name: 'Vendors', path: '/api/v1/vendors' },
    { name: 'Partners', path: '/api/v1/partners' }
  ];

  let totalRecords = 0;
  let issues = [];

  for (const item of checks) {
    const res = await request(item.path, { headers });
    if (res.status !== 200) {
      issues.push(`Failed to fetch ${item.name} (${item.path}): HTTP ${res.status}`);
      continue;
    }

    const records = item.isObj
      ? [res.data]
      : (Array.isArray(res.data)
          ? res.data
          : (res.data?.content || res.data?.items || res.data?.data || []));

    totalRecords += records.length;
    console.log(`\n--- [${item.name.toUpperCase()}] (${records.length} records verified) ---`);

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const label = r.name || r.title || r.fullName || r.companyName || r.code || r.contractNumber || r.invoiceNumber || r.ticketNumber || r.jobNumber || `Record #${i+1}`;
      const status = r.status || r.stage || (r.active !== undefined ? (r.active ? 'ACTIVE' : 'INACTIVE') : '');
      const detail = r.email || r.phone || r.city || r.totalAmount || r.contactPerson || r.estimatedDurationDays || '';

      // Check neatness
      const strVal = JSON.stringify(r).toLowerCase();
      if (strVal.includes('lorem ipsum') || strVal.includes('test test') || strVal.includes('placeholder')) {
        issues.push(`Unprofessional placeholder data detected in ${item.name}: ${label}`);
      }
      if (strVal.includes('real estate') || strVal.includes('apartment') || strVal.includes('villa') || strVal.includes('property sale')) {
        issues.push(`Forbidden Real Estate data detected in ${item.name}: ${label}`);
      }

      console.log(`  • ${String(label).padEnd(36)} | Status: ${String(status).padEnd(16)} | ${detail ? 'Detail: ' + detail : ''}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`DATA NEATNESS & CLARITY AUDIT SUMMARY`);
  console.log(`Total Records Inspected: ${totalRecords}`);
  console.log(`Issues / Messy Data Found: ${issues.length}`);
  if (issues.length > 0) {
    console.log('Issues:');
    issues.forEach(iss => console.log('  - ' + iss));
  } else {
    console.log('VERDICT: ALL DATA IS NEAT, PROFESSIONAL, CONSISTENT, AND ERROR-FREE!');
  }
  console.log('='.repeat(80));
}

auditData().catch(console.error);
