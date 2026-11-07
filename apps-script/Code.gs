// Annesweet order backend. Rules duplicate script.js validateOrder by design (different runtime).
const SHEET_NAME = "Orders";
const HEADERS = ["Timestamp", "Name", "Contact", "FB name", "Items", "Custom cake", "Pickup/Delivery", "Address", "Date needed", "Notes", "Status"];
const CUSTOM_KEYS = ["occasion", "size", "flavor", "message", "design"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Real calendar date from "YYYY-MM-DD" (UTC), or null for malformed/impossible dates like 2026-02-30
function parseDate_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
  const d = new Date(s + "T00:00:00Z");
  return isNaN(d) || d.toISOString().slice(0, 10) !== s ? null : d;
}

function validateOrder_(order, todayStr) {
  if (!order || typeof order !== "object") return ["Invalid order."];
  const errors = [];
  const notString = v => v != null && typeof v !== "string";
  const c = order.custom && typeof order.custom === "object" ? order.custom : {};
  const items = Array.isArray(order.items) ? order.items : [];
  // Optional text fields must really be strings, else length limits are bypassed
  if ([order.fbName, order.address, order.notes].some(notString) || CUSTOM_KEYS.some(k => notString(c[k])) ||
      items.some(i => i && (notString(i.name) || notString(i.size)))) return ["Text fields must be strings."];
  const str = v => (typeof v === "string" ? v : "");
  const tooLong = (v, max) => str(v).length > max;

  if (!str(order.name).trim()) errors.push("Name is required.");
  else if (tooLong(order.name, 100)) errors.push("Name is too long.");

  if (!/^(09|\+639)\d{9}$/.test(str(order.contact).replace(/[\s-]/g, ""))) errors.push("Invalid mobile number.");
  if (tooLong(order.fbName, 100)) errors.push("Facebook name is too long.");

  const hasCustom = CUSTOM_KEYS.some(k => str(c[k]).trim());
  if (CUSTOM_KEYS.some(k => tooLong(c[k], 300))) errors.push("A custom cake field is too long.");

  if (items.some(i => !i || !Number.isInteger(i.qty) || i.qty < 0 || i.qty > 50)) errors.push("Quantity must be a whole number from 0 to 50.");
  else if (!items.some(i => i.qty > 0) && !hasCustom) errors.push("Choose at least one item or describe a custom cake.");

  if (order.fulfillment !== "pickup" && order.fulfillment !== "delivery") errors.push("Choose pickup or delivery.");
  else if (order.fulfillment === "delivery" && !str(order.address).trim()) errors.push("Delivery address is required.");
  if (tooLong(order.address, 300)) errors.push("Address is too long.");

  const date = parseDate_(order.dateNeeded);
  const today = parseDate_(todayStr);
  if (!date) errors.push("Invalid date needed.");
  else if (today && date < new Date(today.getTime() + 3 * 86400000)) errors.push("Date must be at least 3 days ahead.");

  if (tooLong(order.notes, 500)) errors.push("Notes are too long.");
  return errors;
}

// Stops Sheets from running user text as a formula
function safeCell_(value) {
  const s = String(value == null ? "" : value);
  // Trim first: a leading space or tab before =/+/-/@ (e.g. " =1+1") must still be escaped, not just the bare character
  return /^[=+\-@]/.test(s.trim()) ? "'" + s : s;
}

function itemsText_(order) {
  return (order.items || []).filter(i => i.qty > 0)
    .map(i => i.qty + "\u00d7 " + i.name + (i.size ? " (" + i.size + ")" : "")).join(", ");
}

function customText_(order) {
  const c = order.custom || {};
  return CUSTOM_KEYS.filter(k => c[k] && String(c[k]).trim())
    .map(k => k === "message" ? 'message "' + c[k] + '"' : k + " " + c[k]).join("; ");
}

