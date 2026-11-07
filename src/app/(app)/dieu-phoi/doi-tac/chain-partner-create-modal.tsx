"use client"

import React, { useState } from "react"
import { Users } from "@/components/ui/icon-set/users"
import { Plus } from "@/components/ui/icon-set/plus"
import { Search } from "@/components/ui/icon-set/search"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Store } from "@/components/ui/icon-set/store"
import { Phone } from "@/components/ui/icon-set/phone"
import { Mail } from "@/components/ui/icon-set/mail"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { X } from "@/components/ui/icon-set/x"
import { Link2 } from "@/components/ui/icon-set/link2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import type { ChainPartnershipEntity } from "@/modules/chain-partnership/domain/partnership-entities"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import type { PartnerCredential } from "@/components/organization/partner-credential-dialog"

interface ChainPartnerModalProps {
  showModal: boolean
  onClose: () => void
  onSuccess: (credential?: PartnerCredential) => void
}

export function ChainPartnerCreateModal({
  showModal,
  onClose,
  onSuccess,
}: ChainPartnerModalProps) {
  const [activeTab, setActiveTab] = useState<"NEW" | "EXISTING">("NEW")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Form fields: Tạo mới
  const [partnerStoreName, setPartnerStoreName] = useState("")
  const [partnerCode, setPartnerCode] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [address, setAddress] = useState("")
  const [province, setProvince] = useState("Hà Nội")

  // Form fields: Mời cửa hàng có sẵn
  const [existingIdentifier, setExistingIdentifier] = useState("")
  const [existingPartnerCode, setExistingPartnerCode] = useState("")

  if (!showModal) return null

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSubmitting(true)

    try {
      let credential: PartnerCredential | undefined
      if (activeTab === "NEW") {
        const res = await fetch("/api/v1/coordinator/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partnerStoreName,
            partnerCode,
            contactName,
            contactPhone,
            contactEmail,
            address,
            province,
            partnershipType: "SUBCONTRACTOR",
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          setErrorMsg(json.message || "Không thể cấp tài khoản đối tác")
          return
        }
        // Mật khẩu ban đầu — máy chủ chỉ trả về một lần (audit AUD-009)
        if (json.temporaryPassword) {
          credential = { storeName: partnerStoreName, email: contactEmail, temporaryPassword: json.temporaryPassword }
        }
      } else {
        const res = await fetch("/api/v1/coordinator/partners/link-existing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: existingIdentifier,
            partnerCode: existingPartnerCode,
            partnershipType: "SUBCONTRACTOR",
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setErrorMsg(
            res.status === 404
              ? "Không tìm thấy cửa hàng với email chủ tiệm hoặc mã cửa hàng này"
              : json.error?.message || "Không thể liên kết cửa hàng này"
          )
          return
        }
      }

      onClose()
      // Reset form
      setPartnerStoreName("")
      setPartnerCode("")
      setContactName("")
      setContactPhone("")
      setContactEmail("")
      setAddress("")
      setExistingIdentifier("")
      setExistingPartnerCode("")
      onSuccess(credential)
    } catch {
      setErrorMsg("Đã xảy ra lỗi kết nối máy chủ")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={showModal}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-bold text-body-sm text-text">Thêm Cửa hàng Đối tác vào Chuỗi</span>
        </div>
      }
      subHeader={
        <div className="flex border-b border-border px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setActiveTab("NEW")
              setErrorMsg("")
            }}
            className={`flex-1 py-2 text-caption font-bold border-b-2 rounded-none transition-all flex items-center justify-center gap-1.5 h-auto ${
              activeTab === "NEW"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Cấp tài khoản mới
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setActiveTab("EXISTING")
              setErrorMsg("")
            }}
            className={`flex-1 py-2 text-caption font-bold border-b-2 rounded-none transition-all flex items-center justify-center gap-1.5 h-auto ${
              activeTab === "EXISTING"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> Mời tiệm đã có tài khoản
          </Button>
        </div>
      }
      size="md"
    >
      <div className="p-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-danger-subtle text-danger rounded-xl text-caption flex items-center gap-2 border border-danger/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreatePartner} className="space-y-3">
          {activeTab === "NEW" ? (
            <>
              <div>
                <label className="text-caption font-semibold text-text block mb-1">
                  Tên cửa hàng / Chi nhánh đối tác *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Ví dụ: Cửa Hàng Nhỏ - Chi nhánh Cầu Giấy"
                  value={partnerStoreName}
                  onChange={(e) => setPartnerStoreName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-semibold text-text block mb-1">
                    Mã đối tác (Mã định danh) *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="VD: DT-CG-01"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-caption font-semibold text-text block mb-1">
                    Khu vực (Tỉnh / Thành phố)
                  </label>
                  <Input
                    type="text"
                    placeholder="Hà Nội, TP.HCM..."
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-caption font-semibold text-text block mb-1">
                  Người đại diện / Quản lý *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Họ và tên chủ cửa hàng đối tác"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-semibold text-text block mb-1">
                    Email đăng nhập *
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="partner@shop.vn"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-caption font-semibold text-text block mb-1">
                    Số điện thoại liên hệ *
                  </label>
                  <Input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-caption font-semibold text-text block mb-1">
                  Địa chỉ tiệm
                </label>
                <Input
                  type="text"
                  placeholder="Số nhà, ngõ, đường phố..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-warning-subtle rounded-xl text-caption text-warning-text border border-warning/20 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>
                  Dành cho cửa hàng đã có tài khoản trên hệ thống smeOS. Dữ liệu sản phẩm và cài đặt của tiệm sẽ được giữ nguyên hoàn toàn.
                </span>
              </div>

              <div>
                <label className="text-caption font-semibold text-text block mb-1">
                  Email đại diện hoặc Mã / Slug cửa hàng *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Nhập email tài khoản hoặc slug tiệm (VD: chutiem@shop.vn)"
                  value={existingIdentifier}
                  onChange={(e) => setExistingIdentifier(e.target.value)}
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-text block mb-1">
                  Mã đối tác gán trong Chuỗi *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="VD: DT-QN-05"
                  value={existingPartnerCode}
                  onChange={(e) => setExistingPartnerCode(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="p-3 bg-surface-muted rounded-xl text-caption text-text-muted flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <span>
              Sau khi liên kết, hệ thống sẽ tự động mở kênh Chat nội bộ giữa Chuỗi và Cửa hàng này.
            </span>
          </div>

          <div className="pt-3 flex gap-2">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting
                ? "Đang xử lý..."
                : activeTab === "NEW"
                ? "Xác nhận & Cấp tài khoản mới"
                : "Xác nhận & Mời vào chuỗi"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
