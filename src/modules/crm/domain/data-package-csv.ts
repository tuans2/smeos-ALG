/**
 * Bản CSV của gói dữ liệu cá nhân (ADR-014 D-P5, bước P-7b): mỗi giá trị một dòng `mục, số thứ tự, trường, giá trị` —
 * đọc được bằng Excel mà không cần biết cấu trúc JSON. Đối tượng lồng (người nhận của đơn, tin nhắn của hội thoại) nối
 * tên trường bằng dấu chấm. Có BOM để Excel nhận đúng tiếng Việt. Không import hạ tầng.
 */
const HEADER = ["muc", "stt", "truong", "gia_tri"]

function cell(value: string): string {
  // Chặn công thức khi mở bằng Excel (CSV injection) và bọc ô có dấu phẩy, ngoặc kép, xuống dòng.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

function flatten(prefix: string, value: unknown, out: Array<[string, string]>): void {
  if (value === null || value === undefined) {
    out.push([prefix, ""])
  } else if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== "object" || v === null)) out.push([prefix, value.map((v) => String(v ?? "")).join("; ")])
    else value.forEach((v, i) => flatten(`${prefix}.${i + 1}`, v, out))
  } else if (typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) flatten(prefix ? `${prefix}.${key}` : key, v, out)
  } else {
    out.push([prefix, String(value)])
  }
}

export function packageToCsv(pkg: Record<string, unknown>): string {
  const lines = [HEADER.join(",")]
  for (const [section, content] of Object.entries(pkg)) {
    const records = Array.isArray(content) ? content : [content]
    records.forEach((record, index) => {
      const fields: Array<[string, string]> = []
      flatten("", record, fields)
      for (const [field, value] of fields) lines.push([section, String(index + 1), field, value].map(cell).join(","))
    })
  }
  return `﻿${lines.join("\r\n")}\r\n`
}