// Stored as 09..., so the sheet never needs the formula-guard ' prefix on +63 numbers
function localContact_(contact) {
  return String(contact).replace(/[\s-]/g, "").replace(/^\+63/, "0");
}

function orderRow_(order, now) {
  return [
    now,
    safeCell_(order.name),
    safeCell_(localContact_(order.contact)),
    safeCell_(order.fbName),
    safeCell_(itemsText_(order)),
    safeCell_(customText_(order)),
    order.fulfillment === "delivery" ? "Delivery" : "Pickup",
    safeCell_(order.address),
    order.dateNeeded,
    safeCell_(order.notes),
    "New",
  ];
}

// Plain text on purpose: no parse_mode, so &, <, * and _ in customer text can't break the send
function formatTelegramMessage_(order) {
  const d = parseDate_(order.dateNeeded);
  const when = d ? DAYS[d.getUTCDay()] + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() : order.dateNeeded;
  const delivery = order.fulfillment === "delivery";
  const lines = [
    "\uD83C\uDF82 New order \u2014 " + order.name + ", " + localContact_(order.contact),
    itemsText_(order),
    (delivery ? "Delivery" : "Pickup") + ", " + when,
  ];
  if (delivery) lines.push(order.address);
  const custom = customText_(order);
  if (custom) lines.push("Custom: " + custom);
  if (order.notes && order.notes.trim()) lines.push("Notes: " + order.notes);
  return lines.filter(l => l !== "").join("\n");
}

function sendTelegram_(text) {
  const p = PropertiesService.getScriptProperties();
  let res;
  try {
    res = UrlFetchApp.fetch("https://api.telegram.org/bot" + p.getProperty("TELEGRAM_TOKEN") + "/sendMessage", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: p.getProperty("TELEGRAM_CHAT_ID"), text: text }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    throw new Error("Telegram request failed"); // original message contains the URL with the token
  }
  // Log only the status: the request URL contains the token
  if (res.getResponseCode() !== 200) throw new Error("Telegram HTTP " + res.getResponseCode());
}

// ---- Orders tab layout -------------------------------------------------------------------------------------------
// Column A and row 1 stay empty (a white margin); the table starts at B2. "At a glance" counts sit to its right.
const TABLE_COL = 2, HEADER_ROW = 2, FIRST_ROW = 3;
const STATUSES = [["New", "#F7D4DC"], ["Confirmed", "#CFE3F8"], ["Baking", "#FFE9B8"], ["Ready", "#D6F0D0"], ["Done", "#E4E4E4"], ["Cancelled", "#F4C6BE"]];
const INK = "#290A08", CREAM = "#FFFBF0", BLUSH = "#FCEFF2", LINE = "#EBCFD7";
// Widths of: A (margin), B..L (the table), M (gap), N and O (the counts), P (margin)
const COL_WIDTHS = [28, 158, 160, 128, 150, 300, 250, 118, 240, 118, 270, 118, 28, 150, 70, 28];

// Writes one order into the table, below the last filled row of column B, and sizes the row to fit its text.
function appendOrder_(sheet, values) {
  const col = sheet.getRange(1, TABLE_COL, sheet.getMaxRows(), 1).getValues();
  let last = HEADER_ROW;
  for (let i = col.length - 1; i >= HEADER_ROW; i--) if (col[i][0] !== "") { last = i + 1; break; }
  const row = last + 1;
  if (row > sheet.getMaxRows()) sheet.insertRowAfter(sheet.getMaxRows());
  sheet.getRange(row, TABLE_COL, 1, values.length).setValues([values]);
  try {
    sheet.autoResizeRows(row, 1);
    if (sheet.getRowHeight(row) < 54) sheet.setRowHeight(row, 54);
  } catch (err) { /* sizing is cosmetic */ }
  return row;
}

