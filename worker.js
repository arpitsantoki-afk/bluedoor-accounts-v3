// BlueDoor Accounts V3 — r2 ÃÂ¢ÃÂÃÂ Cloudflare Worker
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
  if (action === 'googleLogin') return handleGoogleLogin(params, env);
  if (action === 'logout') return handleLogout(params, req, env);
  const { sess, resp } = await requireSession(env, req);
  if (resp) return resp;
  switch (action) {
    case 'getMe': return ok({ user: sess });
    case 'getMyProfile': return handleGetMyProfile(params, sess, env);
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
    case 'deleteProject': return handleDeleteProject(params, sess, env);
    case 'deleteVendor': return handleDeleteVendor(params, sess, env);
    case 'updateCOA': return handleUpdateCOA(params, sess, env);
    case 'deleteCOA': return handleDeleteCOA(params, sess, env);
    case 'updateCostHead': return handleUpdateCostHead(params, sess, env);
    case 'deleteCostHead': return handleDeleteCostHead(params, sess, env);
    case 'updateEntryTypeAdmin': return handleUpdateEntryTypeAdmin(params, sess, env);
    case 'deleteEntryType': return handleDeleteEntryType(params, sess, env);
    case 'listEntries': return handleListEntries(params, sess, env);
    case 'addEntry': return handleAddEntry(params, sess, env);
    case 'updateEntry': return handleUpdateEntry(params, sess, env);
    case 'deleteEntry': return handleDeleteEntry(params, sess, env);
    case 'updatePending': return handleUpdatePending(params, sess, env);
    case 'deletePending': return handleDeletePending(params, sess, env);
    case 'listPending': return handleListPending(params, sess, env);
    case 'submitPending': return handleSubmitPending(params, sess, env);
    case 'approvePending': return handleApprovePending(params, sess, env);
    case 'rejectPending': return handleRejectPending(params, sess, env);
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
    case 'sendOnboarding': return handleSendOnboarding(params, sess, env);
    case 'deleteFile': return handleDeleteFileProxy(params, sess, env);
    case 'uploadFile': return handleUploadFile(params, sess, env);
    case 'gasProxy': return handleGasProxy(params, sess, env);
    default: return err(`Unknown action: ${action}`, 400);
  }
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AUTH ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

// ── Google OAuth Login ─────────────────────────────────────────────────────
async function handleGoogleLogin({ id_token }, env) {
  if (!id_token) return err('id_token required');
  try {
    // Decode JWT payload (middle part, base64url encoded)
    const parts = id_token.split('.');
    if (parts.length !== 3) return err('Invalid token format', 401);
    // base64url decode
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const payload = JSON.parse(atob(pad));

    // Verify this token is for our app
    const CLIENT_ID = '449634347678-tkbk083eu1igcil0rq58tgvdrs54l4nm.apps.googleusercontent.com';
    if (payload.aud !== CLIENT_ID) return err('Token not for this app', 401);
    if (!payload.email_verified) return err('Email not verified', 401);

    // Check expiry
    if (payload.exp && payload.exp < Date.now() / 1000) return err('Token expired', 401);

    const email = (payload.email || '').toLowerCase();
    if (!email) return err('No email in token', 401);

    // Look up user by google_email
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE LOWER(google_email) = ? AND active = 1"
    ).bind(email).first();

    // Super admin bypass
    const SUPER_ADMIN_EMAIL = 'info.unikraft@gmail.com';
    if (!user && email.toLowerCase() !== SUPER_ADMIN_EMAIL) return err('No account linked to ' + email + '. Contact admin.', 401);
    if (!user && email.toLowerCase() === SUPER_ADMIN_EMAIL) {
      await env.DB.prepare("INSERT OR REPLACE INTO users (user_id,username,password,role,active,companies,google_email,allowed_vendors) VALUES ('USR_SUPERADMIN','SuperAdmin','','Admin',1,'[]','info.unikraft@gmail.com','[]')").run();
      const superUser = await env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind('USR_SUPERADMIN').first();
      const token2 = genToken();
      const sd = { user_id: 'USR_SUPERADMIN', username: 'SuperAdmin', role: 'Admin', companies: [], allowed_vendors: [] };
      await env.SESSIONS.put('sess:' + token2, JSON.stringify(sd), { expirationTtl: 28800 });
      return ok({ token: token2, user: { ...sd, email } });
    }

    const token = genToken();
    const companies = (() => { try { const v = user.companies; if (!v) return []; if (v.startsWith('[')) return JSON.parse(v); return v.split(',').map(s=>s.trim()).filter(Boolean); } catch(e) { return []; } })();
    const normalizedRole = (user.role === 'Supervisor') ? 'Supervisor' : user.role;
    const allowed_vendors = (() => { try { return user.allowed_vendors ? JSON.parse(user.allowed_vendors) : []; } catch(e) { return []; } })();
    const sessData = { user_id: user.user_id, username: user.username, role: normalizedRole, companies, email, allowed_vendors };
    await env.SESSIONS.put(`sess:${token}`, JSON.stringify(sessData), { expirationTtl: 28800 });
    return ok({ token, user: { user_id: user.user_id, username: user.username, role: normalizedRole, companies, email, allowed_vendors } });
  } catch (e) {
    return err('Google auth error: ' + e.message, 500);
  }
}

