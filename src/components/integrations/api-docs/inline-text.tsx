import * as React from "react"

/**
 * Hiển thị mô tả lấy từ OpenAPI: `**đậm**` → chữ đậm, `` `mã` `` → mã (ARC-024 B5). Chỉ hai dạng này — không dựng
 * HTML từ chuỗi (không `dangerouslySetInnerHTML`), nên không có đường chèn mã.
 */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((part) => part.length > 0)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-text">{part.slice(2, -2)}</strong>
        if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-surface-alt px-1 text-text">{part.slice(1, -1)}</code>
        return <React.Fragment key={index}>{part}</React.Fragment>
      })}
    </>
  )
}
