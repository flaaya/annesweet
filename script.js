// let, not const: tests point it at a fake URL (the live Apps Script web app).
let APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzI5RXQW_9z6wYngBTt81_Pv9dLtXWO0WylyjwIx8fUlJaIL4J91AnAuWMixHQAnq9f/exec";
const FACEBOOK_URL = "https://www.facebook.com/annesweetph";

function formatPrice(item) {
  const prices = item.sizes.map(s => s.price);
  const low = Math.min(...prices);
  return (prices.length > 1 ? "From " : "") + "₱" + low.toLocaleString("en-US");
}

// opts.picker (home bestsellers): a size toggle beside the name, one price and one Add for the chosen size.
// opts.heart: a "save to wishlist" heart on the photo.
function makeCard(item, opts = {}) {
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  // Row: photo · name, description, tags · price and Add (bestsellers restyle the same markup)
  const multi = item.sizes.length > 1;
  const picker = multi && opts.picker && !item.soldOut;
  const card = el("article", "card" + (item.soldOut ? " sold-out" : "") + (multi && !picker ? " multi" : "") + (picker ? " picker" : ""));
  card.id = "item-" + item.id; // search results link to menu.html#item-<id>
  const photo = el("div", "photo");
  photo.appendChild(productImg(item, item.name));
  if (opts.heart) {
    const heart = el("button", "wish-btn");
    heart.type = "button";
    heart.dataset.wish = item.id;
    heart.setAttribute("aria-label", "Save " + item.name);
    heart.setAttribute("aria-pressed", "false");
    heart.innerHTML = HEART_SVG;
    photo.appendChild(heart);
  }
  const body = el("div", "card-body");
  const tags = el("div", "tags");
  item.tags.forEach(t => tags.appendChild(el("span", "tag", t)));
  const title = el("h3");
  const open = el("button", "card-open", item.name); // opens the detail window (the photo does too, for the mouse)
  open.type = "button";
  open.dataset.open = item.id;
  open.setAttribute("aria-haspopup", "dialog");
  title.appendChild(open);
  body.append(title, el("p", "desc", item.description));
  if (item.tags.length) body.appendChild(tags);
  const side = el("div", "card-side");
  const price = el("p", "price", picker ? "₱" + item.sizes[0].price.toLocaleString("en-US") : formatPrice(item));
  side.appendChild(price);
  if (item.soldOut) {
    side.appendChild(el("p", "sold-out-label", "Sold out"));
  } else {
    // One button per size ("6-inch ₱650"), or just "Add" when there's only one (or a picker chooses the size)
    const actions = el("div", "actions");
    (picker ? item.sizes.slice(0, 1) : item.sizes).forEach(size => {
      const label = multi && !picker ? size.label + " ₱" + size.price.toLocaleString("en-US") : "Add";
      const btn = el("button", "order-btn", label);
      btn.type = "button";
      btn.dataset.id = item.id;
      btn.dataset.size = size.label;
      btn.dataset.label = label;
      btn.dataset.name = item.name;
      if (picker) btn.dataset.picker = "";
      btn.setAttribute("aria-label", "Add " + itemLabel(btn) + " to your order");
      actions.appendChild(btn);
    });
    side.appendChild(actions);
    if (picker) {
      const btn = actions.firstChild;
      const group = el("div", "size-picker");
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-label", "Size, " + item.name);
      item.sizes.forEach((size, n) => {
        const opt = el("label");
        const radio = el("input");
        radio.type = "radio";
        radio.name = "size-" + item.id;
        radio.value = size.label;
        radio.checked = n === 0;
        radio.addEventListener("change", () => {
          setPrice(price, "₱" + size.price.toLocaleString("en-US"));
          btn.dataset.size = size.label;
          clearTimeout(btn._addedTimer);
          btn.classList.remove("added");
          markCartButtons(card, loadCart(cartStorage()));
        });
        opt.append(radio, el("span", "", size.label));
        group.appendChild(opt);
      });
      body.appendChild(group);
    }
  }
  card.append(photo, body, side);
  return card;
}

const HEART_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

// Square product photo; the id lets style.css re-frame stand-in photos whose cake sits small or low
function productImg(item, alt) {
  const img = document.createElement("img");
  img.src = item.photo;
  img.alt = alt;
  img.loading = "lazy";
  img.width = 1000;
  img.height = 1000;
  img.dataset.photo = item.id;
  return img;
}

