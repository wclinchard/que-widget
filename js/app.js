function loadPreviousCategoryOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_ORDER_STORAGE_KEY));
    return Array.isArray(saved) ? saved : null;
  } catch (err) {
    return null;
  }
}

function saveCategoryOrder(order) {
  try {
    localStorage.setItem(CATEGORY_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch (err) {
    // localStorage unavailable (e.g. private browsing) — nothing to do
  }
}

// Shuffles the category keys, retrying until no category lands in the same
// position it held last reload — a full derangement vs. the previous
// order, not just "a random shuffle that could coincidentally match". If
// the set of categories itself changed size since last time, there's
// nothing meaningful to compare against, so any shuffle is fine.
function shuffleCategoriesAvoidingRepeat(keys, previousOrder) {
  let order = shuffleInPlace(keys.slice());

  if (!previousOrder || previousOrder.length !== order.length) {
    return order;
  }

  let attempts = 0;
  while (order.some((key, i) => key === previousOrder[i]) && attempts < 100) {
    order = shuffleInPlace(keys.slice());
    attempts++;
  }

  return order;
}

// Every category shows in the nav, even ones with no offers yet — render()
// shows an empty-state message for those instead of an offer card. Shuffled
// once per page load, then left alone — the category nav order only
// changes on a fresh load, never when switching categories or clicking
// Next. Unrelated to offer randomization (see shuffleInPlace's other use
// below, for the offer shuffle-bag).
const availableCategories = shuffleCategoriesAvoidingRepeat(
  Object.keys(OFFERS),
  loadPreviousCategoryOrder()
);
saveCategoryOrder(availableCategories);

// Exploration counts persist locally by "category:provider" key, so a
// refresh doesn't lose increments made this session. Offers without a
// stored count keep the starting value from offers.js.
function offerKey(offer) {
  return `${offer.category}:${offer.provider}`;
}

// Deep-linking: the URL hash is just an encoded offerKey. Looked up once on
// load to pick a starting offer; kept in sync (via replaceState, so it
// never touches the browser's own history) whenever the active offer
// changes, so the address bar is always a shareable link to what's on
// screen.
function findOfferByHash() {
  const raw = location.hash.slice(1);
  if (!raw) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch (err) {
    return null;
  }

  for (const key of Object.keys(OFFERS)) {
    const index = OFFERS[key].findIndex(offer => offerKey(offer) === decoded);
    if (index !== -1) return { category: key, index };
  }

  return null;
}

function updateUrlHash(offer) {
  // No offer (e.g. an empty category) → fall back to no hash at all,
  // rather than silently leaving whatever offer's link was there before.
  // The address bar should never claim to point at an offer that isn't
  // actually on screen.
  const hash = offer ? "#" + encodeURIComponent(offerKey(offer)) : "";

  if (location.hash !== hash) {
    // window.history, not the bare `history` identifier — this file also
    // declares a top-level `history` (the back-navigation stack) that
    // shadows the global window.history for the rest of this script.
    window.history.replaceState(null, "", location.pathname + location.search + hash);
  }
}

function buildShareUrl(offer) {
  return `${location.origin}${location.pathname}#${encodeURIComponent(offerKey(offer))}`;
}

// If EXPLORE_DATA_VERSION has been bumped since this browser last saved
// anything, wipe all saved exploration data (counts, cooldowns, seen-flags)
// so it starts clean instead of carrying old/incorrect values forward.
function resetExploreDataIfOutdated() {
  try {
    const savedVersion = localStorage.getItem(EXPLORE_VERSION_STORAGE_KEY);

    if (savedVersion === String(EXPLORE_DATA_VERSION)) return;

    localStorage.removeItem(EXPLORE_STORAGE_KEY);
    localStorage.removeItem(EXPLORE_COOLDOWN_STORAGE_KEY);
    localStorage.removeItem(EXPLORE_SEEN_STORAGE_KEY);
    localStorage.setItem(EXPLORE_VERSION_STORAGE_KEY, String(EXPLORE_DATA_VERSION));
  } catch (err) {
    // localStorage unavailable (e.g. private browsing) — nothing to do
  }
}

function loadExploreCounts() {
  try {
    return JSON.parse(localStorage.getItem(EXPLORE_STORAGE_KEY)) || {};
  } catch (err) {
    return {};
  }
}

function applyStoredExploreCounts() {
  const stored = loadExploreCounts();

  Object.keys(OFFERS).forEach(key => {
    OFFERS[key].forEach(offer => {
      const count = stored[offerKey(offer)];
      if (typeof count === "number") {
        offer.explored = count;
      }
    });
  });
}

function saveExploreCount(offer) {
  try {
    const stored = loadExploreCounts();
    stored[offerKey(offer)] = offer.explored;
    localStorage.setItem(EXPLORE_STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    // localStorage unavailable (e.g. private browsing) — nothing to do
  }
}

// Per-offer cooldown so repeated "Learn more" clicks can't inflate the
// count. Rate-limited locally for now — swap this check for a server
// response later without touching anything that calls incrementExploreCount.
function loadExploreCooldowns() {
  try {
    return JSON.parse(localStorage.getItem(EXPLORE_COOLDOWN_STORAGE_KEY)) || {};
  } catch (err) {
    return {};
  }
}

function isExploreCountOnCooldown(offer) {
  const lastIncrement = loadExploreCooldowns()[offerKey(offer)];
  return typeof lastIncrement === "number" && Date.now() - lastIncrement < EXPLORE_COOLDOWN_MS;
}

function markExploreCooldown(offer) {
  try {
    const cooldowns = loadExploreCooldowns();
    cooldowns[offerKey(offer)] = Date.now();
    localStorage.setItem(EXPLORE_COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
  } catch (err) {
    // localStorage unavailable (e.g. private browsing) — nothing to do
  }
}

// The actual protection: once this browser has registered an exploration
// for an offer, it never counts again, no matter how many more times
// "Learn more" is clicked — this session, after a refresh, or on a future
// visit. This is client-side only (a cleared/incognito browser can explore
// again) — it's anti-duplicate bookkeeping for the MVP, not real fraud
// prevention or unique-visitor verification. Swap these two functions for
// a server-backed check later without touching anything else.
function loadExploreSeen() {
  try {
    return JSON.parse(localStorage.getItem(EXPLORE_SEEN_STORAGE_KEY)) || {};
  } catch (err) {
    return {};
  }
}

function hasExploredOffer(offer) {
  return !!loadExploreSeen()[offerKey(offer)];
}

function markOfferExplored(offer) {
  try {
    const seen = loadExploreSeen();
    seen[offerKey(offer)] = true;
    localStorage.setItem(EXPLORE_SEEN_STORAGE_KEY, JSON.stringify(seen));
  } catch (err) {
    // localStorage unavailable (e.g. private browsing) — nothing to do
  }
}

resetExploreDataIfOutdated();
applyStoredExploreCounts();

// Shuffle-bag randomization: shuffleOrder holds a random permutation of
// offer indices for the active category, and shufflePos points at the one
// currently shown. Every offer in the bag is shown exactly once before any
// repeats — when the bag runs out, it's reshuffled into a new cycle.
let shuffleOrder = [];
let shufflePos = 0;

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function shuffledIndices(length) {
  return shuffleInPlace(Array.from({ length }, (_, i) => i));
}

function startBag(offers) {
  shuffleOrder = shuffledIndices(offers.length);
  shufflePos = 0;
  return shuffleOrder[0];
}

function advanceBag() {
  shufflePos++;

  if (shufflePos >= shuffleOrder.length) {
    const lastIndex = shuffleOrder[shuffleOrder.length - 1];
    shuffleOrder = shuffledIndices(categoryOffers.length);

    if (shuffleOrder.length > 1 && shuffleOrder[0] === lastIndex) {
      [shuffleOrder[0], shuffleOrder[1]] = [shuffleOrder[1], shuffleOrder[0]];
    }

    shufflePos = 0;
  }

  return shuffleOrder[shufflePos];
}

function saveShuffleState() {
  try {
    localStorage.setItem(
      SHUFFLE_STORAGE_KEY,
      JSON.stringify({ category: activeCategory, order: shuffleOrder, pos: shufflePos })
    );
  } catch (err) {
    // localStorage unavailable (e.g. private browsing) — nothing to do
  }
}

function loadShuffleState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SHUFFLE_STORAGE_KEY));

    if (
      !saved ||
      !OFFERS[saved.category] ||
      !Array.isArray(saved.order) ||
      saved.order.length !== OFFERS[saved.category].length
    ) {
      return null;
    }

    // An empty category has no valid index into an empty order — pos must
    // be exactly 0 (meaning "no offer"), not caught by the pos < length
    // check below since 0 >= 0 would otherwise wrongly reject it.
    if (saved.order.length === 0) {
      return saved.pos === 0 ? saved : null;
    }

    if (saved.pos < 0 || saved.pos >= saved.order.length) {
      return null;
    }

    return saved;
  } catch (err) {
    return null;
  }
}

