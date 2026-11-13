"use client"

/**
 * Danh thiếp cửa hàng — xem trước hai mặt, tải bản in PDF (90×54 mm),
 * ảnh PNG 300 dpi và danh bạ điện tử (.vcf). Dữ liệu lấy từ Hồ sơ cửa hàng;
 * sửa thông tin ở Hồ sơ, không sửa trên thẻ (một nguồn dữ liệu).
 */
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { IdCard } from "@/components/ui/icon-set/id-card"
import { FileDown } from "@/components/ui/icon-set/file-down"
import { ImageDown } from "@/components/ui/icon-set/image-down"
import { Contact } from "@/components/ui/icon-set/contact"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { toPng } from "html-to-image"
import jsPDF from "jspdf"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { useApi } from "@/components/greeting-card/greeting-api"
import { generateQRCodeDataUrl } from "@/core/media/qr-engine"
import { BUSINESS_CARD_MM, BUSINESS_CARD_PRINT_PX, buildBusinessCard, buildVCard } from "@/modules/profiles/domain/business-card"
import { slugifyVietnamese } from "@/modules/catalog-links/domain/catalog-link-rules"
import type { StoreShareLinkView } from "@/modules/profiles/domain/store-share-page"
import { PageHeader } from "@/components/ui/page-header"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { BusinessCardBack, BusinessCardFront } from "./business-card-faces"

type ExportKind = "PDF" | "FRONT" | "BACK" | "VCF"

function ScaledPreview({ children, label }: { children: React.ReactNode; label: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setScale(e.contentRect.width / BUSINESS_CARD_PRINT_PX.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <figure className="flex flex-col gap-2 min-w-0">
      <div ref={boxRef} className="w-full rounded-lg border border-border shadow-sm overflow-hidden"
        style={{ aspectRatio: `${BUSINESS_CARD_MM.width} / ${BUSINESS_CARD_MM.height}` }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: BUSINESS_CARD_PRINT_PX.width }}>{children}</div>
      </div>
      <figcaption className="text-caption text-text-muted text-center">{label}</figcaption>
    </figure>
  )
}

