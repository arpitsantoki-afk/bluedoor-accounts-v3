# BlueDoor Accounts V3 — Architecture & Developer Reference

**Last updated:** 2026-06-07  
**Repo:** `arpitsantoki-afk/bluedoor-accounts-v3`  
**Frontend:** https://arpitsantoki-afk.github.io/bluedoor-accounts-v3/  
**Worker API:** https://bluedoor-accounts.info-unikraft.workers.dev  
**Maintained by:** Arpit Santoki (`arpitsantoki@gmail.com` / `info.unikraft@gmail.com`)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Pages (Static)                  │
│  index.html  ·  admin.html  ·  supervisor.html           │
│  sw.js  ·  manifest-*.json  ·  assets/  ·  icons/        │
└───────────────────────┬─────────────────────────────────┘
                        │ POST /api { action, ...params }
                        │ Header: X-Session-Token
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Cloudflare Worker  (worker.js)                 │
│   bluedoor-accounts.info-unikraft.workers.dev            │
│                                                          │
│  Bindings:                                               │
│    env.DB       → D1 SQLite  (bluedoor-db)               │
│    env.SESSIONS → KV Store   (session tokens)            │
│    env.GAS_URL  → Google Apps Script URL (env var)       │
│    env.APP_URL  → GitHub Pages base URL (env var)        │
│    env.RESEND_API_KEY → Resend email (CF secret)         │
└──────────┬────────────────┬────────────────┬────────────┘
           │                │                │
           ▼                ▼                ▼
    D1 SQLite DB       KV Sessions     Google Apps Script
    (bluedoor-db)      (8hr TTL)       (arpitsantoki@gmail)
    12 tables          auth tokens     → Google Drive upload
                                       → Resend email proxy
```

---

## 2. Repository File Structure

```
bluedoor-accounts-v3/
├── index.html              Login page (Google OAuth + password)
├── admin.html              Admin UI (~200KB, all-in-one)
├── supervisor.html         Supervisor UI (~90KB, all-in-one)
├── drive_callback.html     Google OAuth redirect handler
├── worker.js               Cloudflare Worker (all API logic)
├── wrangler.toml           CF config (bindings, account ID)
├── sw.js                   Service Worker (PWA, cache v3)
├── manifest-admin.json     PWA manifest for admin
├── manifest-supervisor.json PWA manifest for supervisor
├── assets/
│   ├── logo-white.png      White logo (for dark theme topbar)
│   └── logo-black.png      Black logo (for light theme topbar)
├── icons/
│   ├── icon-72x72.png      PWA icons (all sizes)
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   └── icon-maskable-512x512.png
└── .github/
    └── workflows/
        └── deploy.yml      Auto-deploy worker on push to main
