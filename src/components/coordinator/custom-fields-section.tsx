"use client"

import { useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { isAudienceAllowed, type EffectiveFieldConfig } from "@/modules/field-platform/domain/field-rules"
import type { FieldAudience } from "@/modules/field-platform/domain/core-field-registry"

/**
 * ĐP-3.16 (26/09/2026) — form nhập giá trị TRƯỜNG TỰ TẠO (Console Vận hành >
 * Trường dữ liệu) cho một thực thể (`ORDER`/`PARTNER`). Đọc cấu hình hiệu
 * lực qua `GET /api/v1/field-config?entity=` (`R1`, tenant, chỉ đọc — 3.14)
 * rồi tự vẽ một ô nhập theo `dataType`. CHỈ trường ORIGIN = CUSTOM hiện ở
 * đây — trường LÕI đã có ô nhập viết tay riêng ở từng form (T01…).
 *
 * `GET /field-config` không trả `origin` (chỉ trả hình dạng đã cộng lớp mã +
 * cấu hình, xem `EffectiveFieldConfig`) — lọc còn trường tự tạo bằng tiền tố
 * khoá `cf_`, đúng bất biến của `slugifyCustomFieldKey`/
 * `assertCustomFieldKeyNotReserved` (field-platform/domain/field-rules.ts):
 * MỌI trường tự tạo bắt buộc có khoá bắt đầu `cf_`, và trường lõi không bao
 * giờ được đặt khoá dạng đó — lọc theo tiền tố là an toàn, không phải suy
 * đoán.
 *
 * ĐỢT ĐẦU (3.16): có ô nhập cho TEXT/LONG_TEXT/NUMBER/MONEY_VND/DATE/
 * DATETIME/BOOLEAN/PHONE/EMAIL/URL/SELECT/MULTI_SELECT (SELECT/MULTI_SELECT
 * tạm nhập chuỗi tự do — danh mục lựa chọn thật của trường tự tạo, nếu có
 * dùng `catalogKey`, để đợt sau). IMAGE/FILE (cần luồng tải `assets` riêng)
 * và STRUCTURED_ADDRESS/ASSET_REF (kiểu dành cho trường LÕI, `custom-field-schema.ts`
 * đã chặn tạo trường tự tạo hai kiểu này) hiện ghi chú thay vì ô nhập, để
 * không chặn phần còn lại của form — sửa các kiểu đó qua
 * `PATCH /coordinator/orders/:id/custom-fields` trực tiếp.
 */

/**
 * Dùng thẳng `EffectiveFieldConfig` của field-platform (tệp thuần, không
 * import Prisma — an toàn nhúng vào bundle client) thay vì tự định nghĩa một
 * kiểu gần giống: để `visibleCustomFieldsForAudience` bên dưới tái dùng
 * ĐÚNG MỘT hàm `isAudienceAllowed` (field-rules.ts) cho lọc theo đối tượng
 * xem, không có một bản sao luật ẩn/hiện thứ hai trôi dạt khỏi bản gốc.
 */
export type EffectiveCustomFieldConfig = EffectiveFieldConfig

const UNSUPPORTED_INPUT_TYPES = new Set(["IMAGE", "FILE", "STRUCTURED_ADDRESS", "ASSET_REF"])

const inputClass =
  "w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-primary"

/** Nạp cấu hình trường tự tạo đang hiệu lực (đã cộng ghi đè theo tổ chức) cho một thực thể. */
export function useCustomFieldDefinitions(entity: "ORDER" | "PARTNER"): EffectiveCustomFieldConfig[] | null {
  const [defs, setDefs] = useState<EffectiveCustomFieldConfig[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setDefs(null)
      try {
        const res = await fetch(`/api/v1/field-config?entity=${entity}`)
        const json = (res.ok ? await res.json() : { data: [] }) as { data?: EffectiveCustomFieldConfig[] }
        if (cancelled) return
        const rows = json.data ?? []
        setDefs(rows.filter((d) => d.key.startsWith("cf_") && d.isEnabled))
      } catch {
        if (!cancelled) setDefs([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [entity])

  return defs
}

/** Một dòng nhãn + ô nhập cho MỘT trường tự tạo. */
export function ConfiguredField({
  def,
  value,
  onChange,
  currentStage,
}: {
  def: EffectiveCustomFieldConfig
  value: unknown
  onChange: (value: unknown) => void
  /** Bước hiện tại của đơn — chỉ để đánh dấu * khi trường bắt buộc ĐÚNG bước này. Bỏ qua với PARTNER. */
  currentStage?: string | undefined
}) {
  const requiredNow = def.requirement === "REQUIRED" && (!def.requiredAtStage || def.requiredAtStage === currentStage)

  return (
    <div>
      <label className="font-bold text-text block mb-1">
        {def.label}
        {requiredNow ? <span className="text-danger"> *</span> : null}
      </label>
      {renderCustomFieldInput(def, value, onChange)}
    </div>
  )
}

function renderCustomFieldInput(def: EffectiveCustomFieldConfig, value: unknown, onChange: (v: unknown) => void) {
  if (UNSUPPORTED_INPUT_TYPES.has(def.dataType)) {
    return (
      <p className="text-caption text-text-muted italic">
        Kiểu {def.dataType} chưa có ô nhập ở form này — sửa qua API custom-fields.
      </p>
    )
  }
  switch (def.dataType) {
    case "BOOLEAN":
      return (
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
      )
    case "NUMBER":
    case "MONEY_VND":
      return (
        <Input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      )
    case "DATE":
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )
    case "DATETIME":
      return (
        <Input
          type="datetime-local"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )
    case "LONG_TEXT":
      return (
        <Textarea
          rows={2}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default:
      // TEXT, PHONE, EMAIL, URL, SELECT, MULTI_SELECT.
      return (
        <Input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export interface VisibleCustomField {
  key: string
  label: string
  value: unknown
}

/**
 * ĐP-3.16 (26/09/2026) — lọc `custom_fields` của MỘT đơn/đối tác theo đối
 * tượng xem (PARTNER/SHIPPER/CUSTOMER), dùng `isAudienceAllowed` — cùng một
 * hàm nguyên tử mà `project-for-audience.ts` (field-platform, "cửa duy nhất
 * lọc theo đối tượng xem") dùng bên trong, để không có luật ẩn/hiện thứ hai.
 * Đi theo DANH SÁCH `defs` (chỉ trường đang ACTIVE, do `GET /field-config`
 * trả) thay vì theo khoá có sẵn trong `customFields` — trường đã bị TẮT
 * (không còn trong `defs`) thì giá trị cũ của nó KHÔNG hiện ra ở đây, dù vẫn
 * còn trong CSDL (khoá lạ trong `customFields` bị bỏ qua, không suy đoán
 * nhãn/độ nhạy cho trường không còn định nghĩa).
 */
export function visibleCustomFieldsForAudience(
  customFields: Record<string, unknown> | null | undefined,
  defs: readonly EffectiveFieldConfig[],
  audience: FieldAudience
): VisibleCustomField[] {
  const record = customFields ?? {}
  return defs
    .filter((d) => d.key.startsWith("cf_") && isAudienceAllowed(d, audience))
    .map((d) => ({ key: d.key, label: d.label, value: record[d.key] }))
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== "")
}

/** Danh sách trường tự tạo của một thực thể — không hiện gì nếu tổ chức chưa tạo trường nào. */
export function CustomFieldsSection({
  entity,
  currentStage,
  values,
  onChange,
}: {
  entity: "ORDER" | "PARTNER"
  currentStage?: string
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}) {
  const defs = useCustomFieldDefinitions(entity)
  if (!defs || defs.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <span className="font-extrabold text-text text-body-sm flex items-center gap-1.5 border-b border-border pb-1">
        Trường tự tạo (cấu hình riêng của tổ chức)
      </span>
      {defs.map((def) => (
        <ConfiguredField
          key={def.key}
          def={def}
          value={values[def.key]}
          currentStage={currentStage}
          onChange={(v) => onChange({ ...values, [def.key]: v })}
        />
      ))}
    </div>
  )
}