function download(href: string, filename: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function BusinessCardStudio() {
  const { business, brand, loading, error, reload } = useTenantProfile()
  const share = useApi<{ data: StoreShareLinkView | null }>("/api/v1/store-share-link")
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const [qrImage, setQrImage] = useState<{ url: string; data: string } | null>(null)
  const [logoOk, setLogoOk] = useState(true)
  const [busy, setBusy] = useState<ExportKind | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const sharePath = share.data?.data?.path ?? null
  const card = useMemo(() => buildBusinessCard({
    business,
    brand: brand ? { primary_color: brand.primary_color, logo_url: brand.logo_url } : null,
    shareUrl: sharePath && typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : null,
  }), [business, brand, sharePath])

  // QR gắn với đúng URL đã sinh — đổi URL thì ảnh cũ tự không dùng nữa
  const qrUrl = card.qr?.url ?? null
  const qrDataUrl = qrImage && qrImage.url === qrUrl ? qrImage.data : null
  useEffect(() => {
    if (!qrUrl) return
    let alive = true
    generateQRCodeDataUrl(qrUrl, { width: 760, margin: 1 })
      .then((data) => { if (alive) setQrImage({ url: qrUrl, data }) })
      .catch(() => { /* không có QR thì mặt sau hiện tên cửa hàng */ })
    return () => { alive = false }
  }, [qrUrl])

  // Logo từ kho lưu trữ có thể không cho phép đưa vào ảnh xuất (CORS) — kiểm trước,
  // không được thì bỏ logo và nói rõ thay vì xuất ảnh lỗi.
  useEffect(() => {
    if (!card.logoUrl) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => setLogoOk(true)
    img.onerror = () => setLogoOk(false)
    img.src = card.logoUrl
  }, [card.logoUrl])

  const baseName = `danh-thiep-${slugifyVietnamese(card.name) || "cua-hang"}`
  const snap = (el: HTMLDivElement) =>
    toPng(el, { pixelRatio: 1, width: BUSINESS_CARD_PRINT_PX.width, height: BUSINESS_CARD_PRINT_PX.height, skipFonts: true, cacheBust: true })

  async function runExport(kind: ExportKind) {
    if (!frontRef.current || !backRef.current) return
    setBusy(kind)
    setExportError(null)
    try {
      if (kind === "VCF") {
        const url = URL.createObjectURL(new Blob([buildVCard(card)], { type: "text/vcard;charset=utf-8" }))
        download(url, `${baseName}.vcf`)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else if (kind === "FRONT") {
        download(await snap(frontRef.current), `${baseName}-mat-truoc.png`)
      } else if (kind === "BACK") {
        download(await snap(backRef.current), `${baseName}-mat-sau.png`)
      } else {
        const { width, height } = BUSINESS_CARD_MM
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [width, height] })
        pdf.addImage(await snap(frontRef.current), "PNG", 0, 0, width, height, undefined, "FAST")
        pdf.addPage([width, height], "landscape")
        pdf.addImage(await snap(backRef.current), "PNG", 0, 0, width, height, undefined, "FAST")
        pdf.save(`${baseName}.pdf`)
      }
    } catch {
      setExportError("Không tạo được tệp. Vui lòng thử lại.")
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <SkeletonBlock lines={6} label="Đang tải hồ sơ cửa hàng..." />
  if (error) return <InlineError message={error} onRetry={() => void reload()} />

  const blocked = card.blockers.length > 0
  const btn = "inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg text-body-sm font-semibold disabled:opacity-50"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Danh thiếp cửa hàng"
        description="Danh thiếp khổ 90×54 mm tạo từ Hồ sơ cửa hàng — tải bản in, ảnh gửi khách hoặc danh bạ điện tử."
      />

      {blocked ? (
        <section role="status" className="p-5 rounded-2xl border border-border bg-surface">
          <p className="text-body-sm text-warning-text">Cần điền {card.blockers.join(" và ").toLowerCase()} trong Hồ sơ cửa hàng trước khi tạo danh thiếp.</p>
          <Link href="/cai-dat?tab=INFO" className="mt-3 inline-flex min-h-10 items-center px-4 rounded-lg bg-primary text-primary-foreground text-body-sm font-semibold">Điền hồ sơ</Link>
        </section>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <ScaledPreview label="Mặt trước"><BusinessCardFront ref={frontRef} card={card} logoOk={logoOk} /></ScaledPreview>
            <ScaledPreview label="Mặt sau"><BusinessCardBack ref={backRef} card={card} qrDataUrl={qrDataUrl} logoOk={logoOk} /></ScaledPreview>
          </div>

          {!card.qr && (
            <p className="text-body-sm text-text-muted">
              Mặt sau chưa có mã QR. <Link href="/ho-so" className="font-semibold text-primary underline">Tạo trang chia sẻ cửa hàng</Link> để khách quét mã xem thông tin.
            </p>
          )}
          {card.logoUrl && !logoOk && (
            <p className="text-body-sm text-warning-text">Không đưa được logo vào danh thiếp. Hãy tải lại logo trong Nhận diện thương hiệu nếu cần.</p>
          )}

          <section aria-label="Tải danh thiếp" className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Button type="button" disabled={busy !== null} onClick={() => void runExport("PDF")} className={`${btn} bg-primary text-primary-foreground`}>
              {busy === "PDF" ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <FileDown size={16} aria-hidden />} Tải bản in PDF
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void runExport("FRONT")} className={`${btn} border border-border text-text`}>
              <ImageDown size={16} aria-hidden /> Ảnh mặt trước
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void runExport("BACK")} className={`${btn} border border-border text-text`}>
              <ImageDown size={16} aria-hidden /> Ảnh mặt sau
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void runExport("VCF")} className={`${btn} border border-border text-text`}>
              <Contact size={16} aria-hidden /> Danh bạ điện tử (.vcf)
            </Button>
          </section>
          {exportError && <InlineError message={exportError} onRetry={() => setExportError(null)} retryLabel="Đóng" />}
          <p className="flex items-center gap-2 text-caption text-text-muted">
            <IdCard size={14} aria-hidden /> Bản in PDF gồm 2 trang (mặt trước, mặt sau) đúng khổ 90×54 mm — gửi thẳng cho tiệm in.
          </p>
        </>
      )}
    </div>
  )
}
