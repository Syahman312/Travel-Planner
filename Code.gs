/**
 * Voyage – Travel Planner sync backend (Google Apps Script)
 *
 * Setup:
 *  1. Create a Google Sheet → Extensions → Apps Script → paste this file.
 *     Change TOKEN below to your own long secret word (16+ characters) → Save.
 *  2. Deploy → New deployment → Web app
 *       Execute as: Me    ·    Who has access: Anyone
 *     Approve the permissions (Sheets + Drive).
 *  3. In Voyage → Settings, paste the /exec URL and the same secret word → Save.
 *
 *  Updating this file later: Deploy → Manage deployments → ✏️ Edit →
 *  Version: "New version" → Deploy. The URL stays the same.
 *
 * Data:
 *  - Full app state is stored as JSON (chunked) in a hidden "_voyage" sheet.
 *  - Readable tabs (Trips, Itinerary, Expenses, To-do, Packing, Bookings,
 *    Essentials) are rebuilt on every push.
 *  - Booking photos/PDFs are saved to Google Drive → "Voyage" → <trip name>.
 *    Files stay private to your Google account.
 */

// Your secret word – type the same one in Voyage → Settings. Every request must carry it.
const TOKEN = 'CHANGE_ME';

const DATA_SHEET = '_voyage';
const CHUNK = 45000;          // a cell holds max 50,000 chars
const DRIVE_ROOT = 'Voyage';

// Opening the URL in a browser shows nothing: all reads and writes need the secret word.
function doGet() {
  return json_({ ok: false, error: 'Voyage sync endpoint – use the app.' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const denied = checkToken_(body);
    if (denied) return json_(denied);
    if (body.action === 'ping') return json_({ ok: true });
    if (body.action === 'get') {
      const raw = readData_();
      return json_({ ok: true, data: raw ? JSON.parse(raw) : {} });
    }
    if (body.action === 'upload') return json_(upload_(body));
    if (!body || !body.data || !Array.isArray(body.data.trips)) {
      return json_({ ok: false, error: 'Invalid payload' });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      writeData_(JSON.stringify(body.data));
      writeTables_(body.data);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- Secret word check (locks for 10 min after 20 wrong tries) ---------- */

function checkToken_(b) {
  if (TOKEN === 'CHANGE_ME' || !TOKEN) return { ok: false, error: 'Set your secret word (TOKEN) at the top of Code.gs' };
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 20) return { ok: false, error: 'Too many wrong secret words. Locked for 10 minutes.' };
  if (!b || typeof b.token !== 'string' || b.token !== TOKEN) {
    cache.put('fails', String(fails + 1), 600);
    return { ok: false, error: 'Wrong secret word' };
  }
  return null;
}

/* ---------- Drive attachments ---------- */

function upload_(b) {
  if (!b.data || !b.name) return { ok: false, error: 'Missing file' };
  const root = folder_(DriveApp.getRootFolder(), DRIVE_ROOT);
  const dir = folder_(root, clean_(b.folder || 'Unsorted'));
  const blob = Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'application/octet-stream', clean_(b.name));
  const file = dir.createFile(blob);
  return { ok: true, id: file.getId(), url: file.getUrl() };
}

function folder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function clean_(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '-').slice(0, 120) || 'file';
}

/* ---------- Sheet storage ---------- */

function readData_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(DATA_SHEET);
  if (!sh || sh.getLastRow() === 0) return '';
  return sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => r[0]).join('');
}

function writeData_(str) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(DATA_SHEET) || ss.insertSheet(DATA_SHEET);
  sh.clear();
  const rows = [];
  for (let i = 0; i < str.length; i += CHUNK) rows.push([str.slice(i, i + CHUNK)]);
  if (rows.length) {
    sh.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
  }
  sh.hideSheet();
}

function writeTables_(S) {
  const trips = S.trips || [];
  const each = (key, fn) => trips.flatMap(t => (t[key] || []).map(x => fn(t, x)));
  const toHome = (t, e) => (e.cur && e.cur !== t.ccy && e.cur === t.lcy && t.fx > 0) ? e.amt / t.fx : Number(e.amt) || 0;

  table_('Trips', ['Trip', 'Destination', 'Start', 'End', 'Budget', 'Home currency', 'Local currency', 'Rate (1 home = x local)', 'Notes'],
    trips.map(t => [t.name, t.dest, t.start, t.end, t.budget, t.ccy, t.lcy || '', t.fx || '', t.notes || '']));
  table_('Itinerary', ['Trip', 'Date', 'Time', 'What', 'Where', 'Notes'],
    each('itin', (t, i) => [t.name, i.date, i.time, i.what, i.where, i.note || '']));
  table_('Expenses', ['Trip', 'Date', 'Category', 'Description', 'Amount', 'Currency', 'Amount (home)', 'Home currency'],
    each('exp', (t, e) => [t.name, e.date, e.cat, e.desc, Number(e.amt) || 0, e.cur || t.ccy, Math.round(toHome(t, e) * 100) / 100, t.ccy]));
  table_('To-do', ['Trip', 'Task', 'Due', 'Done'],
    each('todo', (t, x) => [t.name, x.t, x.due || '', !!x.ok]));
  table_('Packing', ['Trip', 'Section', 'Item', 'Packed'],
    each('pack', (t, p) => [t.name, p.sec || '', p.t, !!p.ok]));
  table_('Bookings', ['Trip', 'Type', 'Date', 'Ref', 'Details', 'Link', 'Files in Drive'],
    each('book', (t, b) => [t.name, b.type, b.date || '', b.ref, b.detail, b.link,
      (b.files || []).map(f => f.drive ? f.name + ': ' + f.drive : f.name + ' (device only)').join('\n')]));
  table_('Essentials', ['Trip', 'Hotel', 'Address', 'Local address', 'Phone', 'Emergency', 'Embassy', 'Time zone', 'Plug', 'Language'],
    trips.map(t => { const e = t.ess || {}; return [t.name, e.hotel, e.addr, e.addrLocal, e.phone, e.emerg, e.embassy, e.tz, e.plug, e.lang]; }));
}

function table_(name, head, rows) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  const all = [head].concat(rows.map(r => r.map(v => (v == null ? '' : v))));
  // '@' keeps dates/times as plain text so they round-trip unchanged
  sh.getRange(1, 1, all.length, head.length).setNumberFormat('@').setValues(all);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
