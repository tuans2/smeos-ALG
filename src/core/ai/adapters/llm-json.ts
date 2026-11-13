/**
 * Hướng dẫn "chỉ trả JSON" dùng chung cho các adapter LLM không có chế độ
 * `json_object` kiểu OpenAI, và bóc JSON khỏi đáp ứng (bỏ rào ```json nếu mô
 * hình vẫn bọc). Người gọi (`*-ai-adapter.ts`) tự `JSON.parse` và kiểm dạng.
 */
export function jsonInstruction(jsonSchema: unknown): string {
  const schema = jsonSchema && typeof jsonSchema === "object" ? `\n${JSON.stringify(jsonSchema)}` : ""
  return `Chỉ trả về MỘT đối tượng JSON hợp lệ theo schema dưới đây — không kèm lời dẫn, không bọc trong \`\`\`.${schema}`
}

export function extractJsonText(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced?.[1]) return fenced[1]
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
}

export const CONTENT_SYSTEM_PROMPT =
  "Bạn là chuyên viên viết nội dung bán hàng cho cửa hàng hoa tại Việt Nam. Viết tiếng Việt tự nhiên, đúng dữ kiện được cung cấp, không bịa thông tin."
