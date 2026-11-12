"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Users } from "@/components/ui/icon-set/users"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Plus } from "@/components/ui/icon-set/plus"
import { Heart } from "@/components/ui/icon-set/heart"
import { Gift } from "@/components/ui/icon-set/gift"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getCareCardTemplate, type CareCardAssetCode, type CareCardContent } from "@/modules/care-cards/domain/care-card"
import { CareCardDesigner } from "@/components/care-cards/care-card-designer"
import { type CareSegmentOption, CreateSegmentModal } from "./create-segment-modal"
import { type CareCustomer, CareCustomerRow } from "./care-customer-row"

interface CareGoal {
  id: string
  name: string
  description: string
  defaultAssetCode: CareCardAssetCode
}

const CARE_GOALS: CareGoal[] = [
  {
    id: "AFTER_PURCHASE",
    name: "Sau mua hàng",
    description: "Cảm ơn khách và tạo ấn tượng chu đáo",
    defaultAssetCode: "49",
  },
  {
    id: "BIRTHDAY",
    name: "Sinh nhật & Dịp đặc biệt",
    description: "Chúc mừng sinh nhật kèm ưu đãi bất ngờ",
    defaultAssetCode: "50",
  },
  {
    id: "WIN_BACK",
    name: "Mời quay lại (Win-back)",
    description: "Khơi gợi nhu cầu cho khách lâu chưa ghé",
    defaultAssetCode: "52",
  },
  {
    id: "ANNIVERSARY",
    name: "Kỷ niệm đồng hành",
    description: "Tri ân chặng đường gắn bó cùng cửa hàng",
    defaultAssetCode: "51",
  },
  {
    id: "CARE_GUIDE",
    name: "Hướng dẫn bảo quản",
    description: "Mẹo nhỏ giúp sản phẩm luôn bền đẹp",
    defaultAssetCode: "55",
  },
]

interface CareWorkflowProps {
  initialAssetCode?: CareCardAssetCode
  storeName?: string
  storePhone?: string | undefined
}

