# QUE

QUE is a brand-neutral discovery system — a tiny static widget for seeing
what you'd actually get and what it costs, one offer at a time, before you
know whose it is. "Offer" isn't limited to deals or discounts: it covers
products, services, subscriptions, and normal pricing plans — anything with
a clear "here's what you get, here's what it costs" shape. No ranked list,
no wall of competing logos.

The problem it's solving: brand recognition changes how people read the
same offer. A familiar logo can make an offer feel safer, an unfamiliar one
can make it feel riskier, regardless of what's actually in the offer. QUE
gives every offer the same even playing field — "what you're getting" and
"what it costs" first, brand revealed only once you've actually read it,
deliberately, in two clicks.

QUE doesn't rank, recommend, or sell placement — there's no pay-to-play:
offers within a category are shown in a random, non-repeating order (see
"How it works" below), and no offer can pay to appear more, appear first,
or skip that order. Anyone can submit an offer. Where QUE does make money,
it's usage-based — the current model charges providers per redirect, $10
per 1,000 redirects, not for visibility or a subscription (see "Commercial
model" below).

No build step, no framework, no dependencies. Just HTML, CSS, and vanilla JS
— open `index.html` and it runs.

## What's in the box

- **One offer at a time**, chosen from a shuffle-bag per category (every
  offer shown once before any repeat, then reshuffled — see below).
- **Category filter** — pills above the offer card, generated automatically
  from `offers.js`; their on-screen order is shuffled once per page load.
- **Hidden-brand reveal** — a small eye icon on the card; first click asks
  "Reveal?", second click confirms and shows the provider name for a few
  seconds before it hides itself again.
- **Next / Back** — click the buttons, or use the ArrowRight / ArrowLeft
  keys. Back replays your actual browsing history for the session, not just
  a random previous offer.
- **Copy** — grabs the current offer's "getting"/"costs" text to the
  clipboard.
- **Share** — copies a deep link straight to the current offer (see
  "Deep links" below).
- **Learn more** — opens the provider's real site in a new tab (the
  redirect QUE's usage-based costs are tied to, see "Commercial model"),
  and counts once toward that offer's "N have explored" number (see
  "Local storage").
- **Suggest an offer** — anyone can submit an offer via the link next to
  the QUE logo, which opens a separate external submission form (QUE
  itself has no form or backend).
- **Transparency panel** — the `?` button opens a full explanation of how
  QUE works, covers commercial relationships, exploration tracking,
  accuracy caveats, and corrections.
- **Scrollable long offers** — if a "getting" or "costs" list runs past a
  typical length, it scrolls within its own box (with a small arrow hint)
  instead of stretching the card.

## How it works

**Shuffle-bag randomization.** Within a category, `app.js` shuffles all
offer indices, then walks through that order one at a time — every offer is
shown exactly once before any repeat. When the bag runs out it reshuffles
for a new cycle, swapping the first pick if it would otherwise repeat the
last offer shown. This is genuinely random order, not a ranking: it doesn't
reflect quality, popularity, or payment.

**Category order.** The category pills are shuffled once when the page
loads (same shuffle helper as offers, separate array) and then left alone —
clicking Next, Back, or switching categories never reshuffles the nav.
`DEFAULT_CATEGORY` in `offers.js` still decides which category is *active*
on load, independently of where its pill lands in the shuffled row.

**Exploration tracking.** Each offer has an `explored` count, shown as "N
have explored". Clicking "Learn more" increments it — but only once ever
per offer per browser (a permanent local flag), and only after a 10-second
cooldown as a secondary guard. It's honest, browser-scoped bookkeeping, not
fraud-proof or unique-visitor verification; see "Local storage" below.

**Card sizing.** The getting/costs lists reserve height based on the
*typical* (median) offer in the category, not the longest one — so the
common case stays tight, and a genuinely longer-than-usual offer scrolls
within its own section (with a fade + arrow hint) instead of forcing dead
space on every shorter offer.

## Commercial model

QUE doesn't sell placement, ranking, or visibility — there's no
pay-to-play: no offer can pay to appear more often, appear first, or skip
the shuffle-bag described above.

