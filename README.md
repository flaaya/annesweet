# Annesweet website

A small bakery site (four main pages plus Terms and Privacy). Customers pick items and send an order. The order lands in a Google Sheet and a Telegram message pops up on the owner's phone.

- The website is plain files (HTML, CSS, JavaScript) hosted free on GitHub Pages.
- The orders go to a small Google Apps Script (a tiny program that lives inside the Google Sheet).

**The pages** (each is a complete file; the top bar and footer are copied into every page, so change them in each one. Home, Terms and Privacy share the newer footer with the logo; Home alone has the search, saved-cakes and order icons in its top bar):

| Page | What's on it |
|---|---|
| `index.html` | Home: big photo and headline, the three most-ordered cakes, custom cakes, how ordering works |
| `menu.html` | The full menu (cakes and pastries) with Add buttons |
| `custom.html` | Custom cakes: what to tell us, and a button to the order form |
| `ideas.html` | Ideas for your custom cake: a photo gallery linked from the top menu and from the Custom cakes page |
| `order.html` | The order request form |
| `terms.html` | Terms and conditions (has `<!-- OWNER: ... -->` notes to settle, see below) |
| `privacy.html` | Privacy policy |

The menu itself lives in `menu.js` (shown on Home and Menu, and as the item list in the order form). Items added with **Add** are remembered while the browser tab is open and appear in the form on `order.html`.

You do not need to know how to code. Follow the steps in order. Take your time.

**Who owns what:** the bakery owner (Mom) should own the Google account that holds the Sheet, and the Telegram account that gets the alerts. Do steps 1 and 2 while signed in as her.

## Before you start: things to swap before launch

Open each file in any text editor. Use "find" (Ctrl+F or Cmd+F) to locate the text.

| File | Look for | Change to |
|---|---|---|
| `script.js` | `APPS_SCRIPT_URL = ""` (top of file) | The web app URL from step 2 (item 8) |
| `script.js` | `FACEBOOK_URL = "https://facebook.com/"` | The bakery's real Facebook page link. It is shown if an order fails to send, so it must match the footer link |
| Every page | `Contact: 09XX XXX XXXX` (bottom, in the footer) | The real contact number |
| Every page | `<a href="https://facebook.com/" ...>Facebook</a>` (footer) | The same Facebook link as in `script.js` |
| Every page | `Pickup area: to be announced` (footer) | The real pickup area |
| `menu.js` | Each item's `description` and prices | Check the wording and prices are right |
| `photos/draft/` | Every `.jpg` | Real photos of Annesweet's cakes (see below) |
| Every page | `Draft photos: Unsplash` (footer) | Delete this line once the real photos are in |
| `photos/logo.png`, `photos/favicon.png`, `photos/apple-touch-icon.png` | The Annesweet logo (a circular crop of the AnneSweet badge: chef, ribbon, "Bespoke cakes and cupcakes") and the small browser-tab icon made from it | A larger or cleaner file of the logo if you have one: save it with the **same names** (logo 240x240 or bigger, favicon 64x64, apple-touch-icon 180x180) |
| `menu.js` | Every cake's `10-inch` price (the 8-inch price is the old single price; each 10-inch price is about 30% more, rounded, and is a draft) | The real 10-inch prices. Pastries stay as a box of 6 |
| `terms.html` | Each `<!-- OWNER: confirm ... -->` note | Decide the deposit/payment rule, the cancellation and refund policy, and what to say about allergens; rewrite the sentence under each note, then delete the note |
| `privacy.html` | `<!-- OWNER: confirm the site is hosted on GitHub Pages -->` | Keep the sentence if the site is on GitHub Pages; change the host name if not |

The colors are set at the top of `style.css`: `--paper` (the cream page), `--linen` (photo plates), `--ink: #290A08` (text and the dark button) and `--blush` (the one pink touch). The dark-mode versions sit just below them.

**Photos.** The pictures in `photos/draft/` are free stand-ins from Unsplash (listed in `photos/draft/SOURCES.txt`), not Annesweet's cakes. Replace each one with a real photo **using the same file name**, and nothing else needs changing:
- `hero.jpg`: the big picture on Home (shown landscape on phones, square on computers)
- one per menu item, named after the item's `id` (`chocolate-cake.jpg`, `ube-cake.jpg`, ... `cupcakes.jpg`)
- `custom.jpg` (custom cakes), `kitchen.jpg` and `cake-box.jpg` (how ordering works)
- `custom-1.jpg` to `custom-4.jpg`: the "Ideas for your custom cake" page, `ideas.html` (portrait, 4:5). Also change the captions and `alt` text in `ideas.html` to match. Real Annesweet custom cakes are best here

