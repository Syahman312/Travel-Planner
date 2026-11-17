/**
 * Voyage – Travel Planner sync backend (Google Apps Script)
 *
 * Setup:
 *  1. Create a Google Sheet → Extensions → Apps Script → paste this file.
 *  2. Deploy → New deployment → Web app
 *       Execute as: Me    ·    Who has access: Anyone
 *  3. Copy the /exec URL into Voyage → Settings → "Google Sheets sync".
 *
 * The full app state is stored as JSON (chunked) in a hidden "_voyage" sheet.
 * Readable "Trips", "Itinerary", "Expenses", "Packing" and "Bookings" tabs are
 * rebuilt on every push so you can browse your data in Sheets.
 */

const DATA_SHEET = '_voyage';
const CHUNK = 45000; // a cell holds max 50,000 chars

function doGet(e) {
  const raw = readData_();
  return json_(raw ? JSON.parse(raw) : {});
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
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
    return json_({ ok: false, error: String(err) });
  }
}

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
  table_('Trips', ['Trip', 'Destination', 'Start', 'End', 'Budget', 'Currency', 'Notes'],
    trips.map(t => [t.name, t.dest, t.start, t.end, t.budget, t.ccy, t.notes || '']));
  table_('Itinerary', ['Trip', 'Date', 'Time', 'What', 'Where'],
    each('itin', (t, i) => [t.name, i.date, i.time, i.what, i.where]));
  table_('Expenses', ['Trip', 'Date', 'Category', 'Description', 'Amount', 'Currency'],
    each('exp', (t, e) => [t.name, e.date, e.cat, e.desc, Number(e.amt) || 0, t.ccy]));
  table_('Packing', ['Trip', 'Item', 'Packed'],
    each('pack', (t, p) => [t.name, p.t, !!p.ok]));
  table_('Bookings', ['Trip', 'Type', 'Ref', 'Details', 'Link'],
    each('book', (t, b) => [t.name, b.type, b.ref, b.detail, b.link]));
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
