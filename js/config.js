// Timing constants used by app.js. Change a value here to change the
// widget's timing everywhere it's used — nothing else needs editing.

const TRANSITION_MS = 130;               // offer fade-out before content swap
const REVEAL_CONFIRM_TIMEOUT_MS = 2500;  // "Reveal?" auto-cancels after this long
const REVEAL_RESET_TIMEOUT_MS = 2200;    // revealed brand auto-hides after this long
const COPY_RESET_TIMEOUT_MS = 1600;      // "Copied" label reverts to "Copy" after this long
const EXPLORE_COOLDOWN_MS = 10000;       // min time between exploration-count increments, per offer
const RESIZE_RECALC_DEBOUNCE_MS = 150;   // wait after the window stops resizing before re-measuring card height

const SHUFFLE_STORAGE_KEY = "que-widget:shuffle";                  // localStorage key for the saved shuffle position
const EXPLORE_STORAGE_KEY = "que-widget:explored";                 // localStorage key for saved exploration counts
const EXPLORE_COOLDOWN_STORAGE_KEY = "que-widget:explore-cooldown"; // localStorage key for per-offer cooldown timestamps
const EXPLORE_SEEN_STORAGE_KEY = "que-widget:explore-seen";        // localStorage key for offers this browser already registered

// Bump this whenever exploration data in offers.js changes in a way that
// makes old saved counts wrong (e.g. correcting fabricated starting
// numbers). On mismatch, app.js wipes all saved exploration data so every
// browser starts clean instead of carrying old values forward forever.
const EXPLORE_DATA_VERSION = 2;
const EXPLORE_VERSION_STORAGE_KEY = "que-widget:explore-version";

// "Suggest an offer" opens this URL in a new tab. Replace with your real
// form link (Tally, Google Form, Typeform, whatever) — nothing else needs
// to change.
const SUGGEST_FORM_URL = "https://YOUR-FORM-URL-HERE.com";