async function handleLogin({ username, password }, env) {
  if (!username || !password) return err('username and password required');
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND active = 1').bind(username).first();
  if (!user) return err('Invalid credentials', 401);
  if (user.password !== password) return err('Invalid credentials', 401);
  const token = genToken();
  const companies = (() => { try { const v = user.companies; if (!v) return []; if (v.startsWith('[')) return JSON.parse(v); return v.split(',').map(s=>s.trim()).filter(Boolean); } catch(e) { return []; } })();
  const normalizedRole = (user.role === 'Supervisor') ? 'Supervisor' : user.role;
  const allowed_vendors = (() => { try { return user.allowed_vendors ? JSON.parse(user.allowed_vendors) : []; } catch(e) { return []; } })();
  const sessData = { user_id: user.user_id, username: user.username, role: normalizedRole, companies, allowed_vendors };
  await env.SESSIONS.put(`sess:${token}`, JSON.stringify(sessData), { expirationTtl: 28800 });
  return ok({ token, user: { user_id: user.user_id, username: user.username, role: normalizedRole, companies, allowed_vendors } });
}
async function handleLogout({ token }, req, env) {
  const t = token || req.headers.get('X-Session-Token') || '';
  if (t) await env.SESSIONS.delete(`sess:${t}`);
  return ok({ message: 'Logged out' });
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ USERS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleGetMyProfile(params, sess, env) {
  const user = await env.DB.prepare('SELECT user_id, username, role, companies, google_email, allowed_vendors FROM users WHERE user_id = ?').bind(sess.user_id).first();
  if (!user) return err('User not found', 404);
  let companies = []; try { companies = JSON.parse(user.companies || '[]'); } catch(e) {}
  let allowed_vendors = []; try { allowed_vendors = JSON.parse(user.allowed_vendors || '[]'); } catch(e) {}
  return ok({ user: { ...user, companies, allowed_vendors } });
}

async function handleListUsers(params, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  const rows = await env.DB.prepare('SELECT user_id, username, role, active, companies, google_email, allowed_vendors FROM users ORDER BY username').all();
  return ok({ users: rows.results });
}
async function handleAddUser({ username, password, role, companies = [], google_email = '' }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  if (!username || !role) return err('username and role required');
  // Auto-generate password if not provided
  if (!password) {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    password = [...arr].map(b => b.toString(16).padStart(2,'0')).join('').substring(0,12);
  }
  const uid = `U${Date.now()}`;
  await env.DB.prepare('INSERT INTO users (user_id, username, password, role, active, companies, google_email) VALUES (?,?,?,?,1,?,?)').bind(uid, username, password, role, JSON.stringify(companies), google_email).run();
  return ok({ user_id: uid, password });
}
async function handleUpdateUser(params, sess, env) {
  const { user_id, role, active, companies, google_email, allowed_vendors, username, password } = params;
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  if (!user_id) return err('user_id required');
  const fields = [], vals = [];
  if (username !== undefined) { fields.push('username = ?'); vals.push(username); }
  if (password !== undefined) { fields.push('password = ?'); vals.push(password); }
  if (role !== undefined) { fields.push('role = ?'); vals.push(role); }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active ? 1 : 0); }
  if (companies !== undefined && companies !== null) { fields.push('companies = ?'); vals.push(JSON.stringify(Array.isArray(companies) ? companies : [])); }
  if (google_email !== undefined) { fields.push('google_email = ?'); vals.push(google_email); }
  if (allowed_vendors !== undefined) { fields.push('allowed_vendors = ?'); vals.push(JSON.stringify(allowed_vendors)); }
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
async function handleAddCompany({ company_id, company_name, drive_folder = '' }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  if (!company_name) return err('company_name required');
  if (!company_id) return err('company_id required');
  // Validate: alphanumeric + underscores only, 2-20 chars
  if (!/^[A-Z0-9_]{2,20}$/.test(company_id)) return err('Company ID must be 2-20 uppercase letters, numbers or underscores (e.g. BDD, TPG_2)');
  // Check uniqueness
  const existing = await env.DB.prepare('SELECT company_id FROM companies WHERE company_id = ?').bind(company_id).first();
  if (existing) return err('Company ID "' + company_id + '" already exists — choose a different ID');
  await env.DB.prepare('INSERT INTO companies (company_id, company_name, drive_folder, active) VALUES (?,?,?,1)').bind(company_id, company_name, drive_folder).run();
  return ok({ company_id });
}
async function handleUpdateCompany({ company_id, company_name, drive_folder, active }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
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
  if (!vendor_name) return err('vendor_name required');
  const vid = vendor_id ? vendor_id.trim().toUpperCase() : ('V' + Date.now());
  const existing = await env.DB.prepare('SELECT vendor_id FROM vendors WHERE vendor_id = ?').bind(vid).first();
  if (existing) return err('Vendor ID "' + vid + '" already exists');
  await env.DB.prepare('INSERT INTO vendors (vendor_id, vendor_name, vendor_type, contact, gstin, details) VALUES (?,?,?,?,?,?)').bind(vid, vendor_name, vendor_type, contact, gstin, details).run();
  return ok({ vendor_id: vid });
}
async function handleUpdateVendor({ vendor_id, vendor_name, vendor_type, contact, gstin, details }, sess, env) {
  if (!vendor_id) return err('vendor_id required');
  // Supervisor access check — only allowed vendors
  if (sess.role === 'Supervisor') {
    const allowed = Array.isArray(sess.allowed_vendors) ? sess.allowed_vendors : [];
    if (allowed.length > 0 && !allowed.includes(vendor_id)) {
      return err('Access denied — this vendor is not in your allowed list', 403);
    }
  }
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
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
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
async function handleAddEntryType({ et_key, label, category, dr, cr, needs_ch = 0, active = 1, hint = '' }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  if (!et_key || !label || !category || !dr || !cr) return err('et_key, label, category, dr, cr required');
  await env.DB.prepare('INSERT INTO entry_types (et_key, label, category, dr, cr, needs_ch, active, hint) VALUES (?,?,?,?,?,?,?,?)').bind(et_key, label, category, dr, cr, needs_ch ? 1 : 0, active ? 1 : 0, hint||'').run();
  return ok({ et_key });
}
async function handleUpdateEntryType({ et_key, label, category, dr, cr, needs_ch, active }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  if (!et_key) return err('et_key required');
  const fields = [], vals = [];
  if (label !== undefined) { fields.push('label = ?'); vals.push(label); }
  if (category !== undefined) { fields.push('category = ?'); vals.push(category); }
  if (dr !== undefined) { fields.push('dr = ?'); vals.push(dr); }
  if (cr !== undefined) { fields.push('cr = ?'); vals.push(cr); }
  if (needs_ch !== undefined) { fields.push('needs_ch = ?'); vals.push(needs_ch ? 1 : 0); }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active ? 1 : 0); }
  if (hint !== undefined) { fields.push('hint = ?'); vals.push(hint); }
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
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor') && sess.companies?.length) {
    q += ` AND company_id IN (${sess.companies.map(() => '?').join(',')})`;
    vals.push(...sess.companies);
  }
  q += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
  vals.push(limit, offset);
  return ok({ entries: (await env.DB.prepare(q).bind(...vals).all()).results });
}
async function handleAddEntry(params, sess, env) {
  const { date, fyid, project_id = '', cost_head_id = '', vendor_id = '', entry_type, amount, narration = '', company_id = '', drive_file_url = '' } = params;
  if (!date || !fyid || !entry_type || !amount) return err('date, fyid, entry_type, amount required');

  // Get entry type definition
  const et = await env.DB.prepare('SELECT * FROM entry_types WHERE et_key = ?').bind(entry_type).first();
  if (!et) return err('Invalid entry_type: ' + entry_type);

  const eid = `E${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  // Resolve account keys — COST_HEAD means use the cost head's linked account
  // PAYABLE / RECEIVABLE / etc. are direct keys in chart_of_accounts
  async function resolveAccount(acKey) {
    if (!acKey) return null;
    if (acKey === 'COST_HEAD') {
      // Use cost_head's ac_key to find the account
      if (!cost_head_id) return null;
      const ch = await env.DB.prepare('SELECT ac_key FROM cost_heads WHERE ch_id = ?').bind(cost_head_id).first();
      if (!ch || !ch.ac_key) return null;
      return env.DB.prepare('SELECT ac_code, ac_name FROM chart_of_accounts WHERE ac_key = ?').bind(ch.ac_key).first();
    }
    return env.DB.prepare('SELECT ac_code, ac_name FROM chart_of_accounts WHERE ac_key = ?').bind(acKey).first();
  }

  const [drAc, crAc] = await Promise.all([resolveAccount(et.dr), resolveAccount(et.cr)]);

  // Insert main entry record
  await env.DB.prepare(
    'INSERT INTO entries (entry_id, date, fyid, project_id, cost_head_id, vendor_id, entry_type, amount, narration, created_by, created_at, company_id, drive_file_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(eid, date, fyid, project_id, cost_head_id, vendor_id, entry_type, amount, narration, sess.username, now, company_id, drive_file_url).run();

  // Insert DEBIT ledger entry
  if (drAc) {
    await env.DB.prepare(
      "INSERT INTO ledger (entry_id, date, fyid, ac_code, ac_name, dr_cr, debit, credit, project_id, cost_head_id, vendor_id, narration, created_by, created_at, company_id) VALUES (?,?,?,?,?,'DR',?,0,?,?,?,?,?,?,?)"
    ).bind(eid, date, fyid, drAc.ac_code, drAc.ac_name, amount, project_id, cost_head_id, vendor_id, narration, sess.username, now, company_id).run();
  } else {
    // Log warning — DR account not resolved
    console.warn(`[addEntry] DR account not resolved for et_key=${entry_type} dr=${et.dr} cost_head_id=${cost_head_id}`);
  }

  // Insert CREDIT ledger entry
  if (crAc) {
    await env.DB.prepare(
      "INSERT INTO ledger (entry_id, date, fyid, ac_code, ac_name, dr_cr, debit, credit, project_id, cost_head_id, vendor_id, narration, created_by, created_at, company_id) VALUES (?,?,?,?,?,'CR',0,?,?,?,?,?,?,?,?)"
    ).bind(eid, date, fyid, crAc.ac_code, crAc.ac_name, amount, project_id, cost_head_id, vendor_id, narration, sess.username, now, company_id).run();
  } else {
    console.warn(`[addEntry] CR account not resolved for et_key=${entry_type} cr=${et.cr}`);
  }

  return ok({
    entry_id: eid,
    dr_account: drAc ? `${drAc.ac_code} ${drAc.ac_name}` : `unresolved(${et.dr})`,
    cr_account: crAc ? `${crAc.ac_code} ${crAc.ac_name}` : `unresolved(${et.cr})`,
    amount
  });
}
// ── UPDATE ENTRY ─────────────────────────────────────────────────────────────
async function handleUpdateEntry({ entry_id, narration, drive_file_url, delete_file }, sess, env) {
  if (!entry_id) return err('entry_id required');
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  const existing = await env.DB.prepare('SELECT * FROM entries WHERE entry_id = ?').bind(entry_id).first();
  if (!existing) return err('Entry not found', 404);
  // Delete old Drive file if requested
  if (delete_file && existing.drive_file_url) {
    await deleteFileFromDrive(existing.drive_file_url, env);
  }
  const newUrl = delete_file ? (drive_file_url || '') : (drive_file_url !== undefined ? drive_file_url : existing.drive_file_url);
  const newNarr = narration !== undefined ? narration : existing.narration;
  await env.DB.prepare('UPDATE entries SET narration = ?, drive_file_url = ? WHERE entry_id = ?')
    .bind(newNarr, newUrl, entry_id).run();
  // Update ledger narration too
  await env.DB.prepare('UPDATE ledger SET narration = ? WHERE entry_id = ?')
    .bind(newNarr, entry_id).run();
  return ok({ updated: entry_id, drive_file_url: newUrl });
}

// ── UPDATE PENDING ────────────────────────────────────────────────────────────
async function handleUpdatePending({ entry_id, entry_type, date, amount, narration, cost_head_id, project_id, vendor_id, drive_file_url, delete_file }, sess, env) {
  if (!entry_id) return err('entry_id required');
  const existing = await env.DB.prepare('SELECT * FROM pending_entries WHERE entry_id = ?').bind(entry_id).first();
  if (!existing) return err('Pending entry not found', 404);
  // Only submitter or admin can edit
  if (sess.role !== 'Admin' && existing.submitted_by !== sess.username) return err('Forbidden', 403);
  // Can only edit Pending status entries (not yet approved/rejected)
  if (existing.status !== 'Pending' && sess.role !== 'Admin') return err('Cannot edit — entry already ' + existing.status, 400);
  // Delete old file if requested
  if (delete_file && existing.drive_file_url) {
    await deleteFileFromDrive(existing.drive_file_url, env);
  }
  const newUrl = delete_file ? (drive_file_url || '') : (drive_file_url !== undefined ? drive_file_url : existing.drive_file_url);
  const fields = [], vals = [];
  if (date !== undefined) { fields.push('date = ?'); vals.push(date); }
  if (amount !== undefined) { fields.push('amount = ?'); vals.push(amount); }
  if (narration !== undefined) { fields.push('narration = ?'); vals.push(narration); }
  if (drive_file_url !== undefined) { fields.push('drive_file_url = ?'); vals.push(drive_file_url); }
  if (cost_head_id !== undefined) { fields.push('cost_head_id = ?'); vals.push(cost_head_id); }
  if (project_id !== undefined) { fields.push('project_id = ?'); vals.push(project_id); }
  if (entry_type !== undefined) { fields.push('entry_type = ?'); vals.push(entry_type); }
  if (vendor_id !== undefined) { fields.push('vendor_id = ?'); vals.push(vendor_id); }
  fields.push('drive_file_url = ?'); vals.push(newUrl);
  fields.push('status = ?'); vals.push('Pending'); // reset to pending on edit
  vals.push(entry_id);
  await env.DB.prepare(`UPDATE pending_entries SET ${fields.join(', ')} WHERE entry_id = ?`).bind(...vals).run();
  return ok({ updated: entry_id });
}

// Delete a file from Google Drive via GAS
async function deleteFileFromDrive(fileUrl, env) {
  if (!fileUrl || !fileUrl.includes('drive.google.com')) return;
  const gasUrl = env.GAS_URL;
  if (!gasUrl) return;
  try {
    // Extract fileId from URL: /file/d/{fileId}/view
    const m = fileUrl.match(/\/file\/d\/([^\/]+)/);
    if (!m) return;
    const fileId = m[1];
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteFile', fileId }),
      redirect: 'follow'
    });
  } catch(e) { /* best-effort delete */ }
}

async function handleDeleteEntry({ entry_id }, sess, env) {
  if (!entry_id) return err('entry_id required');
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  const existing = await env.DB.prepare('SELECT * FROM entries WHERE entry_id = ?').bind(entry_id).first();
  if (!existing) return err('Entry not found', 404);
  const ledgerCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM ledger WHERE entry_id = ?').bind(entry_id).first();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM entries WHERE entry_id = ?').bind(entry_id),
    env.DB.prepare('DELETE FROM ledger WHERE entry_id = ?').bind(entry_id)
  ]);
  // Delete associated Drive file (best-effort)
  if (existing.drive_file_url) {
    await deleteFileFromDrive(existing.drive_file_url, env);
  }
  return ok({ deleted_entry: entry_id, deleted_ledger_rows: ledgerCount?.cnt || 0, entry: existing });
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ PENDING ENTRIES ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleListPending({ fyid, company_id, status, submitted_by }, sess, env) {
  let q = 'SELECT * FROM pending_entries WHERE 1=1'; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  if (status) { q += ' AND status = ?'; vals.push(status); }
  if (submitted_by) { q += ' AND submitted_by = ?'; vals.push(submitted_by); }
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) { q += ' AND submitted_by = ?'; vals.push(sess.username); }
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
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  const pe = await env.DB.prepare('SELECT * FROM pending_entries WHERE entry_id = ?').bind(entry_id).first();
  if (!pe) return err('Pending entry not found', 404);
  if (pe.status !== 'Pending') return err('Entry is not in Pending status');
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE pending_entries SET status='Approved', reviewed_by=?, reviewed_at=? WHERE entry_id=?").bind(sess.username, now, entry_id).run();
  return await handleAddEntry({ date: pe.date, fyid: pe.fyid, project_id: pe.project_id, cost_head_id: pe.cost_head_id, vendor_id: pe.vendor_id, entry_type: pe.entry_type, amount: pe.amount, narration: pe.narration, company_id: pe.company_id, drive_file_url: pe.drive_file_url || '' }, { ...sess, username: pe.submitted_by }, env);
}
async function handleRejectPending({ entry_id, reject_reason = '' }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  await env.DB.prepare("UPDATE pending_entries SET status='Rejected', reviewed_by=?, reviewed_at=?, reject_reason=? WHERE entry_id=?").bind(sess.username, new Date().toISOString(), reject_reason, entry_id).run();
  return ok();
}
async function handleDeletePending({ entry_id }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
  await env.DB.prepare('DELETE FROM pending_entries WHERE entry_id = ?').bind(entry_id).run();
  return ok();
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ LEDGER & REPORTS ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
async function handleGetLedger({ fyid, ac_code, company_id, date_from, date_to }, sess, env) {
  let q = 'SELECT l.*, e.drive_file_url AS doc_url FROM ledger l LEFT JOIN entries e ON l.entry_id = e.entry_id WHERE 1=1';
  const vals = [];
  if (fyid)       { q += ' AND l.fyid = ?';       vals.push(fyid); }
  if (ac_code)    { q += ' AND l.ac_code = ?';    vals.push(ac_code); }
  if (company_id) { q += ' AND l.company_id = ?'; vals.push(company_id); }
  if (date_from)  { q += ' AND l.date >= ?';      vals.push(date_from); }
  if (date_to)    { q += ' AND l.date <= ?';      vals.push(date_to); }
  q += ' ORDER BY l.date ASC, l.id ASC';
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
  let q = "SELECT *, UPPER(dr_cr) as dr_cr FROM opening_balances WHERE 1=1"; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  return ok({ opening_balances: (await env.DB.prepare(q + ' ORDER BY ac_name').bind(...vals).all()).results });
}
async function handleSaveOpeningBalance({ fyid, ac_key, ac_name, dr_cr, amount, company_id }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
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
  let q = "SELECT *, UPPER(dr_cr) as dr_cr FROM vendor_opening_balances WHERE 1=1"; const vals = [];
  if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
  if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
  return ok({ vendor_opening_balances: (await env.DB.prepare(q + ' ORDER BY vendor_id').bind(...vals).all()).results });
}
async function handleSaveVendorOpeningBalance({ fyid, vendor_id, dr_cr, amount, company_id }, sess, env) {
  if ((sess.role !== 'Admin' && sess.role !== 'Supervisor')) return err('Forbidden', 403);
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
  try {
    if (!vendor_id) return err('vendor_id required');
    const vendor = await env.DB.prepare('SELECT * FROM vendors WHERE vendor_id = ?').bind(vendor_id).first();
    if (!vendor) return err('Vendor not found', 404);

    // Get entries for this vendor
    let q = 'SELECT * FROM entries WHERE vendor_id = ?'; const vals = [vendor_id];
    if (fyid) { q += ' AND fyid = ?'; vals.push(fyid); }
    if (company_id) { q += ' AND company_id = ?'; vals.push(company_id); }
    const entries = await env.DB.prepare(q + ' ORDER BY date ASC').bind(...vals).all();

    // Get ledger rows — use subquery alias to avoid column name conflict
    let lq = 'SELECT l.*, e.drive_file_url AS doc_url FROM ledger l LEFT JOIN entries e ON l.entry_id = e.entry_id WHERE l.vendor_id = ?';
    const lvals = [vendor_id];
    if (fyid) { lq += ' AND l.fyid = ?'; lvals.push(fyid); }
    if (company_id) { lq += ' AND l.company_id = ?'; lvals.push(company_id); }
    const ledger = await env.DB.prepare(lq + ' ORDER BY l.date ASC').bind(...lvals).all();

    // Get opening balance — wrapped in try in case table doesn't exist
    let ob = null;
    try {
      if (company_id) {
        ob = await env.DB.prepare('SELECT * FROM vendor_opening_balances WHERE vendor_id = ? AND fyid = ? AND company_id = ?').bind(vendor_id, fyid || 'FY2627', company_id).first();
      }
      if (!ob) {
        ob = await env.DB.prepare('SELECT * FROM vendor_opening_balances WHERE vendor_id = ? AND fyid = ?').bind(vendor_id, fyid || 'FY2627').first();
      }
    } catch(obErr) {
      // vendor_opening_balances table may not exist yet
      ob = null;
    }

    const total = entries.results.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    if (ob) ob = {...ob, dr_cr: (ob.dr_cr || 'CR').toUpperCase()};
    return ok({ vendor, entries: entries.results, ledger: ledger.results, opening_balance: ob || null, total });
  } catch(e) {
    return err('getVendorReport error: ' + e.message, 500);
  }
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



// ── DELETE FILE PROXY ─────────────────────────────────────────────────────────
async function handleDeleteFileProxy({ file_url }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  await deleteFileFromDrive(file_url, env);
  return ok({ deleted: true });
}

// ── FILE UPLOAD VIA GAS → GOOGLE DRIVE ───────────────────────────────────────
async function handleUploadFile({ folderId, filename, base64Data, mimeType }, sess, env) {
  if (!folderId)   return err('folderId required');
  if (!filename)   return err('filename required');
  if (!base64Data) return err('base64Data required');

  const gasUrl = env.GAS_URL;
  if (!gasUrl) return err('GAS_URL not configured');

  try {
    const resp = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'uploadToDrive',
        folderId,
        filename,
        base64Data,
        mimeType: mimeType || 'application/octet-stream'
      }),
      redirect: 'follow'
    });
    const text = await resp.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { raw: text.substring(0, 200) }; }
    if (!result.ok) return err('GAS upload failed: ' + (result.error || JSON.stringify(result)));
    return ok({ url: result.url, fileId: result.fileId, fileName: result.fileName });
  } catch(e) {
    return err('Upload failed: ' + e.message);
  }
}

// ── ONBOARDING EMAIL via Resend ──────────────────────────────────────────────
async function handleSendOnboarding({ user_id }, sess, env) {
  if (sess.role !== 'Admin') return err('Forbidden', 403);
  if (!user_id) return err('user_id required');

  const user = await env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(user_id).first();
  if (!user) return err('User not found', 404);
  if (!user.google_email) return err('No email set for this user. Add their Google Email first.', 400);

  const RESEND_KEY = env.RESEND_API_KEY || 're_apoTnUiS_NmAvgB2c8w3gsdM8qJCEUx12';
  const APP_URL = env.APP_URL || 'https://arpitsantoki-afk.github.io/bluedoor-accounts-v3';
  const role = user.role;
  const appUrl = role === 'Admin' ? `${APP_URL}/admin.html` : `${APP_URL}/supervisor.html`;
  const loginUrl = `${APP_URL}/index.html`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#161920;border-radius:16px;border:1px solid #232630;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:#161920;padding:32px 32px 24px;text-align:center;border-bottom:1px solid #232630">
          <div style="font-size:28px;font-weight:800;color:#4f8ef7;letter-spacing:-0.5px">BLUE DOOR</div>
          <div style="font-size:12px;color:#64748b;letter-spacing:3px;text-transform:uppercase;margin-top:2px">ARCHITECTS</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="color:#e2e8f0;font-size:20px;font-weight:700;margin:0 0 8px">Welcome, ${user.username}! 👋</p>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px">Your BlueDoor Accounts V3 access is ready.</p>

          <!-- Credentials -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;border-radius:10px;border:1px solid #232630;margin-bottom:24px">
            <tr><td style="padding:20px">
              <div style="margin-bottom:14px">
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Role</div>
                <div style="color:#4f8ef7;font-size:14px;font-weight:600;background:rgba(79,142,247,.12);display:inline-block;padding:3px 10px;border-radius:6px">${role}</div>
              </div>
              <div style="margin-bottom:14px">
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Username</div>
                <div style="color:#e2e8f0;font-size:14px;font-weight:600;font-family:monospace">${user.username}</div>
              </div>
              <div>
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Password</div>
                <div style="color:#e2e8f0;font-size:14px;font-weight:600;font-family:monospace">${user.password}</div>
              </div>
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr>
              <td style="padding-right:6px">
                <a href="${loginUrl}" style="display:block;background:#4f8ef7;color:#fff;text-decoration:none;text-align:center;padding:13px;border-radius:9px;font-size:14px;font-weight:600">Sign In →</a>
              </td>
            </tr>
          </table>

          <!-- Install hint -->
          <div style="background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.15);border-radius:10px;padding:16px;margin-bottom:24px">
            <div style="color:#4f8ef7;font-size:12px;font-weight:600;margin-bottom:6px">📱 Install as App</div>
            <div style="color:#94a3b8;font-size:12px;line-height:1.6">
              Open the link in Chrome or Edge on your phone or desktop.<br>
              Tap <strong style="color:#e2e8f0">Install App</strong> when prompted, or use browser menu → "Add to Home Screen".
            </div>
          </div>

          <p style="color:#64748b;font-size:12px;margin:0">
            Please change your password after first login. If you have any issues, contact your administrator.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #232630;text-align:center">
          <div style="color:#475569;font-size:11px">Blue Door Architects · BlueDoor Accounts V3</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Blue Door Architects <onboarding@resend.dev>',
        to: [user.google_email],
        subject: `Welcome to BlueDoor Accounts, ${user.username}!`,
        html
      })
    });
    const result = await resp.json();
    if (!resp.ok) return err('Resend error: ' + JSON.stringify(result), 500);
    return ok({ sent: true, to: user.google_email, id: result.id });
  } catch(e) {
    return err('Email failed: ' + e.message);
  }
}

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
    // seed_user is deprecated — use addUser action via admin UI instead
    // Keeping endpoint active but making it a no-op to avoid accidental resets
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
                else if (table === 'users') { /* users table import blocked — manage users via admin UI */ failed++; errors.push('users table is protected — use admin UI'); continue; }
        else if (table === 'chart_of_accounts') { sql = 'INSERT OR REPLACE INTO chart_of_accounts (ac_key,ac_code,ac_name,ac_type,category) VALUES (?,?,?,?,?)'; params = [s(row.ac_key||row.key),s(row.ac_code||row.code),s(row.ac_name||row.name),s(row.ac_type||row.type||'Asset'),s(row.category||'')]; }
        else if (table === 'entry_types') { sql = 'INSERT OR REPLACE INTO entry_types (et_key,label,category,dr,cr,needs_ch,active,hint) VALUES (?,?,?,?,?,?,?,?)'; params = [s(row.et_key||row.key||row.id),s(row.label||row.name),s(row.category||''),s(row.dr||''),s(row.cr||''),row.needs_ch?1:0,row.active===false?0:1,s(row.hint||row.Hint||'')]; }
        else if (table === 'cost_heads') { sql = 'INSERT OR REPLACE INTO cost_heads (ch_id,ch_name,ac_key) VALUES (?,?,?)'; params = [s(row.ch_id||row.id||row.key),s(row.ch_name||row.name),s(row.ac_key||'')]; }
        else if (table === 'vendors') { sql = 'INSERT OR REPLACE INTO vendors (vendor_id,vendor_name,vendor_type,contact,gstin,details) VALUES (?,?,?,?,?,?)'; params = [s(row.vendor_id||row.id),s(row.vendor_name||row.name),s(row.vendor_type||row.type||''),s(row.contact||row.phone||''),s(row.gstin||row.gst||''),s(row.details||row.notes||'')]; }
        else if (table === 'projects') { sql = 'INSERT OR REPLACE INTO projects (project_id,project_name,client,location,status,start_date,budget,fyid) VALUES (?,?,?,?,?,?,?,?)'; params = [s(row.project_id||row.id),s(row.project_name||row.name),s(row.client||''),s(row.location||''),s(row.status||'Active'),s(row.start_date||''),n(row.budget),s(row.fyid||FYID)]; }
        else if (table === 'entries') { sql = 'INSERT OR REPLACE INTO entries (entry_id,date,fyid,project_id,cost_head_id,vendor_id,entry_type,amount,narration,created_by,created_at,company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'; params = [s(row.entry_id||row.id),s(row.date),s(row.fyid||FYID),s(row.project_id||''),s(row.cost_head_id||''),s(row.vendor_id||''),s(row.entry_type||''),n(row.amount),s(row.narration||''),s(row.created_by||row.user||'migration'),s(row.created_at||row.timestamp||new Date().toISOString()),s(row.company_id||'')]; }
        else if (table === 'opening_balances') { sql = 'INSERT INTO opening_balances (fyid,ac_key,ac_name,dr_cr,amount,entered_by,entered_at,company_id) VALUES (?,?,?,?,?,?,?,?)'; params = [s(row.fyid||FYID),s(row.ac_key||row.key),s(row.ac_name||row.name||''),s(row.dr_cr||'DR'),n(row.amount),s(row.entered_by||'migration'),s(row.entered_at||new Date().toISOString()),s(row.company_id||'')]; }
        else if (table === 'vendor_opening_balances') { sql = 'INSERT INTO vendor_opening_balances (fyid,vendor_id,dr_cr,amount,entered_by,entered_at,company_id) VALUES (?,?,?,?,?,?,?)'; params = [s(row.fyid||FYID),s(row.vendor_id||row.id),s(row.dr_cr||'DR'),n(row.amount),s(row.entered_by||'migration'),s(row.entered_at||new Date().toISOString()),s(row.company_id||'')]; }
        else if (table === 'pending_entries') { sql = 'INSERT OR REPLACE INTO pending_entries (entry_id,date,fyid,entry_type,project_id,cost_head_id,vendor_id,amount,narration,submitted_by,submitted_at,status,reviewed_by,reviewed_at,reject_reason,drive_file_url,company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'; params = [s(row.entry_id||row.id),s(row.date),s(row.fyid||FYID),s(row.entry_type||''),s(row.project_id||''),s(row.cost_head_id||''),s(row.vendor_id||''),n(row.amount),s(row.narration||''),s(row.submitted_by||row.user||''),s(row.submitted_at||row.timestamp||new Date().toISOString()),s(row.status||'Pending'),s(row.reviewed_by||''),s(row.reviewed_at||''),s(row.reject_reason||''),s(row.drive_file_url||''),s(row.company_id||'')]; }
        else if (table === 'ledger') { sql = 'INSERT INTO ledger (entry_id,date,fyid,ac_code,ac_name,dr_cr,debit,credit,project_id,cost_head_id,vendor_id,narration,created_by,created_at,company_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'; params = [s(row.entry_id||row.id),s(row.date),s(row.fyid||FYID),s(row.ac_code||row.AccountCode||''),s(row.ac_name||row.AccountName||''),s(row.dr_cr||row.DrCr||'DR'),n(row.debit||row.DebitAmt),n(row.credit||row.CreditAmt),s(row.project_id||row.ProjectID||''),s(row.cost_head_id||row.CostHeadID||''),s(row.vendor_id||row.VendorID||''),s(row.narration||row.Narration||''),s(row.created_by||row.CreatedBy||'import'),s(row.created_at||row.CreatedAt||new Date().toISOString()),s(row.company_id||row.CompanyID||'')]; } else return err('Unknown table: ' + table);
        await env.DB.prepare(sql).bind(...params).run();
        inserted++;
      } catch(e) { failed++; errors.push({ row, error: e.message }); }
    }
    return ok({ table, inserted, failed, errors: errors.slice(0,5) });
  }

  // wipe_all: delete all data from all tables
  if (body.step === 'delete_row') {
    const { table, pk_col, pk_val } = body;
    if (!table || !pk_col || pk_val === undefined) return err('table, pk_col, pk_val required');
    // Protect critical tables
    const PROTECTED = ['users'];
    if (PROTECTED.includes(table)) return err(`Table '${table}' is protected — use admin UI to manage`);
    try {
      await env.DB.prepare(`DELETE FROM ${table} WHERE ${pk_col} = ?`).bind(pk_val).run();
      return ok({ deleted: true, table, pk_val });
    } catch(e) { return err('Delete failed: ' + e.message); }
  }

  if (body.step === 'wipe_all') {
    const tables = ['ledger','entries','pending_entries','opening_balances','vendor_opening_balances','vendors','projects','cost_heads','entry_types','chart_of_accounts','companies']; // users intentionally excluded
    const results = {};
    for (const t of tables) {
      try {
        await env.DB.prepare(`DELETE FROM ${t}`).run();
        results[t] = 'wiped';
      } catch(e) { results[t] = 'error: ' + e.message; }
    }
    return ok({ wipe_results: results });
  }

  // migrate_schema: add missing columns safely
  if (body.step === 'migrate_schema') {
    const results = {};
    const migrations = [
      "ALTER TABLE entry_types ADD COLUMN hint TEXT DEFAULT ''",
      "ALTER TABLE users ADD COLUMN allowed_vendors TEXT DEFAULT '[]'",
      "ALTER TABLE entries ADD COLUMN drive_file_url TEXT DEFAULT ''",
      "ALTER TABLE pending_entries ADD COLUMN drive_file_url TEXT DEFAULT ''",
      // NOTE: deliberately NOT resetting roles here — user roles are managed via admin UI only
    ];
    for (const sql of migrations) {
      try {
        await env.DB.prepare(sql).run();
        results[sql] = 'ok';
      } catch(e) {
        // Column already exists = expected error, ignore
        results[sql] = e.message.includes('duplicate') || e.message.includes('already exists') ? 'already exists' : 'error: ' + e.message;
      }
    }
    return ok({ schema_results: results });
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