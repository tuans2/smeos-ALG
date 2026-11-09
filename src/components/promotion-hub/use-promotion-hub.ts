"use client"

import { useApi } from "@/components/greeting-card/greeting-api"
import type { CatalogLinkItem } from "@/components/catalog/catalog-link-widgets"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { useSession } from "@/lib/session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { evaluateStoreProfile } from "@/modules/profiles/domain/store-profile-completeness"
import { splitPromotionLinks, type FeatureSource, type PromotionFeature } from "@/modules/toolkit/domain/promotion-hub"

/** Một link riêng đã gửi (rút gọn từ `GET /greeting-card/send-links`). */
export interface SentLink {
  id: string
  send_code: string
  customer_name: string | null
  status: string
  link_state?: string
  created_at: string
  catalog: { id: string; name: string } | null
}

/** Số link riêng đọc một lần cho dòng phụ trên ô (tối đa của API); còn trang sau thì hiện "100+". */
const SENT_LIMIT = 100

export const LINKS_URL = "/api/v1/catalog-links?include_revoked=true"

type Swr<T> = { data?: T | undefined; error?: unknown; isLoading: boolean }

function sourceOf<T>(allowed: boolean, swr: Swr<T>, count: (d: T) => number, hasMore?: (d: T) => boolean): FeatureSource {
  if (!allowed) return { state: "forbidden" }
  if (swr.error) return { state: "error" }
  if (!swr.data) return { state: "loading" }
  return { state: "ready", count: count(swr.data), hasMore: hasMore?.(swr.data) ?? false }
}

/**
 * Dữ liệu cho 3 ô Quảng bá — tải song song qua SWR, mỗi nguồn lỗi riêng và tải lại riêng. Chỉ đọc endpoint đang có;
 * máy chủ vẫn kiểm quyền. Thiếu quyền thì không gọi, ô nói rõ "Bạn chưa có quyền …".
 */
export function usePromotionHub() {
  const { can } = useSession()
  const canLinks = can("J1")
  const canSent = can(GREETING_CARD_CAPABILITY.orderRead)
  const canProducts = can("L1")

  const links = useApi<{ data: CatalogLinkItem[] }>(canLinks ? LINKS_URL : null)
  const sent = useApi<{ data: SentLink[]; next_cursor: string | null }>(canSent ? `/api/v1/greeting-card/send-links?limit=${SENT_LIMIT}` : null)
  const products = useApi<{ data: unknown[] }>(canProducts ? "/api/v1/products?limit=1&status=ACTIVE" : null)
  const profile = useTenantProfile()

  const split = splitPromotionLinks(links.data?.data ?? [])

  const sources: Record<PromotionFeature, FeatureSource> = {
    LANDING: sourceOf(canLinks, links, () => split.activeLandings),
    PUBLIC_COLLECTION: sourceOf(canLinks, links, () => split.activeCollections),
    PRIVATE_COLLECTION: sourceOf(canSent, sent, (d) => d.data.length, (d) => d.next_cursor !== null),
  }

  const profileMissing = !profile.loading && !profile.error
    && !evaluateStoreProfile({ business: profile.business, brand: profile.brand }).readyToShare
  const noApprovedProducts = canProducts && Array.isArray(products.data?.data) && products.data.data.length === 0

  return {
    sources,
    landings: split.landings,
    collections: split.collections,
    linksError: links.error ? (links.error instanceof Error ? links.error.message : String(links.error)) : null,
    reloadLinks: () => void links.mutate(),
    sentLinks: sent.data?.data ?? [],
    reloadSent: () => void sent.mutate(),
    profileMissing,
    noApprovedProducts,
    can: { links: canLinks, revoke: can("J2"), sent: canSent, send: can(GREETING_CARD_CAPABILITY.manage) },
  }
}

export type PromotionHub = ReturnType<typeof usePromotionHub>
