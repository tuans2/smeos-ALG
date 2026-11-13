"use client"

/**
 * Công cụ 45 — Bộ nhận diện và thư viện nội dung.
 * L0: xem và tải tài nguyên thương hiệu. Thêm/phiên bản mới: hộp thoại.
 * Chuỗi chia sẻ xuống cửa hàng thành viên (R3, có xác nhận); cửa hàng thấy
 * khối "Từ chuỗi" chỉ đọc.
 */
import { useState } from "react"
import { Library } from "@/components/ui/icon-set/library"
import { Plus } from "@/components/ui/icon-set/plus"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { isChainTier } from "@/core/governance/tier-of"
import { useApi, apiSend } from "@/components/greeting-card/greeting-api"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Disclosure } from "@/components/ui/disclosure"
import type { BrandLibraryItemView } from "@/modules/profiles/domain/brand-library"
import { BrandLibraryItemCard } from "./brand-library-item-card"
import { BrandLibraryEditorDialog } from "./brand-library-editor-dialog"

type ChainShared = { chain_name: string; items: BrandLibraryItemView[] } | null

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

export function BrandLibraryPage() {
  const { organizationType, roleUx } = useSession()
  const isChain = isChainTier(organizationType, roleUx)
  const own = useApi<{ data: BrandLibraryItemView[] }>("/api/v1/brand-library?include_archived=true")
  const chain = useApi<{ data: ChainShared }>(isChain ? null : "/api/v1/brand-library/chain")
  const [confirm, confirmDialog] = useConfirmDialog()
  const [editor, setEditor] = useState<{ open: boolean; item: BrandLibraryItemView | null }>({ open: false, item: null })
  const [actionError, setActionError] = useState<string | null>(null)

  const items = own.data?.data ?? []
  const active = items.filter((i) => i.status === "ACTIVE")
  const archived = items.filter((i) => i.status === "ARCHIVED")

  async function patch(item: BrandLibraryItemView, body: Record<string, unknown>) {
    setActionError(null)
    try {
      await apiSend(`/api/v1/brand-library/${item.id}`, "PATCH", body, "Không cập nhật được tài nguyên")
      await own.mutate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Không cập nhật được tài nguyên")
    }
  }

  async function toggleShare(item: BrandLibraryItemView) {
    if (!item.share_with_members) {
      const ok = await confirm({
        title: `Chia sẻ "${item.title}" cho cửa hàng thành viên?`,
        consequence: "Mọi cửa hàng đang hoạt động trong chuỗi sẽ thấy và tải được phiên bản hiện hành. Phiên bản mới sau này cũng được chia sẻ ngay. Bạn có thể ngừng chia sẻ bất cứ lúc nào.",
        confirmLabel: "Chia sẻ",
      })
      if (!ok) return
    }
    await patch(item, { share_with_members: !item.share_with_members })
  }

  async function toggleArchive(item: BrandLibraryItemView) {
    if (item.status === "ACTIVE") {
      const ok = await confirm({
        title: `Lưu trữ "${item.title}"?`,
        consequence: item.share_with_members
          ? "Tài nguyên sẽ ẩn khỏi thư viện và cửa hàng thành viên không còn thấy. Bạn có thể khôi phục lại."
          : "Tài nguyên sẽ ẩn khỏi thư viện. Bạn có thể khôi phục lại.",
        confirmLabel: "Lưu trữ",
      })
      if (!ok) return
    }
    await patch(item, { status: item.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" })
  }

  const card = (item: BrandLibraryItemView) => (
    <BrandLibraryItemCard
      key={item.id}
      item={item}
      canShare={isChain}
      onNewVersion={() => setEditor({ open: true, item })}
      onToggleShare={() => void toggleShare(item)}
      onToggleArchive={() => void toggleArchive(item)}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bộ nhận diện thương hiệu"
        description={isChain
          ? "Lưu logo, màu, phông chữ, mẫu và câu chữ chuẩn; chia sẻ cho cửa hàng thành viên dùng thống nhất."
          : "Lưu logo, màu, phông chữ, mẫu và câu chữ chuẩn của cửa hàng ở một nơi, có lưu các phiên bản."}
        actions={
          <Button type="button" onClick={() => setEditor({ open: true, item: null })} className="gap-2">
            <Plus size={16} aria-hidden /> Thêm tài nguyên
          </Button>
        }
      />

      {actionError && <InlineError message={actionError} />}

      {!isChain && chain.data?.data && (
        <section aria-labelledby="tu-chuoi" className="flex flex-col gap-3">
          <h2 id="tu-chuoi" className="text-body font-bold text-text">Từ chuỗi {chain.data.data.chain_name}</h2>
          {chain.data.data.items.length === 0
            ? <p className="text-body-sm text-text-muted">Chuỗi chưa chia sẻ tài nguyên nào.</p>
            : <Grid>{chain.data.data.items.map((i) => <BrandLibraryItemCard key={i.id} item={i} readOnly />)}</Grid>}
        </section>
      )}
      {chain.error && <InlineError message="Không tải được tài nguyên của chuỗi" onRetry={() => void chain.mutate()} />}

      <section aria-labelledby="cua-ban" className="flex flex-col gap-3">
        {!isChain && chain.data?.data && <h2 id="cua-ban" className="text-body font-bold text-text">Của cửa hàng</h2>}
        {own.isLoading ? (
          <SkeletonBlock lines={4} label="Đang tải thư viện..." />
        ) : own.error ? (
          <InlineError message="Không tải được thư viện" onRetry={() => void own.mutate()} />
        ) : active.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Thư viện còn trống"
            reason="Thêm logo, bảng màu hoặc câu chữ chuẩn để mọi người dùng đúng nhận diện thương hiệu."
          />
        ) : (
          <Grid>{active.map(card)}</Grid>
        )}
        {archived.length > 0 && (
          <Disclosure label={`Đã lưu trữ (${archived.length})`}>
            <Grid>{archived.map(card)}</Grid>
          </Disclosure>
        )}
      </section>

      {editor.open && (
        <BrandLibraryEditorDialog
          key={editor.item?.id ?? "new"}
          open={editor.open}
          item={editor.item}
          onOpenChange={(open) => setEditor((s) => ({ ...s, open }))}
          onSaved={() => void own.mutate()}
        />
      )}
      {confirmDialog}
    </div>
  )
}