const hashMatch = findOfferByHash();
const savedShuffle = !hashMatch ? loadShuffleState() : null;

let activeCategory;
let categoryOffers;
let current;

if (hashMatch) {
  // A deep link always wins over a resumed session — someone followed a
  // specific link to see a specific offer. Start a fresh bag for that
  // category, then swap the linked offer into the first slot so what's on
  // screen matches shufflePos, and the rest of the cycle is still random.
  activeCategory = hashMatch.category;
  categoryOffers = OFFERS[activeCategory];
  startBag(categoryOffers);

  const posInBag = shuffleOrder.indexOf(hashMatch.index);
  if (posInBag > 0) {
    [shuffleOrder[0], shuffleOrder[posInBag]] = [shuffleOrder[posInBag], shuffleOrder[0]];
  }

  current = shuffleOrder[0];
} else if (savedShuffle) {
  activeCategory = savedShuffle.category;
  categoryOffers = OFFERS[activeCategory];
  shuffleOrder = savedShuffle.order;
  shufflePos = savedShuffle.pos;
  current = shuffleOrder[shufflePos];
} else {
  activeCategory = DEFAULT_CATEGORY;
  categoryOffers = OFFERS[activeCategory] || [];
  current = startBag(categoryOffers);
}

let history = [];
let animating = false;
let copyResetTimer = null;
let revealStage = "hidden";
let revealTimer = null;

