# Annesweet Website — Design Spec

Date: 2026-11-07
Status: Draft, awaiting review

## Purpose

A free, phone-friendly website for **Annesweet**, a home bakery run by the builder's mom. Customers browse the menu and send an order request. She gets each request in a Google Sheet and as a Telegram message, then confirms the price and payment with the customer herself.

Builder goals: help her business, learn web development from zero, and have a portfolio piece. Making money from the site itself is not a goal.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Scope | Menu + order request form. No online payment. | She already confirms orders and payment by message. |
| Menu updates | The builder edits the site code. | Simplest. An admin page can come later. |
| Tech | Plain HTML/CSS/JavaScript, no framework. | Builder is a complete beginner. Fundamentals first. |
| Hosting | GitHub Pages (free). | ₱0, no server to run. |
| Backend | One Google Apps Script attached to her Google Sheet. | Free, she owns the data, keeps the Telegram token secret. |
| Order alerts | Google Sheet row + Telegram bot message. | Sheet is the record. Telegram is the instant alert. She will install Telegram. |

## The page (single page, phone-first)

1. **Header:** shop name "Annesweet", hero photo, tagline, "Order now" button that scrolls to the form. The top bar with the name and "Order now" stays visible while scrolling.
2. **Menu**
   - **Bestsellers:** 3 featured items shown first
   - Cards can carry a "Bestseller" or "New" tag
   - **Cakes:** 10 cards
   - **Pastries:** 4 cards
   - Each card shows a photo, name, short description and price. An item can be marked "Sold out", which greys out the card and removes it from the order form.
   - **Custom Cakes** card: "Want something special? Tell us in the order form." Links to the form.
3. **Why order from us:** 3–4 short points.
4. **How to order:** 3 steps (request → confirm and pay by message → pickup or delivery).
5. **Order request form** (see below)
6. **Footer:** contact number, Facebook page link, pickup area, and the note "Please order at least 3 days ahead (a week for custom cakes)."

Must look right on phone screens 360px wide and up, and on laptops.

## Design direction

Based on a look at Red Ribbon, Conti's, Magnolia Bakery, Milk Bar and Secret Recipe on 2026-11-07. Goldilocks and Bengawan Solo didn't load.

**Copy these:**
- **"Order now" button always visible** in a header that stays at the top while scrolling. Every site does this.
- **One strong brand color + warm cream background.** Red Ribbon uses red, Conti's green, Magnolia brown with lavender. Annesweet picks one main color and uses it for buttons and headings only.
- **The cake photos do the selling.** Big, appetizing photos with consistent framing: same angle, same plain background, square crop.
- **Small tags on cards:** "Bestseller", "New", "Sold out" (like Milk Bar's "NEW!" / "Limited time").
- **Featured row at the top of the menu:** 3 bestsellers before the full list (like Red Ribbon's "What's New").
- **Friendly, short text.** One sentence per item, no paragraphs.

**From small home bakeries** (Pink Delight Cakes, plus bakery-site roundups):
- **"Why order from us" in 3–4 short points** (e.g. baked fresh to order, custom designs, made at home with care).
- **"How to order" in 3 steps:** send a request → we message you to confirm and arrange payment → pick up or get it delivered.
- **"From ₱X" pricing** when an item comes in more than one size.
- **A button on each card** ("Order this") that jumps to the form with that item's quantity set to 1.

**From checking on a phone:**
- Red Ribbon's photos and carousel showed up **blank for a while** on a phone because the images are heavy. Annesweet keeps photos small (under ~200 KB) so cards never sit empty.
- Magnolia's headline over a busy photo is **hard to read**. Put text on a plain background, not on top of photos.
- Red Ribbon's **sideways-scrolling row** for "What's New" works well on a phone. Use it for the Bestsellers row.

**Avoid these:**
- Popups when the page opens (Conti's, Magnolia). They're annoying on phones.
- Auto-sliding photo carousels (Red Ribbon, Conti's, Secret Recipe). Use one hero photo instead.
- Crowded promo banners and lots of small text.

## Order request form

| Field | Required | Rules |
|---|---|---|
| Name | yes | max 100 characters |
| Contact number | yes | PH mobile format, e.g. `09XXXXXXXXX` or `+639XXXXXXXXX` |
| Facebook / Messenger name | no | max 100 characters |
| Items | at least one item **or** a custom cake request | a quantity box (0–50) next to each available menu item. An item with several sizes gets one line per size. |
| Custom cake request | no | occasion, size/servings, flavor, message on cake, design description. Each max 300 characters. |
| Pickup or delivery | yes | choosing delivery shows the address field and the note "Delivery is via Lalamove/Grab. The rider fee is paid by the customer." |
| Delivery address | only if delivery | max 300 characters |
| Date needed | yes | earliest is today + 3 days. No latest date. |
| Notes | no | max 500 characters |
| Honeypot field | hidden | must stay empty |

The site does not total prices or take payment.

**On submit:**
1. The browser checks the rules above and shows any problems next to their fields.
2. The page sends the order to the Apps Script web app.
3. Success: the form is replaced with "Thanks! Annesweet will message you to confirm your order and payment."
4. Failure: "Couldn't send — please try again or message us on Facebook" with a Facebook link. Everything the customer typed stays in the form.

## Apps Script (backend)

On each order it receives, the script:
1. Silently ignores the request if the honeypot field is filled in, but still reports success so bots learn nothing.
2. Re-checks the required fields and length limits. Never trust the browser alone.
3. Appends a row to the **Orders** tab: timestamp, name, contact, FB name, items, custom cake details, pickup/delivery, address, date needed, notes, and **Status** set to "New". She changes Status by hand to Confirmed or Done.
4. Sends a Telegram message to her chat, for example:
   ```
   🎂 New order — Maria Santos, 09171234567
   1× Chocolate Cake, 6× Ensaymada
   Delivery, Sat Nov 15
   Custom: "Happy Birthday Lola" on cake
   ```
5. If Telegram fails, the Sheet row is still kept and the error goes to the Apps Script log.

The Telegram bot token and chat ID are stored in Apps Script **Script Properties**, never in the website code.

## Files

```
index.html     page structure and menu content
style.css      look and layout
script.js      form checks and sending the order
photos/        menu photos (compressed, under ~200 KB each)
apps-script/Code.gs   backend script (kept in the repo for reference, pasted into Apps Script)
```

## Testing

- **Self-check in Code.gs:** one function that runs the Telegram message formatting and the field checks on sample orders and asserts the output.
- **End-to-end:** submit a test order from the live site, then confirm the Sheet row and the Telegram message arrive.
- **Bad input:** empty form, invalid phone number, date too soon, filled honeypot. Each must be blocked or ignored.
- **Real phones:** check the page on one Android and one iPhone before sharing the link.

## Not included (possible later)

"About the baker" section with her photo and story, admin page for menu edits, online payment (GCash/card), delivery fee calculation, photo upload for custom cakes, multiple pages, reviews, custom domain (~₱600/yr).

## Content needed from her before launch

- Names, descriptions and prices for the 10 cakes and 4 pastries
- A photo of each item, plus one hero photo, all shot the same way (same angle, plain background, daylight)
- Which 3 items are bestsellers- Size options and prices for items that come in more than one size
- A main brand color (e.g. her packaging or logo color)
- Contact number, Facebook page link, pickup area
- A Google account for the Sheet and Apps Script
- Telegram installed (to receive the bot's messages)
