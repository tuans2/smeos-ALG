/**
 * settings.ts — English dictionary section `settings` (mirrors vi/settings.ts)
 */

export const settingsEn = {
  header: {
    guidanceBadge: "SHOP SETTINGS",
    guidanceTitle: "Manage general shop information and advanced configurations.",
    shopName: "Shop Name",
    hotline: "Contact Hotline",
    address: "Shop Address",
    openingHours: "Opening Hours",
    saveButton: "Save Changes",
  },
  navigationCards: {
    profile: {
      title: "Profile & Branding",
      desc: "Logo, brand colors, deposit policy, commitments, and occasions.",
    },
    ai: {
      title: "AI Settings",
      desc: "Customer privacy protection, AI spending caps, and provider preference.",
    },
    social: {
      title: "Social Media Connections",
      desc: "Connect Facebook, Instagram, TikTok, and Zalo OA.",
    },
    vision: {
      title: "Flower Vision Engine",
      desc: "Configure AI recognition behavior for the entire shop.",
    },
    members: {
      title: "Team & Permissions",
      desc: "Invite members, assign roles, and allocate branches.",
    },
  },
  members: {
    backToSettings: "Back to Settings",
    title: "Team & Permissions",
    addMemberButton: "Add Member",
    refresh: "Refresh",
    searchPlaceholder: "Search by name, email, or role…",
    table: {
      member: "Member",
      email: "Email",
      branch: "Branch",
      role: "Role",
      status: "Status",
      actions: "Actions",
    },
  },
  tabs: {
    info: "Store Info",
    branding: "Branding",
    payment: "Payments",
    deposit: "Deposit & Pricing",
    promotions: "Promotions",
    commitments: "Commitments",
    agreements: "Agreements",
    brochureFlow: "Brochure Flow",
    aiChannels: "AI & Channels",
    collectionProfile: "Chain Collection",
    fields: "Data Fields",
    customDomain: "Custom Domain",
  },
} as const
