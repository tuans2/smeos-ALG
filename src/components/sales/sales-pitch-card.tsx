"use client"

import { useState, useRef } from "react"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Gift } from "@/components/ui/icon-set/gift"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Maximize2 } from "@/components/ui/icon-set/maximize2"
import { Tag } from "@/components/ui/icon-set/tag"
import { Clock } from "@/components/ui/icon-set/clock"
import { Heart } from "@/components/ui/icon-set/heart"
import { Pencil } from "@/components/ui/icon-set/pencil"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Layers } from "@/components/ui/icon-set/layers"
import { Phone } from "@/components/ui/icon-set/phone"
import { Store } from "@/components/ui/icon-set/store"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { HelpCircle } from "@/components/ui/icon-set/help-circle"
import { Eye } from "@/components/ui/icon-set/eye"
import { Download } from "@/components/ui/icon-set/download"
import { FileDown } from "@/components/ui/icon-set/file-down"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Unlock } from "@/components/ui/icon-set/unlock"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { MessageSquareText } from "@/components/ui/icon-set/message-square-text"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { BookOpen } from "@/components/ui/icon-set/book-open"
import { toBlob, toPng, toJpeg } from "html-to-image"
import jsPDF from "jspdf"
import {
  TabActionHeader,
  type TabItem,
  type TabAction,
  type TabOverflowAction,
} from "@/components/ui/tab-header"
import { SalesPitchCardA6, ZaloScriptBox } from "@/components/templates/product-analysis"
import { CreateOrderModal, type CreateOrderInitialData } from "@/components/orders/create-order-modal"
import { SalesScriptLibraryModal } from "./sales-script-library-modal"
import { PitchInlineEditor } from "./pitch/pitch-inline-editor"
import { PitchCardTab } from "./pitch/pitch-card-tab"
import {
  type SalesPitchData,
  type SalesPitchOverrides,
  type SalesPitchItem,
  generateZaloPitchScript,
  formatCurrencyVnd,
  DEFAULT_FREE_GIFTS,
  DEFAULT_GUARANTEES,
} from "@/modules/products/domain/sales-pitch-template"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SalesPitchCardProps {
  pitchData: SalesPitchData
  onOverridesChange?: (overrides: SalesPitchOverrides) => void
  onFinalize?: (finalizedPitch: SalesPitchData) => void
  /** Tab mở đầu (mặc định "card"); "edit" khi cần user duyệt ngay — nút "Duyệt nội dung" nằm ở tab này */
  initialTab?: "edit" | "card" | "script"
}

