/**
 * notifications.ts — English dictionary section `notifications` (mirrors vi/notifications.ts)
 */

export const notificationsEn = {
  toast: {
    saveSuccess: "Changes saved successfully.",
    copyLinkSuccess: "Order link copied to clipboard.",
    copyPitchSuccess: "Consultation script copied.",
    restoreSuccess: "Bouquet restored to catalog.",
    trashSuccess: "Bouquet moved to trash.",
    createOrderSuccess: "New order created successfully.",
    refreshSuccess: "Data refreshed.",
    networkError: "Network connection lost. Please check connection and retry.",
    serverError: "Operation could not complete due to system error. Please retry shortly.",
    sessionExpired: "Session expired. Please reload or log in again.",
  },
  validation: {
    required: "Please provide this information.",
    invalidPhone: "Invalid phone number (must be 10 digits).",
    priceGreaterThanZero: "Unit price must be greater than 0 ₫.",
    duplicateCode: "Bouquet code already exists. Please choose another code.",
    fileTooLarge: "File exceeds size limit (maximum 10 MB).",
    invalidFileType: "Unsupported format. Please select JPG, PNG, or WebP.",
    invalidDepositRate: "Please select deposit rate of 50% or 100%.",
  },
  confirmModal: {
    moveToTrash: {
      title: "Move “{name}” to Trash?",
      description: "Bouquet will be hidden from sale lists and catalogs. You can restore it from Trash within 30 days.",
      confirm: "Move to Trash",
      cancel: "Cancel",
    },
    permanentDelete: {
      title: "Permanently delete “{name}”?",
      description: "This item will be permanently removed and cannot be recovered. Are you sure?",
      confirm: "Delete Permanently",
      cancel: "Cancel",
    },
    lockMember: {
      title: "Lock account for “{name}”?",
      description: "This member will not be able to log in until unlocked.",
      confirm: "Lock Account",
      cancel: "Cancel",
    },
    cancelOrder: {
      title: "Cancel order “{orderCode}”?",
      description: "This order will be marked as Cancelled and all crafting and delivery will stop.",
      confirm: "Confirm Cancellation",
      cancel: "Close",
    },
  },
  aiProgress: {
    observingPhoto: "Observing floral photo…",
    detectingFlowers: "Identifying flower varieties and stem counts…",
    draftingPitch: "Drafting consultation script and emotional message…",
    transparencyNote: "Content suggested by AI assistant. You can customize directly before sending to customers.",
  },
} as const