const mainEl = document.querySelector("main");
const keyboardHintEl = document.getElementById("keyboardHint");
const categoryFilterEl = document.getElementById("categoryFilter");
const cardActionsEl = document.getElementById("cardActions");
const emptyStateEl = document.getElementById("emptyState");
const gettingSectionEl = document.getElementById("gettingSection");
const costsSectionEl = document.getElementById("costsSection");
const gettingEl = document.getElementById("getting");
const costsEl = document.getElementById("costs");
const gettingFadeEl = gettingEl.nextElementSibling;
const costsFadeEl = costsEl.nextElementSibling;
const gettingArrowEl = document.getElementById("gettingScrollHint");
const costsArrowEl = document.getElementById("costsScrollHint");
const learnMoreEl = document.getElementById("learnMore");
const nextBtn = document.getElementById("nextOffer");
const backBtn = document.getElementById("backOffer");
const copyBtn = document.getElementById("copyOffer");
const shareBtn = document.getElementById("shareOffer");
const helpBtn = document.getElementById("helpBtn");
const helpPopoverEl = document.getElementById("helpPopover");
const revealBtn = document.getElementById("revealBrand");
const revealIconMarkup = revealBtn.innerHTML;
const exploreCountEl = document.getElementById("exploreCount");
const suggestLinkEl = document.getElementById("suggestOffer");
suggestLinkEl.href = SUGGEST_FORM_URL;