// "In your order" state for Add buttons whose id|size is in the cart (skips one still showing "Added")
const inCartLabel = btn => btn.dataset.label === "Add" ? "In your order" : btn.dataset.size + " in your order";
// "Chocolate Cake, 8-inch": the accessible name always contains the visible text of the button
// (a picker's Add says "Add" but still names the chosen size)
const itemLabel = btn => (btn.dataset.name || "") + (btn.dataset.label === "Add" && !("picker" in btn.dataset) ? "" : ", " + btn.dataset.size);
function setInCart(btn, on) {
  btn.classList.toggle("in-cart", on);
  btn.textContent = on ? inCartLabel(btn) : btn.dataset.label;
  btn.setAttribute("aria-label", on ? itemLabel(btn) + " in your order" : "Add " + itemLabel(btn) + " to your order");
}
function markCartButtons(container, cart) {
  container.querySelectorAll(".order-btn:not(.added)").forEach(btn =>
    setInCart(btn, cart[lineKey(btn.dataset.id, btn.dataset.size)] > 0));
}

function renderMenu(menu, container) {
  const fill = (id, items, opts) => {
    const box = container.querySelector("#" + id);
    if (!box) return; // each page has only some of the lists
    box.textContent = "";
    items.forEach(i => box.appendChild(makeCard(i, opts)));
  };
  fill("bestsellers", menu.filter(i => i.tags.includes("Bestseller")), { picker: true, heart: true });
  fill("cakes", menu.filter(i => i.category === "cake"), { picker: true, heart: true });
  fill("pastries", menu.filter(i => i.category === "pastry"), { heart: true });
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

// One row per item (photo and name once), with a sub-row per size: "6-inch · ₱650  − qty +".
// Grouped under Cakes / Pastries.
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
    items.forEach(item => {
      const row = el("div", "order-item");
      const photo = el("div", "photo");
      photo.appendChild(productImg(item, ""));
      const sizes = el("div", "sizes");
      item.sizes.forEach((size, n) => {
        const line = el("div", "order-line");
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
        label.append(el("span", "visually-hidden", item.name + ", "), size.label + " · ₱" + size.price.toLocaleString("en-US"));
        const stepper = el("div", "stepper");
        const step = (text, delta, what) => {
          const b = el("button", "step", text);
          b.type = "button";
          b.setAttribute("aria-label", what + " " + item.name + ", " + size.label);
          b.addEventListener("click", () => stepQty(input, delta));
          return b;
        };
        stepper.append(step("−", -1, "One fewer"), input, step("+", 1, "One more"));
        line.append(label, stepper);
        sizes.appendChild(line);
      });
      row.append(photo, el("p", "item-name", item.name), sizes);
      list.appendChild(row);
    });
    const group = el("div", "line-group");
    group.append(el("p", "line-head", title), list);
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
// Same rule as the form: only raises a size (default: the first) from 0 to 1
function addToCart(cart, id, menu = MENU, size) {
  const item = menu.find(m => m.id === id);
  if (!item || item.soldOut) return cart;
  const s = item.sizes.find(z => z.label === size) || item.sizes[0];
  const key = lineKey(id, s.label);
  return cart[key] > 0 ? cart : { ...cart, [key]: 1 };
}
// Summary lines ({ id, name, size, qty }) from a cart, for pages without the form.
// Only sizes the order form would show, so a stale or sold-out entry never counts.
function cartLines(cart, menu = MENU) {
  return Object.entries(cart).flatMap(([key, qty]) => {
    const [id, size] = key.split("|");
    const item = menu.find(m => m.id === id);
    if (!item || item.soldOut || !item.sizes.some(z => z.label === size)) return [];
    return [{ id, name: item.name, size, qty }];
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
function addToOrder(id, wide = isWide(), storage = cartStorage(), size) {
  const input = document.querySelector('#order-lines input[data-id="' + id + '"]' + (size ? '[data-size="' + size + '"]' : ""));
  if (!input) { saveCart(storage, addToCart(loadCart(storage), id, MENU, size)); return; }
  if (!(Number(input.value) > 0)) input.value = "1";
  if (!wide) return;
  input.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
  input.focus({ preventScroll: true });
}

// Feedback for Add: "Added" on the button for 1.5s, announced through a live region, then "In your order"
function markAdded(btn, live, name) {
  btn.textContent = "Added";
  btn.setAttribute("aria-label", "Added " + itemLabel(btn) + " to your order");
  btn.classList.add("added", "in-cart");
  if (live) live.textContent = "Added " + name + " to your order.";
  clearTimeout(btn._addedTimer);
  btn._addedTimer = setTimeout(() => { btn.classList.remove("added"); setInCart(btn, true); }, 1500);
}

// The qty > 0 lines of the form: [{ id, name, size, qty }] (also what collectOrder sends)
function orderSummary(form) {
  return [...form.querySelectorAll('input[name="qty"]')]
    .map(i => ({ id: i.dataset.id, name: (MENU.find(m => m.id === i.dataset.id) || {}).name || i.dataset.id,
      size: i.dataset.size, qty: Number(i.value) }))
    .filter(i => i.qty > 0);
}

const cartLinkLabel = n => "Your order, " + n + (n === 1 ? " item" : " items");
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
const ERROR_ORDER = ["items", "name", "contact", "fbName", "custom", "fulfillment", "address", "dateNeeded", "notes"];
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
  fail.append("Couldn't send. Please try again or message us on Facebook ");
  const link = document.createElement("a");
  link.href = FACEBOOK_URL;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Facebook";
  const reason = document.createElement("span");
  fail.append(link, reason);
  button.after(fail); // on wide screens it sits to the right of the button, on the same row
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
  // menu.html#item-<id> (from search): the cards are built by script, so the browser can't scroll to them itself
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView({ behavior: "instant" }); // instant: a smooth scroll is cut short while the page is still loading
  document.addEventListener("click", e => { // a card's photo or name opens its detail window
    if (e.target.closest(".wish-btn, .order-btn, .size-picker")) return;
    const card = e.target.closest(".card");
    if (!card || !(e.target.closest(".photo") || e.target.closest(".card-open"))) return;
    openCakeDetail(card.id.replace(/^item-/, ""), card.querySelector(".card-open"));
  });
  document.addEventListener("click", e => {
    const btn = e.target.closest(".order-btn");
    if (!btn) return;
    addToOrder(btn.dataset.id, undefined, undefined, btn.dataset.size);
    markAdded(btn, document.getElementById("add-status"),
      (MENU.find(m => m.id === btn.dataset.id) || {}).name || "item");
    updateOrderUI();
  });
}
// order.html: lines filled from the saved cart, every quantity change saved back
function initOrderPage(form, storage = cartStorage()) {
  renderOrderLines(MENU, form.querySelector("#order-lines"));
  restoreCart(form, loadCart(storage));
  form.addEventListener("input", e => {
    if (e.target.name === "qty") saveCart(storage, cartFromForm(form));
    updateOrderUI(form, storage);
  });
  // Back/Forward from bfcache keeps old inputs; the cart may have gained items on another page since
  addEventListener("pageshow", e => {
    if (!e.persisted || !form.isConnected) return;
    form.querySelectorAll('input[name="qty"]').forEach(i => { i.value = "0"; });
    restoreCart(form, loadCart(storage));
    updateOrderUI(form, storage);
  });
}
// A calendar that looks like the rest of the site, in place of the browser's own date popup (which can't be styled).
// The real <input type="date"> stays in the form (visually hidden) and keeps the value, so validation and sending don't change.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function initDatePicker(input, minISO) {
  input.min = minISO;
  const pad = n => String(n).padStart(2, "0");
  const isoOf = (y, m, d) => y + "-" + pad(m + 1) + "-" + pad(d);
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d }; };
  const long = s => { const p = parse(s); return new Date(Date.UTC(p.y, p.m, p.d)).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }); };
  const wrap = document.createElement("div");
  wrap.className = "date-field";
  input.before(wrap);
  wrap.appendChild(input);
  input.classList.add("date-native");
  input.tabIndex = -1;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "date-trigger";
  trigger.id = input.id + "-btn";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  if (input.getAttribute("aria-describedby")) trigger.setAttribute("aria-describedby", input.getAttribute("aria-describedby"));
  const text = document.createElement("span");
  trigger.append(text, Object.assign(document.createElement("span"), { className: "date-icon", innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><rect x="4" y="6" width="16" height="14" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 10h16M8 4v4M16 4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' }));
  const pop = document.createElement("div");
  pop.className = "date-pop";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", "Choose a date");
  pop.hidden = true;
  wrap.append(trigger, pop);
  const label = document.querySelector('label[for="' + input.id + '"]');
  if (label) label.htmlFor = trigger.id;
  input.addEventListener("focus", () => trigger.focus()); // an error on this field focuses the visible button
  const showValue = () => { text.textContent = input.value ? long(input.value) : "Choose a date"; trigger.classList.toggle("is-empty", !input.value); };
  let view = parse(minISO);
  const render = focusISO => {
    const min = parse(minISO);
    const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const atMin = view.y * 12 + view.m <= min.y * 12 + min.m;
    pop.textContent = "";
    const head = document.createElement("div");
    head.className = "date-head";
    const nav = (dir, glyph, name) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "date-nav"; b.textContent = glyph; b.setAttribute("aria-label", name);
      b.disabled = dir < 0 && atMin;
      b.addEventListener("click", () => { view = { y: view.y, m: view.m + dir, d: 1 }; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } render(); });
      return b;
    };
    const title = document.createElement("p");
    title.className = "date-title"; title.setAttribute("aria-live", "polite"); title.textContent = MONTHS[view.m] + " " + view.y;
    head.append(nav(-1, "‹", "Previous month"), title, nav(1, "›", "Next month"));
    const grid = document.createElement("div");
    grid.className = "date-grid";
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(n => grid.appendChild(Object.assign(document.createElement("span"), { className: "date-dow", textContent: n })));
    for (let i = 0; i < first; i++) grid.appendChild(document.createElement("span"));
    for (let d = 1; d <= days; d++) {
      const iso = isoOf(view.y, view.m, d);
      const b = document.createElement("button");
      b.type = "button"; b.className = "date-day"; b.textContent = d; b.dataset.date = iso;
      b.setAttribute("aria-label", long(iso));
      if (iso < minISO) b.disabled = true;
      if (iso === input.value) { b.classList.add("is-selected"); b.setAttribute("aria-pressed", "true"); }
      b.addEventListener("click", () => pick(iso));
      grid.appendChild(b);
    }
    const note = document.createElement("p");
    note.className = "date-note"; note.textContent = "Earliest date: " + long(minISO) + " (we need 3 days).";
    pop.append(head, grid, note);
    if (focusISO) { const t = grid.querySelector('[data-date="' + focusISO + '"]:not(:disabled)'); if (t) t.focus(); }
  };
  const open = () => {
    view = parse(input.value || minISO);
    render(input.value || minISO);
    pop.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  };
  const close = refocus => {
    if (pop.hidden) return;
    pop.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (refocus) trigger.focus();
  };
  const pick = iso => {
    input.value = iso;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    showValue();
    close(true);
  };
  trigger.addEventListener("click", () => (pop.hidden ? open() : close(true)));
  pop.addEventListener("keydown", e => {
    if (e.key === "Escape") { e.stopPropagation(); close(true); return; }
    const day = e.target.closest && e.target.closest(".date-day");
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!day || !step) return;
    e.preventDefault();
    const p = parse(day.dataset.date);
    const t = new Date(Date.UTC(p.y, p.m, p.d + step));
    const iso = isoOf(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
    if (iso < minISO) return;
    view = { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: 1 };
    render(iso);
  });
  // composedPath, not contains(): a click on the month arrows redraws the calendar, so the clicked button is already detached
  document.addEventListener("click", e => { if (!e.composedPath().includes(wrap)) close(false); });
  if (input.form) input.form.addEventListener("reset", () => setTimeout(showValue));
  showValue();
}