```

---

## 3. Cloudflare Worker (`worker.js`)

### 3.1 Request Format
All requests are `POST /api` with JSON body:
```json
{ "action": "actionName", "param1": "value1", ... }
```
Auth header: `X-Session-Token: <token>`

Special endpoints:
- `POST /migrate` — DB migrations, protected by hardcoded secret `migrate_bluedoor_2024`
- `GET /` — Health check

### 3.2 Authentication
- **Password login:** `action: 'login'` → verifies username/password in DB → creates KV session (8hr TTL)
- **Google login:** `action: 'googleLogin'` → verifies `id_token` JWT → looks up `google_email` in users table
- **Super admin:** `info.unikraft@gmail.com` always allowed — auto-creates `USR_SUPERADMIN` if missing
- **Session:** Stored in KV as `sess:{token}` → `{ user_id, username, role, companies, allowed_vendors }`
- **getMe:** Validates session token, returns current user

### 3.3 All API Actions

| Category | Action | Role Required | Description |
|---|---|---|---|
| **Auth** | `login` | Public | Password login |
| | `googleLogin` | Public | Google OAuth login |
| | `logout` | Any | Invalidate session |
| | `getMe` | Any | Get current user |
| | `changePassword` | Any | Change own password |
| **Users** | `listUsers` | Admin | List all users |
| | `addUser` | Admin | Add user (password optional, auto-generated) |
| | `updateUser` | Admin | Edit user (role, companies, google_email, allowed_vendors, password) |
| **Companies** | `listCompanies` | Any | List companies (includes drive_folder ID) |
| | `addCompany` | Admin | Add company |
| | `updateCompany` | Admin | Edit company |
| **Projects** | `listProjects` | Any | List projects (filtered by fyid) |
| | `addProject` | Admin | Add project |
| | `updateProject` | Admin | Edit project |
| | `deleteProject` | Admin | Delete project |
| **Vendors** | `listVendors` | Any | List all vendors |
| | `addVendor` | Admin/Supervisor | Add vendor |
| | `updateVendor` | Admin | Edit vendor |
| | `deleteVendor` | Admin | Delete vendor |
| **Chart of Accounts** | `listAccounts` | Any | List COA |
| | `addAccount` | Admin | Add account |
| | `updateCOA` | Admin | Edit account |
| | `deleteCOA` | Admin | Delete account |
| **Cost Heads** | `listCostHeads` | Any | List cost heads |
| | `addCostHead` | Admin | Add cost head |
| | `updateCostHead` | Admin | Edit cost head |
| | `deleteCostHead` | Admin | Delete cost head |
| **Entry Types** | `listEntryTypes` | Any | List entry types (DR/CR rules) |
| | `addEntryType` | Admin | Add entry type |
| | `updateEntryType` | Admin | Edit entry type |
| | `deleteEntryType` | Admin | Delete entry type |
| **Entries** | `addEntry` | Admin | Add approved entry → writes to entries + ledger |
| | `listEntries` | Any | List entries (filterable by fyid, company, type, date) |
| | `updateEntry` | Admin | Edit entry (narration, drive_file_url) |
| | `deleteEntry` | Admin | Delete entry + ledger rows + Drive file |
| **Pending Entries** | `submitPending` | Any | Submit entry for approval |
| | `listPending` | Any | List pending entries |
| | `approvePending` | Admin | Approve → moves to entries + ledger |
| | `rejectPending` | Admin | Reject with reason |
| | `updatePending` | Any (own) | Edit own pending entry |
| | `deletePending` | Any (own) | Delete own pending entry |
| **Ledger & Reports** | `getLedger` | Any | Full ledger (filterable) |
| | `getTrialBalance` | Admin | Trial balance report |
| | `getPL` | Admin | P&L statement |
| | `getBS` | Admin | Balance sheet |
| | `getProjectReport` | Admin | Project-wise report |
| | `getVendorReport` | Any | Vendor ledger (AP + Advances split) |
| | `getDashboard` | Admin | Dashboard KPIs |
| **Opening Balances** | `listOpeningBalances` | Any | List OBs |
| | `saveOpeningBalance` | Admin | Save/update OB |
| | `listVendorOpeningBalances` | Any | List vendor OBs |
| | `saveVendorOpeningBalance` | Admin | Save vendor OB |
| **Drive/Email** | `uploadFile` | Any | Upload file via GAS → Google Drive |
| | `deleteFile` | Admin | Delete file from Drive via GAS |
| | `sendOnboarding` | Admin | Send welcome email via Resend |
| **Migrate** | `gasProxy` | Admin | Proxy to Google Apps Script |

### 3.4 `/migrate` Endpoint Steps

| Step | Description |
|---|---|
| `migrate_schema` | Runs ALTER TABLE migrations (idempotent) |
| `insert` | Bulk INSERT OR REPLACE into any table (users table protected) |
| `delete_row` | Delete single row by PK (users table protected) |
| `wipe_all` | DELETE all rows from all tables **except users** |
| `counts` | Return row counts per table |
| `seed_user` | No-op (deprecated, kept for safety) |

---

## 4. Database Schema (D1 SQLite)

### Tables

```sql
users
  user_id TEXT PK, username TEXT, password TEXT, role TEXT,
  active INT, companies TEXT (JSON array), google_email TEXT,
  allowed_vendors TEXT (JSON array)

companies
  company_id TEXT PK, company_name TEXT,
  drive_folder TEXT,   -- Google Drive folder ID for document uploads
  active INT

projects
  project_id TEXT PK, project_name TEXT, client TEXT, location TEXT,
  status TEXT, start_date TEXT, budget REAL, fyid TEXT

vendors
  vendor_id TEXT PK, vendor_name TEXT, vendor_type TEXT,
  contact TEXT, gstin TEXT, details TEXT

chart_of_accounts
  ac_key TEXT PK, ac_code TEXT, ac_name TEXT,
  ac_type TEXT, category TEXT

cost_heads
  ch_id TEXT PK, ch_name TEXT, ac_key TEXT  -- links to chart_of_accounts

entry_types
  et_key TEXT PK, label TEXT, category TEXT,
  dr TEXT,    -- DR account key (or 'COST_HEAD' = use linked cost head account)
  cr TEXT,    -- CR account key
  needs_ch INT, active INT, hint TEXT