function formatCategoryLabel(key) {
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];

  return key
    .split("_")
    .map(word =>
      word.length <= 3 ? word : word[0] + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function categoryPillHtml(key, active) {
  const activeClass = active ? " is-active" : "";
  return `<li><button type="button" class="category-btn${activeClass}" data-category="${key}">${formatCategoryLabel(key)}</button></li>`;
}

// The active category always pins to the far left, split from the rest by
// a divider — everything after it keeps its shuffled order from
// availableCategories, it's just filtered down to "not the active one".
function renderCategoryFilter() {
  const rest = availableCategories.filter(key => key !== activeCategory);

  categoryFilterEl.innerHTML =
    categoryPillHtml(activeCategory, true) +
    `<li class="category-divider header-divider" aria-hidden="true">|</li>` +
    rest.map(key => categoryPillHtml(key, false)).join("");

  // The active pill is always freshly pinned at the far left — make sure
  // it's actually in view instead of leaving the row scrolled wherever it
  // happened to be (e.g. after picking a pill that was scrolled off to
  // the right). Instant, not smooth: an animated scroll left in-flight
  // when the next tap lands gets read by mobile browsers as "stop
  // scrolling" and the tap is swallowed instead of hitting the pill
  // underneath — the widget looks stalled after the first switch.
  categoryFilterEl.scrollTo({ left: 0, behavior: "auto" });
}

// The next Back click would restore history's top entry — if that entry
// points at a category with no offers, there's nothing there to go back
// to, so Back stays disabled rather than dropping you into an empty card.
function nextBackTargetIsEmpty() {
  if (history.length === 0) return false;
  const target = history[history.length - 1];
  return OFFERS[target.category].length === 0;
}

function updateBackButton() {
  const disabled = history.length === 0 || nextBackTargetIsEmpty();
  backBtn.disabled = disabled;
  backBtn.classList.toggle("is-disabled", disabled);
}

function updateNextButton() {
  const noNextOffer = categoryOffers.length <= 1;
  nextBtn.disabled = noNextOffer;
  nextBtn.classList.toggle("is-disabled", noNextOffer);
}

function setRevealStage(stage) {
  revealStage = stage;
  clearTimeout(revealTimer);

  revealBtn.classList.remove("is-confirming", "is-revealed");

  if (stage === "confirm") {
    revealBtn.textContent = "Reveal?";
    revealBtn.classList.add("is-confirming");
    revealTimer = setTimeout(() => setRevealStage("hidden"), REVEAL_CONFIRM_TIMEOUT_MS);
  } else if (stage === "revealed") {
    const offer = categoryOffers[current];
    revealBtn.textContent = offer ? offer.provider : "";
    revealBtn.classList.add("is-revealed");
    revealTimer = setTimeout(() => setRevealStage("hidden"), REVEAL_RESET_TIMEOUT_MS);
  } else {
    revealBtn.innerHTML = revealIconMarkup;
  }
}

function handleRevealClick() {
  if (revealStage === "hidden") {
    setRevealStage("confirm");
  } else if (revealStage === "confirm") {
    setRevealStage("revealed");
  }
}

function snapshotState() {
  return {
    category: activeCategory,
    index: current,
    order: shuffleOrder.slice(),
    pos: shufflePos
  };
}

function applyState(category, index) {
  const categoryChanged = category !== activeCategory;

  activeCategory = category;
  categoryOffers = OFFERS[activeCategory];
  current = index;
  setRevealStage("hidden");

  if (categoryChanged) {
    reserveOfferHeight();
    renderCategoryFilter();
  } else {
    render(current);
  }

  saveShuffleState();
  updateUrlHash(categoryOffers[current]);
}

function transition(work) {
  if (animating) return;
  animating = true;

  gettingEl.classList.add("is-hidden");
  costsEl.classList.add("is-hidden");

  setTimeout(() => {
    work();
    updateBackButton();
    updateNextButton();

    requestAnimationFrame(() => {
      gettingEl.classList.remove("is-hidden");
      costsEl.classList.remove("is-hidden");
      animating = false;
    });
  }, TRANSITION_MS);
}

function switchCategory(key) {
  if (key === activeCategory || animating || !OFFERS[key]) return;

  transition(() => {
    history.push(snapshotState());
    applyState(key, startBag(OFFERS[key]));
  });
}

function goBack() {
  if (history.length === 0 || animating || nextBackTargetIsEmpty()) return;

  transition(() => {
    const target = history.pop();
    shuffleOrder = target.order;
    shufflePos = target.pos;
    applyState(target.category, target.index);
  });
}

// Exploration count, persisted to localStorage for now. Swap these two
// functions for calls to a real API later — nothing else in the app needs
// to change. incrementExploreCount is the only way the count changes, and
// it enforces both the one-per-offer rule and the cooldown itself, so
// every caller is protected the same way with no way to bypass it.
function getExploreCount(offer) {
  return offer.explored;
}

function incrementExploreCount(offer) {
  if (hasExploredOffer(offer)) return; // the actual protection — once per offer, ever
  if (isExploreCountOnCooldown(offer)) return; // secondary throttle, kept for rapid double-clicks

  offer.explored += 1;
  saveExploreCount(offer);
  markExploreCooldown(offer);
  markOfferExplored(offer);
}

function updateExploreCount(offer) {
  const count = getExploreCount(offer);
  const verb = count === 1 ? "has" : "have";
  exploreCountEl.textContent = `${count.toLocaleString()} ${verb} explored`;
}

// Shows the fade + arrow only while there's actually more to scroll to —
// re-checked against real scroll position (not just "is this scrollable
// at all"), otherwise the hint stayed on forever once a list became
// scrollable, permanently blurring the last item even once you'd
// scrolled all the way down to it.
function updateScrollHint(listEl, fadeEl, arrowEl) {
  const isScrollable = listEl.scrollHeight > listEl.clientHeight + 1;
  const atBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 1;
  const showHint = isScrollable && !atBottom;
  fadeEl.classList.toggle("is-visible", showHint);
  arrowEl.classList.toggle("is-visible", showHint);
}

function render(index) {
  const offer = categoryOffers[index];

  if (!offer) {
    emptyStateEl.hidden = false;
    cardActionsEl.hidden = true;
    gettingSectionEl.hidden = true;
    costsSectionEl.hidden = true;
    revealBtn.hidden = true;
    // Divider and the Back/Next row stay put — Back/Next manage their own
    // enabled state, so they're still how you navigate away from here.
    // Only "Learn more" hides, since there's no offer link to show.
    learnMoreEl.hidden = true;
    exploreCountEl.textContent = "";
    gettingEl.innerHTML = "";
    costsEl.innerHTML = "";
    return;
  }

  emptyStateEl.hidden = true;
  cardActionsEl.hidden = false;
  gettingSectionEl.hidden = false;
  costsSectionEl.hidden = false;
  revealBtn.hidden = false;
  learnMoreEl.hidden = false;

  gettingEl.innerHTML = offer.getting
    .map(item => `<li>${item}</li>`)
    .join("");

  costsEl.innerHTML = offer.costs
    .map(item => `<li>${item}</li>`)
    .join("");

  learnMoreEl.href = offer.link;
  updateExploreCount(offer);
  updateScrollHint(gettingEl, gettingFadeEl, gettingArrowEl);
  updateScrollHint(costsEl, costsFadeEl, costsArrowEl);
}

function nextOffer() {
  if (categoryOffers.length <= 1 || animating) return;

  transition(() => {
    history.push(snapshotState());
    applyState(activeCategory, advanceBag());
  });
}

function buildOfferText(offer) {
  const getting = offer.getting.map(item => `- ${item}`).join("\n");
  const costs = offer.costs.map(item => `- ${item}`).join("\n");
  return `What you're getting:\n${getting}\n\nWhat it costs:\n${costs}`;
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // fall through to legacy fallback below
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.spellcheck = false;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch (err) {
    return false;
  }
}

async function copyOffer() {
  const offer = categoryOffers[current];
  if (!offer) return;

  const copied = await copyText(buildOfferText(offer));
  if (!copied) return;

  copyBtn.textContent = "Copied";
  copyBtn.classList.add("is-copied");

  clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    copyBtn.textContent = "Copy";
    copyBtn.classList.remove("is-copied");
  }, COPY_RESET_TIMEOUT_MS);
}

