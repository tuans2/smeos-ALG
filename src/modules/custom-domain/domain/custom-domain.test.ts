import { describe, expect, it } from "vitest"

import {
  classifyCustomDomainPath, dnsInstructions, domainStatusText, normalizeHostname, txtRecordsMatch,
} from "./custom-domain"

describe("tên miền riêng — luật thuần (ALG 10.8)", () => {
  it("chuẩn hoá: bỏ giao thức, đường dẫn, dấu chấm cuối; chữ thường; tên có dấu → punycode", () => {
    expect(normalizeHostname("https://Hoa.TiemCuaBan.vn/trang?x=1")).toEqual({ ok: true, hostname: "hoa.tiemcuaban.vn" })
    expect(normalizeHostname("tiemhoa.vn.")).toEqual({ ok: true, hostname: "tiemhoa.vn" })
    expect(normalizeHostname("hoa.tiệmhoa.vn")).toEqual({ ok: true, hostname: "hoa.xn--timhoa-jk8b.vn" })
  })

  it("từ chối: rỗng, một nhãn, địa chỉ IP, cổng, ký tự đại diện, tên miền của hệ thống", () => {
    for (const bad of ["", "localhost", "192.168.1.10", "tiem.vn:8080", "*.tiem.vn", "a..vn", "-x.vn", "user@tiem.vn"]) {
      expect(normalizeHostname(bad).ok, bad).toBe(false)
    }
    expect(normalizeHostname("shop.onrender.com", ["onrender.com"]).ok).toBe(false)
    expect(normalizeHostname("app.avilotusgroup.com", ["app.avilotusgroup.com"]).ok).toBe(false)
  })

  it("bản ghi TXT khớp khi các đoạn ghép lại đúng mã; sai mã hoặc thiếu → không khớp", () => {
    expect(txtRecordsMatch([["alg-verify=abc", "123"]], "abc123")).toBe(true)
    expect(txtRecordsMatch([["v=spf1 -all"], ["alg-verify=abc123"]], "abc123")).toBe(true)
    expect(txtRecordsMatch([["alg-verify=khac"]], "abc123")).toBe(false)
    // Bản ghi thêm trước khi đổi tên ALG (12/11/2026) vẫn được nhận
    expect(txtRecordsMatch([["smeos-verify=abc123"]], "abc123")).toBe(true)
    expect(txtRecordsMatch([], "abc123")).toBe(false)
  })

  it("hướng dẫn DNS: TXT luôn có; CNAME chỉ khi biết máy chủ đích", () => {
    expect(dnsInstructions("hoa.tiem.vn", "t1", "smeos-web.onrender.com").map((r) => [r.type, r.name, r.value])).toEqual([
      ["TXT", "_alg-verify.hoa.tiem.vn", "alg-verify=t1"],
      ["CNAME", "hoa.tiem.vn", "smeos-web.onrender.com"],
    ])
    expect(dnsInstructions("hoa.tiem.vn", "t1", null)).toHaveLength(1)
  })

  it("phân loại đường dẫn: chỉ trang danh mục, Thẻ Chào, trang cửa hàng; còn lại chặn", () => {
    expect(classifyCustomDomainPath("/")).toEqual({ kind: "home" })
    expect(classifyCustomDomainPath("/_next/data/x.json")).toEqual({ kind: "pass" })
    expect(classifyCustomDomainPath("/api/v1/public/brochure/x")).toEqual({ kind: "pass" })
    expect(classifyCustomDomainPath("/b/T01-001")).toEqual({ kind: "owner", resource: "greeting_session", key: "T01-001" })
    expect(classifyCustomDomainPath("/bst/tiem-a/BST01/opengraph-image")).toEqual({ kind: "owner", resource: "org_slug", key: "tiem-a" })
    expect(classifyCustomDomainPath("/c/abc")).toMatchObject({ resource: "catalog_link" })
    expect(classifyCustomDomainPath("/s/ABCD")).toMatchObject({ resource: "share_link" })
    expect(classifyCustomDomainPath("/ch/tiem")).toMatchObject({ resource: "store_profile" })
    expect(classifyCustomDomainPath("/g/uuid-1")).toMatchObject({ resource: "greeting_catalog" })
    for (const blocked of ["/dang-nhap", "/van-hanh", "/cai-dat", "/b", "/b/", "/b/%E0%A4%A", "/c/a%20b"]) {
      expect(classifyCustomDomainPath(blocked), blocked).toEqual({ kind: "blocked" })
    }
  })

  it("trạng thái hiển thị nêu rõ khi chứng chỉ do đội vận hành cấp", () => {
    expect(domainStatusText("PENDING", "NOT_REQUESTED")).toBe("Chờ xác minh")
    expect(domainStatusText("VERIFIED", "REQUESTED")).toBe("Đang hoạt động")
    expect(domainStatusText("VERIFIED", "MANUAL")).toContain("Đội vận hành")
    expect(domainStatusText("LOCKED", "REQUESTED")).toBe("Đã bị khoá")
  })
})