if (document.getElementById("order-lines")) {
  const form = document.getElementById("order-form");
  initOrderPage(form);
  initOrderForm(form);
  initDatePicker(document.getElementById("dateNeeded"), earliestDate(new Date()));
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
  if (count) {
    const sr = document.createElement("span");
    sr.className = "visually-hidden";
    sr.textContent = n === 1 ? " item in your order" : " items in your order";
    count.replaceChildren(String(n), sr);
    count.hidden = !(n > 0);
    const before = Number(count.dataset.n || 0);
    count.dataset.n = String(n);
    if (n > before && count.dataset.ready) { // pop when something is added (not on page load)
      count.classList.remove("bump"); void count.offsetWidth; count.classList.add("bump");
    }
    count.dataset.ready = "1";
  }
  const cartLink = document.getElementById("cart-link");
  if (cartLink) cartLink.setAttribute("aria-label", cartLinkLabel(n));
  if (!form || !form.isConnected) markCartButtons(document, loadCart(storage));
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

// ---------- Wishlist: item ids in localStorage, per viewer ----------
const WISH_KEY = "annesweet-wishlist";
function wishStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}
// Only ids still on the menu, each once; anything unreadable is an empty list
function loadWishlist(storage, menu = MENU) {
  try {
    const raw = JSON.parse(storage.getItem(WISH_KEY) || "[]");
    return Array.isArray(raw) ? [...new Set(raw)].filter(id => menu.some(m => m.id === id)) : [];
  } catch (e) { return []; }
}
function saveWishlist(storage, ids) {
  try { storage.setItem(WISH_KEY, JSON.stringify(ids)); } catch (e) { /* storage blocked or full */ }
}
const toggleWish = (ids, id) => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];

