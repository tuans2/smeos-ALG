import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Luật 3 đặc tả 06: mọi endpoint kiểm quyền bằng mã năng lực. Luật chỉ nằm
 * trên giấy thì trôi — soát 05/10/2026 thấy 18 route chỉ gọi
 * `requireTenantContext` (nợ #170). Phép quét này chặn route MỚI thiếu gác;
 * route cũ thiếu gác nằm trong NO_CAPABILITY_GUARD kèm lý do, và danh sách
 * chỉ được co lại (mục nào đã có gác mà vẫn nằm đây thì test đỏ).
 */

const ROOT = path.resolve(__dirname, "../../..")
const API = path.join(ROOT, "src/app/api/v1")

/**
 * Lời gọi được tính là gác quyền. `defineRoute(` (07/11/2026) khai `auth` bắt buộc theo kiểu: mã năng
 * lực, hoặc `capability: null` / `kind: "custom"` kèm `reason` — khai báo đó thay cho một mục
 * NO_CAPABILITY_GUARD, và `src/core/http/define-route.ts` thực thi nó.
 */
const GUARD =
  /\b(requireCapability|hasCapability|requireExecutiveRole|requirePlatformCapability|requirePlatformContext|requireIntegrationContext|requireIntegrationClient|defineRoute)\(|\bcapabilities\.has\(/


/** Route không gọi gác quyền nào — có chủ đích hoặc đang là nợ. */
const NO_CAPABILITY_GUARD: Record<string, string> = {
  // Có chủ đích: chưa có phiên/tổ chức, hoặc gác bằng cơ chế khác.
  "auth/login": "đăng nhập — chưa có phiên",
  "auth/signup": "đăng ký — chưa có phiên",
  "auth/instant-trial": "dùng thử tức thì không cần mật khẩu — chưa có phiên",
  "internal/chain-dispatch-sweep": "cron nội bộ, không có phiên — gác bằng CRON_SECRET (isAuthorizedCronRequest)",
  "internal/health": "sức khoẻ chi tiết cho cron/vận hành, không có phiên — gác bằng CRON_SECRET (isAuthorizedCronRequest)",
  "auth/logout": "đăng xuất phiên của chính mình",
  "auth/me": "đọc phiên của chính mình",
  "auth/session-status": "kiểm phiên của chính mình còn sống (cảnh báo đăng nhập nơi khác)",
  "organizations": "liệt kê tổ chức mà người dùng là thành viên",
  "session/organization": "đổi tổ chức — kiểm memberships trong use-case (đặc tả 06 mục 2)",
  "sso/refresh": "làm mới phiên SSO của chính mình",
  "chat/webhooks/facebook": "webhook nhà cung cấp — xác thực bằng chữ ký",
  "chat/webhooks/zalo": "webhook nhà cung cấp — xác thực bằng chữ ký",
  "storage/[...key]": "URL ký sẵn — verifyStorageSignature",
  "content-guard/validate": "kiểm từ cấm trên văn bản gửi lên — không đọc/ghi dữ liệu tổ chức",
  "field-config/catalogs": "chỉ đọc nhãn danh mục đang active cho form nhập liệu (ĐP-4a.1)",
  "billing/sepay": "webhook SePay của tài khoản nhận tiền thuê bao nền tảng — không có phiên, gác bằng khoá SEPAY_PLATFORM_API_KEY (checklist ALG 10.7)",
  "chat/public/widget": "khung chat AI trên trang công khai do công cụ SMEOS tạo — tổ chức suy từ slug, giới hạn tần suất (đặc tả 06 mục 17)",
  "media/background-removal": "đã đóng ở P24 — luôn trả 409",
  // Thông báo của CHÍNH người dùng — truy vấn luôn lọc theo user + tổ chức của phiên.
  "notification/inbox": "hộp thư thông báo của chính mình (lọc user_id + organization_id của phiên)",
  "notification/inbox/[id]/read": "đánh dấu đã đọc tin của chính mình",
  "notification/inbox/mark-all-read": "đánh dấu đã đọc tin của chính mình",
  "notification/preferences": "tuỳ chọn nhận thông báo của chính mình",
  "notification/stream": "luồng SSE tin của chính mình",
  "notification/events": "chỉ đọc danh mục sự kiện tĩnh",
  "notification/channels": "chỉ đọc trạng thái bật kênh toàn sàn",
  "ux-rollout-flags": "chỉ đọc cờ giao diện đang bật cho chính tổ chức của phiên (03c E9)",
  // Mã năng lực riêng cho chat nội bộ thêm ở GĐ2 (docs/plan/hoan-thien-chat-noi-bo.md, D2); tới lúc đó kiểm trong use-case,
  // có ca chứng minh ở tests/tenant/internal-chat-card-guard.test.ts và internal-chat-isolation.test.ts
  "internal-chat/conversations/[id]/messages": "thành viên phòng + liên kết chuỗi–đối tác còn ACTIVE (assertConversationAccess); client chỉ gửi tin chữ",
  "internal-chat/conversations": "chat nội bộ cho mọi nhân viên; danh sách lọc theo người tham gia trong ngữ cảnh tổ chức hiện tại; luồng theo đơn chỉ với đơn của chính tổ chức",
  "internal-chat/messages/[id]/action": "thành viên phòng + đúng tổ chức được giao trên thẻ + thẻ còn chờ nhận (HandleCardActionUseCase)",
  "noi-bo/identity": "truy vấn thông tin nội bộ hệ thống",
}

function routeFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...routeFiles(full))
    else if (entry === "route.ts") out.push(full)
  }
  return out
}

function resolveImport(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2))
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Gác nằm ở route, ở handler cục bộ nó re-export, hoặc ở use-case nó gọi
 * (sâu tối đa 2 bước). Bỏ qua `infra/` và `resolve-session` — tệp phiên nhắc
 * tới `capabilities` nhưng không gác năng lực nào cho route.
 */
function isGuarded(file: string, depth: number, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false
  seen.add(file)
  const source = readFileSync(file, "utf8")
  if (GUARD.test(source)) return true
  if (depth === 0) return false
  for (const match of source.matchAll(/from "([^"]+)"/g)) {
    const spec = match[1] ?? ""
    const local = spec.startsWith(".")
    if (!local && !spec.startsWith("@/modules/")) continue
    if (spec.includes("/infra/") || spec.includes("resolve-session")) continue
    const target = resolveImport(file, spec)
    if (target && isGuarded(target, local ? depth : depth - 1, seen)) return true
  }
  return false
}

const key = (file: string) => path.relative(API, path.dirname(file)).split(path.sep).join("/")

const routes = routeFiles(API).filter((file) => !key(file).startsWith("public/"))

describe("route /api/v1 gác bằng mã năng lực (đặc tả 06 luật 3)", () => {
  it("route mới không gọi gác quyền phải được ghi vào NO_CAPABILITY_GUARD kèm lý do", () => {
    const unguarded = routes
      .filter((file) => !isGuarded(file, 2))
      .map(key)
      .filter((k) => !(k in NO_CAPABILITY_GUARD))
    expect(unguarded).toEqual([])
  })

  it("NO_CAPABILITY_GUARD không giữ mục đã có gác hoặc đã bị xoá", () => {
    const byKey = new Map(routes.map((file) => [key(file), file]))
    const stale = Object.keys(NO_CAPABILITY_GUARD).filter((k) => {
      const file = byKey.get(k)
      return !file || isGuarded(file, 2)
    })
    expect(stale).toEqual([])
  })
})
