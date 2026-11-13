import { describe, expect, it } from "vitest"

import { packageToCsv } from "./data-package-csv"

describe("bản CSV của gói dữ liệu cá nhân", () => {
  it("mỗi giá trị một dòng; đối tượng lồng nối bằng dấu chấm; mảng giá trị nối bằng chấm phẩy", () => {
    const csv = packageToCsv({
      customer: { name: "Chị Lan", tags: ["quen", "VIP"] },
      orders: [{ code: "DH1", recipient: { name: "Bà Hoa" } }],
      leads: [],
    })
    const rows = csv.replace("﻿", "").trim().split("\r\n")
    expect(rows).toEqual([
      "muc,stt,truong,gia_tri",
      "customer,1,name,Chị Lan",
      "customer,1,tags,quen; VIP",
      "orders,1,code,DH1",
      "orders,1,recipient.name,Bà Hoa",
    ])
    expect(csv.startsWith("﻿")).toBe(true)
  })

  it("bọc ô có dấu phẩy / ngoặc kép / xuống dòng và chặn công thức Excel", () => {
    const csv = packageToCsv({ customer: { address: "12 Lê Lợi, Q1", note: 'nói "gấp"\nchiều', evil: "=HYPERLINK(1)" } })
    expect(csv).toContain('customer,1,address,"12 Lê Lợi, Q1"')
    expect(csv).toContain('customer,1,note,"nói ""gấp""\nchiều"')
    expect(csv).toContain("customer,1,evil,'=HYPERLINK(1)")
  })
})
