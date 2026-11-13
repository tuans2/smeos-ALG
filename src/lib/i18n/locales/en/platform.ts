/**
 * platform.ts — English translation for Platform Operations
 */

export const platformEn = {
  header: {
    title: "Platform Operations Center",
    subtitle: "Comprehensive system administration, permissions, and organization monitoring",
  },
  organizations: {
    title: "Organizations List",
    createOrg: "Add New Organization",
    searchPlaceholder: "Search organizations, tenants...",
    filterAll: "All Organizations",
    statusActive: "Active",
    statusSuspended: "Suspended",
    scopeSystem: "Scope: System-wide",
    table: {
      org: "Organization",
      type: "Type",
      members: "Members",
      credit: "Credit",
      createdAt: "Created At",
    },
    types: {
      store: "Store",
      network: "Floral Network",
      platform: "Platform",
      experience: "Experience",
    },
    empty: "No organizations found.",
    loadError: "Failed to load organizations.",
  },
  registration: {
    title: "Account Registrations",
    approve: "Approve Registration",
    reject: "Reject",
    empty: "No pending registrations",
  },
  approval: {
    title: "System Approval Center",
    subtitle: "Review quota upgrades, feature unlocking, and certifications",
  },
  industry: {
    title: "Industry Matrix",
    subtitle: "Configure industry plugins, measurement units, and BOM definitions",
  },
  health: {
    title: "System & Database Health",
    subtitle: "Real-time monitoring of microservices, latency, and database health",
  },
} as const