// Makes the Orders tab easy on the eyes. Safe to run again any time: it replaces the old styling instead of stacking it.
function formatOrdersSheet_(sheet) {
  const n = HEADERS.length, lastCol = TABLE_COL + n - 1; // L
  if (sheet.getMaxColumns() < COL_WIDTHS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), COL_WIDTHS.length - sheet.getMaxColumns());
  const rows = Math.max(sheet.getMaxRows(), 60);
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  const whole = sheet.getRange(1, 1, rows, COL_WIDTHS.length);
  sheet.getBandings().forEach(b => b.remove());
  whole.clearDataValidations().setBackground("#FFFFFF").setBorder(false, false, false, false, false, false);
  whole.setFontFamily("Lora").setFontSize(11).setFontColor(INK).setVerticalAlignment("middle").setWrap(true);
  sheet.setHiddenGridlines(true);
  COL_WIDTHS.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  // Header
  const head = sheet.getRange(HEADER_ROW, TABLE_COL, 1, n);
  head.setBackground(INK).setFontColor(CREAM).setFontWeight("bold").setFontSize(11).setHorizontalAlignment("left")
    .setBorder(null, null, true, null, null, null, "#DB6A97", SpreadsheetApp.BorderStyle.SOLID_THICK);
  sheet.setRowHeight(1, 28);
  sheet.setRowHeight(HEADER_ROW, 46);

  // Body: banded rows, hairlines, text aligned to the top-left, a comfortable minimum height
  const body = sheet.getRange(FIRST_ROW, TABLE_COL, rows - HEADER_ROW, n);
  body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false).setFirstRowColor(CREAM).setSecondRowColor(BLUSH);
  body.setVerticalAlignment("middle").setHorizontalAlignment("left")
    .setBorder(null, null, true, null, null, true, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeights(FIRST_ROW, rows - HEADER_ROW, 54);
  sheet.getRange(FIRST_ROW, TABLE_COL, rows - HEADER_ROW, 1).setNumberFormat("ddd d mmm, h:mm AM/PM").setFontColor("#6B5A55");
  sheet.getRange(FIRST_ROW, TABLE_COL + 1, rows - HEADER_ROW, n - 1).setNumberFormat("@"); // plain text keeps 0917... from becoming a number

  // Status: a dropdown with a colour per step, centred
  const status = sheet.getRange(FIRST_ROW, lastCol, rows - HEADER_ROW, 1);
  status.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES.map(s => s[0]), true).setAllowInvalid(true).build())
    .setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setConditionalFormatRules(STATUSES.map(([name, color]) =>
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(name).setBackground(color).setFontColor(INK).setRanges([status]).build()));

  // At a glance: counts to the right of the table
  const gc = lastCol + 2; // N
  const card = sheet.getRange(HEADER_ROW, gc, STATUSES.length + 2, 2);
  card.setBackground(CREAM).setBorder(true, true, true, true, null, null, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(HEADER_ROW, gc, 1, 2).merge().setValue("AT A GLANCE").setBackground("#DB6A97").setFontColor("#FFFFFF")
    .setFontWeight("bold").setHorizontalAlignment("center");
  const col = String.fromCharCode(64 + lastCol); // "L"
  const stats = [["All orders", "=COUNTA(" + String.fromCharCode(64 + TABLE_COL) + FIRST_ROW + ":" + String.fromCharCode(64 + TABLE_COL) + ")"]]
    .concat(STATUSES.map(([name]) => [name, '=COUNTIF(' + col + FIRST_ROW + ":" + col + ', "' + name + '")']));
  sheet.getRange(HEADER_ROW + 1, gc, stats.length, 1).setValues(stats.map(s => [s[0]])).setHorizontalAlignment("left");
  sheet.getRange(HEADER_ROW + 1, gc + 1, stats.length, 1).setFormulas(stats.map(s => [s[1]])).setFontWeight("bold").setHorizontalAlignment("center").setNumberFormat("0");
  sheet.getRange(HEADER_ROW + 1, gc, 1, 2).setFontSize(12).setFontWeight("bold");

  sheet.setFrozenRows(HEADER_ROW);
  sheet.setFrozenColumns(TABLE_COL + 1); // margin, time and name stay put when scrolling sideways
  sheet.setTabColor("#DB6A97");
}

