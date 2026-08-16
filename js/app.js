// Shuffled once per page load, then left alone — the category nav order
// only changes on a fresh load, never when switching categories or
// clicking Next. Unrelated to offer randomization (see shuffleInPlace's
// other use below, for the offer shuffle-bag).
const availableCategories = shuffleInPlace(
  Object.keys(OFFERS).filter(key => OFFERS[key].length > 0)
);

// Exploration counts persist locally by "category:provider" key, so a
// refresh doesn't lose increments made this session. Offers without a
// stored count keep the starting value from offers.js.
function offerKey(offer) {
  return `${offer.category}:${offer.provider}`;
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
      saved.order.length !== OFFERS[saved.category].length ||
      saved.pos < 0 ||
      saved.pos >= saved.order.length
    ) {
      return null;
    }

    return saved;
  } catch (err) {
    return null;
  }
}

const savedShuffle = loadShuffleState();

let activeCategory;
let categoryOffers;
let current;

if (savedShuffle) {
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
const categoryFilterEl = document.getElementById("categoryFilter");
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
const helpBtn = document.getElementById("helpBtn");
const helpPopoverEl = document.getElementById("helpPopover");
const revealBtn = document.getElementById("revealBrand");
const revealIconMarkup = revealBtn.innerHTML;
const exploreCountEl = document.getElementById("exploreCount");
const suggestLinkEl = document.getElementById("suggestOffer");
suggestLinkEl.href = SUGGEST_FORM_URL;

function formatCategoryLabel(key) {
  return key
    .split("_")
    .map(word =>
      word.length <= 3 ? word : word[0] + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function renderCategoryFilter() {
  categoryFilterEl.innerHTML = availableCategories
    .map(key => {
      const active = key === activeCategory ? " is-active" : "";
      return `<li><button type="button" class="category-btn${active}" data-category="${key}">${formatCategoryLabel(key)}</button></li>`;
    })
    .join("");
}

function updateBackButton() {
  backBtn.disabled = history.length === 0;
  backBtn.classList.toggle("is-disabled", history.length === 0);
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
}

function transition(work) {
  if (animating) return;
  animating = true;

  gettingEl.classList.add("is-hidden");
  costsEl.classList.add("is-hidden");

  setTimeout(() => {
    work();
    updateBackButton();

    requestAnimationFrame(() => {
      gettingEl.classList.remove("is-hidden");
      costsEl.classList.remove("is-hidden");
      animating = false;
    });
  }, TRANSITION_MS);
}

function switchCategory(key) {
  if (
    key === activeCategory ||
    animating ||
    !OFFERS[key] ||
    OFFERS[key].length === 0
  ) {
    return;
  }

  transition(() => {
    history.push(snapshotState());
    applyState(key, startBag(OFFERS[key]));
  });
}

function goBack() {
  if (history.length === 0 || animating) return;

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

// Shows a bottom fade plus a small arrow next to the section's label, only
// when that list is actually tall enough to need scrolling — most offers
// never trigger this, it's a safety net for whichever ones end up longer
// than usual.
function updateScrollHint(listEl, fadeEl, arrowEl) {
  const isScrollable = listEl.scrollHeight > listEl.clientHeight + 1;
  fadeEl.classList.toggle("is-visible", isScrollable);
  arrowEl.classList.toggle("is-visible", isScrollable);
}

function render(index) {
  const offer = categoryOffers[index];

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

function openHelp() {
  helpPopoverEl.classList.add("is-open");
  helpPopoverEl.setAttribute("aria-hidden", "false");
  helpBtn.classList.add("is-active");
  helpBtn.setAttribute("aria-expanded", "true");
}

function closeHelp() {
  helpPopoverEl.classList.remove("is-open");
  helpPopoverEl.setAttribute("aria-hidden", "true");
  helpBtn.classList.remove("is-active");
  helpBtn.setAttribute("aria-expanded", "false");
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
helpBtn.addEventListener("click", toggleHelp);
revealBtn.addEventListener("click", handleRevealClick);

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
saveShuffleState();

window.addEventListener("pageshow", updateBackButton);

let resizeTimer = null;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(reserveOfferHeight, RESIZE_RECALC_DEBOUNCE_MS);
});

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    mainEl.classList.add("is-visible");
  });
});
