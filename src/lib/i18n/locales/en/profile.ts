/**
 * profile.ts — English dictionary section `profile` (mirrors vi/profile.ts)
 */

export const profileEn = {
  header: {
    title: "Shop Profile & Brand Identity",
    description: "Configure shop information, VietQR payment account, branding, and sales policies.",
    saveButton: "Save Changes",
  },
  tabs: {
    businessInfo: "Shop Information",
    branding: "Brand Identity",
    assets: "Frames & Print Templates",
    policy: "Policies & Commitments",
    toneOfVoice: "Occasions & Tone",
  },
  form: {
    shopNameLabel: "Shop Display Name",
    shopNamePlaceholder: "E.g., Sunrise Flower Shop",
    hotlineLabel: "Consultation Hotline",
    hotlinePlaceholder: "E.g., 0909xxxxxx",
    addressLabel: "Shop Address",
    addressPlaceholder: "Street, Ward, District, City",
    bankLabel: "Receiving Bank (VietQR)",
    accountNumberLabel: "Account Number",
    accountHolderLabel: "Account Holder Name",
  },
  policy: {
    depositTitle: "Link Order Deposit Policy",
    depositRateLabel: "Minimum Deposit Rate",
    giftsTitle: "Complimentary Gifts & Commitments",
    defaultGift: "Free greeting card or custom printed banner",
    defaultCommitment1: "Product photo sent for approval before dispatch",
    defaultCommitment2: "On-time delivery with replacement support if bruised",
  },
} as const
