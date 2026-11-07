# Annesweet Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page, phone-first bakery website with a menu and an order request form. Each order goes to a Google Sheet and a Telegram message.

**Architecture:** Static files on GitHub Pages. The menu lives in one data file (`menu.js`) that both the menu cards and the order form are built from, so changing the menu means editing one list. The form posts JSON to a Google Apps Script web app, which validates the order, appends a Sheet row and calls the Telegram Bot API.

**Tech Stack:** Plain HTML, CSS, JavaScript (no framework, no build step, no npm). Google Apps Script. Telegram Bot API.

**Spec:** `docs/superpowers/specs/2026-11-07-annesweet-website-design.md`

## Global Constraints

- No frameworks, libraries, npm or build tools. Every file must open directly in a browser.
- Must look right on screens 360px wide and up (design phone-first), and on laptops.
- Shop name: "Annesweet".
- Lead time: earliest date needed = today + 3 days (local date). No latest date.
- Lengths: name ≤ 100, FB name ≤ 100, each custom-cake field ≤ 300, address ≤ 300, notes ≤ 500. Quantity is an integer 0–50.
- Phone: PH mobile, `09XXXXXXXXX` or `+639XXXXXXXXX`. Spaces and dashes are allowed and stripped before checking.
- The Telegram bot token and chat ID live only in Apps Script Script Properties (`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`), never in site files.
- Photos under ~200 KB each, square crop.
- No popups on page load and no auto-sliding carousels. Text never sits on top of photos.
- Success copy: "Thanks! Annesweet will message you to confirm your order and payment."
- Failure copy: "Couldn't send — please try again or message us on Facebook" plus the Facebook link.
- Delivery note: "Delivery is via Lalamove/Grab. The rider fee is paid by the customer."
- Footer lead-time note: "Please order at least 3 days ahead (a week for custom cakes)."
- Until the real menu arrives, `menu.js` holds sample items whose names start with "Sample". Contact details use the obvious stand-ins `09XX XXX XXXX` and `https://facebook.com/` and are swapped in Task 6.

## Review Focus

1. **Double tap on Send over slow mobile data**: must create one order, not two. The button is disabled while sending (Task 3 test).
2. **Phone typed as `0917 123 4567` or `0917-123-4567`**: must be accepted. Rejecting a real number loses a customer (Task 2 test).
3. **A customer types `=HYPERLINK(...)` or `+63...` into a field**: the Sheet must store it as text, never run it as a formula (Task 4 self-check).
4. **"Order this" tapped on an item already in the form**: must not reset a quantity the customer already set to more than 1 (Task 2 test).
5. **Notes containing `&`, `<`, `*` or `_`**: the Telegram message must still send. Send plain text with no `parse_mode` (Task 4 self-check).

---

## File structure

```
index.html            page structure, empty containers that script.js fills
style.css             all styling
menu.js               MENU data array (the only file edited for menu changes)
script.js             rendering, form behavior, validation, submitting
tests.html            open in a browser; runs the asserts for menu.js + script.js
photos/               menu photos + hero.jpg
apps-script/Code.gs   backend, pasted into the Sheet's Apps Script editor
apps-script/appsscript.json   sets timeZone "Asia/Manila"
README.md             setup + how to edit the menu
```

### Data shapes (used across tasks)

```js
// menu.js
const MENU = [
  {
    id: "choco-cake",              // unique, kebab-case
    name: "Sample Chocolate Cake",
    category: "cake",              // "cake" | "pastry"
    description: "One short sentence.",
    photo: "photos/choco-cake.jpg",
    sizes: [{ label: "6-inch", price: 650 }, { label: "8-inch", price: 950 }], // one entry = single size
    tags: ["Bestseller"],          // subset of ["Bestseller", "New"]
    soldOut: false,
  },
  // ...10 cakes, 4 pastries
];

// Order sent to Apps Script (JSON)
{
  name, contact, fbName,
  items: [{ id, name, size, qty }],   // only lines with qty > 0
  custom: { occasion, size, flavor, message, design },  // strings, may be ""
  fulfillment: "pickup" | "delivery",
  address, dateNeeded: "YYYY-MM-DD", notes,
  website: ""                          // honeypot
}
```

---

### Task 1: Project setup, menu data and menu cards

