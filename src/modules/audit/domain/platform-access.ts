/**
 * Mục đích truy cập của nhân viên nền tảng vào dữ liệu một tổ chức (ADR-013 D-I5, D-60) — SUY TỪ THAO TÁC (PO
 * 06/11/2026: không bắt người vận hành nhập lý do). Một yêu cầu Console vào `platform/organizations/:id/*` hoặc
 * `platform/orgs-data/:orgId/*` → tổ chức bị truy cập + mã mục đích; nhãn tiếng Việt cho chủ tổ chức ở `/audit`.
 *
 * Thuần: không import Prisma.
 */

const ORG_PROFILE = /^\/api\/v1\/platform\/organizations\/([^/]+)(?:\/([^/]+))?\/?$/
const ORG_DATA = /^\/api\/v1\/platform\/orgs-data\/([^/]+)(?:\/(.+?))?\/?$/

const RECORD_DOMAINS: Record<string, string> = {
  catalog: "sản phẩm",
  orders: "đơn hàng",
  members: "thành viên",
  branches: "chi nhánh",
  customers: "khách hàng",
  jobs: "tác vụ",
}

/** Nhãn hiển thị của từng mã mục đích (mã lạ → nhãn chung). */
export const PLATFORM_ACCESS_LABELS: Readonly<Record<string, string>> = {
  "org.profile.read": "Xem hồ sơ tổ chức",
  "org.profile.update": "Sửa hồ sơ tổ chức",
  "org.credits.read": "Xem số dư credit",
  "org.credits.adjust": "Điều chỉnh credit",
  "org.domains.read": "Xem tên miền riêng",
  "org.fields.read": "Xem cấu hình trường dữ liệu",
  "org.fields.update": "Sửa cấu hình trường dữ liệu",
  "org.subscription.read": "Xem gói dịch vụ",
  "org.subscription.update": "Đổi gói dịch vụ",
  "org.subscription.cancel": "Huỷ gói dịch vụ",
  "org.usage_limit.update": "Đổi hạn mức sử dụng",
  "org.data.overview": "Xem tổng quan dữ liệu",
  "org.data.export": "Xuất toàn bộ dữ liệu",
  "org.legal_hold.update": "Đặt hoặc gỡ lưu giữ pháp lý",
  ...Object.fromEntries(
    Object.entries(RECORD_DOMAINS).flatMap(([domain, label]) => [
      [`org.records.${domain}.read`, `Xem dữ liệu ${label}`],
      [`org.records.${domain}.export`, `Tải dữ liệu ${label}`],
    ]),
  ),
}

export function platformAccessLabel(purpose: string): string {
  return PLATFORM_ACCESS_LABELS[purpose] ?? "Truy cập dữ liệu tổ chức"
}

const PROFILE_SUB: Record<string, Partial<Record<string, string>>> = {
  "": { GET: "org.profile.read", PATCH: "org.profile.update" },
  credits: { GET: "org.credits.read", POST: "org.credits.adjust" },
  "custom-domains": { GET: "org.domains.read" },
  "field-overrides": { PUT: "org.fields.update" },
  "field-preview": { GET: "org.fields.read" },
  subscription: { GET: "org.subscription.read", PUT: "org.subscription.update", DELETE: "org.subscription.cancel" },
  "usage-limit": { PUT: "org.usage_limit.update" },
}

function dataPurpose(rest: string, method: string, search: URLSearchParams): string | null {
  if (rest === "" && method === "GET") return "org.data.overview"
  if (rest === "export" && method === "GET") return "org.data.export"
  if (rest === "legal-hold" || /^assets\/[^/]+\/legal-hold$/.test(rest)) return "org.legal_hold.update"
  const records = /^records\/([^/]+)$/.exec(rest)
  if (records && method === "GET" && records[1] && records[1] in RECORD_DOMAINS) {
    return `org.records.${records[1]}.${search.get("export") === "csv" ? "export" : "read"}`
  }
  return null
}

/** Tổ chức bị truy cập và mục đích; `null` nếu yêu cầu không vào dữ liệu của một tổ chức cụ thể. */
export function describePlatformAccess(method: string, url: string): { organizationId: string; purpose: string } | null {
  const { pathname, searchParams } = new URL(url, "http://localhost")
  const m = method.toUpperCase()
  const profile = ORG_PROFILE.exec(pathname)
  if (profile?.[1]) {
    const purpose = PROFILE_SUB[profile[2] ?? ""]?.[m]
    return { organizationId: decodeURIComponent(profile[1]), purpose: purpose ?? `org.other.${m.toLowerCase()}` }
  }
  const data = ORG_DATA.exec(pathname)
  if (data?.[1]) {
    const purpose = dataPurpose(data[2] ?? "", m, searchParams)
    return { organizationId: decodeURIComponent(data[1]), purpose: purpose ?? `org.other.${m.toLowerCase()}` }
  }
  return null
}
