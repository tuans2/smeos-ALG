"use client"

import { Download } from "@/components/ui/icon-set/download"
import { History } from "@/components/ui/icon-set/history"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABEL, isFileCategory, parseColorList, type BrandLibraryItemView } from "@/modules/profiles/domain/brand-library"

function Preview({ item }: { item: BrandLibraryItemView }) {
  const v = item.latest
  if (!v) return null
  if (isFileCategory(item.category)) {
    return v.file_url ? (
      // eslint-disable-next-line @next/next/no-img-element -- URL ký có hạn từ kho lưu trữ
      <img src={v.file_url} alt={item.title} className="h-28 w-full object-contain rounded-lg bg-surface-alt" />
    ) : (
      <p className="h-28 flex items-center justify-center rounded-lg bg-surface-alt text-caption text-text-muted">Tệp không còn trong kho</p>
    )
  }
  if (item.category === "COLOR") {
    const colors = parseColorList(v.text_value ?? "")
    return (
      <ul className="flex flex-wrap gap-2" aria-label="Các màu">
        {colors.map((c) => (
          <li key={c} className="flex items-center gap-1 text-caption text-text">
            <span aria-hidden className="h-6 w-6 rounded border border-border" style={{ backgroundColor: c }} />{c.toUpperCase()}
          </li>
        ))}
      </ul>
    )
  }
  return <p className="text-body-sm text-text whitespace-pre-line line-clamp-4">{v.text_value}</p>
}

export function BrandLibraryItemCard({
  item, readOnly, onNewVersion, onToggleShare, onToggleArchive, canShare,
}: {
  item: BrandLibraryItemView
  readOnly?: boolean
  canShare?: boolean
  onNewVersion?: () => void
  onToggleShare?: () => void
  onToggleArchive?: () => void
}) {
  const fileUrl = item.latest?.file_url
  const action = "inline-flex items-center gap-1 min-h-8 px-2 rounded-lg text-caption font-semibold"
  return (
    <article className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-surface">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption text-text-muted">{CATEGORY_LABEL[item.category]} · phiên bản {item.current_version}</p>
          <h3 className="text-body-sm font-bold text-text truncate">{item.title}</h3>
        </div>
        {item.share_with_members && !readOnly && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-caption font-semibold text-primary">
            <Share2 size={12} aria-hidden /> Đang chia sẻ
          </span>
        )}
        {item.status === "ARCHIVED" && <span className="shrink-0 text-caption font-semibold text-text-muted">Đã lưu trữ</span>}
      </header>
      <Preview item={item} />
      {item.description && <p className="text-caption text-text-muted">{item.description}</p>}
      <footer className="flex flex-wrap gap-1">
        {fileUrl && (
          <a href={fileUrl} download target="_blank" rel="noopener noreferrer" className={`${action} text-primary hover:bg-primary/10`}>
            <Download size={14} aria-hidden /> Tải về
          </a>
        )}
        {!readOnly && item.status === "ACTIVE" && (
          <Button type="button" variant="ghost" size="sm" onClick={onNewVersion} className="gap-1 px-2 text-caption">
            <History size={14} aria-hidden /> Phiên bản mới
          </Button>
        )}
        {!readOnly && canShare && item.status === "ACTIVE" && (
          <Button type="button" variant="ghost" size="sm" onClick={onToggleShare} aria-pressed={item.share_with_members} className="gap-1 px-2 text-caption">
            <Share2 size={14} aria-hidden /> {item.share_with_members ? "Ngừng chia sẻ" : "Chia sẻ cho cửa hàng"}
          </Button>
        )}
        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={onToggleArchive} className="gap-1 px-2 text-caption text-text-muted">
            {item.status === "ARCHIVED" ? "Khôi phục" : "Lưu trữ"}
          </Button>
        )}
      </footer>
    </article>
  )
}
