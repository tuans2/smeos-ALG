"use client"

import { useState } from "react"

import { Download } from "@/components/ui/icon-set/download"
import { Button } from "@/components/ui/button"

/** Khổ A6 dọc (mm) — báo giá gửi khách qua Zalo/in nhanh (checklist ALG 3.11). */
const A6 = { width: 105, height: 148 }

/** Tải báo giá công khai thành ảnh PNG hoặc PDF khổ A6, chụp từ phần tử `targetId` trên trang. */
export function QuoteExportButtons({ targetId, fileName }: { targetId: string; fileName: string }) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const capture = async () => {
    const el = document.getElementById(targetId)
    if (!el) throw new Error("Không tìm thấy nội dung báo giá")
    const { toPng } = await import("html-to-image")
    return { dataUrl: await toPng(el, { pixelRatio: 2, cacheBust: true }), width: el.offsetWidth, height: el.offsetHeight }
  }

  const download = (href: string, name: string) => {
    const a = document.createElement("a")
    a.href = href
    a.download = name
    a.click()
  }

  const run = async (kind: "png" | "pdf") => {
    setBusy(kind)
    setError(null)
    try {
      const shot = await capture()
      if (kind === "png") return download(shot.dataUrl, `${fileName}.png`)
      const { default: JsPdf } = await import("jspdf")
      const pdf = new JsPdf({ orientation: "portrait", unit: "mm", format: "a6" })
      const scale = Math.min(A6.width / shot.width, A6.height / shot.height)
      const w = shot.width * scale
      const h = shot.height * scale
      pdf.addImage(shot.dataUrl, "PNG", (A6.width - w) / 2, 0, w, h)
      pdf.save(`${fileName}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được báo giá")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("png")}>
        <Download size={14} /> {busy === "png" ? "Đang tạo ảnh…" : "Tải ảnh"}
      </Button>
      <Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => void run("pdf")}>
        <Download size={14} /> {busy === "pdf" ? "Đang tạo PDF…" : "Tải PDF A6"}
      </Button>
      {error && <span role="alert" className="text-caption text-danger">{error}</span>}
    </div>
  )
}
