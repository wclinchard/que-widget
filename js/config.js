// Timing constants used by app.js. Change a value here to change the
// widget's timing everywhere it's used — nothing else needs editing.

const TRANSITION_MS = 130;               // offer fade-out before content swap
const REVEAL_CONFIRM_TIMEOUT_MS = 2500;  // "Reveal?" auto-cancels after this long
const REVEAL_RESET_TIMEOUT_MS = 2200;    // revealed brand auto-hides after this long
const COPY_RESET_TIMEOUT_MS = 1600;      // "Copied" label reverts to "Copy" after this long
const EXPLORE_COOLDOWN_MS = 10000;       // min time between exploration-count increments, per offer

const SHUFFLE_STORAGE_KEY = "que-widget:shuffle";                  // localStorage key for the saved shuffle position
const EXPLORE_STORAGE_KEY = "que-widget:explored";                 // localStorage key for saved exploration counts
const EXPLORE_COOLDOWN_STORAGE_KEY = "que-widget:explore-cooldown"; // localStorage key for per-offer cooldown timestamps
const EXPLORE_SEEN_STORAGE_KEY = "que-widget:explore-seen";        // localStorage key for offers this browser already registered
