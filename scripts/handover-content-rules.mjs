// Luật quét NỘI DUNG bản giao (kế hoạch GD1, Bước 2.4). Tách khỏi handover-check.mjs để test được.
// Phát hiện cũ ghi trong baseline (`rule|tệp` → số lần), chỉ được giảm; phát hiện mới làm lệnh kiểm đỏ.

/** Email dùng làm ví dụ hoặc địa chỉ hệ thống không phải dữ liệu thật. */
const SAFE_EMAIL_DOMAIN = /(^|\.)(example\.(com|org|net|vn)|test|invalid|local|localhost|example)$/i

export const CONTENT_RULES = [
  { rule: "tên bên khác", pattern: /\bSiiN\b|Siin[ _-]?Store|Mộc[ _-]?Lan|\bMoc[ _-]?Lan\b|moclan/gi },
  { rule: "số điện thoại", pattern: /(?<![\w.+-])(?:\+84|0)(?:3|5|7|8|9)\d{8}(?!\d)/g },
  {
    rule: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})\b/g,
    keep: (match) => !SAFE_EMAIL_DOMAIN.test(match[1]),
  },
  { rule: "mật khẩu viết cứng", pattern: /\b(?:password|passwd|mat_?khau|matKhau)\b["']?\s*[:=]\s*["'`][^"'`\s]{6,}["'`]/gi },
  { rule: "đường dẫn máy cá nhân", pattern: /file:\/\/\/|\/Users\/[A-Za-z]|C:\\\\?Users\\\\?|\/home\/(?!user\/|runner\/|node\/)[a-z][\w-]*\//g },
]

/** Tệp văn bản cần quét; bỏ khoá phụ thuộc (băm của gói) và tệp nhị phân. */
export function isScannable(file) {
  if (/(^|\/)package-lock\.json$/.test(file)) return false
  return /\.(tsx?|mts|mjs|cjs|jsx?|json|md|ya?ml|py|sh|sql|txt|csv|env|example|toml|css|html|prisma)$|(^|\/)\.env\.example$|Dockerfile$/.test(file)
}

/**
 * @param {string} file
 * @param {string} text
 * @returns {{ rule: string, path: string, count: number }[]}
 */
export function scanContent(file, text) {
  const out = []
  for (const { rule, pattern, keep } of CONTENT_RULES) {
    let count = 0
    for (const match of text.matchAll(pattern)) if (!keep || keep(match)) count += 1
    if (count) out.push({ rule, path: file, count })
  }
  return out
}

/**
 * So với baseline: trả phát hiện mới hoặc tăng, và mục baseline đã hết (nên xoá).
 * @param {{ rule: string, path: string, count: number }[]} findings
 * @param {Record<string, number>} baseline
 */
export function compareWithBaseline(findings, baseline) {
  const current = new Map(findings.map((f) => [`${f.rule}|${f.path}`, f.count]))
  const fresh = findings.filter((f) => f.count > (baseline[`${f.rule}|${f.path}`] ?? 0))
  const stale = Object.keys(baseline).filter((key) => (current.get(key) ?? 0) < baseline[key])
  return { fresh, stale }
}
