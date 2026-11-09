"use client"

import { useState } from "react"
import { CatalogManagementTab } from "@/components/catalog/catalog-management-tab"
import { useCatalogProducts } from "@/components/catalog/use-catalog-products"
import { Button } from "@/components/ui/button"
import { Plus } from "@/components/ui/icon-set/plus"
import { InlineError } from "@/components/ui/inline-error"
import { CatalogLinkList } from "./catalog-link-list"
import { FEATURE_COPY, PANEL_COPY } from "./promotion-copy"
import type { PromotionHub } from "./use-promotion-hub"

/**
 * Ô "Bộ sưu tập chung": danh sách bộ sưu tập chung (link, QR, ngừng chia sẻ), rồi "Tạo bộ sưu tập" mở đúng luồng
 * tạo của /catalog (`CatalogManagementTab`, không sửa ruột) — chỉ nhận bộ sưu tập chung, không lẫn landing.
 */
export function PublicCollectionPanel({ hub }: { hub: PromotionHub }) {
  const [creating, setCreating] = useState(false)

  if (!hub.can.links) {
    return <p className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-body-sm text-text-muted">{PANEL_COPY.forbidden("tạo bộ sưu tập chung")}</p>
  }

  return (
    <section aria-label={FEATURE_COPY.PUBLIC_COLLECTION.title} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title-sm font-bold text-text">{FEATURE_COPY.PUBLIC_COLLECTION.title}</h3>
        <Button type="button" size="sm" variant={creating ? "secondary" : "primary"} onClick={() => setCreating((v) => !v)}>
          {creating ? PANEL_COPY.backToList : <><Plus size={14} aria-hidden /> {PANEL_COPY.collectionCreate}</>}
        </Button>
      </div>

      {creating ? (
        <CollectionCreator hub={hub} />
      ) : (
        <CatalogLinkList
          title={PANEL_COPY.collectionList}
          emptyText={PANEL_COPY.collectionNone}
          links={hub.collections}
          loading={hub.sources.PUBLIC_COLLECTION.state === "loading"}
          error={hub.linksError}
          canRevoke={hub.can.revoke}
          onRetry={hub.reloadLinks}
          onChanged={hub.reloadLinks}
        />
      )}
    </section>
  )
}

function CollectionCreator({ hub }: { hub: PromotionHub }) {
  const { products, error, reload } = useCatalogProducts("catalog")
  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      {error && <InlineError message={error} onRetry={() => void reload()} />}
      <CatalogManagementTab
        products={products}
        catalogLinks={hub.collections}
        onRefresh={() => { void reload(); hub.reloadLinks() }}
      />
    </div>
  )
}