// ---------- Search: menu items whose name or description contains the words typed ----------
function searchMenu(query, menu = MENU) {
  const q = query.trim().toLowerCase();
  return q ? menu.filter(i => (i.name + " " + i.description).toLowerCase().includes(q)) : [];
}

// Photo, name, price row used by the search results and the wishlist
function miniItem(item, tag, href) {
  const row = document.createElement(tag);
  row.className = "mini-item";
  if (href) row.href = href;
  const photo = document.createElement("div");
  photo.className = "photo";
  photo.appendChild(productImg(item, ""));
  const name = document.createElement("span");
  name.className = "mini-name";
  name.textContent = item.name;
  const price = document.createElement("span");
  price.className = "mini-price";
  price.textContent = item.soldOut ? "Sold out" : formatPrice(item);
  row.append(photo, name, price);
  return row;
}

function renderSearch(results, list, status) {
  list.textContent = "";
  results.forEach(item => {
    const li = document.createElement("li");
    li.appendChild(miniItem(item, "a", "menu.html#item-" + item.id));
    list.appendChild(li);
  });
  status.textContent = !results.length ? "" : results.length === 1 ? "1 cake or pastry found." : results.length + " cakes and pastries found.";
}

function renderWishlist(ids, list, menu = MENU) {
  list.textContent = "";
  if (!ids.length) {
    const li = document.createElement("li");
    li.className = "summary-empty";
    li.textContent = "Tap the heart on a cake to save it here.";
    list.appendChild(li);
  }
  ids.forEach(id => {
    const item = menu.find(m => m.id === id);
    const li = document.createElement("li");
    const row = miniItem(item, "div");
    const tools = document.createElement("div");
    tools.className = "mini-tools";
    if (!item.soldOut) {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "order-btn";
      add.textContent = add.dataset.label = "Add to order";
      add.dataset.id = item.id;
      add.dataset.size = item.sizes[0].label;
      add.dataset.name = item.name;
      add.setAttribute("aria-label", "Add " + itemLabel(add) + " to your order");
      tools.appendChild(add);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-btn";
    remove.dataset.unwish = item.id;
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove " + item.name + " from saved cakes");
    tools.appendChild(remove);
    row.appendChild(tools);
    li.appendChild(row);
    list.appendChild(li);
  });
}

// Icon button + panel under the top bar: aria-expanded, focus in on open, Esc / outside click / the icon close it
function disclosure(button, panel, focusTarget, onOpen) {
  const set = (open, restoreFocus) => {
    button.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    if (open) { if (onOpen) onOpen(); focusTarget().focus(); }
    else if (restoreFocus) button.focus();
  };
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    document.querySelectorAll('.topbar-icons [aria-expanded="true"]').forEach(b => { if (b !== button) b.click(); });
    set(open, true);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !panel.hidden) set(false, panel.contains(document.activeElement) || document.activeElement === button);
  });
  // composedPath: a Remove button is gone from the panel by the time the click gets here
  document.addEventListener("click", e => {
    if (!panel.hidden && !e.composedPath().includes(panel) && !e.composedPath().includes(button)) set(false, false);
  });
}

