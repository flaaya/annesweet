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

// tests.html has no page sections, so only render where they exist
if (document.getElementById("cakes")) renderMenu(MENU, document);
