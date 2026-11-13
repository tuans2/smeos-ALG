// Kiểm tra thuần (không cần trình duyệt) cho bộ audit UX — có test ở checks.test.ts.

/** Chỉ chạy trên database `*_test`: bộ audit tạo tổ chức, người dùng, sản phẩm, đơn mẫu. */
export function assertTestDatabase(url) {
  const name = (() => { try { return new URL(url).pathname.replace(/^\//, "") } catch { return "" } })()
  if (!name.endsWith("_test")) throw new Error(`ux-audit chỉ chạy trên database *_test (đang là "${name || "không rõ"}")`)
  return name
}

/** Dấu hiệu dữ liệu giả (chuỗi = tìm nguyên văn, RegExp = mẫu) / mã kỹ thuật / ưu đãi tự đặt trên màn hình (OPERATING_PRINCIPLES §2). Chỉ là cảnh báo — người audit xác nhận. */
export const RED_FLAGS = [
  ["images.unsplash.com", "ảnh kho Unsplash"],
  [/\b(Offline )?Fallback\b|\bCritic\b|\bgpt-|\bclaude-|\bgemini/i, "tên kỹ thuật / model AI"],
  [/\b(M\d{2}[a-z]?|P[0-3])\b(?=\s|$)/, "mã kỹ thuật"],
  [/\d{2}\s*:\s*\d{2}\s*:\s*\d{2}/, "đồng hồ đếm ngược"],
  [/\b0(90|91|98)\d{7}\b|0901\s?234\s?567/, "số điện thoại mẫu"],
  [/giao (trong|nhanh) 2h|100%|chính hãng|★★★★★/i, "cam kết / đánh giá có thể bịa"],
  [/giảm \d+%|mua 1 tặng 1|freeship/i, "ưu đãi — kiểm có bật trong Cài đặt → Ưu đãi không"],
]

export function scanRedFlags(text) {
  return RED_FLAGS.filter(([p]) => (typeof p === "string" ? text.includes(p) : p.test(text))).map(([, label]) => label)
}

/** Một dòng kết quả cho một trạng thái ở một khổ màn hình. */
export function summarize({ name, width, scrollWidth, violations, flags }) {
  const bad = violations.filter((v) => v.impact === "critical" || v.impact === "serious")
  const problems = []
  if (scrollWidth > width) problems.push(`cuộn ngang ${scrollWidth}px`)
  for (const v of bad) problems.push(`axe ${v.id}×${v.nodes.length}: ${v.nodes[0]?.html.slice(0, 80) ?? ""}`)
  return { line: `${name} @${width}: ${problems.length ? problems.join(" | ") : "ok"}${flags.length ? ` · cảnh báo nội dung: ${flags.join(", ")}` : ""}`, failed: problems.length > 0 }
}
