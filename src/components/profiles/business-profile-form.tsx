"use client"

import React, { useState, useEffect } from "react"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Phone } from "@/components/ui/icon-set/phone"
import { Mail } from "@/components/ui/icon-set/mail"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Globe } from "@/components/ui/icon-set/globe"
import { Clock } from "@/components/ui/icon-set/clock"
import { Check } from "@/components/ui/icon-set/check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BrandAudienceFields, parseAudience } from "./brand-audience-fields"
import type { BusinessProfileDetail } from "@/modules/profiles/use-cases/get-business-profile"
import type { UpsertBusinessProfileInput } from "@/modules/profiles/domain/repositories/business-profile-repository.interface"
import { useSession } from "@/lib/session"
import { DEFAULT_INDUSTRY } from "@/modules/organization/domain/industry-profile"
import { AiRewriteInput } from "./ai-rewrite-input"
import { IndustrySelectSection } from "./industry-select-section"
import { getIndustryPlaceholders } from "./business-profile-placeholders"

export interface BusinessProfileFormProps {
  initialData: BusinessProfileDetail | null
  onSave: (data: UpsertBusinessProfileInput) => Promise<boolean>
  saving: boolean
}

export function BusinessProfileForm({ initialData, onSave, saving }: BusinessProfileFormProps) {
  const { organization } = useSession()
  const [selectedIndustry, setSelectedIndustry] = useState<string>(organization?.industry || DEFAULT_INDUSTRY)

  const [displayName, setDisplayName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [website, setWebsite] = useState("")
  const [otherWebsites, setOtherWebsites] = useState("")
  const [taxCode, setTaxCode] = useState("")
  const [description, setDescription] = useState("")
  const [brandMessage, setBrandMessage] = useState("")
  const [audience, setAudience] = useState("")
  const [openTime, setOpenTime] = useState("08:00")
  const [closeTime, setCloseTime] = useState("21:00")
  const [facebookUrl, setFacebookUrl] = useState("")
  const [zaloUrl, setZaloUrl] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const indPlaceholders = getIndustryPlaceholders(selectedIndustry)

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ lại form khi dữ liệu ban đầu (props) đổi, chủ đích
      setDisplayName(initialData.display_name || "")
      setLegalName(initialData.legal_name || "")
      setPhone(initialData.phone || "")
      setEmail(initialData.email || "")
      setAddress(initialData.address || "")
      setWebsite(initialData.website || "")
      setTaxCode(initialData.tax_code || "")
      setDescription(initialData.description || "")
      setBrandMessage(initialData.brand_message || "")
      setAudience((initialData.target_customers ?? []).join(", "))

      const hours = initialData.operating_hours as { open?: string; close?: string } | null
      if (hours?.open) setOpenTime(hours.open)
      if (hours?.close) setCloseTime(hours.close)

      const socials = initialData.social_links as { facebook?: string; zalo?: string; instagram?: string; websites?: unknown } | null
      if (Array.isArray(socials?.websites)) setOtherWebsites(socials.websites.filter((w): w is string => typeof w === "string").join("\n"))
      if (socials?.facebook) setFacebookUrl(socials.facebook)
      if (socials?.zalo) setZaloUrl(socials.zalo)
      if (socials?.instagram) setInstagramUrl(socials.instagram)
    }
  }, [initialData])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!displayName.trim()) {
      errs.displayName = "Tên hiển thị cửa hàng không được để trống"
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Định dạng email không hợp lệ"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const payload: UpsertBusinessProfileInput = {
      display_name: displayName.trim(),
      legal_name: legalName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      website: website.trim() || null,
      tax_code: taxCode.trim() || null,
      description: description.trim() || null,
      brand_message: brandMessage.trim() || null,
      target_customers: parseAudience(audience),
      operating_hours: {
        open: openTime,
        close: closeTime,
      },
      social_links: {
        facebook: facebookUrl.trim() || null,
        zalo: zaloUrl.trim() || null,
        instagram: instagramUrl.trim() || null,
        websites: otherWebsites.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean).slice(0, 5),
      },
    }

    await onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Khối 0: Ngành nghề kinh doanh & Lĩnh vực hoạt động */}
      <IndustrySelectSection
        selectedIndustry={selectedIndustry}
        onSelectIndustry={setSelectedIndustry}
      />

      {/* Khối 1: Thông tin cơ bản & Pháp lý */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">Thông tin pháp lý & Nhận diện</h3>
            <p className="text-caption text-text-muted">Tên thương hiệu xuất hiện trên hóa đơn, website và hợp đồng</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-field-1" className="block text-caption font-semibold text-text mb-1.5">
              Tên hiển thị cửa hàng <span className="text-danger">*</span>
            </label>
            <Input id="profile-field-1"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={indPlaceholders.displayName}
              hasError={Boolean(errors.displayName)}
            />
            {errors.displayName && (
              <p className="mt-1 text-caption font-medium text-danger">{errors.displayName}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-field-2" className="block text-caption font-semibold text-text mb-1.5">
              Tên pháp lý công ty / Hộ kinh doanh
            </label>
            <Input id="profile-field-2"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder={indPlaceholders.legalName}
            />
          </div>

          <div>
            <label htmlFor="profile-field-3" className="block text-caption font-semibold text-text mb-1.5">
              Mã số thuế (nếu có)
            </label>
            <Input id="profile-field-3"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              placeholder="0101234567"
            />
          </div>

          <div>
            <AiRewriteInput
              value={description}
              onChange={setDescription}
              placeholder={indPlaceholders.description}
              fieldType="description"
              label="Mô tả ngắn gọn về cửa hàng"
              helperText="Được AI sử dụng làm bối cảnh chính để giới thiệu cơ sở trên Landing Page và Catalog"
            />
          </div>
          <BrandAudienceFields brandMessage={brandMessage} onBrandMessage={setBrandMessage} audience={audience} onAudience={setAudience} />
        </div>
      </div>

      {/* Khối 2: Thông tin liên hệ & Kênh phân phối */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
            <Phone size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">Kênh liên hệ & Nhận đơn hàng</h3>
            <p className="text-caption text-text-muted">Tự động gắn vào Zalo scripts, Thẻ chào hàng A6 và nút bấm E-Catalog</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-field-4" className="block text-caption font-semibold text-text mb-1.5">
              Hotline / Số Zalo tư vấn chính
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" />
              <Input id="profile-field-4"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-field-5" className="block text-caption font-semibold text-text mb-1.5">
              Email chăm sóc khách hàng
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" />
              <Input id="profile-field-5"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@tiemhoathaomoc.vn"
                hasError={Boolean(errors.email)}
                className="pl-10"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-caption font-medium text-danger">{errors.email}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-field-6" className="block text-caption font-semibold text-text mb-1.5">
              Địa chỉ cửa hàng chính
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" />
              <Input id="profile-field-6"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số 123 Đường Hoa Hồng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-field-7" className="block text-caption font-semibold text-text mb-1.5">
              Website cửa hàng (nếu có)
            </label>
            <div className="relative">
              <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" />
              <Input id="profile-field-7"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://tiemhoathaomoc.vn"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-other-websites" className="block text-caption font-semibold text-text mb-1.5">
              Website khác (mỗi dòng một địa chỉ, tối đa 5)
            </label>
            <Textarea
              id="profile-other-websites"
              rows={2}
              value={otherWebsites}
              onChange={(e) => setOtherWebsites(e.target.value)}
              placeholder={"https://shop.tiemhoathaomoc.vn\nhttps://hoacuoi.tiemhoathaomoc.vn"}
              className="text-body-sm"
            />
          </div>

          <div>
            <label htmlFor="profile-field-8" className="block text-caption font-semibold text-text mb-1.5">
              Fanpage Facebook
            </label>
            <Input id="profile-field-8"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/tiemhoathaomoc"
            />
          </div>
        </div>
      </div>

      {/* Khối 3: Giờ vận hành */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning-text">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">Khung giờ mở cửa & Giao hàng</h3>
            <p className="text-caption text-text-muted">Hiển thị trên thông tin đặt hàng và trả lời tự động</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-field-9" className="block text-caption font-semibold text-text mb-1.5">
              Giờ mở cửa buổi sáng
            </label>
            <Input id="profile-field-9"
              type="time"
              aria-label="Giờ mở cửa buổi sáng"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="profile-field-10" className="block text-caption font-semibold text-text mb-1.5">
              Giờ đóng cửa buổi tối
            </label>
            <Input id="profile-field-10"
              type="time"
              aria-label="Giờ đóng cửa buổi tối"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Nút lưu ở chân form */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="gap-2 px-6"
        >
          <Check size={16} />
          <span>{saving ? "Đang lưu..." : "Lưu hồ sơ kinh doanh"}</span>
        </Button>
      </div>
    </form>
  )
}