Where money does come in: the current model charges providers per
redirect — a click that sends a visitor to their site via "Learn more" —
rather than a flat subscription or a fee tied to exposure. The current
rate is **$10 per 1,000 redirects**. Cost scales with traffic actually
delivered, not with how often an offer is shown or where it lands in the
shuffle. Any future sponsorship, affiliate relationship, or other
commercial arrangement gets disclosed in the `?` panel before it affects
anything user-facing.

This is the same signal exploration tracking already measures (see "Local
storage" below): the "Learn more" click that increments an offer's
`explored` count is the redirect a provider would be billed for. Today's
count is a simplified, browser-local proxy for that — not the actual
billing system.

## Deep links

The URL hash is always a link to whatever offer is on screen — it updates
(via `history.replaceState`, so it never adds browser-history entries or
interferes with Next/Back) every time the active offer changes, and it's
checked once on page load:

- **Valid hash** (`#AI%3AOpenAI`, i.e. an encoded `category:provider`) →
  that exact offer loads, in its category, first.
- **Missing or invalid hash** → falls back to a resumed session
  (`localStorage`, see below) or, failing that, a fresh random start.

The hash is just an encoded `offerKey(offer)` (`` `${category}:${provider}` ``,
the same identity string exploration tracking already keys by — see
`findOfferByHash`/`updateUrlHash` in `app.js`). Loading a deep link still
starts a normal shuffle-bag for that category — the linked offer is just
swapped into the first slot, so `current` and `shufflePos` agree and the
rest of the cycle is still genuinely random. Clicking **Share** copies this
same URL to the clipboard, so any offer is directly shareable.

## Files

```
index.html        Page structure and markup only. No inline CSS or JS.
css/
  styles.css       All styling.
js/
  offers.js        Category and offer data. The only file most edits touch.
  config.js        Timing constants (fade durations, timeouts).
  app.js           Application logic: state, rendering, event handling.
README.md          This file.
```

Each file has exactly one job. `index.html` never contains styling or
behavior; `styles.css` never contains markup or logic; `app.js` never
contains offer content; `offers.js` never contains behavior.

## Where do I...

**...add a new category?**
Open `js/offers.js` and add a new key to the `OFFERS` object:

```js
const OFFERS = {
  AI: [ /* ... */ ],
  GAMING: [
    {
      provider: "Spotify",
      category: "GAMING",
      getting: ["...", "..."],
      costs: ["Free", "Premium — $11.99/mo"],
      link: "https://www.spotify.com/premium/",
      explored: 0
    }
  ],
  // ...
};
```

That's it — the category filter, randomization, and rendering all pick this
up automatically. Nothing in `index.html` or `app.js` needs to change. If
the key wouldn't read well once auto-formatted into a pill label (it needs
an "&", mixed case like "FinTech", or a hyphen), add an entry for it to
`CATEGORY_LABELS` in the same file — see the current 10 categories there
for examples. A key with no `CATEGORY_LABELS` entry just gets its label
derived from the key itself (underscores → spaces, each word capitalized).

**...add a new offer to an existing category?**
Add another object to that category's array in `js/offers.js`, following the
same shape (`provider`, `category`, `getting`, `costs`, `link`, `explored`).
Always start `explored` at `0` — never a made-up number (see "Local storage").

**...remove a category or offer?**
Delete the entry from `js/offers.js` (and its `CATEGORY_LABELS` entry, if it
has one). An empty category array (e.g. `PRODUCTIVITY: []`) is fine — it
just won't show up in the category filter until it has at least one offer.
Currently only `AI` is populated; the other nine (`DEVELOPER_TOOLS`,
`DESIGN_CREATIVE`, `PRODUCTIVITY`, `MARKETING_SALES`, `FINTECH_CRYPTO`,
`ECOMMERCE_RETAIL`, `CONSUMER_ENTERTAINMENT`, `HEALTH_FITNESS`,
`SECURITY_PRIVACY`) are empty placeholders waiting for offers.

**...change the UI (layout, text, structure)?**
Edit `index.html`. It's the only place markup lives.