function initTopbarTools(storage = wishStorage()) {
  const searchBtn = document.getElementById("search-toggle");
  const searchPanel = document.getElementById("search-panel");
  const input = document.getElementById("site-search");
  const results = document.getElementById("search-results");
  const status = document.getElementById("search-status");
  disclosure(searchBtn, searchPanel, () => input);
  input.addEventListener("input", () => renderSearch(searchMenu(input.value), results, status));

  const wishBtn = document.getElementById("wish-toggle");
  const wishPanel = document.getElementById("wish-panel");
  const wishList = document.getElementById("wish-list");
  const badge = document.getElementById("wish-count");
  const live = document.getElementById("add-status");
  const sync = () => {
    const ids = loadWishlist(storage);
    document.querySelectorAll(".wish-btn").forEach(b => b.setAttribute("aria-pressed", String(ids.includes(b.dataset.wish))));
    badge.textContent = ids.length;
    badge.hidden = !ids.length;
    wishBtn.setAttribute("aria-label", "Saved cakes, " + ids.length);
    renderWishlist(ids, wishList);
    markCartButtons(wishList, loadCart(cartStorage()));
  };
  disclosure(wishBtn, wishPanel, () => wishPanel, sync);
  document.addEventListener("click", e => {
    const heart = e.target.closest(".wish-btn, .remove-btn");
    if (!heart) return;
    const id = heart.dataset.wish || heart.dataset.unwish;
    const ids = toggleWish(loadWishlist(storage), id);
    saveWishlist(storage, ids);
    const name = (MENU.find(m => m.id === id) || {}).name;
    if (live) live.textContent = (ids.includes(id) ? "Saved " : "Removed ") + name + (ids.includes(id) ? " to" : " from") + " your saved cakes.";
    sync();
    if (heart.classList.contains("wish-btn")) replay(heart.querySelector("svg"), "beat"); // grows on like and on unlike
    if (heart.classList.contains("remove-btn")) wishPanel.focus(); // the button just went away
  });
  addEventListener("storage", e => { if (e.key === WISH_KEY) sync(); }); // saved in another tab
  sync();
}
if (document.getElementById("search-toggle")) initTopbarTools();