Photo tips: square (except the hero, about 4:3), under about 200 KB each (shrink them free at squoosh.app), no text on them, and shot the same way (same angle, plain light background, daylight). When they're all real, you can rename the folder from `photos/draft/` to `photos/`, but then every `photos/draft/` in `menu.js` and the four pages must change too, so it's simpler to leave it.

## Step 1. Telegram bot (so Mom gets alerts)

1. In Telegram, search for **@BotFather** (the official one has a blue check) and open it.
2. Send `/newbot`. Pick a display name, then a username ending in `bot`.
3. BotFather replies with a **token**, a long text like `123456:ABC...`. Copy it somewhere private.
4. **Never paste the token into the website files, GitHub, or a chat.** Anyone with it can control the bot. It only goes into Script Properties in step 2.
5. Mom opens her new bot in Telegram and sends it any message (for example "hi"). This must happen first, or the next step shows nothing.
6. In a browser, open `https://api.telegram.org/bot<TOKEN>/getUpdates`, replacing `<TOKEN>` with the token (no `<` `>` characters, and keep the word `bot` before it).
7. Find `"chat":{"id":123456789,...`. That number is the **chat ID**. Copy it. (If the page shows `"result":[]`, Mom has not messaged the bot yet. Do step 5 and reload.)

## Step 2. Google Sheet and Apps Script

1. As Mom, go to sheets.google.com and create a blank spreadsheet. Name it "Annesweet Orders".
2. **Create the script from inside the Sheet**, so it is attached to it: click **Extensions ▸ Apps Script**. Do not start it from script.google.com.
3. Delete everything in the code box. Open `apps-script/Code.gs` from this project, copy all of it, paste it in, and click the save icon.
4. Click the gear icon (**Project Settings**) on the left. Tick **Show "appsscript.json" manifest file in editor**.
5. Go back to the **Editor** (the `< >` icon). Click `appsscript.json` in the file list, delete everything in it, and paste the contents of `apps-script/appsscript.json`:

   ```json
   {
     "timeZone": "Asia/Manila",
     "runtimeVersion": "V8",
     "exceptionLogging": "STACKDRIVER",
     "webapp": {
       "executeAs": "USER_DEPLOYING",
       "access": "ANYONE_ANONYMOUS"
     }
   }
   ```
   Save.
6. Back in **Project Settings**, scroll to **Script Properties** and click **Add script property**. Add two:
   - `TELEGRAM_TOKEN` = the token from step 1
   - `TELEGRAM_CHAT_ID` = the chat ID from step 1

   Click **Save script properties**. Spell the names exactly as shown.
7. Go to the Editor, open `Code.gs`, choose **selfCheck** in the function dropdown at the top, and click **Run**.
   - **Google will ask to authorise access. This is expected**: the script needs permission to edit the Sheet and send web requests. Click **Review permissions**, pick Mom's account, then **Advanced ▸ Go to (project name) (unsafe) ▸ Allow**. The "unsafe" warning appears because we wrote the script ourselves and Google hasn't reviewed it.
   - Open **Execution log** at the bottom. It should say it finished with no errors.
   - Optional, for a developer with Node installed: `node -e "require('./apps-script/Code.gs').selfCheck()"` runs the same check in a terminal.
8. Click **Deploy ▸ New deployment**. Click the gear next to "Select type" and choose **Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy**. Copy the **Web app URL** (it ends in `/exec`).
9. The **Orders** tab is created automatically with the first order, with columns B to K set to plain text. If an "Orders" tab already exists, select columns B to K, then **Format ▸ Number ▸ Plain text**. Otherwise phone numbers lose their leading 0.

**Changing Code.gs later:** the live site keeps running the old code until you publish a new version. Click **Deploy ▸ Manage deployments ▸ the pencil (Edit) ▸ Version: New version ▸ Deploy**. The URL stays the same.

## Step 3. Connect the website to the Sheet

1. Open `script.js`. At the top, change `let APPS_SCRIPT_URL = "";` to `let APPS_SCRIPT_URL = "https://script.google.com/macros/s/.../exec";` using your URL. Keep the quotes and the semicolon.
2. Swap everything else in the "things to swap" table above.

## Step 4. Put the site online (GitHub Pages)

