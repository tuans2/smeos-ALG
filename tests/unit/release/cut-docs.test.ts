import { describe, expect, it } from "vitest"

import { alignApiSpec, alignTemplateSsot, endpointKey } from "../../../scripts/release/cut-docs"

/** Kế hoạch bàn giao GD1, Bước 2.3: tài liệu đặc tả trong bản cắt chỉ mô tả mã có trong bản cắt. */
describe("căn đặc tả API 06 theo route của bản cắt", () => {
  const spec = [
    "## Đơn hàng",
    "| Method | Path | Năng lực | Ghi chú |",
    "|---|---|---|---|",
    "| GET · POST | `/orders` | `O1` · `O2` | danh sách, tạo |",
    "| GET · PATCH | `/orders/:id` | `O1` · `O3` | |",
    "| POST | `/video/jobs/:id/render` | `I1` | không giao |",
    "| GET | `/products/:id/images` | **CHƯA XÂY** `G1` | |",
    "Đoạn văn nhắc `/video/jobs` vẫn giữ.",
  ].join("\n")
  const endpoints = new Set([endpointKey("GET", "/orders"), endpointKey("POST", "/orders"), endpointKey("GET", "/orders/:id")])

  it("giữ dòng đủ method, rút method thiếu kèm cột năng lực, bỏ dòng không còn method nào", () => {
    const { text, removedRows, trimmedRows } = alignApiSpec(spec, endpoints)
    expect(removedRows).toBe(1)
    expect(trimmedRows).toBe(1)
    expect(text).toContain("| GET · POST | `/orders` | `O1` · `O2` | danh sách, tạo |")
    expect(text).toContain("| GET | `/orders/:id` | `O1` | |")
    expect(text).not.toContain("/video/jobs/:id/render")
  })

  it("không đụng dòng CHƯA XÂY, tiêu đề bảng và đoạn văn", () => {
    const { text } = alignApiSpec(spec, endpoints)
    expect(text).toContain("**CHƯA XÂY** `G1`")
    expect(text).toContain("| Method | Path | Năng lực | Ghi chú |")
    expect(text).toContain("Đoạn văn nhắc `/video/jobs` vẫn giữ.")
  })

  it("khoá so khớp giống check-docs: bỏ /api/v1, tham số thành {}", () => {
    expect(endpointKey("GET", "`/api/v1/orders/:id/`")).toBe("GET /orders/{}")
  })
})

describe("đánh dấu tệp mẫu không có trong bản cắt ở SSOT hệ mẫu", () => {
  it("chỉ đánh dấu dòng nhắc tệp không còn; dòng đã ngoài SSOT giữ nguyên", () => {
    const text = [
      "| `order-card.tsx` | Thẻ đơn |",
      "| `video-player-card.tsx` | Trình phát video |",
      "| `storyboard-editor.tsx` | `components/video-studio/` (ngoài SSOT) |",
      "│   ├── order-card.tsx",
      "│   ├── chat-thread-card.tsx",
    ].join("\n")
    const { text: out, markedLines } = alignTemplateSsot(text, new Set(["order-card.tsx"]))
    expect(markedLines).toBe(2)
    expect(out).toContain("| `order-card.tsx` | Thẻ đơn |\n")
    expect(out).toContain("| `video-player-card.tsx` | Trình phát video | (ngoài SSOT) — không có trong bản giao")
    expect(out).toContain("│   ├── chat-thread-card.tsx (ngoài SSOT) — không có trong bản giao")
    expect(out).toContain("(ngoài SSOT) |\n")
  })
})
