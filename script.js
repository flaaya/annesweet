// let, not const: tests point it at a fake URL. Filled in Task 6.
let APPS_SCRIPT_URL = "";
const FACEBOOK_URL = "https://facebook.com/";

function formatPrice(item) {
  const prices = item.sizes.map(s => s.price);
  const low = Math.min(...prices);
  return (prices.length > 1 ? "From " : "") + "₱" + low.toLocaleString("en-US");
}

function makeCard(item) {
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const card = el("article", "card" + (item.soldOut ? " sold-out" : ""));
  const img = el("img");
  img.src = item.photo;
  img.alt = item.name;
  img.loading = "lazy";
  card.appendChild(img);
  const tags = el("div", "tags");
  item.tags.forEach(t => tags.appendChild(el("span", "tag", t)));
  card.append(tags, el("h3", "", item.name), el("p", "desc", item.description),
    el("p", "price", formatPrice(item)));
  if (item.soldOut) {
    card.appendChild(el("p", "sold-out-label", "Sold out"));
  } else {
    const btn = el("button", "order-btn", "Order this");
    btn.type = "button";
    btn.dataset.id = item.id;
    card.appendChild(btn);
  }
  return card;
}

function renderMenu(menu, container) {
  const fill = (id, items) => {
    const box = container.querySelector("#" + id);
    box.textContent = "";
    items.forEach(i => box.appendChild(makeCard(i)));
  };
  fill("bestsellers", menu.filter(i => i.tags.includes("Bestseller")));
  fill("cakes", menu.filter(i => i.category === "cake"));
  fill("pastries", menu.filter(i => i.category === "pastry"));
}

// Today in Manila (the server's clock, whatever the phone's timezone is) + 3 days, by UTC date math like Code.gs
function earliestDate(today) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(today).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 3)).toISOString().slice(0, 10);
}

function normalizePhone(s) {
  return s.replace(/[\s-]/g, "");
}

function validateOrder(order, today) {
  const errors = {};
  const earliest = earliestDate(today);
  const text = v => (v || "").trim();
  const tooLong = (v, max) => (v || "").length > max;

  if (!text(order.name)) errors.name = "Please enter your name.";
  else if (tooLong(order.name, 100)) errors.name = "Name must be 100 characters or fewer.";

  if (!/^(09|\+639)\d{9}$/.test(normalizePhone(order.contact || "")))
    errors.contact = "Enter a mobile number like 0917 123 4567.";

  if (tooLong(order.fbName, 100)) errors.fbName = "Facebook name must be 100 characters or fewer.";

  const c = order.custom || {};
  const hasCustom = Object.values(c).some(v => text(v));
  if (Object.values(c).some(v => tooLong(v, 300))) errors.custom = "Each custom cake field must be 300 characters or fewer.";

  const items = order.items || [];
  if (items.some(i => !Number.isInteger(i.qty) || i.qty < 0 || i.qty > 50))
    errors.items = "Quantity must be a whole number from 0 to 50.";
  else if (!items.some(i => i.qty > 0) && !hasCustom)
    errors.items = "Choose at least one item or describe a custom cake.";

  if (order.fulfillment !== "pickup" && order.fulfillment !== "delivery")
    errors.fulfillment = "Choose pickup or delivery.";
  else if (order.fulfillment === "delivery" && !text(order.address))
    errors.address = "Please enter a delivery address.";
  else if (tooLong(order.address, 300)) errors.address = "Address must be 300 characters or fewer.";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(order.dateNeeded || "")) errors.dateNeeded = "Please pick the date you need it.";
  else if (order.dateNeeded < earliest) errors.dateNeeded = "Please pick " + earliest + " or later (we need 3 days).";

  if (tooLong(order.notes, 500)) errors.notes = "Notes must be 500 characters or fewer.";
  return errors;
}

function renderOrderLines(menu, container) {
  container.textContent = "";
  menu.filter(i => !i.soldOut).forEach(item => item.sizes.forEach(size => {
    const label = document.createElement("label");
    label.className = "order-line";
    const span = document.createElement("span");
    span.textContent = item.name + " (" + size.label + ", ₱" + size.price.toLocaleString("en-US") + ")";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "50";
    input.value = "0";
    input.name = "qty";
    input.dataset.id = item.id;
    input.dataset.size = size.label;
    input.setAttribute("aria-describedby", "err-items");
    label.append(span, input);
    container.appendChild(label);
  }));
}

// Only raises 0 to 1, so a quantity the customer already set is kept
function addToOrder(id) {
  const input = document.querySelector('#order-lines input[data-id="' + id + '"]');
  if (!input) return;
  if (!(Number(input.value) > 0)) input.value = "1";
  input.scrollIntoView({ behavior: "smooth", block: "center" });
  input.focus({ preventScroll: true });
}

