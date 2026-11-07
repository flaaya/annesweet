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
  const c0 = order.custom && typeof order.custom === "object" ? order.custom : {};
  const its = Array.isArray(order.items) ? order.items : [];
  // Optional text fields must really be strings, else length limits are bypassed
  if ([order.fbName, order.address, order.notes].some(notString) || CUSTOM_KEYS.some(k => notString(c0[k])) ||
      its.some(i => i && (notString(i.name) || notString(i.size)))) return ["Text fields must be strings."];
  const str = v => (typeof v === "string" ? v : "");
  const tooLong = (v, max) => str(v).length > max;

  if (!str(order.name).trim()) errors.push("Name is required.");
  else if (tooLong(order.name, 100)) errors.push("Name is too long.");

  if (!/^(09|\+639)\d{9}$/.test(str(order.contact).replace(/[\s-]/g, ""))) errors.push("Invalid mobile number.");
  if (tooLong(order.fbName, 100)) errors.push("Facebook name is too long.");

  const c = order.custom && typeof order.custom === "object" ? order.custom : {};
  const hasCustom = CUSTOM_KEYS.some(k => str(c[k]).trim());
  if (CUSTOM_KEYS.some(k => tooLong(c[k], 300))) errors.push("A custom cake field is too long.");

  const items = Array.isArray(order.items) ? order.items : [];
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
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function itemsText_(order) {
  return (order.items || []).filter(i => i.qty > 0)
    .map(i => i.qty + "× " + i.name + (i.size ? " (" + i.size + ")" : "")).join(", ");
}

function customText_(order) {
  const c = order.custom || {};
  return CUSTOM_KEYS.filter(k => c[k] && String(c[k]).trim())
    .map(k => k === "message" ? 'message "' + c[k] + '"' : k + " " + c[k]).join("; ");
}

function orderRow_(order, now) {
  return [
    now,
    safeCell_(order.name),
    safeCell_(order.contact),
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
    "🎂 New order — " + order.name + ", " + order.contact,
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
    sheet.getRange("B:K").setNumberFormat("@"); // plain text keeps 0917... and "1/2" from being converted; A stays a date
      sheet.appendRow(HEADERS);
    }
    sheet.appendRow(orderRow_(order, new Date()));
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
  assert(safeCell_("-1") === "'-1" && safeCell_("@a") === "'@a", "minus/at escaped");
  assert(safeCell_("Maria") === "Maria", "plain text unchanged");
  const row = orderRow_(sample, now);
  assert(row.length === 11 && row[10] === "New", "row shape");
  assert(row[1] === "Maria Santos" && row[8] === "2026-11-15", "row fields");
  assert(orderRow_({ ...sample, name: "=1+1" }, now)[1] === "'=1+1", "row cells escaped");
  assert(orderRow_(sample, now)[4] === "1× Chocolate Cake (8-inch), 6× Ensaymada", "items text");
  const msg = formatTelegramMessage_({ ...sample, notes: "R&D <b> *_" });
  assert(msg.startsWith("🎂 New order — Maria Santos, 09171234567"), "header line");
  assert(msg.includes("R&D <b> *_"), "special chars kept raw");
  assert(msg.includes("1× Chocolate Cake (8-inch), 6× Ensaymada"), "items line");
  assert(msg.includes("Delivery, Sun Nov 15\n12 Rizal St, Manila"), "delivery line + address");
  assert(msg.includes("Custom: occasion Birthday; message \"Happy Birthday Lola\""), "custom line");
  assert(!formatTelegramMessage_({ ...sample, notes: "" }).includes("Notes:"), "empty notes omitted");
  assert(!formatTelegramMessage_({ ...sample, custom: {} }).includes("Custom:"), "empty custom omitted");
  assert(formatTelegramMessage_({ ...sample, fulfillment: "pickup", address: "" }).includes("Pickup, Sun Nov 15"), "pickup line");
}

if (typeof module !== "undefined") module.exports = { validateOrder_, safeCell_, orderRow_, formatTelegramMessage_, selfCheck };