let shareResetTimer = null;

async function shareOffer() {
  const offer = categoryOffers[current];
  if (!offer) return;

  const copied = await copyText(buildShareUrl(offer));
  if (!copied) return;

  shareBtn.textContent = "Copied";
  shareBtn.classList.add("is-copied");

  clearTimeout(shareResetTimer);
  shareResetTimer = setTimeout(() => {
    shareBtn.textContent = "Share";
    shareBtn.classList.remove("is-copied");
  }, COPY_RESET_TIMEOUT_MS);
}

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Reserves a fixed height for the getting list and the costs list
// separately, based on the *typical* (median) offer in the active
// category — not the tallest one. Sizing to the tallest offer guarantees
// dead space inside every shorter offer's box; sizing to the median keeps
// the common case tight, and a genuinely longer-than-usual offer just
// scrolls within its own section (see the scroll-fade hint) instead of
// forcing slack on everyone else.
//
// Fixing each section's own height — not just the card's overall height —
// is what keeps "WHAT IT COSTS" anchored at the same position for every
// offer. Always resets first so it re-measures at the current viewport
// width — callers never need to remember to reset it themselves.
function reserveOfferHeight() {
  gettingEl.style.height = "";
  costsEl.style.height = "";

  if (categoryOffers.length === 0) {
    render(current); // shows the empty-state message — nothing to measure
    return;
  }

  const gettingHeights = [];
  const costsHeights = [];

  for (let i = 0; i < categoryOffers.length; i++) {
    render(i);
    // getBoundingClientRect is sub-pixel precise, unlike the rounded
    // scrollHeight — using scrollHeight here let a couple of offers render
    // fractionally taller than the reserved height, resizing the section.
    gettingHeights.push(gettingEl.getBoundingClientRect().height);
    costsHeights.push(costsEl.getBoundingClientRect().height);
  }

  gettingEl.style.height = median(gettingHeights) + "px";
  costsEl.style.height = median(costsHeights) + "px";
  render(current);
}

