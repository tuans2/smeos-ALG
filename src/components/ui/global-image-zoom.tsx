"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X } from "@/components/ui/icon-set/x"
import { ZoomIn } from "@/components/ui/icon-set/zoom-in"
import { ZoomOut } from "@/components/ui/icon-set/zoom-out"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Download } from "@/components/ui/icon-set/download"
import { Maximize2 } from "@/components/ui/icon-set/maximize2"
import { Minimize2 } from "@/components/ui/icon-set/minimize2"

interface ZoomState {
  isOpen: boolean
  src: string
  alt: string
  title?: string
}

export function GlobalImageZoom() {
  const [zoomState, setZoomState] = useState<ZoomState>({
    isOpen: false,
    src: "",
    alt: "",
  })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showCheckerboard, setShowCheckerboard] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleClose = useCallback(() => {
    setZoomState((prev) => ({ ...prev, isOpen: false }))
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
  }, [])

  // Bắt sự kiện click vào bất kỳ thẻ img nào trên toàn hệ thống
  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Tìm thẻ img gần nhất
      const img = target.closest("img")
      if (!img) return

      // Bỏ qua nếu có cờ data-no-zoom hoặc icon nhỏ (< 45px)
      if (img.dataset.noZoom === "true") return
      const rect = img.getBoundingClientRect()
      if (rect.width < 45 && rect.height < 45) return

      // Bỏ qua nếu click vào nút download hoặc nút xóa
      const parentLink = img.closest("a")
      if (parentLink && parentLink.hasAttribute("download")) return

      // Lấy URL ảnh nét nhất
      const src = img.currentSrc || img.src
      if (!src || src.startsWith("data:image/svg+xml")) return

      const isTransparent =
        src.includes(".png") ||
        src.startsWith("data:image/png") ||
        img.alt.toLowerCase().includes("trong suốt") ||
        img.alt.toLowerCase().includes("tách nền")

      setShowCheckerboard(isTransparent)
      setScale(1)
      setPosition({ x: 0, y: 0 })
      setZoomState({
        isOpen: true,
        src,
        alt: img.alt || "Chi tiết ảnh",
        title: img.title || img.alt || "Chi tiết ảnh ALG",
      })
    }

    document.addEventListener("click", handleDocumentClick, { capture: true })
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true })
    }
  }, [])

  // Phím tắt bàn phím (ESC, +, -, 0)
  useEffect(() => {
    if (!zoomState.isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose()
      } else if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(s + 0.25, 4))
      } else if (e.key === "-") {
        setScale((s) => Math.max(s - 0.25, 0.5))
      } else if (e.key === "0") {
        setScale(1)
        setPosition({ x: 0, y: 0 })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [zoomState.isOpen, handleClose])

  // Phóng to / Thu nhỏ bằng con lăn chuột (Mouse Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 5))
  }

  // Kéo thả ảnh khi đã zoom in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  if (!zoomState.isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
      className="fixed inset-0 z-9999 flex flex-col items-center justify-between bg-black/90 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={handleClose}
    >
      {/* Top Controls Bar */}
      <div
        role="presentation"
        className="w-full flex items-center justify-between px-6 py-3 bg-black/40 border-b border-white/10 z-10 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-white">
          <div className="text-body-sm font-semibold truncate max-w-xs sm:max-w-md">
            {zoomState.title || zoomState.alt || "Chi tiết ảnh"}
          </div>
          <span className="text-caption text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nền ca-rô toggle */}
          <button
            type="button"
            onClick={() => setShowCheckerboard((v) => !v)}
            title="Bật/Tắt nền trong suốt (Alpha)"
            className={`px-2.5 py-1.5 text-caption font-medium rounded-lg transition ${
              showCheckerboard
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Nền caro
          </button>

          {/* Thu nhỏ */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
            title="Thu nhỏ (-)"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <ZoomOut size={18} />
          </button>

          {/* Phóng to */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s + 0.25, 5))}
            title="Phóng to (+)"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <ZoomIn size={18} />
          </button>

          {/* Đặt lại zoom */}
          <button
            type="button"
            onClick={() => {
              setScale(1)
              setPosition({ x: 0, y: 0 })
            }}
            title="Đặt lại tỉ lệ (100%)"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <RotateCcw size={18} />
          </button>

          {/* Tải về */}
          <a
            href={zoomState.src}
            download={`${(zoomState.title || "image").replace(/\s+/g, "_")}.png`}
            target="_blank"
            rel="noreferrer"
            title="Tải ảnh gốc về máy"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <Download size={18} />
          </a>

          <div className="h-4 w-px bg-white/20 mx-1" />

          {/* Nút Đóng */}
          <button
            type="button"
            onClick={handleClose}
            title="Đóng (ESC)"
            className="p-1.5 bg-white/10 text-white hover:bg-danger/80 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        role="button"
        tabIndex={0}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          // Chỉ đóng nếu click vào khoảng trống xung quanh ảnh
          if (e.target === e.currentTarget) handleClose()
        }}
      >
        <div
          className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-75 select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            ...(showCheckerboard
              ? {
                  backgroundImage:
                    "linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  backgroundColor: "#1e293b",
                  borderRadius: "12px",
                }
              : {}),
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            ref={imgRef}
            src={zoomState.src}
            alt={zoomState.alt}
            draggable={false}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
          />
        </div>
      </div>

      {/* Bottom Hint Footer */}
      <div
        role="presentation"
        className="w-full text-center py-2 text-caption text-white/50 bg-black/30 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <span>Lăn chuột để phóng to / thu nhỏ • Kéo chuột để di chuyển • Nhấn ESC hoặc click ra ngoài để đóng</span>
      </div>
    </div>
  )
}