**Files:**
- Create: `index.html`, `style.css` (basic layout only), `menu.js`, `script.js`, `tests.html`, `photos/` (sample images, any small square JPGs)

**Interfaces:**
- Produces: `MENU` (global array, shape above); `formatPrice(item) -> string`; `renderMenu(menu, container: HTMLElement) -> void`; DOM ids `#bestsellers`, `#cakes`, `#pastries`, `#order` (empty section for Task 2)

- [ ] **Step 1: `git init` and create the page skeleton**

`index.html` sections in this order: sticky top bar (name "Annesweet" + "Order now" link to `#order`), hero (one photo, tagline, below-photo text), `#bestsellers`, `#cakes`, Custom Cakes card ("Want something special? Tell us in the order form." linking to `#order`), `#pastries`, Why order from us (3 points: baked fresh to order, custom designs for any celebration, made at home with care), How to order (3 steps: send a request → we message you to confirm and arrange payment → pick up or get it delivered), `#order`, footer (contact, Facebook link, pickup area, lead-time note). Scripts load `menu.js` then `script.js` with `defer`.

- [ ] **Step 2: Write failing tests in `tests.html`**

`tests.html` loads `menu.js` and `script.js`, defines `test(name, fn)` and `assertEqual(actual, expected)`, and prints "N passed, M failed" plus each failure on the page.

```js
test("formatPrice single size", () =>
  assertEqual(formatPrice({ sizes: [{ label: "Box of 6", price: 180 }] }), "₱180"));
test("formatPrice multiple sizes uses From lowest", () =>
  assertEqual(formatPrice({ sizes: [{ label: "8-inch", price: 950 }, { label: "6-inch", price: 650 }] }), "From ₱650"));
test("formatPrice adds thousands comma", () =>
  assertEqual(formatPrice({ sizes: [{ label: "x", price: 1250 }] }), "₱1,250"));
test("renderMenu puts cakes and pastries in their sections", () => {
  // build a container with #bestsellers/#cakes/#pastries, render a 3-item fake menu
  // assert #cakes has 2 .card, #pastries has 1 .card
});
test("bestsellers row holds only Bestseller-tagged items", ...);   // count matches
test("sold out card has class sold-out and no Order this button", ...);
test("each card shows its tags as .tag elements", ...);
test("MENU ids are unique", () =>
  assertEqual(new Set(MENU.map(i => i.id)).size, MENU.length));
```

- [ ] **Step 3: Open `tests.html` in a browser.** Expected: failures, because `formatPrice` is not defined.

- [ ] **Step 4: Fill `menu.js` with 10 sample cakes and 4 sample pastries** (3 tagged Bestseller, at least one with several sizes, one `soldOut: true`). **Implement `formatPrice` and `renderMenu`** in `script.js`. Build cards with `document.createElement` and `textContent`, not `innerHTML`, so menu text can't break the page. Each card has a photo (`loading="lazy"`, `alt` = item name), tags, name, description, price and an "Order this" button (`data-id` = item id) unless sold out. Call `renderMenu(MENU, document)` on load.

- [ ] **Step 5: Reload `tests.html`.** Expected: all pass. Open `index.html` and see the cards.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: page skeleton and menu cards from menu.js"`

---

### Task 2: Order form, item lines and validation

**Files:**
- Modify: `index.html` (form inside `#order`), `script.js`, `tests.html`

**Interfaces:**
- Consumes: `MENU`, item shape
- Produces:
  - `earliestDate(today: Date) -> "YYYY-MM-DD"` (today + 3, local date)
  - `normalizePhone(s: string) -> string` (strips spaces and dashes)
  - `validateOrder(order, today: Date) -> { [field]: message }` (empty object = valid). Field keys: `name`, `contact`, `fbName`, `items`, `custom`, `fulfillment`, `address`, `dateNeeded`, `notes`.
  - `renderOrderLines(menu, container) -> void`: one `<input type="number" min="0" max="50" value="0">` per size of each non-sold-out item, with `name="qty"` and `data-id`, `data-size`
  - `addToOrder(id) -> void`: the "Order this" handler

- [ ] **Step 1: Write failing tests**

