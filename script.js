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
  // Row: photo · name, description, tags · price and Add (bestsellers restyle the same markup)
  const card = el("article", "card" + (item.soldOut ? " sold-out" : ""));
  const img = el("img");
  img.src = item.photo;
  img.alt = item.name;
  img.loading = "lazy";
  img.width = 1000;
  img.height = 1000;
  const body = el("div", "card-body");
  const tags = el("div", "tags");
  item.tags.forEach(t => tags.appendChild(el("span", "tag", t)));
  body.append(el("h3", "", item.name), el("p", "desc", item.description));
  if (item.tags.length) body.appendChild(tags);
  const side = el("div", "card-side");
  side.appendChild(el("p", "price", formatPrice(item)));
  if (item.soldOut) {
    side.appendChild(el("p", "sold-out-label", "Sold out"));
  } else {
    const btn = el("button", "order-btn", "Add");
    btn.type = "button";
    btn.dataset.id = item.id;
    btn.setAttribute("aria-label", "Add " + item.name + " to your order");
    side.appendChild(btn);
  }
  card.append(img, body, side);
  return card;
}

function renderMenu(menu, container) {
  const fill = (id, items) => {
    const box = container.querySelector("#" + id);
    if (!box) return; // each page has only some of the lists
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

// One line per size, grouped under Cakes / Pastries: photo, name, size and price, then − qty +
function renderOrderLines(menu, container) {
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  container.textContent = "";
  [["cake", "Cakes"], ["pastry", "Pastries"]].forEach(([category, title]) => {
    const items = menu.filter(i => i.category === category && !i.soldOut);
    if (!items.length) return;
    const list = el("div", "lines");
    items.forEach(item => item.sizes.forEach((size, n) => {
      const line = el("div", "order-line");
      const img = el("img");
      img.src = item.photo;
      img.alt = "";
      img.loading = "lazy";
      img.width = 1000;
      img.height = 1000;
      const input = el("input");
      input.id = "qty-" + item.id + "-" + n;
      input.type = "number";
      input.min = "0";
      input.max = "50";
      input.value = "0";
      input.name = "qty";
      input.inputMode = "numeric";
      input.dataset.id = item.id;
      input.dataset.size = size.label;
      input.setAttribute("aria-describedby", "err-items");
      const label = el("label", "line-label");
      label.htmlFor = input.id;
      label.append(el("span", "line-name", item.name), el("span", "line-meta", size.label + " · ₱" + size.price.toLocaleString("en-US")));
      const stepper = el("div", "stepper");
      const step = (text, delta, what) => {
        const b = el("button", "step", text);
        b.type = "button";
        b.setAttribute("aria-label", what + " " + item.name + ", " + size.label);
        b.addEventListener("click", () => stepQty(input, delta));
        return b;
      };
      stepper.append(step("−", -1, "One fewer"), input, step("+", 1, "One more"));
      line.append(img, label, stepper);
      list.appendChild(line);
    }));
    const group = el("div", "line-group");
    group.append(el("h3", "", title), list);
    container.appendChild(group);
  });
}

// The − / + buttons: the number input stays the source of truth; clamp 0–50 and tell listeners
function stepQty(input, delta) {
  input.value = String(Math.min(50, Math.max(0, (parseInt(input.value, 10) || 0) + delta)));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

// ---------- Cart: { "id|size": qty } in sessionStorage, so Add on Home/Menu reaches order.html ----------
const CART_KEY = "annesweet-cart";
const lineKey = (id, size) => id + "|" + size;
function cartStorage() {
  try { return window.sessionStorage; } catch (e) { return null; } // blocked storage: site still works, cart just doesn't carry over
}
function loadCart(storage) {
  try {
    const raw = JSON.parse(storage.getItem(CART_KEY) || "{}");
    const cart = {};
    Object.entries(raw && typeof raw === "object" ? raw : {}).forEach(([k, q]) => {
      if (Number.isInteger(q) && q > 0 && q <= 50) cart[k] = q;
    });
    return cart;
  } catch (e) { return {}; }
}
function saveCart(storage, cart) {
  try { storage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage blocked or full */ }
}
const cartCount = cart => Object.values(cart).reduce((n, q) => n + q, 0);
// Same rule as the form: only raises the first size from 0 to 1
function addToCart(cart, id, menu = MENU) {
  const item = menu.find(m => m.id === id);
  if (!item || item.soldOut) return cart;
  const key = lineKey(id, item.sizes[0].label);
  return cart[key] > 0 ? cart : { ...cart, [key]: 1 };
}
// Summary lines ({ id, name, size, qty }) from a cart, for pages without the form
function cartLines(cart, menu = MENU) {
  return Object.entries(cart).map(([key, qty]) => {
    const [id, size] = key.split("|");
    return { id, name: (menu.find(m => m.id === id) || {}).name || id, size, qty };
  });
}
function cartFromForm(form) {
  const cart = {};
  orderSummary(form).forEach(l => { if (Number.isInteger(l.qty) && l.qty <= 50) cart[lineKey(l.id, l.size)] = l.qty; });
  return cart;
}
function restoreCart(form, cart) {
  form.querySelectorAll('input[name="qty"]').forEach(i => {
    const q = cart[lineKey(i.dataset.id, i.dataset.size)];
    if (q) i.value = String(q);
  });
}

const isWide = () => matchMedia("(min-width: 960px)").matches;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Only raises 0 to 1, so a quantity the customer already set is kept.
// With the form on the page: set its line (wide screens jump to it). Otherwise: save it to the cart for order.html.
function addToOrder(id, wide = isWide(), storage = cartStorage()) {
  const input = document.querySelector('#order-lines input[data-id="' + id + '"]');
  if (!input) { saveCart(storage, addToCart(loadCart(storage), id)); return; }
  if (!(Number(input.value) > 0)) input.value = "1";
  if (!wide) return;
  input.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
  input.focus({ preventScroll: true });
}

// Phone feedback for Add: "Added" on the button for 1.5s, announced through a live region
function markAdded(btn, live, name) {
  btn.textContent = "Added";
  btn.classList.add("added");
  if (live) live.textContent = "Added " + name + " to your order.";
  clearTimeout(btn._addedTimer);
  btn._addedTimer = setTimeout(() => { btn.textContent = "Add"; btn.classList.remove("added"); }, 1500);
}

// The qty > 0 lines of the form: [{ id, name, size, qty }] (also what collectOrder sends)
function orderSummary(form) {
  return [...form.querySelectorAll('input[name="qty"]')]
    .map(i => ({ id: i.dataset.id, name: (MENU.find(m => m.id === i.dataset.id) || {}).name || i.dataset.id,
      size: i.dataset.size, qty: Number(i.value) }))
    .filter(i => i.qty > 0);
}

const orderCount = lines => lines.reduce((n, l) => n + l.qty, 0);
const barLabel = n => n + (n === 1 ? " item" : " items") + " · Review order";
// The phone bar never shows with nothing ordered, over the form itself, or over the keyboard
const barHidden = (n, orderOnScreen, typing) => !(n > 0) || orderOnScreen || typing;

function renderSummary(lines, list) {
  list.textContent = "";
  if (!lines.length) {
    const li = document.createElement("li");
    li.className = "summary-empty";
    li.textContent = "Nothing added yet.";
    list.appendChild(li);
  }
  lines.forEach(l => {
    const li = document.createElement("li");
    li.textContent = l.qty + " × " + l.name + " (" + l.size + ")";
    list.appendChild(li);
  });
}

function collectOrder(form) {
  const f = n => form.elements[n];
  const t = n => f(n).value.trim();
  const items = orderSummary(form);
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

function initOrderForm(form, fetchFn = fetch, storage = cartStorage()) {
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
      done.className = "thanks";
      done.setAttribute("role", "status");
      done.textContent = "Thanks! Annesweet will message you to confirm your order and payment.";
      form.replaceWith(done);
      saveCart(storage, {}); // sent: empty the cart, the summary and the bar
      updateOrderUI(undefined, storage);
    } else {
      reason.textContent = result.error ? " (" + result.error + ")" : "";
      fail.hidden = false;
      button.disabled = false;
      button.textContent = label;
    }
  });
}

// tests.html has no page sections, so only wire up what exists on this page
if (document.querySelector("#bestsellers, #cakes")) {
  renderMenu(MENU, document);
  document.addEventListener("click", e => {
    const btn = e.target.closest(".order-btn");
    if (!btn) return;
    addToOrder(btn.dataset.id);
    markAdded(btn, document.getElementById("add-status"),
      (MENU.find(m => m.id === btn.dataset.id) || {}).name || "item");
    updateOrderUI();
  });
}
if (document.getElementById("order-lines")) {
  const form = document.getElementById("order-form");
  renderOrderLines(MENU, document.getElementById("order-lines"));
  restoreCart(form, loadCart(cartStorage()));
  form.addEventListener("input", e => {
    if (e.target.name === "qty") saveCart(cartStorage(), cartFromForm(form));
    updateOrderUI();
  });
  initOrderForm(form);
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

// Desktop summary (order.html), phone bottom bar and the count by "Order" in the top bar (other pages).
// Lines come from the form while it's on the page, else from the saved cart (emptied once sent).
function updateOrderUI(form = document.getElementById("order-form"), storage = cartStorage()) {
  const lines = form && form.isConnected ? orderSummary(form) : cartLines(loadCart(storage));
  const n = orderCount(lines);
  const list = document.getElementById("order-summary-lines");
  if (list) renderSummary(lines, list);
  const count = document.getElementById("nav-count");
  if (count) { count.textContent = n; count.hidden = !(n > 0); }
  const bar = document.getElementById("order-bar");
  if (!bar) return;
  bar.textContent = barLabel(n);
  bar.hidden = barHidden(n, false, false); // the bar is left off order.html, so never over the form or keyboard
  document.body.classList.toggle("has-bar", !bar.hidden);
}
if (document.querySelector(".topbar")) {
  updateOrderUI();
  addEventListener("pageshow", () => updateOrderUI()); // coming Back from order.html restores this page from cache
}
