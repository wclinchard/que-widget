// QUE offer data.
//
// Structure: category -> collection of offers.
// The app picks a category, then a random offer within it.
//
// Provider name is internal only and must NEVER be rendered in the UI —
// it exists purely for editorial reference (e.g. spotting duplicates).
//
// To add a new offer to an existing category, add an object to that
// category's array. To add a new category, add a new `KEY: [...]` entry —
// nothing else in this file or index.html needs to change. If the key
// itself wouldn't read well as a pill label once auto-formatted (e.g. it
// needs an "&", mixed case like "FinTech", or a hyphen), add an entry to
// CATEGORY_LABELS below — otherwise the label is just derived from the key.
//
// CATEGORY_LABELS: key -> exact display text for the category pill.
// Optional — any key without an entry here just gets its label derived
// from the key (underscores become spaces, each word capitalized).
const CATEGORY_LABELS = {
  AI: "AI",
  DEVELOPER_TOOLS: "Developer Tools",
  DESIGN_CREATIVE: "Design & Creative",
  PRODUCTIVITY: "Productivity",
  MARKETING_SALES: "Marketing & Sales",
  FINTECH_CRYPTO: "FinTech & Crypto",
  ECOMMERCE_RETAIL: "E-commerce & Retail",
  CONSUMER_ENTERTAINMENT: "Consumer & Entertainment",
  HEALTH_FITNESS: "Health & Fitness",
  SECURITY_PRIVACY: "Security & Privacy"
};
//
// Offer shape:
// {
//   provider: "...",   // internal only, never shown in the UI
//   category: "...",   // must match the surrounding category key
//   getting: [...],
//   costs: [...],
//   link: "...",
//   explored: 0         // starts at 0 — never fabricate a number here. Shown as
//                        // "N have explored" and incremented only by real
//                        // "Learn more" clicks (see js/app.js). Swap this for a
//                        // real shared count later without changing how it's
//                        // displayed.
// }

const OFFERS = {
  AI: [
    {
      provider: "OpenAI",
      category: "AI",
      getting: [
        "Frontier language model access",
        "Deep research mode",
        "Persistent memory across conversations",
        "Custom assistants, projects, and scheduled tasks",
        "Image generation",
        "Autonomous coding agent"
      ],
      costs: [
        "Free",
        "Go — $8/mo",
        "Plus — $20/mo",
        "Pro — $200/mo"
      ],
      link: "https://openai.com/chatgpt/pricing/",
      explored: 0
    }
  ],

  DEVELOPER_TOOLS: [],
  DESIGN_CREATIVE: [],
  PRODUCTIVITY: [],
  MARKETING_SALES: [],
  FINTECH_CRYPTO: [],
  ECOMMERCE_RETAIL: [],
  CONSUMER_ENTERTAINMENT: [],
  HEALTH_FITNESS: [],
  SECURITY_PRIVACY: []
};

// The category QUE currently shows. Changing this is the only step needed
// to switch which category the widget draws from.
const DEFAULT_CATEGORY = "AI";