```js
const today = new Date(2026, 10, 7); // Nov 7 2026, local time
const ok = { name: "Maria", contact: "09171234567", fbName: "", items: [{ id: "a", name: "A", size: "6-inch", qty: 1 }],
  custom: { occasion: "", size: "", flavor: "", message: "", design: "" },
  fulfillment: "pickup", address: "", dateNeeded: "2026-11-10", notes: "", website: "" };

test("earliestDate is today + 3", () => assertEqual(earliestDate(today), "2026-11-10"));
test("earliestDate crosses month end", () => assertEqual(earliestDate(new Date(2026, 10, 29)), "2026-12-02"));
test("valid order has no errors", () => assertEqual(Object.keys(validateOrder(ok, today)).length, 0));
test("phone with spaces accepted", () => assertEqual(validateOrder({ ...ok, contact: "0917 123 4567" }, today).contact, undefined));
test("phone with dashes accepted", () => assertEqual(validateOrder({ ...ok, contact: "0917-123-4567" }, today).contact, undefined));
test("+63 phone accepted", () => assertEqual(validateOrder({ ...ok, contact: "+639171234567" }, today).contact, undefined));
test("short phone rejected", () => assertEqual(typeof validateOrder({ ...ok, contact: "0917123" }, today).contact, "string"));
test("missing name rejected", ...);                       // name: "   "
test("name over 100 rejected", ...);                       // "x".repeat(101)
test("no items and no custom rejected", ...);              // items: [] -> errors.items
test("custom cake only is accepted", ...);                 // items: [], custom.design: "unicorn"
test("date 2 days ahead rejected", ...);                   // "2026-11-09" -> errors.dateNeeded
test("delivery without address rejected", ...);
test("pickup without address accepted", ...);
test("qty 51 rejected", ...);                              // errors.items
test("notes over 500 rejected", ...);
test("renderOrderLines skips sold out and makes one line per size", ...);
test("addToOrder sets 0 to 1", ...);
test("addToOrder keeps an existing 3", ...);               // Review Focus 4
```

- [ ] **Step 2: Open `tests.html`.** Expected: the new tests fail.

- [ ] **Step 3: Build the form in `index.html`** with fields per the spec table: name, contact (`type="tel"`), fbName, `#order-lines` container, Custom cake fieldset (occasion, size/servings, flavor, message on cake, design description), pickup/delivery radios, address (hidden unless delivery, with the delivery note), dateNeeded (`type="date"`), notes, honeypot `<input name="website" tabindex="-1" autocomplete="off">` hidden with CSS (not `type="hidden"`), and a Send button. Every input has a `<label>`. Add `maxlength` attributes matching Global Constraints.

- [ ] **Step 4: Implement** `earliestDate`, `normalizePhone`, `validateOrder`, `renderOrderLines`, `addToOrder`. On load, set the date input's `min` to `earliestDate(new Date())`. Toggle the address field on fulfillment change. "Order this" calls `addToOrder` on the first size line, then scrolls to that line. Errors show in a `.error` element under each field with `aria-describedby`.

- [ ] **Step 5: Reload `tests.html`.** Expected: all pass.

- [ ] **Step 6: Commit** — `git commit -am "feat: order form with validation"`

---

### Task 3: Submitting the order

**Files:**
- Modify: `script.js`, `tests.html`

