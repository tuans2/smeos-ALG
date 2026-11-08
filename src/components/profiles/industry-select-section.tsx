"use client"

import React, { useState } from "react"
import { Store } from "@/components/ui/icon-set/store"
import { Lock } from "@/components/ui/icon-set/lock"
import { Unlock } from "@/components/ui/icon-set/unlock"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Database } from "@/components/ui/icon-set/database"
import { Check } from "@/components/ui/icon-set/check"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Checkbox } from "@/components/ui/checkbox"
import { listAllIndustries, getIndustryDefinition, DEFAULT_INDUSTRY } from "@/modules/organization/domain/industry-profile"
import { canOverrideIndustryLock } from "@/modules/organization/domain/organization-settings-policy"
import { useSession } from "@/lib/session"

export interface IndustrySelectSectionProps {
  selectedIndustry: string
  onSelectIndustry: (newKey: string) => void
}

export function IndustrySelectSection({
  selectedIndustry,
  onSelectIndustry,
}: IndustrySelectSectionProps) {
  const { organization, platformCapabilities, organizationType } = useSession()
  const toast = useToast()
  const isSuperAdmin = canOverrideIndustryLock(platformCapabilities ?? [])
  const isUnlocked = isSuperAdmin || !Boolean(organization?.industryLocked)

  const [loadingMockKey, setLoadingMockKey] = useState<string | null>(null)
  const [autoSeedMockData, setAutoSeedMockData] = useState<boolean>(true)
  const [mockSuccessMsg, setMockSuccessMsg] = useState<string | null>(null)
  const [industrySaved, setIndustrySaved] = useState<boolean>(false)

  const currentIndDef = getIndustryDefinition(selectedIndustry || DEFAULT_INDUSTRY)

  const handleApplyMockData = async (industryKey: string) => {
    setLoadingMockKey(industryKey)
    setMockSuccessMsg(null)
    try {
      const res = await fetch("/api/v1/business-profile/mock-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry_key: industryKey }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || "Không thể nạp dữ liệu mẫu")
      }
      const json = await res.json()
      onSelectIndustry(industryKey)
      setMockSuccessMsg(`Đã nạp dữ liệu mẫu ngành ${json.data?.industryName || industryKey} (${json.data?.businessName})!`)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không nạp được dữ liệu mẫu")
    } finally {
      setLoadingMockKey(null)
    }
  }

  const handleUpdateIndustry = async (newKey: string) => {
    onSelectIndustry(newKey)
    try {
      const res = await fetch("/api/v1/organizations/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            industry: newKey,
          },
        }),
      })
      if (res.ok) {
        setIndustrySaved(true)
        setTimeout(() => {
          setIndustrySaved(false)
          window.location.reload()
        }, 1000)
      }
    } catch {
      // Bỏ qua lỗi mạng
    }
  }

  const handleSelect = async (newKey: string) => {
    if (organizationType === "EXPERIENCE" && isSuperAdmin && autoSeedMockData) {
      await handleApplyMockData(newKey)
    } else {
      await handleUpdateIndustry(newKey)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-surface p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-sm font-bold text-text">Lĩnh vực hoạt động / Ngành nghề</h3>
              <span className="text-caption font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {currentIndDef.name}
              </span>
            </div>
            <p className="text-caption text-text-muted mt-0.5">
              Định hình giao diện, cấu trúc catalog, định mức nguyên liệu và trợ lý AI phù hợp với mô hình kinh doanh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-bg text-success border border-success/20 text-caption font-bold">
              <Unlock size={13} />
              <span>{isSuperAdmin ? "Quản trị nền tảng — được đổi ngành" : "Được đổi ngành"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-alt text-text-muted border border-border text-caption font-semibold">
              <Lock size={13} />
              <span>Đã cố định theo đăng ký ban đầu</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {organizationType === "EXPERIENCE" && isSuperAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <label className="inline-flex items-center gap-2 cursor-pointer text-caption font-semibold text-text select-none">
              <Checkbox
                checked={autoSeedMockData}
                onCheckedChange={(checked) => setAutoSeedMockData(checked === true)}
              />
              <span>Tự động nạp dữ liệu mẫu (tên cửa hàng, logo, sản phẩm mẫu) khi đổi ngành</span>
            </label>

            <Button
              type="button"
              size="sm"
              disabled={loadingMockKey !== null}
              onClick={() => handleApplyMockData(selectedIndustry)}
              className="gap-1.5 shrink-0"
              title={`Nạp đồng bộ toàn bộ tên shop, logo và sản phẩm mẫu cho ngành ${currentIndDef.name}`}
            >
              <Database size={13} className={loadingMockKey === selectedIndustry ? "animate-spin motion-reduce:animate-none" : ""} />
              <span>
                {loadingMockKey === selectedIndustry
                  ? "Đang đồng bộ..."
                  : `Nạp dữ liệu mẫu ${currentIndDef.name}`}
              </span>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {listAllIndustries().map((ind) => {
            const isSelected = ind.key === selectedIndustry
            const isLoadingThis = loadingMockKey === ind.key

            return (
              <div
                key={ind.key}
                className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border bg-surface hover:border-primary/40"
                } ${!isUnlocked ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div>
                  <div className="flex items-center justify-between w-full mb-1">
                    {/* Nút chọn ngành phủ cả thẻ (after:inset-0); nút "Nạp" nằm trên lớp phủ */}
                    <Button variant="ghost"
                      type="button"
                      aria-pressed={isSelected}
                      disabled={!isUnlocked || loadingMockKey !== null}
                      onClick={() => handleSelect(ind.key)}
                      className="h-auto p-0 justify-start gap-0 text-left text-body-sm font-bold text-text after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring disabled:cursor-not-allowed"
                    >
                      {ind.name}
                    </Button>
                    {isSelected && <Check size={14} className="text-primary font-bold" />}
                  </div>
                  <p className="text-caption text-text-muted line-clamp-2 leading-relaxed">
                    {ind.description}
                  </p>
                </div>

                {organizationType === "EXPERIENCE" && isUnlocked && (
                  <div className="relative z-10 mt-3 pt-2 border-t border-border/60 flex items-center justify-between w-full gap-1.5">
                    <span className="text-caption text-text-muted font-medium">Dữ liệu mẫu</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loadingMockKey !== null}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApplyMockData(ind.key)
                      }}
                      className="h-6 px-2 text-caption font-bold bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 gap-1"
                      title={`Nạp dữ liệu mẫu cho ngành ${ind.name}`}
                    >
                      <Sparkles size={11} className={isLoadingThis ? "animate-spin motion-reduce:animate-none" : "text-primary"} />
                      <span>{isLoadingThis ? "Đang nạp..." : "Nạp"}</span>
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!isUnlocked && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-alt border border-border mt-3">
            <div className="flex items-center gap-2 text-caption text-text-muted">
              <Lock size={14} className="text-text-muted shrink-0" />
              <span>Ngành nghề được khóa để bảo vệ toàn vẹn dữ liệu mẫu sản phẩm và catalog đã tạo.</span>
            </div>
            <p className="text-caption text-text-muted shrink-0">Cần đổi ngành? Liên hệ quản trị viên smeOS.</p>
          </div>
        )}

        {mockSuccessMsg && (
          <p className="text-caption font-bold text-success animate-in fade-in">
            ✓ {mockSuccessMsg} Đang làm mới trang...
          </p>
        )}

        {industrySaved && !mockSuccessMsg && (
          <p className="text-caption font-bold text-success animate-in fade-in">
            ✓ Đã cập nhật ngành nghề thành công! Hệ thống đang tải lại...
          </p>
        )}
      </div>
    </div>
  )
}
