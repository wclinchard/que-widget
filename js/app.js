const availableCategories = Object.keys(OFFERS).filter(
  key => OFFERS[key].length > 0
);

// Shuffle-bag randomization: shuffleOrder holds a random permutation of
// offer indices for the active category, and shufflePos points at the one
// currently shown. Every offer in the bag is shown exactly once before any
// repeats — when the bag runs out, it's reshuffled into a new cycle.
let shuffleOrder = [];
let shufflePos = 0;

function shuffledIndices(length) {
  const order = Array.from({ length }, (_, i) => i);

  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return order;
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
const offerBodyEl = document.getElementById("offerBody");
const gettingEl = document.getElementById("getting");
const costsEl = document.getElementById("costs");
const learnMoreEl = document.getElementById("learnMore");
const nextBtn = document.getElementById("nextOffer");
const backBtn = document.getElementById("backOffer");
const copyBtn = document.getElementById("copyOffer");
const helpBtn = document.getElementById("helpBtn");
const helpPopoverEl = document.getElementById("helpPopover");
const revealBtn = document.getElementById("revealBrand");
const revealIconMarkup = revealBtn.innerHTML;
const exploreCountEl = document.getElementById("exploreCount");

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
    offerBodyEl.style.minHeight = "";
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

// Local, in-memory exploration count. Swap these two functions for calls to
// a real API later — nothing else in the app needs to change.
function getExploreCount(offer) {
  return offer.explored;
}

function incrementExploreCount(offer) {
  offer.explored += 1;
}

function updateExploreCount(offer) {
  exploreCountEl.textContent = `${getExploreCount(offer).toLocaleString()} have explored`;
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

function reserveOfferHeight() {
  let max = 0;

  for (let i = 0; i < categoryOffers.length; i++) {
    render(i);
    max = Math.max(max, offerBodyEl.scrollHeight);
  }

  offerBodyEl.style.minHeight = max + "px";
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

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    mainEl.classList.add("is-visible");
  });
});
