// BlueDoor Accounts V3 ÃÂ¢ÃÂÃÂ Cloudflare Worker
// Handles: auth, companies, users, projects, vendors, chart_of_accounts,
//          cost_heads, entry_types, entries, pending_entries, ledger,
//          opening_balances, vendor_opening_balances, reports, drive proxy
// Bindings: DB (D1), SESSIONS (KV), GAS_URL (env var)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Session-Token',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function err(msg, status = 400) { return json({ ok: false, error: msg }, status); }
function ok(data = {}) { return json({ ok: true, ...data }); }

function genToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function getSession(env, req) {
  const token = req.headers.get('X-Session-Token') || '';
  if (!token) return null;
  const raw = await env.SESSIONS.get(`sess:${token}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
async function requireSession(env, req) {
  const sess = await getSession(env, req);
  if (!sess) return { sess: null, resp: err('Unauthorized', 401) };
  return { sess, resp: null };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (method === 'POST' && url.pathname === '/api') {
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON'); }
      const { action, ...params } = body;
      return await route(action, params, request, env, ctx);
    }
    if (method === 'GET' && url.pathname === '/') return ok({ service: 'BlueDoor Accounts V3', status: 'running' });
    if (method === 'POST' && url.pathname === '/migrate') return handleMigrate(request, env);
    return err('Not found', 404);
  },
};

async function route(action, params, req, env, ctx) {
  if (action === 'login') return handleLogin(params, env);
  if (action === 'logout') return handleLogout(params, req, env);
  const { sess, resp } = await requireSession(env, req);
  if (resp) return resp;
  switch (action) {
    case 'getMe': return ok({ user: sess });
    case 'listUsers': return handleListUsers(params, sess, env);
    case 'addUser': return handleAddUser(params, sess, env);
    case 'updateUser': return handleUpdateUser(params, sess, env);
    case 'changePassword': return handleChangePassword(params, sess, env);
    case 'listCompanies': return handleListCompanies(env);
    case 'addCompany': return handleAddCompany(params, sess, env);
    case 'updateCompany': return handleUpdateCompany(params, sess, env);
    case 'listProjects': return handleListProjects(params, env);
    case 'addProject': return handleAddProject(params, sess, env);
    case 'updateProject': return handleUpdateProject(params, sess, env);
    case 'listVendors': return handleListVendors(params, env);
    case 'addVendor': return handleAddVendor(params, sess, env);
    case 'updateVendor': return handleUpdateVendor(params, sess, env);
    case 'listAccounts': return handleListAccounts(env);
    case 'addAccount': return handleAddAccount(params, sess, env);
    case 'listCostHeads': return handleListCostHeads(env);
    case 'addCostHead': return handleAddCostHead(params, sess, env);
    case 'listEntryTypes': return handleListEntryTypes(env);
    case 'addEntryType': return handleAddEntryType(params, sess, env);
    case 'updateEntryType': return handleUpdateEntryType(params, sess, env);
    case 'listEntries': return handleListEntries(params, sess, env);
    case 'addEntry': return handleAddEntry(params, sess, env);
    case 'updateEntry': return handleUpdateEntry(params, sess, env);
    case 'deleteEntry': return handleDeleteEntry(params, sess, env);
    case 'listPending': return handleListPending(params, sess, env);
    case 'submitPending': return handleSubmitPending(params, sess, env);
    case 'approvePending': return handleApprovePending(params, sess, env);
    case 'rejectPending': return handleRejectPending(params, sess, env);
    case 'deletePending': return handleDeletePending(params, sess, env);
    case 'getLedger': return handleGetLedger(params, sess, env);
    case 'getTrialBalance': return handleGetTrialBalance(params, sess, env);
    case 'getPL': return handleGetPL(params, sess, env);
    case 'getBS': return handleGetBS(params, sess, env);
    case 'listOpeningBalances': return handleListOpeningBalances(params, env);
    case 'saveOpeningBalance': return handleSaveOpeningBalance(params, sess, env);
    case 'listVendorOpeningBalances': return handleListVendorOpeningBalances(params, env);
    case 'saveVendorOpeningBalance': return handleSaveVendorOpeningBalance(params, sess, env);
    case 'getProjectReport': return handleGetProjectReport(params, sess, env);
    case 'getVendorReport': return handleGetVendorReport(params, sess, env);
    case 'getDashboard': return handleGetDashboard(params, sess, env);
    case 'driveProxy': return handleDriveProxy(params, sess, env);
    case 'gasProxy': return handleGasProxy(params, sess, env);
    default: return err(`Unknown action: ${action}`, 400);
  }
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AUTH ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleLogin({ username, password }, env) {
  if (!username || !password) return err('username and password required');
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND active = 1').bind(username).first();
  if (!user) return err('Invalid credentials', 401);
  if (user.password !== password) return err('Invalid credentials', 401);
  const token = genToken();
  const companies = user.companies ? JSON.parse(user.companies) : [];
  const sessData = { user_id: user.user_id, username: user.username, role: user.role, companies };
  await env.SESSIONS.put(`sess:${token}`, JSON.stringify(sessData), { expirationTtl: 28800 });
  return ok({ token, user: { user_id: user.user_id, username: user.username, role: user.role, companies } });
}
async function handleLogout({ token }, req, env) {
  const t = token || req.headers.get('X-Session-Token') || '';
  if (t) await env.SESSIONS.delete(`sess:${t}`);
  return ok({ message: 'Logged out' });
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ USERS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListUsers(params, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  const rows = await env.DB.prepare('SELECT user_id, username, role, active, companies FROM users ORDER BY username').all();
  return ok({ users: rows.results });
}
async function handleAddUser({ username, password, role, companies = [] }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!username || !password || !role) return err('username, password, role required');
  const uid = `U${Date.now()}`;
  await env.DB.prepare('INSERT INTO users (user_id, username, password, role, active, companies) VALUES (?,?,?,?,1,?)').bind(uid, username, password, role, JSON.stringify(companies)).run();
  return ok({ user_id: uid });
}
async function handleUpdateUser({ user_id, role, active, companies }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!user_id) return err('user_id required');
  const fields = [], vals = [];
  if (role !== undefined) { fields.push('role = ?'); vals.push(role); }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active ? 1 : 0); }
  if (companies !== undefined) { fields.push('companies = ?'); vals.push(JSON.stringify(companies)); }
  if (!fields.length) return err('Nothing to update');
  vals.push(user_id);
  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`).bind(...vals).run();
  return ok();
}
async function handleChangePassword({ old_password, new_password }, sess, env) {
  if (!old_password || !new_password) return err('old_password and new_password required');
  const user = await env.DB.prepare('SELECT password FROM users WHERE user_id = ?').bind(sess.user_id).first();
  if (!user || user.password !== old_password) return err('Old password incorrect', 401);
  await env.DB.prepare('UPDATE users SET password = ? WHERE user_id = ?').bind(new_password, sess.user_id).run();
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ COMPANIES ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListCompanies(env) {
  const rows = await env.DB.prepare('SELECT * FROM companies ORDER BY company_name').all();
  return ok({ companies: rows.results });
}
async function handleAddCompany({ company_name, drive_folder = '' }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!company_name) return err('company_name required');
  const cid = `CO${Date.now()}`;
  await env.DB.prepare('INSERT INTO companies (company_id, company_name, drive_folder, active) VALUES (?,?,?,1)').bind(cid, company_name, drive_folder).run();
  return ok({ company_id: cid });
}
async function handleUpdateCompany({ company_id, company_name, drive_folder, active }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!company_id) return err('company_id required');
  const fields = [], vals = [];
  if (company_name !== undefined) { fields.push('company_name = ?'); vals.push(company_name); }
  if (drive_folder !== undefined) { fields.push('drive_folder = ?'); vals.push(drive_folder); }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active ? 1 : 0); }
  if (!fields.length) return err('Nothing to update');
  vals.push(company_id);
  await env.DB.prepare(`UPDATE companies SET ${fields.join(', ')} WHERE company_id = ?`).bind(...vals).run();
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ PROJECTS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListProjects({ fyid, status } = {}, env) {
  let q = 'SELECT * FROM projects WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (status) { q += ' AND status = ?'; vals.push(status); }
  q += ' ORDER BY project_name';
  return ok({ projects: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleAddProject({ project_name, client = '', location = '', start_date = '', budget = 0, fyid = '', status = 'Active' }, sess, env) {
  if (!project_name) return err('project_name required');
  const pid = `P${Date.now()}`;
  await env.DB.prepare('INSERT INTO projects (project_id, project_name, client, location, status, start_date, budget, fyid) VALUES (?,?,?,?,?,?,?,?)').bind(pid, project_name, client, location, status, start_date, budget, fyid).run();
  return ok({ project_id: pid });
}
async function handleUpdateProject({ project_id, project_name, client, location, status, start_date, budget, fyid }, sess, env) {
  if (!project_id) return err('project_id required');
  const fields = [], vals = [];
  if (project_name !== undefined) { fields.push('project_name = ?'); vals.push(project_name); }
  if (client !== undefined) { fields.push('client = ?'); vals.push(client); }
  if (location !== undefined) { fields.push('location = ?'); vals.push(location); }
  if (status !== undefined) { fields.push('status = ?'); vals.push(status); }
  if (start_date !== undefined) { fields.push('start_date = ?'); vals.push(start_date); }
  if (budget !== undefined) { fields.push('budget = ?'); vals.push(budget); }
  if (fyid !== undefined) { fields.push('fyid = ?'); vals.push(fyid); }
  if (!fields.length) return err('Nothing to update');
  vals.push(project_id);
  await env.DB.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE project_id = ?`).bind(...vals).run();
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ VENDORS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListVendors({ vendor_type } = {}, env) {
  let q = 'SELECT * FROM vendors'; const vals = [];
  if (vendor_type) { q += ' WHERE vendor_type = ?'; vals.push(vendor_type); }
  q += ' ORDER BY vendor_name';
  return ok({ vendors: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleAddVendor({ vendor_id, vendor_name, vendor_type = '', contact = '', gstin = '', details = '' }, sess, env) {
  if (!vendor_id || !vendor_name) return err('vendor_id and vendor_name required');
  await env.DB.prepare('INSERT INTO vendors (vendor_id, vendor_name, vendor_type, contact, gstin, details) VALUES (?,?,?,?,?,?)').bind(vendor_id, vendor_name, vendor_type, contact, gstin, details).run();
  return ok({ vendor_id });
}
async function handleUpdateVendor({ vendor_id, vendor_name, vendor_type, contact, gstin, details }, sess, env) {
  if (!vendor_id) return err('vendor_id required');
  const fields = [], vals = [];
  if (vendor_name !== undefined) { fields.push('vendor_name = ?'); vals.push(vendor_name); }
  if (vendor_type !== undefined) { fields.push('vendor_type = ?'); vals.push(vendor_type); }
  if (contact !== undefined) { fields.push('contact = ?'); vals.push(contact); }
  if (gstin !== undefined) { fields.push('gstin = ?'); vals.push(gstin); }
  if (details !== undefined) { fields.push('details = ?'); vals.push(details); }
  if (!fields.length) return err('Nothing to update');
  vals.push(vendor_id);
  await env.DB.prepare(`UPDATE vendors SET ${fields.join(', ')} WHERE vendor_id = ?`).bind(...vals).run();
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ CHART OF ACCOUNTS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListAccounts(env) {
  return ok({ accounts: (await env.DB.prepare('SELECT * FROM chart_of_accounts ORDER BY ac_code').all()).results });
}
async function handleAddAccount({ ac_key, ac_code, ac_name, ac_type, category = '' }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!ac_key || !ac_code || !ac_name || !ac_type) return err('ac_key, ac_code, ac_name, ac_type required');
  await env.DB.prepare('INSERT INTO chart_of_accounts (ac_key, ac_code, ac_name, ac_type, category) VALUES (?,?,?,?,?)').bind(ac_key, ac_code, ac_name, ac_type, category).run();
  return ok({ ac_key });
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ COST HEADS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListCostHeads(env) {
  return ok({ cost_heads: (await env.DB.prepare('SELECT * FROM cost_heads ORDER BY ch_name').all()).results });
}
async function handleAddCostHead({ ch_id, ch_name, ac_key = '' }, sess, env) {
  if (!ch_id || !ch_name) return err('ch_id and ch_name required');
  await env.DB.prepare('INSERT INTO cost_heads (ch_id, ch_name, ac_key) VALUES (?,?,?)').bind(ch_id, ch_name, ac_key).run();
  return ok({ ch_id });
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ ENTRY TYPES ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListEntryTypes(env) {
  return ok({ entry_types: (await env.DB.prepare('SELECT * FROM entry_types ORDER BY label').all()).results });
}
async function handleAddEntryType({ et_key, label, category, dr, cr, needs_ch = 0, active = 1 }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!et_key || !label || !category || !dr || !cr) return err('et_key, label, category, dr, cr required');
  await env.DB.prepare('INSERT INTO entry_types (et_key, label, category, dr, cr, needs_ch, active) VALUES (?,?,?,?,?,?,?)').bind(et_key, label, category, dr, cr, needs_ch ? 1 : 0, active ? 1 : 0).run();
  return ok({ et_key });
}
async function handleUpdateEntryType({ et_key, label, category, dr, cr, needs_ch, active }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!et_key) return err('et_key required');
  const fields = [], vals = [];
  if (label !== undefined) { fields.push('label = ?'); vals.push(label); }
  if (category !== undefined) { fields.push('category = ?'); vals.push(category); }
  if (dr !== undefined) { fields.push('dr = ?'); vals.push(dr); }
  if (cr !== undefined) { fields.push('cr = ?'); vals.push(cr); }
  if (needs_ch !== undefined) { fields.push('needs_ch = ?'); vals.push(needs_ch ? 1 : 0); }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active ? 1 : 0); }
  if (!fields.length) return err('Nothing to update');
  vals.push(et_key);
  await env.DB.prepare(`UPDATE entry_types SET ${fields.join(', ')} WHERE et_key = ?`).bind(...vals).run();
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ ENTRIES ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListEntries({ fyid, company_id, project_id, vendor_id, entry_type, date_from, date_to, limit = 200, offset = 0 }, sess, env) {
  let q = 'SELECT * FROM entries WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  if (project_id) { q += ' AND project_id = ?'; vals.push(project_id); }
  if (vendor_id) { q += ' AND vendor_id = ?'; vals.push(vendor_id); }
  if (entry_type) { q += ' AND entry_type = ?'; vals.push(entry_type); }
  if (date_from) { q += ' AND date >= ?'; vals.push(date_from); }
  if (date_to) { q += ' AND date <= ?'; vals.push(date_to); }
  if (sess.role !== 'Admin' && sess.companies?.length) {
    q += ` AND company_id IN (${sess.companies.map(() => '?').join(',')})`;
    vals.push(...sess.companies);
  }
  q += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
  vals.push(limit, offset);
  return ok({ entries: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleAddEntry(params, sess, env) {
  const { date, fyid, project_id = '', cost_head_id = '', vendor_id = '', entry_type, amount, narration = '', company_id = '' } = params;
  if (!date || !fyid || !entry_type || !amount) return err('date, fyid, entry_type, amount required');
  const et = await env.DB.prepare('SELECT * FROM entry_types WHERE et_key = ?').bind(entry_type).first();
  if (!et) return err('Invalid entry_type');
  const eid = `E${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const drAc = await env.DB.prepare('SELECT ac_code, ac_name FROM chart_of_accounts WHERE ac_key = ?').bind(et.dr).first();
  const crAc = await env.DB.prepare('SELECT ac_code, ac_name FROM chart_of_accounts WHERE ac_key = ?').bind(et.cr).first();
  await env.DB.prepare('INSERT INTO entries (entry_id, date, fyid, project_id, cost_head_id, vendor_id, entry_type, amount, narration, created_by, created_at, company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(eid, date, fyid, project_id, cost_head_id, vendor_id, entry_type, amount, narration, sess.username, now, company_id).run();
  if (drAc) await env.DB.prepare("INSERT INTO ledger (entry_id, date, fyid, ac_code, ac_name, dr_cr, debit, credit, project_id, cost_head_id, vendor_id, narration, created_by, created_at, company_id) VALUES (?,?,?,?,?,'DR',?,0,?,?,?,?,?,?,?)").bind(eid, date, fyid, drAc.ac_code, drAc.ac_name, amount, project_id, cost_head_id, vendor_id, narration, sess.username, now, company_id).run();
  if (crAc) await env.DB.prepare("INSERT INTO ledger (entry_id, date, fyid, ac_code, ac_name, dr_cr, debit, credit, project_id, cost_head_id, vendor_id, narration, created_by, created_at, company_id) VALUES (?,?,?,?,?,'CR',0,?,?,?,?,?,?,?,?)").bind(eid, date, fyid, crAc.ac_code, crAc.ac_name, amount, project_id, cost_head_id, vendor_id, narration, sess.username, now, company_id).run();
  return ok({ entry_id: eid });
}
async function handleUpdateEntry(params, sess, env) {
  const { entry_id, date, project_id, cost_head_id, vendor_id, amount, narration } = params;
  if (!entry_id) return err('entry_id required');
  const existing = await env.DB.prepare('SELECT * FROM entries WHERE entry_id = ?').bind(entry_id).first();
  if (!existing) return err('Entry not found', 404);
  if (sess.role !== 'Admin' && existing.created_by !== sess.username) return err('Forbidden', 403);
  const fields = [], vals = [];
  if (date !== undefined) { fields.push('date = ?'); vals.push(date); }
  if (project_id !== undefined) { fields.push('project_id = ?'); vals.push(project_id); }
  if (cost_head_id !== undefined) { fields.push('cost_head_id = ?'); vals.push(cost_head_id); }
  if (vendor_id !== undefined) { fields.push('vendor_id = ?'); vals.push(vendor_id); }
  if (amount !== undefined) { fields.push('amount = ?'); vals.push(amount); }
  if (narration !== undefined) { fields.push('narration = ?'); vals.push(narration); }
  if (!fields.length) return err('Nothing to update');
  vals.push(entry_id);
  await env.DB.prepare(`UPDATE entries SET ${fields.join(', ')} WHERE entry_id = ?`).bind(...vals).run();
  if (amount !== undefined) await env.DB.prepare("UPDATE ledger SET debit = CASE WHEN dr_cr='DR' THEN ? ELSE 0 END, credit = CASE WHEN dr_cr='CR' THEN ? ELSE 0 END WHERE entry_id = ?").bind(amount, amount, entry_id).run();
  const lf = [], lv = [];
  if (date !== undefined) { lf.push('date = ?'); lv.push(date); }
  if (narration !== undefined) { lf.push('narration = ?'); lv.push(narration); }
  if (project_id !== undefined) { lf.push('project_id = ?'); lv.push(project_id); }
  if (lf.length) { lv.push(entry_id); await env.DB.prepare(`UPDATE ledger SET ${lf.join(', ')} WHERE entry_id = ?`).bind(...lv).run(); }
  return ok();
}
async function handleDeleteEntry({ entry_id }, sess, env) {
  if (!entry_id) return err('entry_id required');
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  await env.DB.batch([env.DB.prepare('DELETE FROM entries WHERE entry_id = ?').bind(entry_id), env.DB.prepare('DELETE FROM ledger WHERE entry_id = ?').bind(entry_id)]);
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ PENDING ENTRIES ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListPending({ fyid, company_id, status, submitted_by }, sess, env) {
  let q = 'SELECT * FROM pending_entries WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  if (status) { q += ' AND status = ?'; vals.push(status); }
  if (submitted_by) { q += ' AND submitted_by = ?'; vals.push(submitted_by); }
  if (sess.role !== 'Admin') { q += ' AND submitted_by = ?'; vals.push(sess.username); }
  q += ' ORDER BY submitted_at DESC';
  return ok({ pending: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleSubmitPending(params, sess, env) {
  const { date, fyid = '', entry_type, project_id = '', cost_head_id = '', vendor_id = '', amount, narration = '', drive_file_url = '', company_id = '' } = params;
  if (!date || !entry_type || !amount) return err('date, entry_type, amount required');
  const eid = `PE${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO pending_entries (entry_id, date, fyid, entry_type, project_id, cost_head_id, vendor_id, amount, narration, submitted_by, submitted_at, status, drive_file_url, company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,'Pending',?,?)").bind(eid, date, fyid, entry_type, project_id, cost_head_id, vendor_id, amount, narration, sess.username, now, drive_file_url, company_id).run();
  return ok({ entry_id: eid });
}
async function handleApprovePending({ entry_id }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  const pe = await env.DB.prepare('SELECT * FROM pending_entries WHERE entry_id = ?').bind(entry_id).first();
  if (!pe) return err('Pending entry not found', 404);
  if (pe.status !== 'Pending') return err('Entry is not in Pending status');
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE pending_entries SET status='Approved', reviewed_by=?, reviewed_at=? WHERE entry_id=?").bind(sess.username, now, entry_id).run();
  return await handleAddEntry({ date: pe.date, fyid: pe.fyid, project_id: pe.project_id, cost_head_id: pe.cost_head_id, vendor_id: pe.vendor_id, entry_type: pe.entry_type, amount: pe.amount, narration: pe.narration, company_id: pe.company_id }, { ...sess, username: pe.submitted_by }, env);
}
async function handleRejectPending({ entry_id, reject_reason = '' }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  await env.DB.prepare("UPDATE pending_entries SET status='Rejected', reviewed_by=?, reviewed_at=?, reject_reason=? WHERE entry_id=?").bind(sess.username, new Date().toISOString(), reject_reason, entry_id).run();
  return ok();
}
async function handleDeletePending({ entry_id }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  await env.DB.prepare('DELETE FROM pending_entries WHERE entry_id = ?').bind(entry_id).run();
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ LEDGER & REPORTS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleGetLedger({ fyid, ac_code, company_id, date_from, date_to }, sess, env) {
  let q = 'SELECT * FROM ledger WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (ac_code) { q += ' AND ac_code = ?'; vals.push(ac_code); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  if (date_from) { q += ' AND date >= ?'; vals.push(date_from); }
  if (date_to) { q += ' AND date <= ?'; vals.push(date_to); }
  q += ' ORDER BY date ASC, id ASC';
  return ok({ ledger: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleGetTrialBalance({ fyid, company_id }, sess, env) {
  let q = 'SELECT ac_code, ac_name, SUM(debit) as total_dr, SUM(credit) as total_cr, SUM(debit)-SUM(credit) as net FROM ledger WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  q += ' GROUP BY ac_code, ac_name ORDER BY ac_code';
  return ok({ trial_balance: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleGetPL({ fyid, company_id }, sess, env) {
  let q = "SELECT l.ac_code, l.ac_name, c.ac_type, c.category, SUM(l.debit) as total_dr, SUM(l.credit) as total_cr FROM ledger l LEFT JOIN chart_of_accounts c ON c.ac_code = l.ac_code WHERE c.ac_type IN ('Income','Expense')"; const vals = [];
  if (fyid) { q += ' AND l.fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND l.company_id = ?'; vals.push(company_id); }
  q += ' GROUP BY l.ac_code, l.ac_name, c.ac_type, c.category ORDER BY c.ac_type, l.ac_code';
  return ok({ pl: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleGetBS({ fyid, company_id }, sess, env) {
  let q = "SELECT l.ac_code, l.ac_name, c.ac_type, c.category, SUM(l.debit) as total_dr, SUM(l.credit) as total_cr FROM ledger l LEFT JOIN chart_of_accounts c ON c.ac_code = l.ac_code WHERE c.ac_type IN ('Asset','Liability','Equity')"; const vals = [];
  if (fyid) { q += ' AND l.fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND l.company_id = ?'; vals.push(company_id); }
  q += ' GROUP BY l.ac_code, l.ac_name, c.ac_type, c.category ORDER BY c.ac_type, l.ac_code';
  return ok({ balance_sheet: (await env.DB.prepare(q).bind(...vals).all()).results });
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ OPENING BALANCES ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListOpeningBalances({ fyid, company_id }, env) {
  let q = 'SELECT * FROM opening_balances WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  return ok({ opening_balances: (await env.DB.prepare(q + ' ORDER BY ac_name').bind(...vals).all()).results });
}
async function handleSaveOpeningBalance({ fyid, ac_key, ac_name, dr_cr, amount, company_id }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!fyid || !ac_key || !dr_cr || amount === undefined) return err('fyid, ac_key, dr_cr, amount required');
  const now = new Date().toISOString();
  const existing = await env.DB.prepare('SELECT id FROM opening_balances WHERE fyid=? AND ac_key=? AND company_id=?').bind(fyid, ac_key, company_id || '').first();
  if (existing) {
    await env.DB.prepare('UPDATE opening_balances SET dr_cr=?, amount=?, entered_by=?, entered_at=? WHERE id=?').bind(dr_cr, amount, sess.username, now, existing.id).run();
  } else {
    await env.DB.prepare('INSERT INTO opening_balances (fyid, ac_key, ac_name, dr_cr, amount, entered_by, entered_at, company_id) VALUES (?,?,?,?,?,?,?,?)').bind(fyid, ac_key, ac_name || '', dr_cr, amount, sess.username, now, company_id || '').run();
  }
  return ok();
}
async function handleListVendorOpeningBalances({ fyid, company_id }, env) {
  let q = 'SELECT * FROM vendor_opening_balances WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  return ok({ vendor_opening_balances: (await env.DB.prepare(q + ' ORDER BY vendor_id').bind(...vals).all()).results });
}
async function handleSaveVendorOpeningBalance({ fyid, vendor_id, dr_cr, amount, company_id }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!fyid || !vendor_id || !dr_cr || amount === undefined) return err('fyid, vendor_id, dr_cr, amount required');
  const now = new Date().toISOString();
  const existing = await env.DB.prepare('SELECT id FROM vendor_opening_balances WHERE fyid=? AND vendor_id=? AND company_id=?').bind(fyid, vendor_id, company_id || '').first();
  if (existing) {
    await env.DB.prepare('UPDATE vendor_opening_balances SET dr_cr=?, amount=?, entered_by=?, entered_at=? WHERE id=?').bind(dr_cr, amount, sess.username, now, existing.id).run();
  } else {
    await env.DB.prepare('INSERT INTO vendor_opening_balances (fyid, vendor_id, dr_cr, amount, entered_by, entered_at, company_id) VALUES (?,?,?,?,?,?,?)').bind(fyid, vendor_id, dr_cr, amount, sess.username, now, company_id || '').run();
  }
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ REPORTS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleGetProjectReport({ project_id, fyid }, sess, env) {
  if (!project_id) return err('project_id required');
  const project = await env.DB.prepare('SELECT * FROM projects WHERE project_id = ?').bind(project_id).first();
  if (!project) return err('Project not found', 404);
  let q = 'SELECT * FROM entries WHERE project_id = ?'; const vals = [project_id];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  const entries = await env.DB.prepare(q + ' ORDER BY date DESC').bind(...vals).all();
  return ok({ project, entries: entries.results, total: entries.results.reduce((s, e) => s + (e.amount || 0), 0) });
}
async function handleGetVendorReport({ vendor_id, fyid, company_id }, sess, env) {
  if (!vendor_id) return err('vendor_id required');
  const vendor = await env.DB.prepare('SELECT * FROM vendors WHERE vendor_id = ?').bind(vendor_id).first();
  if (!vendor) return err('Vendor not found', 404);
  let q = 'SELECT * FROM entries WHERE vendor_id = ?'; const vals = [vendor_id];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  const entries = await env.DB.prepare(q + ' ORDER BY date DESC').bind(...vals).all();
  return ok({ vendor, entries: entries.results, total: entries.results.reduce((s, e) => s + (e.amount || 0), 0) });
}
async function handleGetDashboard({ fyid, company_id }, sess, env) {
  const vals = []; let where = '1=1';
  if (fyid) { where += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { where += ' AND company_id = ?'; vals.push(company_id); }
  const [ec, pc, ta] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM entries WHERE ${where}`).bind(...vals).first(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM pending_entries WHERE status='Pending' AND ${where}`).bind(...vals).first(),
    env.DB.prepare(`SELECT SUM(amount) as total FROM entries WHERE ${where}`).bind(...vals).first(),
  ]);
  return ok({ entries_count: ec?.cnt || 0, pending_count: pc?.cnt || 0, total_amount: ta?.total || 0 });
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ DRIVE / GAS PROXY ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleDriveProxy({ file_url }, sess, env) {
  if (!file_url) return err('file_url required');
  if (!file_url.includes('drive.google.com') && !file_url.includes('docs.google.com')) return err('Only Google Drive URLs are allowed');
  try {
    const resp = await fetch(file_url);
    const blob = await resp.arrayBuffer();
    return new Response(blob, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/octet-stream', ...CORS } });
  } catch (e) { return err(`Drive fetch failed: ${e.message}`); }
}
async function handleGasProxy({ gas_action, payload = {} }, sess, env) {
  const gasUrl = env.GAS_URL;
  if (!gasUrl) return err('GAS_URL not configured');
  try {
    const url = new URL(gasUrl);
    url.searchParams.set('action', gas_action);
    const resp = await fetch(url.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return ok({ gas_response: await resp.json() });
  } catch (e) { return err(`GAS proxy failed: ${e.message}`); }
}


// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// MIGRATION ENDPOINT Ã¢ÂÂ POST /migrate { secret, step, table?, rows?, fyid? }
// steps: probe | seed_user | insert | counts
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
async function handleMigrate(request, env) {
  let body; try { body = await request.json(); } catch { return err('Invalid JSON'); }
  if (body.secret !== 'migrate_bluedoor_2024') return err('Forbidden', 403);
  const FYID = body.fyid || 'FY2627';

  async function gasCall(action, extra = {}) {
    try {
      const url = new URL(env.GAS_URL);
      url.searchParams.set('action', action);
      const r = await fetch(url.toString(), { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({action, fyid: FYID, ...extra}), redirect: 'follow' });
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { _raw: text.substring(0, 300) }; }
    } catch(e) { return { _error: e.message }; }
  }

  // probe: test all GAS actions
  if (body.step === 'probe') {
    const probes = {};
    for (const a of ['getFYList','getCompanies','getUsers','getCOA','getEntryTypes','getCostHeads','getAllVendors','getAllProjects','getOpeningBalances','getVendorOB','getLedger','getPendingEntries']) {
      probes[a] = await gasCall(a);
    }
    return ok({ probes });
  }

  // seed_user: insert Arpit supervisor
  if (body.step === 'seed_user') {
    await env.DB.prepare("INSERT OR REPLACE INTO users (user_id,username,password,role,active,companies) VALUES ('USR_ARPIT','Arpit','BlueDoor@2024','Admin',1,'[]')").run();
    return ok({ seed_user: 'done' });
  }

  // insert: bulk insert rows into a table
  if (body.step === 'insert') {
    const { table, rows } = body;
    if (!table || !Array.isArray(rows)) return err('table and rows[] required');
    let inserted = 0, failed = 0; const errors = [];
    const n = v => parseFloat(v) || 0, s = v => v ?? '';
    for (const row of rows) {
      try {
        let sql, params;
        if (table === 'companies') { sql = 'INSERT OR REPLACE INTO companies (company_id,company_name,drive_folder,active) VALUES (?,?,?,1)'; params = [s(row.company_id||row.id),s(row.company_name||row.name),s(row.drive_folder||'')]; }
        else if (table === 'users') { sql = 'INSERT OR REPLACE INTO users (user_id,username,password,role,active,companies) VALUES (?,?,?,?,?,?)'; params = [s(row.user_id||row.id||row.email),s(row.username||row.name||row.email),s(row.password||'changeme123'),s(row.role||'Staff'),row.active===false?0:1,JSON.stringify(row.companies||[])]; }
        else if (table === 'chart_of_accounts') { sql = 'INSERT OR REPLACE INTO chart_of_accounts (ac_key,ac_code,ac_name,ac_type,category) VALUES (?,?,?,?,?)'; params = [s(row.ac_key||row.key),s(row.ac_code||row.code),s(row.ac_name||row.name),s(row.ac_type||row.type||'Asset'),s(row.category||'')]; }
        else if (table === 'entry_types') { sql = 'INSERT OR REPLACE INTO entry_types (et_key,label,category,dr,cr,needs_ch,active) VALUES (?,?,?,?,?,?,?)'; params = [s(row.et_key||row.key||row.id),s(row.label||row.name),s(row.category||''),s(row.dr||''),s(row.cr||''),row.needs_ch?1:0,row.active===false?0:1]; }
        else if (table === 'cost_heads') { sql = 'INSERT OR REPLACE INTO cost_heads (ch_id,ch_name,ac_key) VALUES (?,?,?)'; params = [s(row.ch_id||row.id||row.key),s(row.ch_name||row.name),s(row.ac_key||'')]; }
        else if (table === 'vendors') { sql = 'INSERT OR REPLACE INTO vendors (vendor_id,vendor_name,vendor_type,contact,gstin,details) VALUES (?,?,?,?,?,?)'; params = [s(row.vendor_id||row.id),s(row.vendor_name||row.name),s(row.vendor_type||row.type||''),s(row.contact||row.phone||''),s(row.gstin||row.gst||''),s(row.details||row.notes||'')]; }
        else if (table === 'projects') { sql = 'INSERT OR REPLACE INTO projects (project_id,project_name,client,location,status,start_date,budget,fyid) VALUES (?,?,?,?,?,?,?,?)'; params = [s(row.project_id||row.id),s(row.project_name||row.name),s(row.client||''),s(row.location||''),s(row.status||'Active'),s(row.start_date||''),n(row.budget),s(row.fyid||FYID)]; }
        else if (table === 'entries') { sql = 'INSERT OR REPLACE INTO entries (entry_id,date,fyid,project_id,cost_head_id,vendor_id,entry_type,amount,narration,created_by,created_at,company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'; params = [s(row.entry_id||row.id),s(row.date),s(row.fyid||FYID),s(row.project_id||''),s(row.cost_head_id||''),s(row.vendor_id||''),s(row.entry_type||''),n(row.amount),s(row.narration||''),s(row.created_by||row.user||'migration'),s(row.created_at||row.timestamp||new Date().toISOString()),s(row.company_id||'')]; }
        else if (table === 'opening_balances') { sql = 'INSERT INTO opening_balances (fyid,ac_key,ac_name,dr_cr,amount,entered_by,entered_at,company_id) VALUES (?,?,?,?,?,?,?,?)'; params = [s(row.fyid||FYID),s(row.ac_key||row.key),s(row.ac_name||row.name||''),s(row.dr_cr||'DR'),n(row.amount),s(row.entered_by||'migration'),s(row.entered_at||new Date().toISOString()),s(row.company_id||'')]; }
        else if (table === 'vendor_opening_balances') { sql = 'INSERT INTO vendor_opening_balances (fyid,vendor_id,dr_cr,amount,entered_by,entered_at,company_id) VALUES (?,?,?,?,?,?,?)'; params = [s(row.fyid||FYID),s(row.vendor_id||row.id),s(row.dr_cr||'DR'),n(row.amount),s(row.entered_by||'migration'),s(row.entered_at||new Date().toISOString()),s(row.company_id||'')]; }
        else if (table === 'pending_entries') { sql = "INSERT OR REPLACE INTO pending_entries (entry_id,date,fyid,entry_type,project_id,cost_head_id,vendor_id,amount,narration,submitted_by,submitted_at,status,drive_file_url,company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,'Pending',?,?)"; params = [s(row.entry_id||row.id),s(row.date),s(row.fyid||FYID),s(row.entry_type||''),s(row.project_id||''),s(row.cost_head_id||''),s(row.vendor_id||''),n(row.amount),s(row.narration||''),s(row.submitted_by||row.user||''),s(row.submitted_at||row.timestamp||new Date().toISOString()),s(row.drive_file_url||''),s(row.company_id||'')]; }
        else if (table === 'ledger') { sql = 'INSERT INTO ledger (entry_id,date,fyid,ac_code,ac_name,dr_cr,debit,credit,project_id,cost_head_id,vendor_id,narration,created_by,created_at,company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'; params = [s(row.entry_id||row.id),s(row.date),s(row.fyid||FYID),s(row.ac_code||row.AccountCode||''),s(row.ac_name||row.AccountName||''),s(row.dr_cr||row.DrCr||'DR'),n(row.debit||row.DebitAmt),n(row.credit||row.CreditAmt),s(row.project_id||row.ProjectID||''),s(row.cost_head_id||row.CostHeadID||''),s(row.vendor_id||row.VendorID||''),s(row.narration||row.Narration||''),s(row.created_by||row.CreatedBy||'import'),s(row.created_at||row.CreatedAt||new Date().toISOString()),s(row.company_id||row.CompanyID||'')]; } else return err('Unknown table: ' + table);
        await env.DB.prepare(sql).bind(...params).run();
        inserted++;
      } catch(e) { failed++; errors.push({ row, error: e.message }); }
    }
    return ok({ table, inserted, failed, errors: errors.slice(0,5) });
  }

  // counts: show row counts for all tables
  if (body.step === 'counts') {
    const counts = {};
    for (const t of ['companies','users','chart_of_accounts','entry_types','cost_heads','vendors','projects','entries','pending_entries','opening_balances','vendor_opening_balances','ledger']) {
      const r = await env.DB.prepare('SELECT COUNT(*) as cnt FROM ' + t).first();
      counts[t] = r?.cnt || 0;
    }
    return ok({ counts });
  }

  return err('Unknown step. Use: probe | seed_user | insert | counts');
}