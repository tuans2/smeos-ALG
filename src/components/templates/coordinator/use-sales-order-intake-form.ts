"use client"

import React, { useState, useEffect } from "react"
import type { AccessoryBomItem, FlowerBomItem, FoliageBomItem, WrappingLayer } from "@/modules/products/domain/product-master-index"
import { coordinatorApi, errorMessage, uploadCoordinatorPhoto, type CreateOrderRequest } from "@/components/coordinator/coordinator-api"
import type { CustomerMatch, MasterPreset, SalesOrderIntakeModalProps } from "./sales-order-intake-types"

/** Toàn bộ state, tải dữ liệu và xử lý gửi của hộp "Tiếp nhận đơn hàng". */
export function useSalesOrderIntakeForm({ isOpen, onClose, onSubmit }: SalesOrderIntakeModalProps) {
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerTier, setCustomerTier] = useState<"NEW" | "BRONZE" | "SILVER" | "GOLD" | "VIP">("NEW")
  // ĐP-2.9 (26/09/2026): chọn khách từ Customer Master Index — có `customerId`
  // thì máy chủ TỰ lấy tên/SĐT/hạng từ CMI và bỏ qua giá trị nhập tay bên
  // dưới, nên khoá 3 ô đó lại để không tạo cảm giác sai là sửa được.
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerQuery, setCustomerQuery] = useState("")
  const [customerMatches, setCustomerMatches] = useState<CustomerMatch[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)

  // ĐP-2.6 (26/09/2026): giữ lại ID của sản phẩm Master Index đã chọn — cho
  // phép máy chủ chụp snapshot (§5) và ghi vết nếu Sales sửa BOM (§6) sau khi
  // chọn. Sửa BOM KHÔNG xoá `productId` — vẫn cùng một mẫu, chỉ khác chỗ nào
  // đã tuỳ biến.
  const [productId, setProductId] = useState<string | null>(null)
  const [selectedProductBom, setSelectedProductBom] = useState<{
    foliage: FoliageBomItem[]
    wrapping: WrappingLayer[]
    accessories: AccessoryBomItem[]
  } | null>(null)

  const [recipientName, setRecipientName] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")

  // Chuẩn hóa địa chỉ phân cấp 5 tầng: Mặc định để trống để người dùng tự nhập liệu
  const [addressStreet, setAddressStreet] = useState("")
  const [addressWard, setAddressWard] = useState("")
  const [addressDistrict, setAddressDistrict] = useState("")
  const [addressCity, setAddressCity] = useState("")
  const [addressCountry, setAddressCountry] = useState("Việt Nam")

  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [deliveryTime, setDeliveryTime] = useState("17:00")

  const [productTitle, setProductTitle] = useState("")
  const [unitPriceVnd, setUnitPriceVnd] = useState<number>(0)
  // ĐP-4a.4 (26/09/2026, sổ thu §2.14): tuỳ chọn — khách trả trước bao nhiêu
  // lúc nhận đơn. 0/để trống = không ghi cọc lúc này (ghi sau ở Sổ thu).
  const [depositVnd, setDepositVnd] = useState<number>(0)
  // ĐP-4a.1 (26/09/2026): cột `priority` + danh mục thật đã có — ô "Mức ưu
  // tiên" quay lại đây, bỏ trống = máy TỰ GỢI Ý (§2.15.1) lúc tạo đơn.
  const [channel, setChannel] = useState("")
  const [orderType, setOrderType] = useState("")
  const [serviceLevel, setServiceLevel] = useState("")
  const [deliveryType, setDeliveryType] = useState("")
  const [deliveryLocationType, setDeliveryLocationType] = useState("")
  const [priority, setPriority] = useState("")
  /** Danh mục theo khoá (`priority`/`serviceLevel`/…) → mã+nhãn đang active. */
  const [catalogs, setCatalogs] = useState<Record<string, { code: string; label: string }[]>>({})
  const [catalogsError, setCatalogsError] = useState<string | null>(null)
  const [cardMessage, setCardMessage] = useState("")
  // ĐP-4a.1 (26/09/2026): "Có thiệp/băng rôn" — cần thì `cardMessage` bắt
  // buộc (kiểm ở máy chủ, `http-schemas.ts`); trước bản này cờ này không có
  // cột, form chỉ có ô lời nhắn tuỳ chọn.
  const [cardRequired, setCardRequired] = useState(false)
  const [internalNote, setInternalNote] = useState("")
  const [sampleImageUrl, setSampleImageUrl] = useState<string>("")
  const [sampleAssetId, setSampleAssetId] = useState<string | null>(null)
  // ĐP-3.16 (26/09/2026): giá trị trường tự tạo (entity ORDER, khoá `cf_...`).
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Ảnh tải lên đi qua kho `assets` của tổ chức (không base64 trong đơn).
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setFormError(null)
    setIsUploading(true)
    try {
      const { assetId, previewUrl } = await uploadCoordinatorPhoto(file)
      setSampleAssetId(assetId)
      setSampleImageUrl(previewUrl)
    } catch (error) {
      setFormError(`Không tải được ảnh mẫu: ${errorMessage(error)}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Danh sách BOM cành hoa nguyên tử
  const [flowers, setFlowers] = useState<FlowerBomItem[]>([])

  const handlePrefillSampleAddressHN = () => {
    setAddressStreet("195 Lương Thế Vinh")
    setAddressWard("Phường Trung Văn")
    setAddressDistrict("Quận Nam Từ Liêm")
    setAddressCity("Hà Nội")
    setAddressCountry("Việt Nam")
  }

  const handlePrefillSampleAddressHCM = () => {
    setAddressStreet("68 Nguyễn Huệ, Bến Nghé")
    setAddressWard("Phường Bến Nghé")
    setAddressDistrict("Quận 1")
    setAddressCity("TP. Hồ Chí Minh")
    setAddressCountry("Việt Nam")
  }

  const handleClearAddress = () => {
    setAddressStreet("")
    setAddressWard("")
    setAddressDistrict("")
    setAddressCity("")
    setAddressCountry("Việt Nam")
  }

  // Master index presets để Sales bấm chọn nhanh
  const [masterProducts, setMasterProducts] = useState<MasterPreset[]>([])

  useEffect(() => {
    if (!isOpen) return
    fetch("/api/v1/products/master-index?limit=20")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setMasterProducts(res.items)
        }
      })
      .catch(() => {
        // Graceful fallback nếu server offline
      })
  }, [isOpen])

  // ĐP-2.9: tìm khách trong Customer Master Index khi Sales gõ tên/SĐT — có
  // gõ ít nhất 2 ký tự mới tìm, tránh gọi API cho một chữ cái.
  useEffect(() => {
    if (!isOpen || customerId || customerQuery.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- xoá kết quả tìm cũ khi điều kiện tìm không còn thoả (query rỗng/đã chọn khách), không phải side-effect ngoài React
      setCustomerMatches([])
      return
    }
    const handle = setTimeout(() => {
      setCustomerSearching(true)
      fetch(`/api/v1/crm/customers?search=${encodeURIComponent(customerQuery.trim())}&limit=6`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((res) => setCustomerMatches(Array.isArray(res.items) ? res.items : []))
        .catch(() => setCustomerMatches([]))
        .finally(() => setCustomerSearching(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [isOpen, customerQuery, customerId])

  // ĐP-4a.1 (26/09/2026): tải danh mục Phân loại & Ưu tiên (§2.15) cho các ô
  // chọn dưới — CHỈ giá trị đang active (`GET /field-config/catalogs`, R1).
  useEffect(() => {
    if (!isOpen) return
    coordinatorApi
      .listCatalogs(["priority", "serviceLevel", "channel", "orderType", "deliveryType", "deliveryLocationType"])
      .then((rows) => {
        const map: Record<string, { code: string; label: string }[]> = {}
        for (const row of rows) map[row.key] = row.values.map((v) => ({ code: v.code, label: v.label }))
        setCatalogs(map)
      })
      .catch((e) => setCatalogsError(errorMessage(e)))
  }, [isOpen])


  const handleSelectCustomer = (customer: CustomerMatch) => {
    setCustomerId(customer.id)
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone)
    if (customer.metrics?.tier) setCustomerTier(customer.metrics.tier as typeof customerTier)
    setCustomerQuery("")
    setCustomerMatches([])
  }

  const handleClearCustomer = () => {
    setCustomerId(null)
    setCustomerName("")
    setCustomerPhone("")
    setCustomerTier("NEW")
    setCustomerQuery("")
  }

  const handleSelectMasterProduct = (prod: MasterPreset) => {
    setProductId(prod.id)
    setProductTitle(prod.name)
    if (prod.masterImageUrl) {
      setSampleImageUrl(prod.masterImageUrl)
      setSampleAssetId(null)
    }
    if (prod.pricing?.quotePriceVnd) setUnitPriceVnd(prod.pricing.quotePriceVnd)
    if (prod.bom?.flowers && prod.bom.flowers.length > 0) {
      setFlowers(prod.bom.flowers)
    }
    // ĐP-2.10 (26/09/2026): TRƯỚC bản này, gói/nơ của mẫu bị nhồi thành văn
    // bản vào `internalNote` ("Gói: ... . Nơ: ..."), trộn dữ liệu có cấu trúc
    // (BOM) với chữ tự do — đúng lỗi cùng loại với 1.1/1.7. Nay hiện lá/gói/
    // phụ kiện đúng cấu trúc (chỉ đọc — sửa được từ ĐP-4a) thay vì ghi đè ghi
    // chú nội bộ của người dùng.
    setSelectedProductBom({
      foliage: prod.bom?.foliage ?? [],
      wrapping: prod.bom?.wrapping ?? [],
      accessories: prod.bom?.accessories ?? [],
    })
  }

  const handleAddFlower = () => {
    setFlowers((prev) => [
      ...prev,
      { flowerName: "", quantity: 1, unit: "cành", color: "Tự nhiên", role: "Phụ" },
    ])
  }

  const handleRemoveFlower = (index: number) => {
    setFlowers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFlowerChange = (index: number, field: keyof FlowerBomItem, val: string | number) => {
    setFlowers((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: val } : f))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!customerName || !recipientName || !recipientPhone || !addressStreet || !addressWard || !addressDistrict || !addressCity) {
      setFormError("Điền đủ khách hàng, người nhận và địa chỉ 4 tầng (Số nhà, Phường/Xã, Quận/Huyện, Tỉnh/TP).")
      return
    }

    const country = addressCountry.trim() || "Việt Nam"
    const deliveryAddress = {
      street: addressStreet.trim(),
      ward: addressWard.trim(),
      district: addressDistrict.trim(),
      city: addressCity.trim(),
      country,
      formattedAddress: [addressStreet, addressWard, addressDistrict, addressCity]
        .map((v) => v.trim())
        .concat(country)
        .filter(Boolean)
        .join(", "),
    }
    // Giờ hẹn thật (giờ máy người nhập) — máy chủ dùng nó tính rủi ro trễ (F09/F12).
    const target = new Date(`${deliveryDate}T${deliveryTime}:00`)
    const isStoredUrl = /^https?:\/\//i.test(sampleImageUrl) || sampleImageUrl.startsWith("/")

    const body: CreateOrderRequest = {
      ...(customerId ? { customerId } : {}),
      ...(productId ? { productId } : {}),
      customerName: customerName.trim(),
      customerTier,
      ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      deliveryAddress,
      deliveryTargetTime: `${deliveryTime} ngày ${deliveryDate}`,
      ...(Number.isNaN(target.getTime()) ? {} : { deliveryTargetAt: target.toISOString() }),
      productTitle: productTitle.trim() || "Sản phẩm thiết kế nghệ thuật",
      ...(sampleAssetId ? { sampleAssetId } : isStoredUrl ? { sampleImageUrl } : {}),
      unitPriceVnd: Number(unitPriceVnd) || 0,
      flowers: flowers
        .filter((f) => f.flowerName.trim())
        .map((f) => ({ flowerName: f.flowerName, quantity: Number(f.quantity) || 1, unit: f.unit, color: f.color, role: f.role })),
      ...(cardMessage.trim() ? { cardMessage } : {}),
      cardRequired,
      ...(internalNote.trim() ? { internalNote: internalNote.trim() } : {}),
      ...(Object.keys(customFields).length > 0 ? { customFields } : {}),
      ...(channel ? { channel } : {}),
      ...(orderType ? { orderType } : {}),
      ...(serviceLevel ? { serviceLevel } : {}),
      ...(deliveryType ? { deliveryType } : {}),
      ...(deliveryLocationType ? { deliveryLocationType } : {}),
      // Bỏ trống = để máy chủ TỰ GỢI Ý (§2.15.1) — không gửi giá trị mặc định giả.
      ...(priority ? { priority } : {}),
    }

    setIsSubmitting(true)
    try {
      await onSubmit(body, Number(depositVnd) || 0)
    } catch (error) {
      setFormError(errorMessage(error))
      return
    } finally {
      setIsSubmitting(false)
    }

    handleClearAddress()
    handleClearCustomer()
    setRecipientName("")
    setRecipientPhone("")
    setProductId(null)
    setSelectedProductBom(null)
    setProductTitle("")
    setUnitPriceVnd(0)
    setDepositVnd(0)
    setFlowers([])
    setCardMessage("")
    setCardRequired(false)
    setChannel("")
    setOrderType("")
    setServiceLevel("")
    setDeliveryType("")
    setDeliveryLocationType("")
    setPriority("")
    setInternalNote("")
    setSampleImageUrl("")
    setSampleAssetId(null)
    setCustomFields({})
    onClose()
  }

  return {
    customerName, setCustomerName, customerPhone, setCustomerPhone, customerTier, setCustomerTier,
    customerId, setCustomerId, customerQuery, setCustomerQuery, customerMatches, setCustomerMatches,
    customerSearching, setCustomerSearching, productId, setProductId, selectedProductBom, setSelectedProductBom,
    recipientName, setRecipientName, recipientPhone, setRecipientPhone, addressStreet, setAddressStreet,
    addressWard, setAddressWard, addressDistrict, setAddressDistrict, addressCity, setAddressCity,
    addressCountry, setAddressCountry, deliveryDate, setDeliveryDate, deliveryTime, setDeliveryTime,
    productTitle, setProductTitle, unitPriceVnd, setUnitPriceVnd, depositVnd, setDepositVnd,
    channel, setChannel, orderType, setOrderType, serviceLevel, setServiceLevel,
    deliveryType, setDeliveryType, deliveryLocationType, setDeliveryLocationType, priority, setPriority,
    catalogs, setCatalogs, catalogsError, setCatalogsError, cardMessage, setCardMessage,
    cardRequired, setCardRequired, internalNote, setInternalNote, sampleImageUrl, setSampleImageUrl,
    sampleAssetId, setSampleAssetId, customFields, setCustomFields, isUploading, setIsUploading,
    isSubmitting, setIsSubmitting, formError, setFormError, fileInputRef, handleFileUpload,
    flowers, setFlowers, handlePrefillSampleAddressHN, handlePrefillSampleAddressHCM, handleClearAddress, masterProducts,
    setMasterProducts, handleSelectCustomer, handleClearCustomer, handleSelectMasterProduct, handleAddFlower, handleRemoveFlower,
    handleFlowerChange, handleSubmit,
  }
}

export type SalesOrderIntakeForm = ReturnType<typeof useSalesOrderIntakeForm>