entries
  entry_id TEXT PK, date TEXT, fyid TEXT, project_id TEXT,
  cost_head_id TEXT, vendor_id TEXT, entry_type TEXT,
  amount REAL, narration TEXT, created_by TEXT, created_at TEXT,
  company_id TEXT, drive_file_url TEXT

pending_entries
  entry_id TEXT PK, date TEXT, fyid TEXT, project_id TEXT,
  cost_head_id TEXT, vendor_id TEXT, entry_type TEXT,
  amount REAL, narration TEXT, submitted_by TEXT, submitted_at TEXT,
  status TEXT,           -- 'Pending' | 'Approved' | 'Rejected'
  reviewed_by TEXT, reviewed_at TEXT, reject_reason TEXT,
  drive_file_url TEXT, company_id TEXT

ledger
  id INT PK, entry_id TEXT, date TEXT, fyid TEXT,
  ac_code TEXT, ac_name TEXT, dr_cr TEXT,
  debit REAL, credit REAL, project_id TEXT, cost_head_id TEXT,
  vendor_id TEXT, narration TEXT, created_by TEXT,
  created_at TEXT, company_id TEXT
  -- Note: ledger rows are auto-generated from entries (2 rows per entry: DR + CR)

opening_balances
  id INT PK, fyid TEXT, ac_key TEXT, ac_name TEXT,
  dr_cr TEXT, amount REAL, company_id TEXT

vendor_opening_balances
  id INT PK, fyid TEXT, vendor_id TEXT,
  dr_cr TEXT, amount REAL, company_id TEXT
```

### Financial Year Format
`fyid` is a string like `"FY2627"` = FY 2026-27. Used as a filter everywhere.

### Drive File URL Convention
`drive_file_url` stores the Google Drive `webViewLink`:
`https://drive.google.com/file/d/{fileId}/view?usp=drivesdk`

Filename format: `yyyy_mm_dd_VendorName_entry_type.ext`

---

## 5. Frontend Pages

### 5.1 `index.html` — Login Page
- Google Sign-In button (OAuth implicit flow via GIS library)
- Username/password form
- Auto-restore existing session via `getMe`
- On success → redirects by role:
  - `Admin` → `admin.html`
  - `Supervisor` → `supervisor.html`

### 5.2 `admin.html` — Admin Panel
Single-file app (~200KB). No external JS dependencies.

**Bottom nav tabs:**
| Tab | View ID | Description |
|---|---|---|
| Home | `v-home` | Dashboard KPIs, recent entries, pending summary |
| Ledger | `v-ledger` | Full ledger with filters, edit/delete per row, 📎 doc view |
| Add | `v-add` | Add journal entry (all entry types, with confirmation popup) |
| Reports | `v-reports` | Trial Balance, P&L, Balance Sheet, Project, Vendor reports |
| More | `v-more` | Sub-tabs below |

**More sub-tabs:**
| Sub-tab | Description |
|---|---|
| Pending | Approve/reject pending entries (with full detail confirmation popup) |
| Users | Add/edit users, roles, companies, vendor access for supervisors |
| Masters | View COA, cost heads, entry types, projects, vendors |
| 📎 Docs | Document viewer — all drive docs grouped by month, multi-select ZIP export |
| Raw Data | Full CRUD on every DB table (edit/add/delete rows) |
| Import | Bulk import via Excel/CSV |

**Key JS globals:**
```javascript
S           // { token, user } — current session
curFY       // e.g. 'FY2627'
curCo       // current company filter
_cos        // companies array
_vendors    // vendors array
_chs        // cost heads array
_ets        // entry types array
_projs      // projects array
_pendingMap // { entry_id → pending row } for confirm popups
_usersMap   // { user_id → user row } for edit user modal
_rawRowMap  // { pk → row } for raw data edit
_entryDocMap // { entry_id → drive_file_url } for ledger doc buttons
```

**Document Upload Flow (Admin):**
1. User picks file via ATTACH button → `handleDocUpload()` fires immediately
2. Reads file → calls `uploadFileToDrive(file, companyId, entryType, vendorName, date)`
3. Worker action `uploadFile` → POSTs base64 to GAS → GAS saves to company Drive folder
4. Returns Drive URL → stored in `ae-doc-url` input
5. On Save Entry → `drive_file_url` included in `addEntry` payload

### 5.3 `supervisor.html` — Supervisor Portal
Single-file app (~90KB). Mobile-first design.

