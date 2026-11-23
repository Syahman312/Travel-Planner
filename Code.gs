/**
 * Voyage – Travel Planner sync backend (Google Apps Script)
 *
 * Setup:
 *  1. Create a Google Sheet → Extensions → Apps Script → paste this file → Save.
 *  2. Deploy → New deployment → Web app
 *       Execute as: Me    ·    Who has access: Anyone
 *     Approve the permissions (Sheets + Drive).
 *  3. Copy the /exec URL into Voyage → Settings → "Google Sheets & Drive sync".
 *  4. (Optional) Turn on "Add bookings to Google Calendar" in Voyage.
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
 *  - Bookings can go into a "Voyage" calendar in Google Calendar, with
 *    reminders. Only events this script created are changed or removed.
 */

const DATA_SHEET = '_voyage';
const CHUNK = 45000;          // a cell holds max 50,000 chars
const DRIVE_ROOT = 'Voyage';
const CAL_NAME = 'Voyage';
const CAL_PREFIX = 'cal_';    // script properties: booking id → event id + hash

function doGet(e) {
  const raw = readData_();
  return json_(raw ? JSON.parse(raw) : {});
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body && body.action === 'upload') return json_(upload_(body));
    if (!body || !body.data || !Array.isArray(body.data.trips)) {
      return json_({ ok: false, error: 'Invalid payload' });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let cal;
    try {
      writeData_(JSON.stringify(body.data));
      writeTables_(body.data);
      if (Array.isArray(body.cal)) {
        try { cal = syncCal_(body.cal); }
        catch (err) { cal = { ok: false, error: String(err && err.message || err) }; }
      }
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, savedAt: new Date().toISOString(), cal: cal });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
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

/* ---------- Google Calendar ---------- */

function syncCal_(evs) {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const map = {};
  Object.keys(all).forEach(k => { if (k.indexOf(CAL_PREFIX) === 0) map[k.slice(CAL_PREFIX.length)] = JSON.parse(all[k]); });
  if (!evs.length && !Object.keys(map).length) return { ok: true, n: 0 };   // never used: don't touch Calendar
  const cal = CalendarApp.getCalendarsByName(CAL_NAME)[0] || CalendarApp.createCalendar(CAL_NAME);
  const keep = {};
  let n = 0;
  evs.slice(0, 300).forEach(e => {
    const key = String(e.key || '').replace(/[^\w-]/g, '').slice(0, 40);
    if (!key) return;
    keep[key] = 1;
    const h = hash_(JSON.stringify(e)), m = map[key];
    if (m && m.h === h && eventOf_(cal, m.id)) return;          // unchanged
    if (m) drop_(cal, m.id);
    const title = String(e.title || 'Booking') + (e.trip ? ' · ' + e.trip : '');
    const opt = { description: String(e.desc || ''), location: String(e.loc || '') };
    const ev = e.allDay
      ? cal.createAllDayEvent(title, day_(e.date), opt)
      : cal.createEvent(title, new Date(e.start), new Date(e.end), opt);
    ev.removeAllReminders();
    (e.rem || []).slice(0, 5).forEach(x => { x = Number(x); if (x > 0 && x <= 40320) ev.addPopupReminder(x); });
    props.setProperty(CAL_PREFIX + key, JSON.stringify({ id: ev.getId(), h: h }));
    n++;
  });
  Object.keys(map).forEach(k => { if (!keep[k]) { drop_(cal, map[k].id); props.deleteProperty(CAL_PREFIX + k); } });
  return { ok: true, n: n };
}

function eventOf_(cal, id) { try { return cal.getEventById(id); } catch (e) { return null; } }
function drop_(cal, id) { const ev = eventOf_(cal, id); if (ev) try { ev.deleteEvent(); } catch (e) {} }
function day_(s) { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function hash_(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

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

  table_('Trips', ['Trip', 'Destination', 'Start', 'End', 'Budget', 'Home currency', 'Local currency', 'Rate (1 home = x local)', 'People', 'Notes'],
    trips.map(t => [t.name, t.dest, t.start, t.end, t.budget, t.ccy, t.lcy || '', t.fx || '', (t.people || []).join(', '), t.notes || '']));
  table_('Itinerary', ['Trip', 'Date', 'Time', 'What', 'Where', 'Notes'],
    each('itin', (t, i) => [t.name, i.date, i.time, i.what, i.where, i.note || '']));
  const split = t => (t.people || []).length > 1;
  table_('Expenses', ['Trip', 'Date', 'Category', 'Description', 'Amount', 'Currency', 'Amount (home)', 'Home currency', 'Paid by', 'Split between'],
    each('exp', (t, e) => [t.name, e.date, e.cat, e.desc, Number(e.amt) || 0, e.cur || t.ccy, Math.round(toHome(t, e) * 100) / 100, t.ccy,
      split(t) ? (t.people.indexOf(e.paid) >= 0 ? e.paid : t.people[0]) : '', split(t) ? ((e.split || []).length ? e.split.join(', ') : 'Everyone') : '']));
  table_('Payments', ['Trip', 'Date', 'From', 'To', 'Amount', 'Currency'],
    each('pay', (t, p) => [t.name, p.date || '', p.from, p.to, Number(p.amt) || 0, t.ccy]));
  table_('To-do', ['Trip', 'Task', 'Due', 'Done'],
    each('todo', (t, x) => [t.name, x.t, x.due || '', !!x.ok]));
  table_('Packing', ['Trip', 'Section', 'Item', 'Packed'],
    each('pack', (t, p) => [t.name, p.sec || '', p.t, !!p.ok]));
  table_('Bookings', ['Trip', 'Type', 'Date', 'Time', 'Ref', 'Details', 'Link', 'Files in Drive'],
    each('book', (t, b) => [t.name, b.type, b.date || '', b.time || '', b.ref, b.detail, b.link,
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
