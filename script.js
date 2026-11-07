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

const pad = n => String(n).padStart(2, "0");

// Local date parts, never toISOString (it shifts by timezone)
function earliestDate(today) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function normalizePhone(s) {
  return s.replace(/[\s-]/g, "");
}

function validateOrder(order, today) {
  const errors = {};
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
  else if (order.dateNeeded < earliestDate(today)) errors.dateNeeded = "Please pick " + earliestDate(today) + " or later (we need 3 days).";

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
  const date = document.getElementById("dateNeeded");
  date.min = earliestDate(new Date());
  const address = document.getElementById("address-field");
  document.querySelectorAll('input[name="fulfillment"]').forEach(r => r.addEventListener("change", () => {
    address.hidden = document.querySelector('input[name="fulfillment"]:checked').value !== "delivery";
  }));
}
