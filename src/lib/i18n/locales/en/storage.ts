/**
 * storage.ts — English dictionary section `storage` (mirrors vi/storage.ts)
 */

export const storageEn = {
  header: {
    title: "Media & Content Storage",
    description: "Find every photo, video, audio, content, catalog and greeting card your shop has created. Deleted items stay 30 days in Trash.",
    uploadButton: "Upload New Photo",
  },
  tabs: {
    rawPhotos: "Raw Photos",
    approvedPhotos: "Approved Photos",
    salesPitches: "Consultation Scripts",
    trash: "Trash (30 Days)",
  },
  filters: {
    searchPlaceholder: "Search by flower, code, occasion, or component…",
  },
  actions: {
    analyzePhoto: "Analyze Photo",
    createCopy: "Generate Sales Copy",
    copyPitch: "Copy Script",
    restore: "Restore",
    permanentDelete: "Permanently Delete",
  },
} as const