**...change the look (colors, spacing, fonts, animations)?**
Edit `css/styles.css`.

**...change behavior (randomization, transitions, timing, reveal logic)?**
Edit `js/app.js`. Timing values (how long a fade takes, how long "Copied"
stays on screen, the exploration-count cooldown, `localStorage` key names,
etc.) live in `js/config.js` — change the number there rather than hunting
for it in `app.js`.

**...change the keyboard shortcuts?**
Edit the single `document.addEventListener("keydown", ...)` block near the
bottom of `js/app.js` — it maps `ArrowRight` to `nextOffer()` and
`ArrowLeft` to `goBack()`.

**...change where "Suggest an offer" points?**
Edit `SUGGEST_FORM_URL` in `js/config.js`. QUE doesn't host or process the
form itself — that link just opens whatever URL is set there, in a new tab.

**...change the deep-link/share URL format?**
Edit `findOfferByHash`, `updateUrlHash`, and `buildShareUrl` in `js/app.js`
— all three read/write the same encoded `offerKey(offer)` string, so keep
them in sync if you change the format.

**...update the `?` transparency panel's text?**
Edit the `#helpPopover` markup in `index.html` — each topic is its own
`<section class="help-section">` with a title and a paragraph.

## Data model

```js
OFFERS = {
  CATEGORY_KEY: [
    {
      provider: "...",   // internal only — never rendered in the UI
      category: "...",   // must match the surrounding category key
      getting: ["...", "..."],
      costs: ["...", "..."],
      link: "https://...",
      explored: 0         // starting count, shown as "N have explored" — must
                          // start at 0, never a fabricated number
    }
  ]
}

DEFAULT_CATEGORY = "CATEGORY_KEY"  // which category shows on first load
```

`provider` is intentionally never read into the DOM — the whole point of
QUE is that you see the offer before the brand. `DEFAULT_CATEGORY` lives in
`offers.js` next to the data it depends on, so the two can't drift out of
sync. `explored` is just a starting value — see "Local storage" below for
how it actually changes at runtime.

This shape scales the same way at 6 offers or at 6,000 — nothing about
rendering, randomization, or the category filter assumes a particular size.
If offer data ever needs to come from an API instead of a hardcoded file,
only `offers.js` changes: it would fetch and populate `OFFERS` instead of
declaring it inline, and `app.js` wouldn't need to know the difference.

## Local storage

QUE keeps a few small things in the browser's `localStorage` (keys are
defined in `js/config.js`) so a refresh doesn't reset the experience:

- **Shuffle position** — which offer you're on in the current category's
  shuffle-bag cycle, so a refresh resumes instead of reshuffling.
- **Exploration counts** — each offer's `explored` number, so increments
  survive a refresh.
- **Exploration cooldown** — a per-offer timestamp blocking rapid repeat
  increments for 10 seconds (`EXPLORE_COOLDOWN_MS`).
- **Exploration "seen" flags** — the actual anti-duplicate protection: once
  this browser has registered an exploration for an offer, "Learn more"
  never increments that offer's count again, cooldown or not.
- **Exploration data version** (`EXPLORE_DATA_VERSION`) — if a future change
  to `offers.js` makes old saved counts wrong (e.g. correcting a starting
  number), bump this constant. On mismatch, `app.js` wipes all saved
  exploration data on that browser's next load instead of carrying stale
  values forward forever.

All of this is client-side bookkeeping for the MVP — it identifies a
*browser*, not a person. Clearing storage, using another browser, or
incognito mode resets it. It is **not** fraud prevention or unique-visitor
verification. Swapping in real tracking later means replacing the
`localStorage` reads/writes in `app.js` (`getExploreCount`,
`incrementExploreCount`, `hasExploredOffer`, etc.) with API calls — the
rest of the app doesn't need to change.

## How to run it

No build, no server required. Just open `index.html` in a browser.

If you'd rather serve it (some browsers restrict `fetch`/clipboard APIs on
`file://`), any static file server works, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## How to deploy it

It's five static files, no build or configuration — deploy the whole folder
anywhere that serves static files as-is (GitHub Pages, Netlify, Vercel, S3,
etc.).
