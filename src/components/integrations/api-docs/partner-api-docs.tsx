import { Disclosure } from "@/components/ui/disclosure"
import type { ApiOperation, PartnerApiReference } from "@/modules/integration/use-cases/partner-api-reference"
import { ApiFieldList } from "./api-field-list"
import { InlineText } from "./inline-text"
import { PARTNER_GUIDE, type GuideSection } from "./partner-guide"

const ERROR_LABEL: Record<string, string> = {
  "400": "400 dữ liệu sai",
  "401": "401 chưa xác thực",
  "403": "403 thiếu quyền",
  "404": "404 không thấy",
  "413": "413 thân quá lớn",
  "422": "422 vi phạm luật",
  "429": "429 vượt giới hạn",
  "500": "500 lỗi máy chủ",
}

/**
 * Tài liệu Integration API cho đối tác (ARC-024 B3–B5): hướng dẫn viết tay + tham chiếu sinh từ OpenAPI.
 * Progressive disclosure (UX-P03): "Bắt đầu nhanh" mở sẵn; phần còn lại và từng endpoint mở khi cần.
 */
export function PartnerApiDocs({ reference }: { reference: PartnerApiReference }) {
  const groups = [...new Set(reference.operations.map((op) => op.group))]
  return (
    <div className="space-y-8">
      <section aria-labelledby="huong-dan" className="space-y-3">
        <h2 id="huong-dan" className="text-title font-semibold text-text">Hướng dẫn</h2>
        {PARTNER_GUIDE.map((section, index) => (
          <Disclosure key={section.id} label={section.title} defaultOpen={index === 0}>
            <GuideBody section={section} />
          </Disclosure>
        ))}
      </section>

      <section aria-labelledby="tham-chieu" className="space-y-4">
        <div className="space-y-1">
          <h2 id="tham-chieu" className="text-title font-semibold text-text">Tham chiếu</h2>
          <p className="text-body-sm text-text-muted">
            Đường dẫn gốc <code className="text-text">{reference.baseUrl}</code> · phiên bản {reference.version} · sinh tự động từ mã, luôn khớp máy chủ.
          </p>
        </div>
        {groups.map((group) => (
          <div key={group} className="space-y-2">
            <h3 className="text-title-sm font-semibold text-text">{group}</h3>
            {reference.operations
              .filter((op) => op.group === group)
              .map((op) => (
                <Disclosure key={op.id} label={`${op.method} ${op.path} · ${op.summary}`}>
                  <OperationBody op={op} />
                </Disclosure>
              ))}
          </div>
        ))}
      </section>
    </div>
  )
}

function GuideBody({ section }: { section: GuideSection }) {
  return (
    <div className="space-y-3 px-3.5 pb-3.5 text-body-sm text-text">
      {section.paragraphs.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {section.code && (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-surface-alt p-3 text-meta text-text">
          <code>{section.code}</code>
        </pre>
      )}
      {section.rows && (
        <dl className="divide-y divide-border rounded-xl border border-border">
          {section.rows.map(([term, detail]) => (
            <div key={term} className="space-y-0.5 p-3">
              <dt className="font-semibold text-text">{term}</dt>
              <dd className="text-text-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function OperationBody({ op }: { op: ApiOperation }) {
  return (
    <div className="space-y-4 px-3.5 pb-3.5">
      {op.description && <p className="text-body-sm text-text"><InlineText text={op.description} /></p>}
      <p className="text-meta text-text-muted">Xác thực: {op.auth.join(" hoặc ")}</p>
      <ApiFieldList label="Tham số truy vấn" fields={op.query} />
      <ApiFieldList label="Thân yêu cầu (JSON)" fields={op.body} />
      {op.responses.map((response) => (
        <ApiFieldList
          key={response.status}
          label={`Phản hồi ${response.status} · ${response.description}${response.nullable ? " (có thể rỗng)" : ""}`}
          fields={response.fields}
        />
      ))}
      {op.errors.length > 0 && (
        <p className="text-meta text-text-muted">Lỗi có thể gặp: {op.errors.map((code) => ERROR_LABEL[code] ?? code).join(" · ")}</p>
      )}
    </div>
  )
}