// Show a new price with its digits turning over one after another, left to right (textContent stays the plain price).
function setPrice(el, text) {
  el.replaceChildren(...[...text].map((ch, i) => {
    const outer = document.createElement("span");
    const inner = document.createElement("span");
    outer.className = "dg";
    inner.className = "dgi";
    inner.style.animationDelay = i * 110 + "ms";
    inner.textContent = ch;
    outer.appendChild(inner);
    return outer;
  }));
}
// Restart a CSS animation class
function replay(el, cls) { el.classList.remove(cls); el.getBoundingClientRect(); el.classList.add(cls); } // the read forces a reflow; SVG elements have no offsetWidth

// ---------- Cake detail window ----------
// Optional text fields per item in menu.js: ingredients, contains (allergens), calories. A line only shows once it is filled in.
const DETAIL_FIELDS = [["Ingredients", "ingredients"], ["Contains", "contains"], ["Calories", "calories"]];
function detailFacts(item) {
  return DETAIL_FIELDS.filter(([, key]) => item[key] && String(item[key]).trim())
    .map(([label, key]) => ({ label, text: String(item[key]).trim() }));
}

// Photo on the left; name, description, facts, size picker, price and Add on the right.
// The Add button is a normal .order-btn, so the page's existing Add handling (cart, "Added", counts) just works.
function makeCakeDetail(item) {
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const wrap = el("div", "cake-detail");
  const photo = el("div", "photo");
  const img = productImg(item, item.name);
  img.loading = "eager";
  photo.appendChild(img);
  const body = el("div", "cake-detail-body");
  const h2 = el("h2", "", item.name);
  h2.id = "cake-detail-title";
  body.appendChild(h2);
  if (item.tags.length) body.appendChild(el("p", "cake-detail-tags", item.tags.join(", ")));
  body.appendChild(el("p", "cake-detail-desc", item.description));
  const facts = detailFacts(item);
  if (facts.length) {
    const dl = el("dl", "cake-detail-facts");
    facts.forEach(f => { dl.append(el("dt", "", f.label), el("dd", "", f.text)); });
    body.appendChild(dl);
  }
  body.appendChild(el("p", "cake-detail-note", "Baked fresh to order, never frozen. Please order at least 3 days ahead."));
  const buy = el("div", "cake-detail-buy");
  if (item.soldOut) {
    buy.appendChild(el("p", "sold-out-label", "Sold out right now"));
  } else {
    const price = el("p", "cake-detail-price", "₱" + item.sizes[0].price.toLocaleString("en-US"));
    const add = el("button", "order-btn cake-add", "Add");
    add.type = "button";
    add.dataset.id = item.id;
    add.dataset.size = item.sizes[0].label;
    add.dataset.label = "Add";
    add.dataset.name = item.name;
    add.dataset.picker = "";
    add.setAttribute("aria-label", "Add " + itemLabel(add) + " to your order");
    if (item.sizes.length > 1) {
      const group = el("div", "size-picker");
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-label", "Size, " + item.name);
      item.sizes.forEach((size, n) => {
        const opt = el("label");
        const radio = el("input");
        radio.type = "radio";
        radio.name = "detail-size";
        radio.value = size.label;
        radio.checked = n === 0;
        radio.addEventListener("change", () => {
          setPrice(price, "₱" + size.price.toLocaleString("en-US"));
          add.dataset.size = size.label;
          clearTimeout(add._addedTimer);
          add.classList.remove("added");
          markCartButtons(wrap, loadCart(cartStorage()));
        });
        opt.append(radio, el("span", "", size.label));
        group.appendChild(opt);
      });
      buy.appendChild(group);
    }
    buy.append(price, add);
  }
  body.appendChild(buy);
  wrap.append(photo, body);
  return wrap;
}