**Bottom nav tabs:**
| Tab | View ID | Description |
|---|---|---|
| Home | `v-home` | Pending entries (own only) with ✏️ Edit button + recent entries |
| Add | `v-add` | Submit Vendor Bill or Petty Cash entry (goes to pending) |
| Petty | `v-petty` | Petty Cash ledger for full FY (from getLedger on PETTY_CASH ac_code) |
| Ledger | `v-vendor` | Vendor ledger (AP + Advances split) — only allowed vendors |
| Vendors | `v-vendors` | Add vendor + view all vendors |

**Supervisor permissions:**
- Can only see **own** pending entries
- Can only see vendor ledgers that admin has **explicitly enabled** (via `allowed_vendors` in user record)
- Can add vendors
- Cannot approve/reject entries
- Cannot access ledger or reports directly

**Edit Pending Entry:**
- Only `Pending` status entries can be edited
- Modal: date, amount, narration, cost head, doc management (delete/replace)
- Resubmit resets status to `Pending` for re-review

**Confirmation Popup:**
- Fires before `submitPending` showing all entry details
- User must explicitly confirm before submitting

---

## 6. Google Drive Integration

### File Upload Path
```
Frontend (base64 file)
    → Worker action: uploadFile { folderId, filename, base64Data, mimeType }
    → Worker POSTs to GAS_URL with { action: 'uploadToDrive', ... }
    → GAS runs as arpitsantoki@gmail.com → DriveApp.getFolderById(folderId)
    → Creates file, sets public view link
    → Returns { ok, fileId, fileName, url }
    → Worker returns url to frontend
    → Frontend stores url in drive_file_url field
```

### File Delete Path
```
Frontend → Worker action: deleteEntry / updateEntry { delete_file: true }
    → Worker calls deleteFileFromDrive(url, env)
    → Extracts fileId from URL regex: /file/d/([^/]+)
    → POSTs to GAS_URL with { action: 'deleteFile', fileId }
    → GAS deletes the file (best-effort, no error thrown if fails)
```

### Company Drive Folder IDs
Stored in `companies.drive_folder`. Must be a real Google Drive folder ID (length > 10) to trigger upload. Currently:
- `Blue Door Architects` (`CO1780750803404`) → `1DAyFW5EGY8BGCwCem2U46YV60LTSXtaQ` ✓
- `Blue Door` (`BD`) → `BlueDoor_Bills_BD` ✗ (name, not ID — upload skipped)
- `Blue Door Design` (`BDD`) → `BlueDoor_Bills_BDD` ✗ (name, not ID — upload skipped)

### Google Apps Script
URL: stored in `wrangler.toml` as `GAS_URL` env var.  
Runs as: `arpitsantoki@gmail.com`  
Handles: `uploadToDrive`, `deleteFile`, `sendOnboarding`

---

## 7. Email (Resend)

- API key stored as Cloudflare secret `RESEND_API_KEY`
- Sending from: `Blue Door Architects <onboarding@resend.dev>` (sandbox)
- Triggered by: `sendOnboarding` action (Admin only)
- Email contains: username, role, password, login URL, install instructions
- To upgrade from sandbox: add domain in Resend → update `from` address in `handleSendOnboarding`

---

## 8. Authentication & Roles

### Roles
| Role | Access |
|---|---|
| `Admin` | Full access to everything |
| `Supervisor` | Add entries (→ pending), add vendors, view own pending, view allowed vendor ledgers, view petty cash ledger |

### Session Flow
```
login/googleLogin → genToken() → KV.put('sess:{token}', JSON, { expirationTtl: 28800 })
→ token returned to frontend → stored in localStorage('bd_token')
→ every API call sends X-Session-Token header
→ worker reads KV → gets session data → passes to handler as sess
```

### Super Admin
`info.unikraft@gmail.com` — bypasses DB lookup, auto-created as `USR_SUPERADMIN` on first login. Cannot be locked out.

### Vendor Ledger Access Control
Admin sets `allowed_vendors` (JSON array of vendor IDs) on each Supervisor user. Stored in `users.allowed_vendors`. Supervisor can only see ledgers for vendors in their list.

---

## 9. PWA Configuration

Both admin and supervisor are installable PWAs.

- **Service Worker:** `sw.js` (cache version `bluedoor-v3-3`)
  - Cache strategy: network-first for HTML, cache-first for images
  - Never caches API calls (`workers.dev` domain bypassed)
- **Manifests:** `manifest-admin.json`, `manifest-supervisor.json`
- **Icons:** 9 sizes in `/icons/` folder
- **Theme color:** `#4f8ef7`
- **Display:** `standalone` (full-screen, no browser chrome)
- **Install:** ⬇️ Install button appears in topbar when browser detects installability