// Run this once from the Apps Script editor (pick "formatSheet" in the dropdown, then Run). It shifts an old table
// (starting at A1) one column right and one row down, then styles everything.
function formatSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  const atB2 = sheet.getRange(HEADER_ROW, TABLE_COL).getValue() === HEADERS[0];
  if (!atB2 && sheet.getRange(1, 1).getValue() === HEADERS[0]) {
    sheet.insertColumnBefore(1);
    sheet.insertRowBefore(1);
  } else if (!atB2) {
    sheet.getRange(HEADER_ROW, TABLE_COL, 1, HEADERS.length).setNumberFormat("@").setValues([HEADERS]);
  }
  formatOrdersSheet_(sheet);
}

function doPost(e) {
  let order;
  try {
    order = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "Bad request" });
  }
  if (order && order.website) return json_({ ok: true }); // honeypot: pretend success
  const errors = validateOrder_(order, Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd"));
  if (errors.length) return json_({ ok: false, error: errors.join(" ") });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(HEADER_ROW, TABLE_COL, 1, HEADERS.length).setNumberFormat("@").setValues([HEADERS]);
      formatOrdersSheet_(sheet);
    }
    appendOrder_(sheet, orderRow_(order, new Date()));
  } catch (err) {
    console.error("Sheet write failed: " + err.message);
    return json_({ ok: false, error: "Could not save order" });
  } finally {
    lock.releaseLock();
  }
  try {
    sendTelegram_(formatTelegramMessage_(order));
  } catch (err) {
    console.error("Telegram failed: " + err.message); // order is saved; don't fail the customer
  }
  return json_({ ok: true });
}