export function SalesPitchCard({ pitchData, onOverridesChange, onFinalize, initialTab = "card" }: SalesPitchCardProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"edit" | "card" | "script">(initialTab)
  const [editTab, setEditTab] = useState<"general" | "bom" | "gifts">("general")
  const [justFinalized, setJustFinalized] = useState(false)

  // Local state initialized from pitchData
  const [productName, setProductName] = useState(pitchData.productName)
  const [sku, setSku] = useState(pitchData.sku ?? "")
  const [style, setStyle] = useState(pitchData.style)
  const [occasions, setOccasions] = useState<string[]>(pitchData.occasions)
  const [newOccasion, setNewOccasion] = useState("")
  const [description, setDescription] = useState(pitchData.description)

  const [mainFlowers, setMainFlowers] = useState<SalesPitchItem[]>(
    pitchData.mainFlowers.length > 0
      ? pitchData.mainFlowers
      : [{ id: "f-0", name: "Sản phẩm", quantity: 10, unit: "cành", color: "Tự nhiên", role: "Chủ đạo" }]
  )
  const [foliageItems, setFoliageItems] = useState<SalesPitchItem[]>(pitchData.foliageItems)
  const [accessoryItems, setAccessoryItems] = useState<SalesPitchItem[]>(pitchData.accessoryItems)

  const [container, setContainer] = useState(pitchData.container)
  const [wrapping, setWrapping] = useState(pitchData.wrapping)
  // Nợ #96 (18/09): `dimensions.heightCm`/`widthCm` nay là `number | null` —
  // không còn mặc định bịa 55×40. `?? ""` giữ đúng khuôn đã dùng cho
  // `price`/`originalPrice` ngay dưới: null -> ô trống, không phải số 0.
  const [heightCm, setHeightCm] = useState<number | string>(pitchData.dimensions.heightCm ?? "")
  const [widthCm, setWidthCm] = useState<number | string>(pitchData.dimensions.widthCm ?? "")

  const [price, setPrice] = useState<number | string>(pitchData.priceVnd ?? "")
  const [originalPrice, setOriginalPrice] = useState<number | string>(pitchData.originalPriceVnd ?? "")
  const [priceSegment, setPriceSegment] = useState(pitchData.priceSegment)

  const [freeGifts, setFreeGifts] = useState<string[]>(pitchData.freeGifts ?? DEFAULT_FREE_GIFTS)
  const [newGift, setNewGift] = useState("")
  const [guarantees, setGuarantees] = useState<string[]>(pitchData.guarantees ?? DEFAULT_GUARANTEES)
  const [newGuarantee, setNewGuarantee] = useState("")

  // Không dùng tên thương hiệu/hotline giả trông như thật làm fallback — nếu
  // pitchData chưa có (hồ sơ tenant trống), phải hiện rõ đây là chỗ cần cập nhật.
  const [shopName, setShopName] = useState(pitchData.shopName ?? "Chưa cập nhật tên cửa hàng")
  const [shopHotline, setShopHotline] = useState(pitchData.shopHotline ?? "Chưa cập nhật hotline")
  const [customNote, setCustomNote] = useState(pitchData.customNote ?? "")

  const [status, setStatus] = useState<"DRAFT" | "FINALIZED">(pitchData.status ?? "DRAFT")
  const [finalizedAt, setFinalizedAt] = useState<string | null>(pitchData.finalizedAt ?? null)

  // Ref & states for Image / PDF export
  const cardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Cấu hình hiển thị Thẻ Chào Đa Kích Thước (Công cụ 03)
  const [cardFormat, setCardFormat] = useState<"a6" | "square" | "story">("a6")
  const [cardTheme, setCardTheme] = useState<"classic" | "minimal" | "festive">("classic")

  // State & Data cho tác vụ BH-15: Chuyển Báo giá / Thẻ chào thành Đơn hàng 1-chạm
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(false)

  // State cho Thư viện kịch bản tư vấn chốt sale (KB-01..14)
  const [isScriptLibraryOpen, setIsScriptLibraryOpen] = useState(false)

  const orderInitialData: CreateOrderInitialData = {
    items: [
      {
        description: `${productName}${sku ? ` [${sku}]` : ""}`,
        quantity: 1,
        unitPriceVnd: typeof price === "number" ? price : (Number(price) || 0),
        sampleImageUrl: pitchData.imageUrl || undefined,
        bomSummary: mainFlowers.map((f) => `${f.name} (${f.quantity} ${f.unit})`).join(", "),
        bomFlowers: mainFlowers.map((f) => ({
          flowerName: f.name,
          quantity: typeof f.quantity === "number" ? f.quantity : (Number(f.quantity) || 1),
          unit: f.unit || "cành",
          color: f.color || "Tươi",
        })),
        wrapStyle: wrapping || undefined,
        ribbon: accessoryItems.map((a) => a.name).join(", ") || undefined,
      },
    ],
    internalNote: `Mẫu từ Thẻ chào: ${productName}. Phong cách: ${style}. Dịp: ${occasions.join(", ")}.${freeGifts.length > 0 ? ` Quà tặng: ${freeGifts.join(", ")}.` : ""}`,
    cardMessage: occasions.some((o) => o.toLowerCase().includes("sinh nhật"))
      ? "Chúc mừng sinh nhật!"
      : occasions.some((o) => o.toLowerCase().includes("khai trương"))
      ? "Chúc mừng khai trương hồng phát!"
      : "",
  }

  const sanitizeFileName = (name: string) => {
    return (
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "the-chao-san-pham"
    )
  }

  const exportOptions = {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    skipFonts: true,
    fontEmbedCSS: "",
  }

  const handleCopyCardImage = async () => {
    if (!cardRef.current) return
    setIsExporting(true)
    setExportError(null)
    try {
      const blob = await toBlob(cardRef.current, exportOptions)
      if (!blob) throw new Error("Không tạo được dữ liệu ảnh")

      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2500)
        setExportSuccess("Đã copy ảnh vào Clipboard! Nhấn Ctrl+V (hoặc Cmd+V) để dán vào Zalo/Messenger ngay.")
        setTimeout(() => setExportSuccess(null), 4000)
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${sanitizeFileName(productName)}-the-chao.png`
        link.click()
        URL.revokeObjectURL(url)
        setExportSuccess("Trình duyệt không hỗ trợ dán ảnh trực tiếp, đã tự động tải ảnh PNG về máy!")
        setTimeout(() => setExportSuccess(null), 4000)
      }
    } catch (err) {
      console.error("Lỗi copy ảnh:", err)
      setExportError("Không thể copy trực tiếp vào clipboard. Đang tải file PNG về máy...")
      handleDownloadPng()
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadPng = async () => {
    if (!cardRef.current) return
    setIsExporting(true)
    setExportError(null)
    try {
      const dataUrl = await toPng(cardRef.current, exportOptions)
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `${sanitizeFileName(productName)}-the-chao.png`
      link.click()
      setExportSuccess("Đã tải ảnh Thẻ Chào (PNG 2x Retina)!")
      setTimeout(() => setExportSuccess(null), 3500)
    } catch (err) {
      console.error("Lỗi tải ảnh PNG:", err)
      setExportError("Không thể tạo ảnh PNG. Vui lòng thử lại.")
      setTimeout(() => setExportError(null), 3500)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadJpeg = async () => {
    if (!cardRef.current) return
    setIsExporting(true)
    setExportError(null)
    try {
      const dataUrl = await toJpeg(cardRef.current, {
        ...exportOptions,
        quality: 0.95,
      })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `${sanitizeFileName(productName)}-the-chao.jpeg`
      link.click()
      setExportSuccess("Đã tải ảnh Thẻ Chào (JPEG)!")
      setTimeout(() => setExportSuccess(null), 3500)
    } catch (err) {
      console.error("Lỗi tải ảnh JPEG:", err)
      setExportError("Không thể tạo ảnh JPEG.")
      setTimeout(() => setExportError(null), 3500)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return
    setIsExporting(true)
    setExportError(null)
    try {
      const dataUrl = await toPng(cardRef.current, exportOptions)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a6",
      })
      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${sanitizeFileName(productName)}-the-chao.pdf`)
      setExportSuccess("Đã xuất file PDF Thẻ Chào Khách (Khổ A6 chuẩn in ấn) thành công!")
      setTimeout(() => setExportSuccess(null), 3500)
    } catch (err) {
      console.error("Lỗi xuất PDF:", err)
      setExportError("Không thể tạo file PDF.")
      setTimeout(() => setExportError(null), 3500)
    } finally {
      setIsExporting(false)
    }
  }

  // Generate real-time active pitch data for display
  const activePitch: SalesPitchData = {
    ...pitchData,
    productName,
    sku: sku || null,
    style,
    occasions,
    description,
    mainFlowers,
    foliageItems,
    accessoryItems,
    container,
    wrapping,
    // Nợ #96 (18/09): bỏ hẳn "|| 55"/"|| 40" — đó chính là cách con số bịa
    // cũ lọt vào runtime (kể cả khi Sales để trống, `Number("") || 55` vẫn
    // ra 55). Giữ đúng khuôn `priceVnd`/`originalPriceVnd` ngay trên: trống
    // -> `null`, không suy ra số mặc định.
    dimensions: {
      heightCm: heightCm === "" ? null : Number(heightCm),
      widthCm: widthCm === "" ? null : Number(widthCm),
    },
    priceVnd: price === "" ? null : Number(price),
    originalPriceVnd: originalPrice === "" ? null : Number(originalPrice),
    priceSegment,
    freeGifts,
    guarantees,
    shopName,
    shopHotline,
    customNote: customNote || null,
    status,
    finalizedAt,
  }

  const scriptText = generateZaloPitchScript(activePitch)

  const handleCopyZalo = async () => {
    try {
      await navigator.clipboard.writeText(scriptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleFinalize = () => {
    const now = new Date().toISOString()
    setStatus("FINALIZED")
    setFinalizedAt(now)
    setJustFinalized(true)
    setActiveTab("card")

    const finalizedData: SalesPitchData = {
      ...activePitch,
      status: "FINALIZED",
      finalizedAt: now,
    }

    onOverridesChange?.(finalizedData)
    onFinalize?.(finalizedData)

    setTimeout(() => setJustFinalized(false), 5000)
  }

  // Helpers for editing flower items
  const updateFlower = <K extends keyof SalesPitchItem>(index: number, field: K, value: SalesPitchItem[K]) => {
    setMainFlowers((prev) => {
      const copy = [...prev]
      const current = copy[index]
      if (current) {
        copy[index] = { ...current, [field]: value }
      }
      return copy
    })
  }

  const addFlower = () => {
    setMainFlowers((prev) => [
      ...prev,
      { id: `flower-${Date.now()}`, name: "Hoa mới", quantity: 5, unit: "cành", color: "Tươi", role: "Điểm nhấn" },
    ])
  }

  const removeFlower = (index: number) => {
    setMainFlowers((prev) => prev.filter((_, i) => i !== index))
  }

  // Helpers for editing foliage
  const updateFoliage = <K extends keyof SalesPitchItem>(index: number, field: K, value: SalesPitchItem[K]) => {
    setFoliageItems((prev) => {
      const copy = [...prev]
      const current = copy[index]
      if (current) {
        copy[index] = { ...current, [field]: value }
      }
      return copy
    })
  }

  const addFoliage = () => {
    setFoliageItems((prev) => [
      ...prev,
      { id: `foliage-${Date.now()}`, name: "Lá đệm mới", quantity: 3, unit: "cành" },
    ])
  }

  const removeFoliage = (index: number) => {
    setFoliageItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Helpers for editing occasions
  const addOccasion = () => {
    if (newOccasion.trim() && !occasions.includes(newOccasion.trim())) {
      setOccasions((prev) => [...prev, newOccasion.trim()])
      setNewOccasion("")
    }
  }

  const removeOccasion = (index: number) => {
    setOccasions((prev) => prev.filter((_, i) => i !== index))
  }

  // Helpers for gifts & guarantees
  const addGiftItem = () => {
    if (newGift.trim()) {
      setFreeGifts((prev) => [...prev, newGift.trim()])
      setNewGift("")
    }
  }

  const removeGiftItem = (index: number) => {
    setFreeGifts((prev) => prev.filter((_, i) => i !== index))
  }

  const addGuaranteeItem = () => {
    if (newGuarantee.trim()) {
      setGuarantees((prev) => [...prev, newGuarantee.trim()])
      setNewGuarantee("")
    }
  }

  const removeGuaranteeItem = (index: number) => {
    setGuarantees((prev) => prev.filter((_, i) => i !== index))
  }

  // Define dynamic actions for TabActionHeader based on activeTab
  const getTabActions = (): { primary: TabAction[]; overflow: TabOverflowAction[] } => {
    if (activeTab === "edit") {
      const primary: TabAction[] =
        status !== "FINALIZED"
          ? [
              {
                id: "finalize",
                label: "Duyệt nội dung",
                icon: CheckCircle2,
                variant: "success",
                onClick: handleFinalize,
              },
            ]
          : [
              {
                id: "finalized-badge",
                label: "Đã duyệt",
                icon: CheckCircle2,
                variant: "outline",
                disabled: true,
                onClick: () => {},
              },
            ]

      const overflow: TabOverflowAction[] = []
      if (status === "FINALIZED") {
        overflow.push({
          id: "unlock",
          label: "Mở khóa sửa lại",
          icon: Unlock,
          onClick: () => {
            setStatus("DRAFT")
            setActiveTab("edit")
          },
        })
      }
      overflow.push({
        id: "reset",
        label: "Đặt lại dữ liệu gốc",
        icon: RotateCcw,
        onClick: () => {
          setProductName(pitchData.productName)
          setDescription(pitchData.description)
          setPrice(pitchData.priceVnd ?? "")
          setOriginalPrice(pitchData.originalPriceVnd ?? "")
        },
      })

      return { primary, overflow }
    }

    if (activeTab === "card") {
      const primary: TabAction[] = [
        {
          id: "create-order",
          label: "Tạo đơn hàng",
          icon: ShoppingBag,
          variant: "primary",
          onClick: () => setIsOrderModalOpen(true),
        },
        {
          id: "copy-card",
          label: copiedImage ? "Đã sao chép ảnh!" : "Sao chép ảnh Zalo",
          icon: copiedImage ? Check : Copy,
          variant: "outline",
          loading: isExporting,
          onClick: handleCopyCardImage,
        },
      ]

      const overflow: TabOverflowAction[] = [
        {
          id: "dl-png",
          label: "Tải ảnh PNG",
          icon: Download,
          disabled: isExporting,
          onClick: handleDownloadPng,
        },
        {
          id: "dl-jpeg",
          label: "Tải ảnh JPEG",
          icon: ImageIcon,
          disabled: isExporting,
          onClick: handleDownloadJpeg,
        },
        {
          id: "dl-pdf",
          label: "Xuất file PDF (khổ A6)",
          icon: FileDown,
          disabled: isExporting,
          onClick: handleDownloadPdf,
        },
      ]

      if (status === "FINALIZED") {
        overflow.push({
          id: "unlock",
          label: "Mở khóa chỉnh sửa",
          icon: Unlock,
          dividerAbove: true,
          onClick: () => {
            setStatus("DRAFT")
            setActiveTab("edit")
          },
        })
      }

      return { primary, overflow }
    }

    if (activeTab === "script") {
      const primary: TabAction[] = [
        {
          id: "open-script-library",
          label: "Thư viện kịch bản",
          icon: BookOpen,
          variant: "outline",
          onClick: () => setIsScriptLibraryOpen(true),
        },
        {
          id: "create-order-script",
          label: "Tạo đơn từ mẫu này",
          icon: ShoppingBag,
          variant: "outline",
          onClick: () => setIsOrderModalOpen(true),
        },
        {
          id: "copy-script",
          label: copied ? "Đã sao chép kịch bản!" : "Sao chép kịch bản",
          icon: copied ? Check : Copy,
          variant: "primary",
          onClick: handleCopyZalo,
        },
      ]

      const overflow: TabOverflowAction[] = [
        {
          id: "edit-content",
          label: "Chỉnh sửa nội dung",
          icon: Pencil,
          onClick: () => setActiveTab("edit"),
        },
        {
          id: "goto-card",
          label: "Xem thẻ chào A6",
          icon: Eye,
          onClick: () => setActiveTab("card"),
        },
      ]

      if (status === "FINALIZED") {
        overflow.push({
          id: "unlock",
          label: "Mở khóa chỉnh sửa",
          icon: Unlock,
          dividerAbove: true,
          onClick: () => {
            setStatus("DRAFT")
            setActiveTab("edit")
          },
        })
      }

      return { primary, overflow }
    }

    return { primary: [], overflow: [] }
  }

  const tabItems: TabItem[] = [
    { id: "edit", label: "Chỉnh sửa thông tin", icon: Pencil },
    { id: "card", label: "Thẻ chào khách", icon: Eye, badge: "A6", badgeTone: "accent" },
    { id: "script", label: "Kịch bản tư vấn", icon: MessageSquareText, badgeTone: "success" },
  ]

  // eslint-disable-next-line react-hooks/refs -- chỉ dựng danh sách nút; cardRef được đọc trong onClick (xuất ảnh), không đọc lúc render
  const currentTabActions = getTabActions()

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto">
      {/* Celebration Banner when finalized */}
      {justFinalized && (
        <div className="flex items-center gap-3 rounded-2xl bg-success/10 border-2 border-success/30 p-4 text-success animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-white flex-shrink-0">
            <CheckCircle2 size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-body-sm font-bold">Lưu thẻ chào sản phẩm thành công!</h4>
            <p className="text-caption opacity-90">
              Thẻ đã được duyệt và lưu vào <strong>Kho ảnh & nội dung</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Banner khi tạo đơn hàng thành công từ Thẻ chào */}
      {orderCreatedSuccess && (
        <div className="flex items-center gap-3 rounded-2xl bg-success/10 border-2 border-success/30 p-4 text-success animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-white flex-shrink-0">
            <CheckCircle2 size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-body-sm font-bold">Tạo đơn hàng thành công!</h4>
            <p className="text-caption opacity-90">
              Đơn hàng đã được chuyển sang mục <strong>Đơn hàng</strong> với đầy đủ thành phần hoa để chuẩn bị chế tác.
            </p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-caption font-bold text-accent-text uppercase tracking-wider">Tư vấn bán hàng</span>
            {status === "FINALIZED" ? (
              <Badge className="bg-success/15 text-success border border-success/30 font-bold text-caption gap-1 py-0.5">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                ĐÃ DUYỆT
              </Badge>
            ) : (
              <Badge tone="neutral" className="font-semibold text-caption py-0.5">
                Bản nháp
              </Badge>
            )}
          </div>
          <h2 className="mt-0.5 text-title sm:text-title-lg font-extrabold text-text tracking-tight">Thẻ chào sản phẩm và kịch bản tư vấn</h2>
          <p className="text-caption text-text-muted mt-0.5">
            Chỉnh sửa thông tin hoa, giá bán và quà tặng trước khi sử dụng.
          </p>
        </div>
      </div>

      {/* Standardized SaaS Tab Action Header (Tabs on Left + Actions on Top-Right) */}
      <TabActionHeader
        tabs={tabItems}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as "edit" | "card" | "script")}
        primaryActions={currentTabActions.primary}
        overflowActions={currentTabActions.overflow}
      />

      {/* TAB 1: FULL INLINE EDITOR */}
      {activeTab === "edit" && (
        <PitchInlineEditor
          generalProps={{
            productName,
            setProductName,
            sku,
            setSku,
            style,
            setStyle,
            price,
            setPrice,
            originalPrice,
            setOriginalPrice,
            shopHotline,
            setShopHotline,
            shopName,
            setShopName,
            occasions,
            removeOccasion,
            newOccasion,
            setNewOccasion,
            addOccasion,
            description,
            setDescription,
            customNote,
            setCustomNote,
          }}
          bomProps={{
            mainFlowers,
            addFlower,
            updateFlower,
            removeFlower,
            foliageItems,
            addFoliage,
            updateFoliage,
            removeFoliage,
            container,
            setContainer,
            wrapping,
            setWrapping,
            heightCm,
            setHeightCm,
            widthCm,
            setWidthCm,
          }}
          giftsProps={{
            freeGifts,
            setFreeGifts,
            removeGiftItem,
            newGift,
            setNewGift,
            addGiftItem,
            guarantees,
            setGuarantees,
            removeGuaranteeItem,
            newGuarantee,
            setNewGuarantee,
            addGuaranteeItem,
          }}
          status={status}
          onViewCard={() => setActiveTab("card")}
          onFinalize={handleFinalize}
        />
      )}

      {/* TAB 2: THẺ CHÀO KHÁCH (VISUAL CARD KHỔ A6 & XUẤT ẢNH / PDF) */}
      {activeTab === "card" && (
        <PitchCardTab
          cardRef={cardRef}
          activePitch={activePitch}
          status={status}
          cardFormat={cardFormat}
          setCardFormat={setCardFormat}
          cardTheme={cardTheme}
          setCardTheme={setCardTheme}
          exportSuccess={exportSuccess}
          exportError={exportError}
          onOpenEdit={() => setActiveTab("edit")}
          onOpenOrderModal={() => setIsOrderModalOpen(true)}
          onOpenScript={() => setActiveTab("script")}
        />
      )}

      {/* TAB 3: KỊCH BẢN ZALO (HIỂN THỊ KHI activeTab = 'script') */}
      {activeTab === "script" && (
        <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
          <ZaloScriptBox
            script={scriptText}
            onCopySuccess={() => setCopied(true)}
          />

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("card")}
              className="text-caption font-semibold gap-1 text-text hover:text-primary"
            >
              <Eye size={13} />
              ← Xem Thẻ chào khách A6
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScriptLibraryOpen(true)}
                className="text-caption font-semibold gap-1.5 text-text hover:text-primary"
              >
                <BookOpen size={14} />
                Thư viện 14 kịch bản chốt sale
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOrderModalOpen(true)}
                className="text-caption font-semibold gap-1.5 text-primary border-primary/40 hover:bg-primary/5"
              >
                <ShoppingBag size={14} />
                Chốt đơn hàng ngay
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo đơn hàng 1-chạm (BH-15) */}
      <CreateOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSuccess={() => {
          setIsOrderModalOpen(false)
          setOrderCreatedSuccess(true)
          setTimeout(() => setOrderCreatedSuccess(false), 5000)
        }}
        initialData={orderInitialData}
      />

      {/* Modal Thư viện 14 kịch bản tư vấn thực chiến (KB-01..14) */}
      <SalesScriptLibraryModal
        isOpen={isScriptLibraryOpen}
        onClose={() => setIsScriptLibraryOpen(false)}
        variables={{
          productName,
          priceVnd: typeof price === "number" ? price : (Number(price) || 0),
          occasion: occasions[0] || "sinh nhật",
          style,
          freeGifts: freeGifts.join(", "),
          shopName,
          hotline: shopHotline,
        }}
      />
    </div>
  )
}