---

## 10. Deployment Pipeline

### Auto-deploy (on every `git push` to `main`)
```
git push → GitHub Actions (.github/workflows/deploy.yml)
         → cloudflare/wrangler-action@v3
         → wrangler deploy (reads wrangler.toml)
         → Uploads worker.js to Cloudflare
         → ~2 min total
```

### Frontend deploy
```
git push → GitHub Pages auto-deploys from main branch
         → ~1-2 min for files to propagate
         → Service worker may serve cached version until cleared
```

### Manual steps after schema changes
```bash
# Run migrations against live DB
npx wrangler d1 execute bluedoor-db --remote --command="ALTER TABLE ..."
# OR hit the /migrate endpoint:
POST /migrate { "secret": "migrate_bluedoor_2024", "step": "migrate_schema" }
```

### Secrets management
```bash
# Add/update Cloudflare Worker secrets (not in wrangler.toml)
echo "your_key" | npx wrangler secret put RESEND_API_KEY
# Note: CLOUDFLARE_API_TOKEN stored in GitHub repo secrets for Actions
```

---

## 11. Known Patterns & Conventions

### CSS Variables (design tokens)
```css
--bg: #0d0f14          /* dark background */
--card: #161920        /* card/panel background */
--border: #232630      /* border color */
--accent: #4f8ef7      /* blue — primary action */
--green: #22c55e       /* success, debit */
--red: #ef4444         /* danger, credit */
--amber: #f59e0b       /* warning, pending */
--purple: #a78bfa      /* supervisor badge */
--text: #e2e8f0        /* primary text */
--muted: #64748b       /* secondary text */
--nav-h: 56px          /* bottom nav height */
--top-h: 52px          /* topbar height */
```
Light theme overrides applied via `body.light-theme`.

### Logo switching
```css
/* Dark theme: show white logo */
.bd-logo-dark { display: block; }
.bd-logo-light { display: none; }

/* Light theme */
body.light-theme .bd-logo-dark { display: none !important; }
body.light-theme .bd-logo-light { display: block !important; }
```

### Debug console
- Admin: `dbg(message, type)` — `type` is `'ok'|'err'|'warn'|'info'`
- Supervisor: `addDebug(message, type)`
- Both have a 🐞 toggle button in topbar

### Modal pattern
`showEditModal(title, bodyHTML, afterRenderCallback)` — renders HTML into `#edit-modal-body`, fires `afterRenderCallback` after 50ms (used for checkbox rendering via `document.createElement`).

### Safe click handlers for complex data
Instead of `onclick="fn(${JSON.stringify(obj)})"` (breaks with special chars), the pattern is:
```javascript
window._someMap = {}; rows.forEach(r => window._someMap[r.id] = r);
// In HTML: onclick="fn('${r.id}')"
// In function: const row = window._someMap[id];
```

### Preventing `async async function` errors
When patching files via string replacement across multiple sessions, doubled `async` keywords can accumulate. Before committing, always scan:
```python
import re
problems = re.findall(r'async\s+async', content)
```

### Template literal `</body>` injection bug
`document.write('...' + innerHTML + '...\n</body></html>')` breaks if the closing part is on a new line AND a `content.replace('</body>', modal)` replaces the wrong occurrence. Fix: always join onto one line OR use `content.rfind('</body>')` to target only the real closing tag.

---

## 12. Key IDs & Credentials Reference

| Item | Value |
|---|---|
| CF Account ID | `e87173c892aeaf3f199a7728857f7c1b` |
| D1 Database ID | `ebaaa404-6232-4331-9d18-5d1bb5ec87cd` |
| KV Namespace ID | `b91d11a00154490ebd4c4f8945b1a76c` |
| Worker name | `bluedoor-accounts` |
| Google OAuth Client ID | `449634347678-tkbk083eu1igcil0rq58tgvdrs54l4nm.apps.googleusercontent.com` |
| Google Cloud Project | `The Palm Location` |
| GAS Deployment URL | `https://script.google.com/macros/s/AKfycbz8MqHg3lMYYoCBTN_bKOrI8npQQ2p78bAvWioVF9YKKpYD_9f-qDwUsHLsUr_N9hJW/exec` |
| Primary Drive Folder | `1DAyFW5EGY8BGCwCem2U46YV60LTSXtaQ` (Blue Door Architects) |
| Migrate secret | `migrate_bluedoor_2024` |
| Super admin email | `info.unikraft@gmail.com` |
| Super admin user_id | `USR_SUPERADMIN` |
