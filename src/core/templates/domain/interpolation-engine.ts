/**
 * ALG Template Engine — Variable Interpolation Engine
 * Bộ phân tích và trộn biến an toàn cho template văn bản/kịch bản.
 *
 * DỰ TRỮ, KHÔNG PHẢI NỢ (nợ #99, chốt 17/09) — xem chú thích đầy đủ ở
 * `../golden-templates.ts`. `interpolateTemplate()` là logic thuần, có test,
 * nhưng KHÔNG được `generateZaloPitchScript()` hay bất kỳ luồng thật nào gọi
 * tới — giữ lại làm hạ tầng dự trữ theo quyết định của anh Tony.
 */

import type { InterpolationContext } from "./template-types"

/**
 * Lấy giá trị biến theo đường dẫn key dạng dot-notation (vd: "product.name" hoặc "flower.summary_list")
 */
export function resolveVariablePath(context: InterpolationContext, key: string): string | undefined {
  const normalizedKey = key.trim()
  const parts = normalizedKey.split(".")

  let current: unknown = context
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    // Hỗ trợ cả camelCase và snake_case
    const camelPart = part.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    const node = current as Record<string, unknown>
    current = node[part] ?? node[camelPart]
  }

  if (current === undefined || current === null) return undefined
  if (typeof current === "string") return current
  if (typeof current === "number" || typeof current === "boolean") return String(current)
  if (Array.isArray(current)) return current.join(", ")
  return String(current)
}

import { sanitizeFlowerContent } from "@/core/ai/domain/flower-content-guard"

/**
 * Trộn các biến số trong chuỗi template theo định dạng `{{key}}` hoặc `{{key | default: "..."}}`
 */
export function interpolateTemplate(
  templateString: string,
  context: InterpolationContext,
  options?: { fallback?: string; sanitize?: boolean; brandForbiddenStyles?: string | null }
): string {
  if (!templateString) return ""

  // Regex nhận diện {{ key }} hoặc {{ key | default: "giá trị mặc định" }}
  const tokenRegex = /\{\{\s*([a-zA-Z0-9_.]+)(?:\s*\|\s*default:\s*["']([^"']*)["'])?\s*\}\}/g

  let result = templateString.replace(tokenRegex, (match, key, defaultValue) => {
    const resolved = resolveVariablePath(context, key)
    if (resolved !== undefined && resolved !== "") {
      return resolved
    }
    if (defaultValue !== undefined) {
      return defaultValue
    }
    return options?.fallback ?? ""
  })

  if (options?.sanitize) {
    const sanitizedRes = sanitizeFlowerContent(result, {
      brandForbiddenStyles: options.brandForbiddenStyles,
    })
    result = sanitizedRes.sanitizedText
  }

  return result
}


/**
 * Trích xuất danh sách tất cả các biến số được sử dụng trong chuỗi template
 */
export function extractTemplateVariables(templateString: string): string[] {
  if (!templateString) return []
  const tokenRegex = /\{\{\s*([a-zA-Z0-9_.]+)(?:\s*\|\s*default:\s*["'][^"']*["'])?\s*\}\}/g
  const vars = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(templateString)) !== null) {
    if (match[1]) {
      vars.add(match[1])
    }
  }

  return Array.from(vars)
}