function openCakeDetail(id, opener) {
  const item = MENU.find(m => m.id === id);
  if (!item) return;
  let dialog = document.getElementById("cake-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "cake-dialog";
    dialog.className = "cake-dialog";
    dialog.setAttribute("aria-labelledby", "cake-detail-title");
    dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); }); // the dim backdrop
    dialog.addEventListener("close", () => { const o = dialog._opener; if (o && o.isConnected) o.focus(); });
    document.body.appendChild(dialog);
  }
  const close = document.createElement("button");
  close.type = "button";
  close.className = "cake-close";
  close.setAttribute("aria-label", "Close");
  close.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  close.addEventListener("click", () => dialog.close());
  const detail = makeCakeDetail(item);
  dialog.replaceChildren(close, detail);
  dialog._opener = opener;
  markCartButtons(detail, loadCart(cartStorage()));
  dialog.showModal();
  dialog.scrollTop = 0;
}

// Home: the closing slide + footer fill exactly one screen, so the slide is sized from the footer's real height
// (it changes with the screen width as the legal line wraps).
if (document.body.classList.contains("page-home")) {
  const footer = document.querySelector(".site-footer");
  const sync = () => document.body.style.setProperty("--footer-h", footer.offsetHeight + "px");
  sync();
  addEventListener("resize", sync);
  if (document.fonts) document.fonts.ready.then(sync);
}

// ---------- Motion ----------
// Words rise into place and blocks fade up once as they scroll into view. Only runs when the page's head script
// switched on html.js-anim (no reduced-motion preference); without it everything is simply visible.
const WORDS_SEL = ".hero h1, .page-head h1, .custom-text h1, .slide h2";
const UP_SEL = ".hero .lead, .hero .actions, .hero .trust, .hero-facts li, .page-head .lead, .slide .section-head a, .best .card, " +
  ".duo-custom p, .duo-custom .btn, .duo-how h2, .steps li, .closing-text p, .closing-text .btn, .closing-photos li, " +
  ".ideas-photos li, .ideas-note, .ideas-cta, .points li, .custom-text .lead, .custom-text .btn, .custom-text h2";
const PHOTO_SEL = ".hero-photo, .duo-photo, .best .photo, .custom-photo";

// Wrap every word in a clipped span so it can slide up on its own; nested tags (<mark>, <em>) keep their shape.
// Returns the number of words wrapped. Safe to call twice.
function splitWords(el) {
  if (el.dataset.split) return 0;
  el.dataset.split = "1";
  let n = 0;
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const outer = document.createElement("span");
          const inner = document.createElement("span");
          outer.className = "w";
          inner.className = "wi";
          inner.style.setProperty("--i", String(n++));
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        walk(child);
      }
    });
  };
  walk(el);
  return n;
}