function selfCheck() {
  const assert = (cond, label) => { if (!cond) throw new Error("selfCheck failed: " + label); };
  const today = "2026-11-07";
  const now = new Date("2026-11-07T02:00:00Z");
  const sample = {
    name: "Maria Santos", contact: "09171234567", fbName: "Maria S",
    items: [{ id: "choco-cake", name: "Chocolate Cake", size: "8-inch", qty: 1 }, { id: "ens", name: "Ensaymada", size: "", qty: 6 }],
    custom: { occasion: "Birthday", size: "", flavor: "", message: "Happy Birthday Lola", design: "" },
    fulfillment: "delivery", address: "12 Rizal St, Manila", dateNeeded: "2026-11-15", notes: "Less sweet please", website: "",
  };
  const bad = patch => validateOrder_({ ...sample, ...patch }, today).length > 0;
  assert(validateOrder_(sample, today).length === 0, "valid sample");
  assert(validateOrder_({ ...sample, contact: "0917-123 4567" }, today).length === 0, "spaced phone ok");
  assert(validateOrder_({ ...sample, contact: "+63 917 123 4567" }, today).length === 0, "+63 phone ok");
  assert(bad({ contact: "123" }), "bad phone");
  assert(bad({ dateNeeded: "2026-11-09" }), "too soon");
  assert(!bad({ dateNeeded: "2026-11-10" }), "earliest date ok");
  assert(bad({ dateNeeded: "2026-13-45" }), "impossible date");
  assert(bad({ dateNeeded: "2026-02-30" }), "feb 30");
  assert(bad({ dateNeeded: "tomorrow" }), "malformed date");
  assert(bad({ name: "x".repeat(101) }), "long name");
  assert(bad({ name: " " }), "blank name");
  assert(bad({ fbName: "x".repeat(101) }), "long fb name");
  assert(bad({ notes: "x".repeat(501) }), "long notes");
  assert(bad({ address: "x".repeat(301) }), "long address");
  assert(bad({ fulfillment: "delivery", address: "" }), "delivery needs address");
  assert(!bad({ fulfillment: "pickup", address: "" }), "pickup no address");
  assert(bad({ fulfillment: "drone" }), "bad fulfillment");
  assert(bad({ items: [{ ...sample.items[0], qty: 51 }] }), "qty too high");
  assert(bad({ items: [{ ...sample.items[0], qty: 1.5 }] }), "qty fraction");
  assert(bad({ items: [{ ...sample.items[0], qty: "2" }] }), "qty string");
  assert(bad({ items: [], custom: {} }), "nothing ordered");
  assert(!bad({ items: [] }), "custom only ok");
  assert(bad({ custom: { ...sample.custom, design: "x".repeat(301) } }), "long custom field");
  assert(validateOrder_(null, today).length > 0, "null order");
  assert(bad({ notes: ["x"] }), "array notes");
  assert(bad({ notes: ["x".repeat(100000)] }), "huge array notes");
  assert(bad({ fbName: 5 }) && bad({ address: {} }), "non-string fbName/address");
  assert(bad({ custom: { ...sample.custom, flavor: 5 } }), "numeric custom field");
  assert(bad({ items: [{ ...sample.items[0], name: ["x"] }] }), "non-string item name");
  assert(!bad({ fbName: null, notes: undefined }), "null/missing optionals ok");
  assert(safeCell_("=HYPERLINK(\"x\")") === "'=HYPERLINK(\"x\")", "formula escaped");
  assert(safeCell_("+639171234567") === "'+639171234567", "plus escaped");
  assert(safeCell_(" =1+1") === "'" + " =1+1", "leading-space formula escaped");
  assert(safeCell_("\t=1+1") === "'" + "\t=1+1", "leading-tab formula escaped");
  assert(localContact_("+63 917-123 4567") === "09171234567" && localContact_("0917 123 4567") === "09171234567", "contact stored as 09...");
  assert(orderRow_({ ...sample, contact: "+639171234567" }, now)[2] === "09171234567", "+63 contact stored as 09 in row");
  assert(formatTelegramMessage_({ ...sample, contact: "+639171234567" }).includes("Maria Santos, 09171234567"), "+63 contact as 09 in message");
  assert(safeCell_("-1") === "'-1" && safeCell_("@a") === "'@a", "minus/at escaped");
  assert(safeCell_("Maria") === "Maria", "plain text unchanged");
  const row = orderRow_(sample, now);
  assert(row.length === 11 && row[10] === "New", "row shape");
  assert(row[1] === "Maria Santos" && row[8] === "2026-11-15", "row fields");
  assert(orderRow_({ ...sample, name: "=1+1" }, now)[1] === "'=1+1", "row cells escaped");
  assert(orderRow_(sample, now)[4] === "1\u00d7 Chocolate Cake (8-inch), 6\u00d7 Ensaymada", "items text");
  const msg = formatTelegramMessage_({ ...sample, notes: "R&D <b> *_" });
  assert(msg.startsWith("\uD83C\uDF82 New order \u2014 Maria Santos, 09171234567"), "header line");
  assert(msg.includes("R&D <b> *_"), "special chars kept raw");
  assert(msg.includes("1\u00d7 Chocolate Cake (8-inch), 6\u00d7 Ensaymada"), "items line");
  assert(msg.includes("Delivery, Sun Nov 15\n12 Rizal St, Manila"), "delivery line + address");
  assert(msg.includes("Custom: occasion Birthday; message \"Happy Birthday Lola\""), "custom line");
  assert(!formatTelegramMessage_({ ...sample, notes: "" }).includes("Notes:"), "empty notes omitted");
  assert(!formatTelegramMessage_({ ...sample, custom: {} }).includes("Custom:"), "empty custom omitted");
  assert(formatTelegramMessage_({ ...sample, fulfillment: "pickup", address: "" }).includes("Pickup, Sun Nov 15"), "pickup line");
}

if (typeof module !== "undefined") module.exports = { validateOrder_, safeCell_, orderRow_, formatTelegramMessage_, selfCheck };
