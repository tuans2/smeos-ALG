import gd1Routes from "./gd1.routes.json"
import { bestMatch } from "./route-match"

/**
 * Chế độ chỉ bật một giai đoạn bàn giao (`docs/plan/BANGIAO_GD1_123_CHUC_NANG.md`, Bước 2.2).
 *
 * Bật bằng `NEXT_PUBLIC_DELIVERY_PHASE=gd1`. Không đặt biến (hoặc giá trị lạ) thì mọi route mở như cũ.
 * Danh sách route sinh từ `gd1.manifest.json` bằng `npm run release:routes`; test giữ nó khớp với code.
 */
export type DeliveryPhase = "gd1"

export interface PhaseRoutes {
  phase: DeliveryPhase
  /** Route trong phạm vi giao. */
  pages: string[]
  apis: string[]
  /** Route có thật nhưng ngoài phạm vi — bị trả 404 khi bật chế độ. */
  blockedPages: string[]
  blockedApis: string[]
}

const ROUTES: Record<DeliveryPhase, PhaseRoutes> = { gd1: gd1Routes as PhaseRoutes }

export function resolveDeliveryPhase(value: string | undefined | null): DeliveryPhase | null {
  return value === "gd1" ? value : null
}

/** Đọc biến môi trường; `NEXT_PUBLIC_` được Next.js gắn cứng lúc build nên client và server thấy cùng giá trị. */
export function activeDeliveryPhase(): DeliveryPhase | null {
  return resolveDeliveryPhase(process.env.NEXT_PUBLIC_DELIVERY_PHASE)
}

export function phaseRoutes(phase: DeliveryPhase): PhaseRoutes {
  return ROUTES[phase]
}

function stripHref(href: string): string {
  const path = href.split(/[?#]/)[0] ?? ""
  return path.length > 1 ? path.replace(/\/+$/, "") : path || "/"
}

/**
 * Route có nằm trong giai đoạn không. Đường dẫn không khớp route nào (tệp tĩnh, URL sai) được cho qua để
 * Next.js tự xử lý; chỉ route có thật mà ngoài phạm vi mới bị chặn.
 */
export function isRouteInPhase(pathname: string, phase: DeliveryPhase | null): boolean {
  if (!phase) return true
  const routes = ROUTES[phase]
  const path = stripHref(pathname)
  const isApi = path === "/api" || path.startsWith("/api/")
  const allowed = isApi ? routes.apis : routes.pages
  const blocked = isApi ? routes.blockedApis : routes.blockedPages
  const match = bestMatch([...allowed, ...blocked], path)
  return match === null || !blocked.includes(match)
}

/** Giữ mục có link trong giai đoạn; mục không có link (null) giữ nguyên. */
export function filterByPhase<T>(items: readonly T[], hrefOf: (item: T) => string | null | undefined, phase = activeDeliveryPhase()): T[] {
  return phase ? items.filter((item) => isHrefInPhase(hrefOf(item), phase)) : [...items]
}

/** Dùng cho menu, lưới công cụ, hành trình: link ngoài (http…) luôn giữ. */
export function isHrefInPhase(href: string | null | undefined, phase: DeliveryPhase | null = activeDeliveryPhase()): boolean {
  if (!phase || !href || !href.startsWith("/")) return true
  return isRouteInPhase(href, phase)
}

/**
 * Route API có trong mã nguồn hiện tại (trong hay ngoài phạm vi). Ở smeOS là mọi route; ở bản cắt chỉ còn
 * route được giao — dùng để danh sách operation OpenAPI tự khớp bản cắt. `path` dạng OpenAPI (`/orders/{id}`).
 */
export function isKnownApiRoute(openApiPath: string, phase: DeliveryPhase = "gd1"): boolean {
  const routes = ROUTES[phase]
  const pathname = `/api/v1${openApiPath.replace(/\{[^}]+\}/g, "_")}`
  return bestMatch([...routes.apis, ...routes.blockedApis], pathname) !== null
}

