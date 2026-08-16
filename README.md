# QUE

A tiny static widget that shows one random offer at a time, grouped by
category, with the brand hidden until you choose to reveal it.

No build step, no framework, no dependencies. Just HTML, CSS, and vanilla JS.

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
  MUSIC: [
    {
      provider: "Spotify",
      category: "MUSIC",
      getting: ["...", "..."],
      costs: ["Free", "Premium — $11.99/mo"],
      link: "https://www.spotify.com/premium/"
    }
  ],
  // ...
};
```

That's it — the category filter, randomization, and rendering all pick this
up automatically. Nothing in `index.html` or `app.js` needs to change.

**...add a new offer to an existing category?**
Add another object to that category's array in `js/offers.js`, following the
same shape (`provider`, `category`, `getting`, `costs`, `link`).

**...remove a category or offer?**
Delete the entry from `js/offers.js`. An empty category array (`MUSIC: []`)
is fine — it just won't show up in the category filter until it has at
least one offer.

**...change the UI (layout, text, structure)?**
Edit `index.html`. It's the only place markup lives.

**...change the look (colors, spacing, fonts, animations)?**
Edit `css/styles.css`.

**...change behavior (randomization, transitions, timing, reveal logic)?**
Edit `js/app.js`. Timing values (how long a fade takes, how long "Copied"
stays on screen, etc.) live in `js/config.js` — change the number there
rather than hunting for it in `app.js`.

## Data model

```js
OFFERS = {
  CATEGORY_KEY: [
    {
      provider: "...",   // internal only — never rendered in the UI
      category: "...",   // must match the surrounding category key
      getting: ["...", "..."],
      costs: ["...", "..."],
      link: "https://..."
    }
  ]
}

DEFAULT_CATEGORY = "CATEGORY_KEY"  // which category shows on first load
```

`provider` is intentionally never read into the DOM — the whole point of
QUE is that you see the offer before the brand. `DEFAULT_CATEGORY` lives in
`offers.js` next to the data it depends on, so the two can't drift out of
sync.

This shape scales the same way at 6 offers or at 6,000 — nothing about
rendering, randomization, or the category filter assumes a particular size.
If offer data ever needs to come from an API instead of a hardcoded file,
only `offers.js` changes: it would fetch and populate `OFFERS` instead of
declaring it inline, and `app.js` wouldn't need to know the difference.

## How to run it

No build, no server required. Just open `index.html` in a browser.

If you'd rather serve it (some browsers restrict `fetch`/clipboard APIs on
`file://`), any static file server works, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## How to deploy it

It's three static files plus data — deploy it anywhere that serves static
files as-is (GitHub Pages, Netlify, Vercel, S3, etc.). There's nothing to
build or configure.
