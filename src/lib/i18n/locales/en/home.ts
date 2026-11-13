/**
 * home.ts — English dictionary section `home` (mirrors vi/home.ts)
 */

export const homeEn = {
  header: {
    badge: "Quick Start",
    title: "What would you like to do for your shop today?",
    description: "Choose a task below to get started.",
    expertModeButton: "View Dashboard",
    journeyModeButton: "Back to Task Journey",
    expertModeBanner: "You are currently viewing the live metric dashboard.",
  },
  tiers: {
    mother: {
      title: "WHAT WOULD YOU LIKE TO DO WITH ALG PLATFORM?",
      subtitle: "Task direction center for Platform Operations Administrators",
    },
    industry: {
      title: "WHAT WOULD YOU LIKE TO DO WITH MULTI-INDUSTRY SAAS ECOSYSTEM?",
      subtitle: "Governance center for plugin contracts, AI Studio configuration, A6 printable templates, and BOM standardization across 7 industries.",
    },
    chain: {
      title: "WHAT WOULD YOU LIKE TO DO WITH {name} NETWORK?",
      subtitle: "Select a task to dispatch or manage the {product} network",
    },
    store: {
      title: "What would you like to do for {name} today?",
      subtitle: "Choose a task below to get started.",
    },
  },
  filters: {
    all: "All ({count})",
    singleTask: "Single Tasks",
    workflow: "Full Workflows",
    aiAssistant: "AI Assistant",
    searchPlaceholder: "Search tasks…",
    emptySearch: "No results for “{query}”. Try another keyword.",
  },
  spotlight: {
    badge: "Featured",
    readyStatus: "Ready to use",
    title: "Showcase Card",
    description: "Send flower catalogs for customers to browse, order, and pay directly on mobile.",
    features: {
      zalo: "Share link via messaging apps",
      customerPick: "Customers pick samples & write cards",
      autoOrder: "Auto-sync orders to workshop florists",
    },
    cta: "Create Order Link",
    note: "Recommended daily for your flower shop",
  },
  actionCards: {
    report: {
      title: "View Reports",
      desc: "Track revenue, orders, and ALG activity for your shop.",
    },
    trends: {
      title: "Trending Bouquets",
      desc: "Discover popular styles, colors, and prices to prepare inventory.",
    },
    scanPhoto: {
      title: "Create Bouquet from Photo",
      desc: "Snap a photo; AI identifies flowers and prepares a sample to sell.",
    },
    quote: {
      title: "Create Quotation",
      desc: "Prepare flower quotations for retail buyers or partner shops.",
    },
    writeCopy: {
      title: "Write Social Post",
      desc: "Draft Facebook, Instagram, or TikTok posts matching shop tone with hashtags.",
    },
    voiceover: {
      title: "Generate Voiceover",
      desc: "Convert post captions into expressive audio for video showcases.",
    },
    mockup: {
      title: "Create Promo Visuals",
      desc: "Remove background and stage bouquets in studio or event settings.",
    },
    video: {
      title: "Create Video from Photo",
      desc: "Generate short motion clips from bouquet photos for TikTok or Reels.",
    },
  },
} as const