function saveHelpOpenState(isOpen) {
  try {
    localStorage.setItem(HELP_OPEN_STORAGE_KEY, isOpen ? "1" : "0");
  } catch (err) {
    // localStorage unavailable (e.g. private browsing) — nothing to do
  }
}

function loadHelpOpenState() {
  try {
    return localStorage.getItem(HELP_OPEN_STORAGE_KEY) === "1";
  } catch (err) {
    return false;
  }
}

function openHelp() {
  helpPopoverEl.classList.add("is-open");
  helpPopoverEl.setAttribute("aria-hidden", "false");
  helpBtn.classList.add("is-active");
  helpBtn.setAttribute("aria-expanded", "true");
  saveHelpOpenState(true);
}

function closeHelp() {
  helpPopoverEl.classList.remove("is-open");
  helpPopoverEl.setAttribute("aria-hidden", "true");
  helpBtn.classList.remove("is-active");
  helpBtn.setAttribute("aria-expanded", "false");
  saveHelpOpenState(false);
}

function toggleHelp() {
  if (helpPopoverEl.classList.contains("is-open")) {
    closeHelp();
  } else {
    openHelp();
  }
}

nextBtn.addEventListener("click", nextOffer);
backBtn.addEventListener("click", goBack);
copyBtn.addEventListener("click", copyOffer);
shareBtn.addEventListener("click", shareOffer);
helpBtn.addEventListener("click", toggleHelp);
revealBtn.addEventListener("click", handleRevealClick);

gettingEl.addEventListener("scroll", () =>
  updateScrollHint(gettingEl, gettingFadeEl, gettingArrowEl)
);
costsEl.addEventListener("scroll", () =>
  updateScrollHint(costsEl, costsFadeEl, costsArrowEl)
);

document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

  // Without this, if focus happens to be on something inside the
  // horizontally-scrollable category nav (e.g. after clicking a pill),
  // the browser's own default arrow-key behavior scrolls that nav
  // sideways *in addition to* Next/Back firing — two things moving at
  // once from one keypress.
  event.preventDefault();

  if (event.key === "ArrowRight") {
    nextOffer();
  } else {
    goBack();
  }
});

learnMoreEl.addEventListener("click", () => {
  const offer = categoryOffers[current];
  if (!offer) return;
  incrementExploreCount(offer);
  updateExploreCount(offer);
});

document.addEventListener("click", event => {
  if (!helpPopoverEl.classList.contains("is-open")) return;
  if (event.target === helpBtn || helpPopoverEl.contains(event.target)) {
    return;
  }
  closeHelp();
});

categoryFilterEl.addEventListener("click", event => {
  const btn = event.target.closest(".category-btn");
  if (!btn) return;
  switchCategory(btn.dataset.category);
});

renderCategoryFilter();
render(current);
reserveOfferHeight();
updateBackButton();
updateNextButton();
saveShuffleState();
updateUrlHash(categoryOffers[current]);

// Restored before the reveal below, so the panel is already in its right
// state by the time the widget fades in — no separate pop-open animation.
if (loadHelpOpenState()) {
  openHelp();
}

window.addEventListener("pageshow", () => {
  updateBackButton();
  updateNextButton();
});

let resizeTimer = null;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(reserveOfferHeight, RESIZE_RECALC_DEBOUNCE_MS);
});

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    mainEl.classList.add("is-visible");
    keyboardHintEl.classList.add("is-visible");
  });
});
