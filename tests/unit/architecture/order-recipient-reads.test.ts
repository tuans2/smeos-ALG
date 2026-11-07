import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { applyRecipientView, planRecipientRead, RECIPIENT_VIEW_FIELDS } from "@/modules/orders/infra/order-recipient-view"

const SRC = path.join(process.cwd(), "src")

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (name === "generated" || name === "node_modules") continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(name) && !/\.test\.|__tests__/.test(full)) out.push(full)
  }
  return out
}

/** Đối tượng `{ … }` bao quanh vị trí `at` và đoạn chữ ngay trước dấu `{` mở nó. */
function enclosing(source: string, at: number): { body: string; before: string } {
  let depth = 0
  let start = at
  for (; start >= 0; start--) {
    if (source[start] === "}") depth++
    else if (source[start] === "{") {
      if (depth === 0) break
      depth--
    }
  }
  let end = at
  for (depth = 0; end < source.length; end++) {
    if (source[end] === "{") depth++
    else if (source[end] === "}") {
      if (depth === 0) break
      depth--
    }
  }
  return { body: source.slice(start, end + 1), before: source.slice(Math.max(0, start - 40), start) }
}

/**
 * ADR-014 P-3b: người nhận/địa chỉ đọc từ `order_recipients`. Lệnh đọc `orders.*` đi qua extension của client Prisma;
 * chọn đơn LỒNG trong bảng khác (`order: { select: { delivery_address: true } }`) thì phải kèm `recipient` và
 * `withDeliveryView`, nếu không thì sau P-3c màn hình mất tên/SĐT/địa chỉ người nhận.
 */
describe("order_recipients — mọi chỗ đọc địa chỉ giao", () => {
  it("chọn đơn lồng có `delivery_address` thì kèm `recipient`", () => {
    const offenders: string[] = []
    for (const file of walk(SRC)) {
      const source = readFileSync(file, "utf8")
      for (const m of source.matchAll(/delivery_address:\s*true/g)) {
        const { body, before } = enclosing(source, m.index ?? 0)
        if (/\border:\s*\{\s*select:\s*$/.test(before) && !/\brecipient\b/.test(body)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${source.slice(0, m.index).split("\n").length}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("extension: thêm `recipient` khi kết quả có `delivery_address`, giữ khi người gọi đã xin", () => {
    expect(planRecipientRead("findMany", { select: { id: true } })).toBeNull()
    expect(planRecipientRead("update", { where: { id: "x" } })).toBeNull()
    expect(planRecipientRead("findFirst", { omit: { delivery_address: true } })).toBeNull()
    expect(planRecipientRead("findFirst", { select: { id: true, delivery_address: true } })).toEqual({
      args: { select: { id: true, delivery_address: true, recipient: { select: RECIPIENT_VIEW_FIELDS } } }, keepRecipient: false,
    })
    expect(planRecipientRead("findMany", { where: { id: "x" } })).toEqual({
      args: { where: { id: "x" }, include: { recipient: { select: RECIPIENT_VIEW_FIELDS } } }, keepRecipient: false,
    })
    const vat = { select: { vat_email: true } }
    expect(planRecipientRead("findFirst", { include: { recipient: vat } })).toEqual({
      args: { include: { recipient: { select: { vat_email: true, ...RECIPIENT_VIEW_FIELDS } } } }, keepRecipient: true,
    })
  })

  it("extension: kết quả có JSON đã ghép, bỏ `recipient` khi người gọi không xin", () => {
    const recipient = { recipient_name: "Lan", recipient_phone: "0912", address_line: "1 Lê Lợi", address_parts: { street: "1 Lê Lợi" } }
    const row = { id: "o1", delivery_address: { zone: "Q1" }, recipient }
    expect(applyRecipientView([row, null], false)).toEqual([{ id: "o1", delivery_address: { zone: "Q1", street: "1 Lê Lợi", recipientName: "Lan", phone: "0912" } }, null])
    expect(applyRecipientView(row, true)).toMatchObject({ recipient })
    expect(applyRecipientView({ id: "o2", delivery_address: "2 Lê Lợi", recipient: null }, false)).toEqual({ id: "o2", delivery_address: "2 Lê Lợi" })
  })

  it("extension (P-5c): JSON ghép từ `recipient` đã giải mã — không bao giờ lộ bản mã ra `delivery_address`", () => {
    const sealed = { recipient_name: "Lan", recipient_phone: "pii1.sdt", address_line: "pii1.dc", address_parts: null }
    const open = (r: Record<string, unknown>) => ({ ...r, recipient_phone: "0912", address_line: "1 Lê Lợi" })
    const decode = <T,>(r: T) => open(r as Record<string, unknown>) as T
    expect(applyRecipientView({ id: "o1", delivery_address: { zone: "Q1" }, recipient: sealed }, false, decode))
      .toEqual({ id: "o1", delivery_address: { zone: "Q1", street: "1 Lê Lợi", recipientName: "Lan", phone: "0912" } })
  })
})