export function CareWorkflow({
  initialAssetCode = "49",
  storeName = "Cửa hàng của bạn",
  storePhone,
}: CareWorkflowProps) {
  // Step state
  const [selectedGoal, setSelectedGoal] = useState<string>("AFTER_PURCHASE")
  const [currentAssetCode, setCurrentAssetCode] = useState<CareCardAssetCode>(initialAssetCode)
  const [cardContent, setCardContent] = useState<CareCardContent>(() => {
    const tpl = getCareCardTemplate(initialAssetCode)
    return {
      assetCode: initialAssetCode,
      recipientName: "",
      headline: tpl.defaultHeadline,
      messageBody: tpl.defaultMessage,
      signature: storeName,
      voucherCode: initialAssetCode === "52" ? "TRIAN10" : "",
      voucherValue: initialAssetCode === "52" ? "Giảm 10%" : "",
      careInstructions: tpl.defaultInstructions ?? [],
      accentColor: tpl.suggestedTheme,
    }
  })

  // Segments & Customers
  const [segments, setSegments] = useState<CareSegmentOption[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("ALL")
  const [customers, setCustomers] = useState<CareCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [sentCustomerIds, setSentCustomerIds] = useState<Set<string>>(new Set())
  const [isCreateSegmentOpen, setIsCreateSegmentOpen] = useState(false)

  // Load segments
  const loadSegments = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/customer-segments?limit=50")
      if (res.ok) {
        const data = await res.json()
        setSegments(data.data || [])
      }
    } catch {
      // Fallback
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    loadSegments()
  }, [loadSegments])

  // Load customers for chosen segment
  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    try {
      if (selectedSegmentId === "ALL") {
        const res = await fetch("/api/v1/customers?limit=50")
        if (res.ok) {
          const data = await res.json()
          setCustomers(data.data || [])
        }
      } else {
        const res = await fetch(`/api/v1/customer-segments/${selectedSegmentId}/customers?limit=50`)
        if (res.ok) {
          const data = await res.json()
          setCustomers(data.data || [])
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingCustomers(false)
    }
  }, [selectedSegmentId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    loadCustomers()
  }, [loadCustomers])

  const handleSelectGoal = (goal: CareGoal) => {
    setSelectedGoal(goal.id)
    setCurrentAssetCode(goal.defaultAssetCode)
    const tpl = getCareCardTemplate(goal.defaultAssetCode)
    setCardContent((prev) => ({
      ...prev,
      assetCode: goal.defaultAssetCode,
      headline: tpl.defaultHeadline,
      messageBody: tpl.defaultMessage,
      careInstructions: tpl.defaultInstructions ?? [],
      voucherCode: goal.defaultAssetCode === "52" ? "TRIAN10" : prev.voucherCode,
      voucherValue: goal.defaultAssetCode === "52" ? "Giảm 10%" : prev.voucherValue,
      accentColor: tpl.suggestedTheme,
    }))
  }

  const handleMarkSent = async (
    customerId: string,
    channel: "ZALO" | "PHONE" | "SMS",
    outcome: string
  ) => {
    try {
      const res = await fetch(`/api/v1/customers/${customerId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          direction: "OUTBOUND",
          summary: `Đã gửi ${cardContent.headline} (${cardContent.assetCode})`,
          outcome,
        }),
      })

      if (res.ok) {
        setSentCustomerIds((prev) => new Set([...prev, customerId]))
      }
    } catch {
      // Fallback
    }
  }

  return (
    <div className="space-y-8">
      {/* Bước 1 & Bước 2: Chọn Mục tiêu & Nhóm khách */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Mục tiêu chăm sóc */}
        <div className="md:col-span-7 bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-title-sm font-bold text-text">Bước 1: Chọn mục tiêu chăm sóc</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CARE_GOALS.map((goal) => {
              const isSelected = selectedGoal === goal.id
              return (
                <Button variant="ghost"
                  type="button"
                  key={goal.id}
                  onClick={() => handleSelectGoal(goal)}
                  className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 inline-block p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs"
                      : "border-border hover:border-border-hover bg-surface-alt/40 text-text"
                  }`}
                >
                  <div className="font-semibold text-body-sm">{goal.name}</div>
                  <div className="text-caption text-text-muted mt-0.5">{goal.description}</div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Nhóm khách hàng */}
        <div className="md:col-span-5 bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 className="text-title-sm font-bold text-text">Bước 2: Nhóm khách hàng</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateSegmentOpen(true)}
                className="h-8 px-2.5 text-caption flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo nhóm</span>
              </Button>
            </div>

            <div>
              <label htmlFor="care-send-1" className="block text-caption font-medium text-text-muted mb-1.5">
                Chọn phân nhóm gửi tin
              </label>
              <NativeSelect id="care-send-1"
                value={selectedSegmentId}
                onChange={(e) => setSelectedSegmentId(e.target.value)}
                className="w-full"
              >
                <option value="ALL">Tất cả khách hàng ({customers.length})</option>
                {segments.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name} ({seg.kind === "DYNAMIC" ? "Tự động" : "Tĩnh"})
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-caption text-text-muted">
            <span>Khách thoả điều kiện: <strong className="text-text">{customers.length}</strong></span>
            <span>Đã gửi: <strong className="text-primary">{sentCustomerIds.size}</strong></span>
          </div>
        </div>
      </div>

      {/* Bước 3: Soạn thiệp & nội dung */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-title-sm font-bold text-text">Bước 3: Tùy chỉnh thiệp & lời nhắn</h2>
        </div>
        <CareCardDesigner
          initialCode={currentAssetCode}
          storeName={storeName}
          storePhone={storePhone}
          onSelectCard={(c) => setCardContent(c)}
        />
      </div>

      {/* Bước 4: Danh sách khách hàng & Thực hiện gửi thủ công */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-title-sm font-bold text-text">
              Bước 4: Danh sách gửi thủ công ({customers.length} khách)
            </h2>
            <p className="text-caption text-text-muted mt-0.5">
              Gửi qua Zalo/cuộc gọi và bấm &quot;Đánh dấu đã gửi&quot; để tự động lưu vào nhật ký chăm sóc
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadCustomers}
            disabled={loadingCustomers}
            className="flex items-center gap-1.5 h-8 px-2.5 text-caption"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCustomers ? "animate-spin motion-reduce:animate-none" : ""}`} />
            <span>Làm mới</span>
          </Button>
        </div>

        {loadingCustomers ? (
          <div className="p-8 text-center text-text-muted text-body-sm">Đang tải danh sách khách hàng...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface-alt/40 space-y-2">
            <Users className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-body-sm font-semibold text-text">Chưa có khách hàng nào trong nhóm này</p>
            <p className="text-caption text-text-muted max-w-sm mx-auto">
              Hãy kiểm tra lại điều kiện phân nhóm hoặc chọn &quot;Tất cả khách hàng&quot; để bắt đầu gửi chăm sóc.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {customers.map((c) => (
              <CareCustomerRow
                key={c.id}
                customer={c}
                cardContent={cardContent}
                storeName={storeName}
                isSent={sentCustomerIds.has(c.id)}
                onMarkSent={handleMarkSent}
              />
            ))}
          </div>
        )}
      </div>

      <CreateSegmentModal
        isOpen={isCreateSegmentOpen}
        onClose={() => setIsCreateSegmentOpen(false)}
        onSuccess={(newSeg) => {
          setSegments((prev) => [newSeg, ...prev])
          setSelectedSegmentId(newSeg.id)
        }}
      />
    </div>
  )
}
