const availableCategories = Object.keys(OFFERS).filter(
  key => OFFERS[key].length > 0
);

let activeCategory = DEFAULT_CATEGORY;
let categoryOffers = OFFERS[activeCategory] || [];
let current = Math.floor(Math.random() * categoryOffers.length);
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
    revealTimer = setTimeout(() => setRevealStage("hidden"), 2500);
  } else if (stage === "revealed") {
    const offer = categoryOffers[current];
    revealBtn.textContent = offer ? offer.provider : "";
    revealBtn.classList.add("is-revealed");
    revealTimer = setTimeout(() => setRevealStage("hidden"), 2200);
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
  }, 130);
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
    history.push({ category: activeCategory, index: current });
    applyState(key, Math.floor(Math.random() * OFFERS[key].length));
  });
}

function goBack() {
  if (history.length === 0 || animating) return;

  transition(() => {
    const target = history.pop();
    applyState(target.category, target.index);
  });
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
}

function nextOffer() {
  if (categoryOffers.length <= 1 || animating) return;

  transition(() => {
    history.push({ category: activeCategory, index: current });

    let next;

    do {
      next = Math.floor(Math.random() * categoryOffers.length);
    } while (next === current);

    applyState(activeCategory, next);
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
  }, 1600);
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

window.addEventListener("pageshow", updateBackButton);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    mainEl.classList.add("is-visible");
  });
});
