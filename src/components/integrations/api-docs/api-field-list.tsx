import { Badge } from "@/components/ui/badge"
import { InlineText } from "./inline-text"
import type { ApiField } from "@/modules/integration/use-cases/partner-api-reference"

/**
 * Danh sách trường của thân/tham số/phản hồi (trang tài liệu đối tác). Dạng danh sách thay cho bảng để không cuộn
 * ngang ở 390px. Trường sắp gỡ có nhãn cảnh báo và câu giải thích luôn hiện (UX-017 — không giấu rủi ro).
 */
export function ApiFieldList({ fields, label }: { fields: ApiField[]; label: string }) {
  if (fields.length === 0) return null
  return (
    <section aria-label={label} className="space-y-2">
      <h4 className="text-body-sm font-semibold text-text">{label}</h4>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {fields.map((field) => (
          <ApiFieldItem key={field.name} field={field} />
        ))}
      </ul>
    </section>
  )
}

function ApiFieldItem({ field }: { field: ApiField }) {
  return (
    <li className="space-y-1 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="break-all text-body-sm font-semibold text-text">{field.name}</code>
        <span className="text-meta text-text-muted">{field.type}</span>
        {field.required && <Badge tone="neutral">Bắt buộc</Badge>}
        {field.nullable && <Badge tone="neutral">Có thể rỗng</Badge>}
        {field.deprecated && <Badge tone="warning">Sắp gỡ</Badge>}
      </div>
      {field.description && (
        <p className={field.deprecated ? "text-meta text-warning-text" : "text-meta text-text-muted"}><InlineText text={field.description} /></p>
      )}
      {field.allowed.length > 0 && (
        <p className="break-words text-meta text-text-muted">Giá trị: {field.allowed.join(", ")}</p>
      )}
      {field.children.length > 0 && (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-surface-alt">
          {field.children.map((child) => (
            <ApiFieldItem key={child.name} field={child} />
          ))}
        </ul>
      )}
    </li>
  )
}