1. Create a free account at github.com and click **New repository**. Name it, set it **Public**, and create it.
2. Upload or push the project files to it (the repo's `main` branch).
3. In the repo, go to **Settings ▸ Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to `main` and folder `/ (root)`, then **Save**.
4. After a minute or two the page shows your site address, like `https://yourname.github.io/repo-name/`.

## Step 5. Check that it works

Open `tests.html` in a browser first. It should say **"N passed, 0 failed"** (N is a number, such as 96). If anything fails, stop and fix that before going on.

Then, on the live site address, test each of these:

1. **A valid order.** Fill in everything and send. Expected: a new row in the Orders tab with Status "New", and a Telegram message to Mom in this style: `🎂 New order — Name, contact`, then the items, then `Pickup, Mon Nov 16` (day and date).
2. **Notes `=1+1`.** Send an order with `=1+1` in Notes. Expected: the Sheet shows it as text, not as the number 2.
3. **Spam trap.** Open the browser's developer tools (F12), fill in the hidden `website` field (`<input class="hp" name="website">`), and send. Expected: the site says success, but there is no new row and no Telegram message.
4. **A `+63` phone number.** Send an order with the contact `+63 917 123 4567`. Expected: the Sheet's Contact cell shows `09171234567` (no leading `'` or `+`), and the Telegram message shows the same number.
5. **No internet.** Turn on airplane mode and send. Expected: a failure message that shows the Facebook link, and everything typed is still in the form.

Then check on a **real Android phone and a real iPhone**:
- The text is readable.
- The date picker will not let you choose today or the next 2 days.
- The page does not zoom in when you tap a field.
- Tap **Add** on the Menu page, then **Order** in the top bar: the item is already filled in on the form.
- After a successful order, go back to the Menu: the bottom bar is gone (the saved items were cleared).

## Editing the menu day to day

Open `menu.js`. Each item is one line like this:

```js
{ id: "ube-cake", name: "Ube Cake", category: "cake", description: "...", photo: "photos/draft/ube-cake.jpg", sizes: [{ label: "8-inch", price: 900 }], tags: ["Bestseller"], soldOut: false },
```

- **Sold out:** change `soldOut: false` to `soldOut: true`. Change it back when it's available again.
- **Tags:** the little labels on a card, for example `tags: ["Bestseller"]` or `tags: ["New", "Bestseller"]`. Use `tags: []` for none. Items tagged `"Bestseller"` are the ones shown on Home under "Most-ordered cakes" (three looks best).
- **The pop-up window:** clicking a cake's photo or name opens a window with a bigger photo, the description, the size choice (8-inch / 10-inch), the price and an Add button. To fill in more about a cake, add any of these to its line in `menu.js` (only what is true for that cake): `ingredients: "Flour, sugar, eggs, ..."`, `contains: "Wheat, eggs, milk"` (allergens) and `calories: "About 380 per slice"`. A line only appears once it is filled in, so nothing shows until she is sure of it. Allergen details are worth getting exactly right.
- **Add a size:** every cake now has `8-inch` and `10-inch`. To add another, put `{ label: "6-inch", price: 650 }` inside `sizes: [ ... ]`, separated by a comma.
- **New item:** copy a whole line, give it a new unique `id`, and edit the rest. Add its photo to `photos/draft/` first, named after the `id`.
- Keep every comma, quote and bracket. If the menu disappears, a comma or quote went missing.

Then save and publish: on GitHub, open the file, click the pencil, edit, and click **Commit changes** (or `git commit` and `git push` if you use the command line). GitHub Pages updates in a minute or two. Reload the page (hold Shift when you click reload) to see it.

## Motion

The site moves a little, on purpose, and only once per element:
- **Home, Menu, Custom cakes, Ideas:** headline words rise into place, blocks fade up as they scroll into view, photos unveil, and the pink swatch behind "date." wipes in.
- **Everywhere:** buttons slide a pink layer in on hover, Add buttons lift and press, photos zoom slowly inside their frame, the heart and the cart count pop when something is added, and pages crossfade when you click between them. On big screens the Home slides settle into place as you scroll.
- **Turned off automatically** for anyone whose phone or computer is set to "reduce motion". The styles are in the `Motion` section of `style.css`, and the small script is at the end of `script.js` (`initMotion`).
- To remove it all, delete the `<script>` line that mentions `js-anim` in the `<head>` of those four pages: nothing is hidden or moved without it.