**Interfaces:**
- Consumes: `validateOrder`, form field names from Task 2
- Produces:
  - `const APPS_SCRIPT_URL = ""` at the top of `script.js` (filled in Task 6)
  - `collectOrder(form: HTMLFormElement) -> Order` (shape above; trims strings; `contact` normalized; only `qty > 0` lines)
  - `submitOrder(order, fetchFn = fetch) -> Promise<boolean>`: POSTs `JSON.stringify(order)` to `APPS_SCRIPT_URL` with `Content-Type: text/plain;charset=utf-8` (a "simple" request, so Apps Script doesn't need CORS preflight). Resolves `true` only if the response JSON has `ok: true`. Network or parse errors resolve `false`.

- [ ] **Step 1: Write failing tests**

```js
test("collectOrder keeps only qty > 0 lines", ...);
test("collectOrder trims and normalizes contact", ...);    // " 0917 123 4567 " -> "09171234567"
test("submitOrder true on {ok:true}", async () =>
  assertEqual(await submitOrder(ok, async () => ({ json: async () => ({ ok: true }) })), true));
test("submitOrder false on network error", async () =>
  assertEqual(await submitOrder(ok, async () => { throw new Error("offline"); }), false));
test("submitOrder false on {ok:false}", ...);
test("send button disabled while sending", ...);           // Review Focus 1: fake fetch that never resolves; click twice; fake fetch called once
```

(Let `test` accept async functions and await them.)

- [ ] **Step 2: Open `tests.html`.** Expected: new tests fail.

- [ ] **Step 3: Implement** `collectOrder` and `submitOrder`, plus the submit handler: `preventDefault` → validate (show errors, focus the first bad field, stop) → disable the button and show "Sending…" → `submitOrder`. On `true`, replace the form with the success copy. On `false`, show the failure copy and Facebook link above the button, re-enable it, and leave every field as typed.

- [ ] **Step 4: Reload `tests.html`.** Expected: all pass.

- [ ] **Step 5: Commit** — `git commit -am "feat: submit order to Apps Script"`

---

### Task 4: Apps Script backend

**Files:**
- Create: `apps-script/Code.gs`, `apps-script/appsscript.json`

**Interfaces:**
- Consumes: Order JSON shape
- Produces:
  - `doPost(e) -> TextOutput` JSON `{ ok: true }` or `{ ok: false, error }`
  - `validateOrder_(order, today) -> string[]` (error list). Same rules as the site, date checked in Asia/Manila.
  - `safeCell_(value) -> string`: prefixes `'` when a string starts with `= + - @`
  - `orderRow_(order, now) -> any[]`: columns: Timestamp, Name, Contact, FB name, Items, Custom cake, Pickup/Delivery, Address, Date needed, Notes, Status (`"New"`). Items and custom are joined into readable text. Every user string goes through `safeCell_`.
  - `formatTelegramMessage_(order) -> string`: exact format from the spec, e.g.
    ```
    🎂 New order — Maria Santos, 09171234567
    1× Chocolate Cake (8-inch), 6× Ensaymada
    Delivery, Sat Nov 15
    Custom: occasion Birthday; message "Happy Birthday Lola"
    Notes: Less sweet please
    ```
    Lines for Custom and Notes appear only when not empty. Delivery adds the address on its own line.
  - `sendTelegram_(text) -> void`: `UrlFetchApp.fetch` to `https://api.telegram.org/bot<TOKEN>/sendMessage` with payload `{ chat_id, text }`. **No `parse_mode`.**
  - `selfCheck() -> void`: runs the asserts below and throws on the first failure.

- [ ] **Step 1: Write `selfCheck()` first**

```js
// assert(cond, label) helper; sample order like the site tests
assert(validateOrder_(sample, today).length === 0, "valid sample");
assert(validateOrder_({ ...sample, contact: "123" }, today).length > 0, "bad phone");
assert(validateOrder_({ ...sample, dateNeeded: "2026-11-09" }, today).length > 0, "too soon");
assert(validateOrder_({ ...sample, name: "x".repeat(101) }, today).length > 0, "long name");
assert(safeCell_("=HYPERLINK(\"x\")") === "'=HYPERLINK(\"x\")", "formula escaped");   // Review Focus 3
assert(safeCell_("+639171234567") === "'+639171234567", "plus escaped");
assert(safeCell_("Maria") === "Maria", "plain text unchanged");
assert(orderRow_(sample, now).length === 11 && orderRow_(sample, now)[10] === "New", "row shape");
const msg = formatTelegramMessage_({ ...sample, notes: "R&D <b> *_" });
assert(msg.startsWith("🎂 New order — Maria Santos, 09171234567"), "header line");
assert(msg.includes("R&D <b> *_"), "special chars kept raw");                       // Review Focus 5
assert(!formatTelegramMessage_({ ...sample, notes: "" }).includes("Notes:"), "empty notes omitted");
```

- [ ] **Step 2: Run `selfCheck` in the Apps Script editor** (Run ▸ selfCheck). Expected: throws "is not defined".

- [ ] **Step 3: Implement the functions above, then `doPost`:** parse `e.postData.contents` (bad JSON → `{ok:false}`). If `order.website` is non-empty, return `{ok:true}` and do nothing. Validate (errors → `{ok:false, error}`). Then `LockService.getScriptLock().waitLock(10000)` → append the row to the sheet named `Orders` (create it with a header row if missing) → release. Then `sendTelegram_` inside try/catch: log on failure, still return `{ok:true}`. Return through `ContentService.createTextOutput(JSON.stringify(...)).setMimeType(ContentService.MimeType.JSON)`. `appsscript.json`: `"timeZone": "Asia/Manila"`, `"runtimeVersion": "V8"`, and a web app section with `"executeAs": "USER_DEPLOYING"`, `"access": "ANYONE_ANONYMOUS"`.

- [ ] **Step 4: Run `selfCheck` again.** Expected: completes with no error.

- [ ] **Step 5: Commit** — `git add apps-script && git commit -m "feat: Apps Script backend for Sheet + Telegram"`

---

### Task 5: Look and feel

**Files:**
- Modify: `style.css`, `index.html` (class names only)

**Interfaces:**
- Consumes: class names from Tasks 1–3 (`.card`, `.tag`, `.sold-out`, `.error`)

- [ ] **Step 1: Write the styles,** following the spec's Design direction:
  - CSS variables `--brand` (placeholder `#c2185b`, swapped for her color in Task 6), `--cream: #fff8f0`, `--text: #3b2a24`
  - Phone-first: single column at 360px, menu grid of 2 columns from 600px and 3–4 from 900px
  - Top bar `position: sticky` with an "Order now" pill in `--brand`
  - `#bestsellers` is a sideways-scrolling row (`overflow-x: auto; scroll-snap-type: x mandatory`)
  - Card photos `aspect-ratio: 1; object-fit: cover`
  - `.sold-out` is greyed, with a "Sold out" tag
  - Buttons and inputs at least 44px tall, form inputs at least 16px font (stops iPhone zooming in)
  - Visible focus outlines, contrast at least 4.5:1 for text
- [ ] **Step 2: Check `index.html` in the browser at 360px, 768px and desktop widths.** Expected: no sideways page scroll, no text over photos, the top bar stays on screen, the Bestsellers row swipes.
- [ ] **Step 3: Reload `tests.html`.** Expected: still all pass.
- [ ] **Step 4: Commit** — `git commit -am "style: phone-first Annesweet design"`

---

### Task 6: Deploy and end-to-end test

**Files:**
- Create: `README.md`
- Modify: `script.js` (`APPS_SCRIPT_URL`), `index.html` (real contact details), `menu.js` and `photos/` (her real menu, when available), `style.css` (`--brand`)

- [ ] **Step 1: Write `README.md`** with beginner steps:
  1. Telegram: create a bot with @BotFather to get the token. She sends the bot a message. Get her chat ID from `https://api.telegram.org/bot<TOKEN>/getUpdates`.
  2. Google Sheet: create one, then Extensions ▸ Apps Script. Paste `Code.gs`, set `appsscript.json` (show manifest in Project Settings), and add Script Properties `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID`. Run `selfCheck`, then Deploy ▸ New deployment ▸ Web app (Execute as me, Anyone). Copy the URL.
  3. Paste the URL into `APPS_SCRIPT_URL` in `script.js`.
  4. GitHub: create the repo, push, then Settings ▸ Pages ▸ deploy from `main` / root.
  5. Editing the menu: change `menu.js` (sold out = `soldOut: true`), add the photo to `photos/` and compress it to under 200 KB (e.g. squoosh.app), then commit and push.
- [ ] **Step 2: Do steps 1–4 of the README** (needs the user and their mom's Google and Telegram accounts; the user does these steps, not an agent).
- [ ] **Step 3: End-to-end on the live URL:**
  - A valid order → Sheet row with Status "New" + Telegram message in the spec's format
  - Notes `=1+1` → shown as text in the Sheet
  - Honeypot filled (via devtools) → success shown, no row, no message
  - Airplane mode → failure message, fields kept
  - Expected: all four behave as described
- [ ] **Step 4: Check on a real Android and a real iPhone.** Expected: readable, date picker blocks the next 2 days, no zoom on input focus.
- [ ] **Step 5: Commit and push** — `git commit -am "chore: deploy config and README" && git push`
