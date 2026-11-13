import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { ADDRESS_PART_MAX, type AddressParts } from "@/modules/greeting-card/domain/delivery-address"
import {
  districtNames,
  guessAddressSystem,
  provinceNames,
  wardNames,
  type AddressSystem,
} from "@/modules/greeting-card/domain/vn-address-units"
import { PickOrTypeField } from "./pick-or-type-field"
import { useVnAddressUnits } from "./use-vn-address-units"
import { useI18n } from "@/lib/i18n"

/**
 * Địa chỉ giao hàng: khách chọn hệ địa chỉ cũ (Tỉnh → Quận/Huyện → Phường/Xã, mặc định)
 * hoặc mới từ 01/07/2025 (Tỉnh → Phường/Xã), rồi bấm chọn từng cấp; không có trong danh sách thì tự nhập.
 */
export function AddressFields(props: {
  idPrefix: string
  value: AddressParts
  inputClassName: string
  onChange: (next: AddressParts) => void
}) {
  const { idPrefix, value, inputClassName, onChange } = props
  const { locale } = useI18n()
  const isEn = locale === "en"

  const [system, setSystem] = useState<AddressSystem>(() => guessAddressSystem(value))
  const units = useVnAddressUnits(system)
  const data = units.data
  const provinces = data ? provinceNames(data) : []
  const districts = data ? districtNames(data, value.province) : []
  const wards = data ? wardNames(data, value.province, value.district) : []
  const loadingHint = units.loading ? (isEn ? "Loading list..." : "Đang tải danh sách...") : null

  function switchSystem(next: AddressSystem) {
    if (next === system) return
    setSystem(next)
    // Tên tỉnh/phường hai hệ khác nhau → chọn lại từ đầu, giữ số nhà và đường
    onChange({ houseNumber: value.houseNumber, street: value.street, ward: "", province: "" })
  }

  const systemLabels: Record<AddressSystem, string> = {
    old: isEn ? "District system (Pre-2025)" : "Địa chỉ cũ (có Quận/Huyện)",
    new: isEn ? "New system (From 07/2025)" : "Địa chỉ mới (từ 01/07/2025)",
  }

  return (
    <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <legend className="mb-1 block text-body-sm font-bold text-text">
        {isEn ? "Delivery Address" : "Địa chỉ nhận hàng"} <span className="text-danger">*</span>
      </legend>

      <div role="radiogroup" aria-label={isEn ? "Address System" : "Kiểu địa chỉ"} className="flex flex-wrap gap-2 sm:col-span-2">
        {(["old", "new"] as const).map((s) => (
          <Button variant="outline"
            key={s}
            type="button"
            role="radio"
            aria-checked={system === s}
            onClick={() => switchSystem(s)}
            className={`py-0 gap-0 min-h-11 flex-1 rounded-xl border px-3 text-body-sm font-semibold transition ${
              system === s ? "border-primary bg-primary/10 text-primary hover:bg-primary/10" : "border-border bg-surface text-text-muted hover:border-primary/40 hover:bg-surface"
            }`}
          >
            {systemLabels[s]}
          </Button>
        ))}
      </div>
      {units.error && <p role="alert" className="text-caption text-danger sm:col-span-2">{units.error}</p>}

      <PickOrTypeField
        id={`${idPrefix}-province`}
        label={isEn ? "Province / City" : "Tỉnh / Thành phố"}
        required
        value={value.province}
        options={provinces}
        placeholder={isEn ? "e.g., Ho Chi Minh City, Ha Noi..." : "VD: Thành phố Hồ Chí Minh"}
        pickPlaceholder={loadingHint ?? (isEn ? "— Select Province / City —" : "— Chọn Tỉnh / Thành phố —")}
        inputClassName={inputClassName}
        onChange={(province) => onChange({ ...value, province, district: undefined, ward: "" })}
      />

      {system === "old" && (
        <PickOrTypeField
          id={`${idPrefix}-district`}
          label={isEn ? "District" : "Quận / Huyện"}
          required
          value={value.district ?? ""}
          options={districts}
          placeholder={isEn ? "e.g., District 1" : "VD: Quận 1"}
          pickPlaceholder={value.province ? (isEn ? "— Select District —" : "— Chọn Quận / Huyện —") : (isEn ? "Select Province/City first" : "Chọn Tỉnh / Thành phố trước")}
          inputClassName={inputClassName}
          onChange={(district) => onChange({ ...value, district, ward: "" })}
        />
      )}

      <PickOrTypeField
        id={`${idPrefix}-ward`}
        label={isEn ? "Ward / Commune" : "Phường / Xã"}
        required
        value={value.ward}
        options={wards}
        placeholder={isEn ? "e.g., Ben Nghe Ward" : "VD: Phường Bến Thành"}
        pickPlaceholder={isEn ? "— Select Ward / Commune —" : "— Chọn Phường / Xã —"}
        inputClassName={inputClassName}
        onChange={(ward) => onChange({ ...value, ward })}
      />

      <div>
        <label htmlFor={`${idPrefix}-street`} className="mb-1 block text-caption font-semibold text-text-muted">
          {isEn ? "Street / Village" : "Đường / Thôn / Ấp"} <span className="text-danger">*</span>
        </label>
        <Input
          id={`${idPrefix}-street`}
          type="text"
          required
          maxLength={ADDRESS_PART_MAX}
          placeholder={isEn ? "e.g., Le Loi, Nguyen Hue..." : "VD: Lê Lợi, Nguyễn Huệ..."}
          value={value.street ?? ""}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          className={inputClassName}
        />
      </div>

      <div className={system === "old" ? "sm:col-span-2" : ""}>
        <label htmlFor={`${idPrefix}-houseNumber`} className="mb-1 block text-caption font-semibold text-text-muted">
          {isEn ? "House / Building / Unit No." : "Số nhà / Tòa nhà / Phòng"} <span className="text-danger">*</span>
        </label>
        <Input
          id={`${idPrefix}-houseNumber`}
          type="text"
          required
          maxLength={ADDRESS_PART_MAX}
          placeholder={isEn ? "e.g., No. 45, Bitexco Tower 12th Floor..." : "VD: 45, Tòa Bitexco Tầng 12..."}
          value={value.houseNumber ?? ""}
          onChange={(e) => onChange({ ...value, houseNumber: e.target.value })}
          className={inputClassName}
        />
      </div>
    </fieldset>
  )
}