function collectOrder(form) {
  const f = n => form.elements[n];
  const t = n => f(n).value.trim();
  const items = [...form.querySelectorAll('input[name="qty"]')]
    .map(i => ({ id: i.dataset.id, name: (MENU.find(m => m.id === i.dataset.id) || {}).name || i.dataset.id,
      size: i.dataset.size, qty: Number(i.value) }))
    .filter(i => i.qty > 0);
  const checked = form.querySelector('input[name="fulfillment"]:checked');
  return {
    name: t("name"), contact: normalizePhone(t("contact")), fbName: t("fbName"), items,
    custom: { occasion: t("occasion"), size: t("size"), flavor: t("flavor"), message: t("message"), design: t("design") },
    fulfillment: checked ? checked.value : "", address: checked && checked.value === "delivery" ? t("address") : "", dateNeeded: f("dateNeeded").value,
    notes: t("notes"), website: f("website").value,
  };
}

// Resolves { ok, error }: error is the server's reason when it gave one
async function submitOrder(order, fetchFn = fetch) {
  if (!APPS_SCRIPT_URL) return { ok: false };
  try {
    // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight
    const res = await fetchFn(APPS_SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(order),
      signal: AbortSignal.timeout(30000) });
    const data = await res.json();
    return { ok: data.ok === true, error: typeof data.error === "string" ? data.error : "" };
  } catch (e) {
    return { ok: false };
  }
}

// error key (from validateOrder) -> the element to flag and focus
const ERROR_ORDER = ["name", "contact", "fbName", "items", "custom", "fulfillment", "address", "dateNeeded", "notes"];
function errorTarget(form, key) {
  if (key === "items") return form.querySelector('input[name="qty"]');
  if (key === "custom") return form.querySelector("#occasion");
  if (key === "fulfillment") return form.querySelector('input[name="fulfillment"]');
  return form.querySelector("#" + key);
}

function showErrors(form, errors) {
  form.querySelectorAll(".error").forEach(p => { p.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
  let first = null;
  ERROR_ORDER.forEach(key => {
    if (!errors[key]) return;
    form.querySelector("#err-" + key).textContent = errors[key];
    const target = errorTarget(form, key);
    if (key === "items") form.querySelectorAll('input[name="qty"]').forEach(i => i.setAttribute("aria-invalid", "true"));
    else target.setAttribute("aria-invalid", "true");
    first = first || target;
  });
  if (first) first.focus();
  return Object.keys(errors).length > 0;
}

function initOrderForm(form, fetchFn = fetch) {
  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  const fail = document.createElement("p");
  fail.setAttribute("role", "alert");
  fail.hidden = true;
  fail.append("Couldn't send — please try again or message us on Facebook ");
  const link = document.createElement("a");
  link.href = FACEBOOK_URL;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Facebook";
  const reason = document.createElement("span");
  fail.append(link, reason);
  button.before(fail);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (button.disabled) return;
    fail.hidden = true;
    const order = collectOrder(form);
    if (showErrors(form, validateOrder(order, new Date()))) return;
    button.disabled = true;
    button.textContent = "Sending…";
    const result = await submitOrder(order, fetchFn);
    if (result.ok) {
      const done = document.createElement("p");
      done.setAttribute("role", "status");
      done.textContent = "Thanks! Annesweet will message you to confirm your order and payment.";
      form.replaceWith(done);
    } else {
      reason.textContent = result.error ? " (" + result.error + ")" : "";
      fail.hidden = false;
      button.disabled = false;
      button.textContent = label;
    }
  });
}

// tests.html has no page sections, so only wire up where they exist
if (document.getElementById("cakes")) {
  renderMenu(MENU, document);
  document.addEventListener("click", e => {
    const btn = e.target.closest(".order-btn");
    if (btn) addToOrder(btn.dataset.id);
  });
}
if (document.getElementById("order-lines")) {
  renderOrderLines(MENU, document.getElementById("order-lines"));
  initOrderForm(document.getElementById("order-form"));
  const date = document.getElementById("dateNeeded");
  date.min = earliestDate(new Date());
  const address = document.getElementById("address-field");
  const toggleAddress = () => {
    const checked = document.querySelector('input[name="fulfillment"]:checked');
    address.hidden = !checked || checked.value !== "delivery";
  };
  document.querySelectorAll('input[name="fulfillment"]').forEach(r => r.addEventListener("change", toggleAddress));
  toggleAddress(); // a restored form may already have Delivery ticked
}
