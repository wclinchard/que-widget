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
// nothing else in this file or index.html needs to change.
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
    },
    {
      provider: "Anthropic",
      category: "AI",
      getting: [
        "Frontier and fast reasoning models",
        "CLI coding agent and multi-app work agent",
        "Projects and extended thinking mode",
        "Workspace document integration",
        "Higher usage limits on paid tiers"
      ],
      costs: [
        "Free",
        "Pro — $20/mo",
        "Max — $100/mo (5x) or $200/mo (20x)",
        "Team — from $25/user/mo"
      ],
      link: "https://claude.com/pricing",
      explored: 0
    },
    {
      provider: "Google",
      category: "AI",
      getting: [
        "Frontier reasoning model with extended thinking mode",
        "Deep research mode",
        "AI video generation",
        "Workspace document integration",
        "Extra cloud storage"
      ],
      costs: [
        "Free",
        "Plus — $4.99/mo",
        "Pro — $19.99/mo",
        "Ultra — $99.99/mo (5x) or $199.99/mo (20x)"
      ],
      link: "https://gemini.google/subscriptions/",
      explored: 0
    },
    {
      provider: "Perplexity",
      category: "AI",
      getting: [
        "Real-time web search with citations",
        "Access to multiple frontier models",
        "Built-in browser agent",
        "File and app creation",
        "Deep research mode"
      ],
      costs: [
        "Free",
        "Pro — $20/mo",
        "Max — $200/mo"
      ],
      link: "https://www.perplexity.ai/pro",
      explored: 0
    },
    {
      provider: "xAI",
      category: "AI",
      getting: [
        "Frontier reasoning model",
        "Web-search-augmented reasoning",
        "Extended thinking mode",
        "AI image generation",
        "Real-time social platform data access"
      ],
      costs: [
        "Free",
        "Standard — $8/mo",
        "Premium — $30/mo",
        "Heavy — $300/mo"
      ],
      link: "https://x.ai/grok",
      explored: 0
    },
    {
      provider: "Cursor",
      category: "AI",
      getting: [
        "AI-native code editor",
        "Unlimited inline code completion",
        "Autonomous coding agent across frontier models",
        "Background/async agents",
        "Automated code review add-on"
      ],
      costs: [
        "Free",
        "Pro — $20/mo",
        "Pro+ — $60/mo",
        "Ultra — $200/mo"
      ],
      link: "https://cursor.com/pricing",
      explored: 0
    }
  ],

  MUSIC: [],
  SOFTWARE: [],
  STREAMING: [],
  CLOUD_STORAGE: [],
  PRODUCTIVITY: [],
  DESIGN: [],
  DEVELOPER_TOOLS: [],
  SERVICES: []
};

// The category QUE currently shows. Changing this is the only step needed
// to switch which category the widget draws from.
const DEFAULT_CATEGORY = "AI";