// The pink marker is one slab that glides along a wavy guide line through the headline: left to right on the first line,
// round the end, right to left on the next, and so on, until it lands exactly on "date." where the real <mark> background takes over.
// It is a thick SVG stroke whose visible part (a dash as long as "date.") slides along the path.
function markerSweep(h1) {
  const done = () => h1.classList.add("marked");
  try {
    const mark = h1.querySelector("mark");
    const words = [...h1.querySelectorAll(".w")];
    if (!mark || !words.length || !h1.animate) return done();
    const base = h1.getBoundingClientRect();
    const m = mark.getBoundingClientRect();
    const markWord = mark.querySelector(".w").getBoundingClientRect();
    const H = m.height, X = m.left - base.left, W = m.width;
    const cy = m.top - base.top + H / 2;
    const lines = [];
    words.forEach(w => {
      const r = w.getBoundingClientRect();
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - r.top) < 4) last.right = r.right - base.left;
      else lines.push({ top: r.top, y: cy + r.top - markWord.top, left: r.left - base.left, right: r.right - base.left });
    });
    // The guide line: gentle waves along each line, a tight loop at each end, close to the words,
    // and a straight run the length of "date." at the very end so the slab lands exactly on the real <mark>.
    const g = lines.length > 1 ? lines[1].y - lines[0].y : H;
    const outR = Math.max(8, Math.min(28, innerWidth - base.right - 8));
    const outL = Math.max(8, Math.min(28, base.left + lines[0].left - 8));
    let x = lines[0].left - 10, d = "";
    lines.forEach((l, i) => {
      const ltr = i % 2 === 0, last = i === lines.length - 1, sx = ltr ? 1 : -1;
      const yIn = i === 0 ? l.y + g * 0.04 : l.y - g * 0.04;
      if (i === 0) d += `M${x} ${yIn}`;
      if (last) {
        const qx = ltr ? X : X + W, ex = ltr ? X + W : X;
        d += ` C${x + (qx - x) * 0.4} ${yIn + g * 0.04} ${qx - (qx - x) * 0.3} ${l.y} ${qx} ${l.y} L${ex} ${l.y}`;
        return;
      }
      const ex = ltr ? l.right : l.left, yOut = l.y + g * 0.1;
      d += ` C${x + (ex - x) * 0.33} ${yIn + g * 0.06} ${x + (ex - x) * 0.66} ${yIn - g * 0.02} ${ex} ${yOut}`;
      const out = ltr ? outR : outL, ny = lines[i + 1].y - g * 0.04;
      d += ` C${ex + sx * out * 1.4} ${yOut} ${ex + sx * out * 1.4} ${ny} ${ex} ${ny}`;
      x = ex;
    });
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const path = document.createElementNS(ns, "path");
    svg.setAttribute("class", "hero-marker");
    svg.setAttribute("aria-hidden", "true");
    path.setAttribute("d", d);
    path.setAttribute("stroke-width", H);
    svg.appendChild(path);
    h1.prepend(svg);
    const total = path.getTotalLength();
    path.style.strokeDasharray = `${W} ${total + W}`;
    const anim = path.animate(
      [{ strokeDashoffset: W }, { strokeDashoffset: -(total - W) }],
      { duration: 4200, delay: 500, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" });
    anim.onfinish = anim.oncancel = () => { done(); svg.remove(); };
  } catch (e) { done(); }
}

function initMotion(root = document) {
  window.__motion = true; // tells the head script the page script ran
  const html = document.documentElement;
  if (!html.classList.contains("js-anim")) return;
  if (!("IntersectionObserver" in window)) { html.classList.remove("js-anim"); return; }
  const words = [...root.querySelectorAll(WORDS_SEL)];
  words.forEach(el => { splitWords(el); el.classList.add("rv-words"); });
  const groups = new Map(); // stagger siblings: 0, 90, 180 ms ...
  const ups = [...root.querySelectorAll(UP_SEL)];
  ups.forEach(el => {
    const k = groups.get(el.parentNode) || 0;
    groups.set(el.parentNode, k + 1);
    el.style.setProperty("--d", ((el.closest(".hero") ? 450 : 80) + Math.min(k, 6) * 90) + "ms");
    el.classList.add("rv");
  });
  const photos = [...root.querySelectorAll(PHOTO_SEL)];
  photos.forEach(el => el.classList.add("rv-photo"));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    if (e.target.matches(".hero h1")) (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => markerSweep(e.target));
    io.unobserve(e.target);
  }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  [...words, ...ups, ...photos].forEach(el => io.observe(el));
}
initMotion();

// Text boxes grow with what is typed (no drag handle). Also re-measured when the form is reset.
function autoGrow(box) {
  box.style.height = "auto";
  box.style.height = box.scrollHeight + 2 + "px"; // + the 1px borders
}
document.addEventListener("input", e => { if (e.target.matches && e.target.matches("textarea")) autoGrow(e.target); });
document.addEventListener("reset", () => setTimeout(() => document.querySelectorAll("textarea").forEach(autoGrow)));
