import * as React from "react"
import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs"
import { TabActionHeader, type TabItem, type TabAction } from "../tab-header"

describe("Tabs & TabActionHeader Components", () => {
  it("renders Tabs with tablist, triggers and active selection", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="tab1">
        <TabsList aria-label="Cài đặt tổ chức">
          <TabsTrigger value="tab1">Thông tin chung</TabsTrigger>
          <TabsTrigger value="tab2">Thành viên</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Nội dung tab 1</TabsContent>
        <TabsContent value="tab2">Nội dung tab 2</TabsContent>
      </Tabs>
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain("Thông tin chung")
    expect(html).toContain("Thành viên")
  })

  it("tab đang mở có dấu hiệu nhìn thấy: kiểu tô theo thuộc tính Base UI thật sự đặt (data-active)", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="tab1">
        <TabsList aria-label="Loại nhật ký">
          <TabsTrigger value="tab1">Một</TabsTrigger>
          <TabsTrigger value="tab2">Hai</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => m[0])
    const active = tabs.find((t) => t.includes('aria-selected="true"')) ?? ""
    expect(active).toMatch(/\bdata-active=/)
    expect(active).toContain("data-[active]:bg-surface")
    expect(html).not.toContain("data-[selected]:")
  })

  it("renders TabActionHeader with tab items, badges, and action buttons", () => {
    const tabs: TabItem[] = [
      { id: "all", label: "Tất cả", badge: 12, badgeTone: "accent" },
      { id: "pending", label: "Chờ duyệt", badge: 3, badgeTone: "warning" },
    ]
    const primaryActions: TabAction[] = [
      { id: "create", label: "Thêm mới", onClick: vi.fn(), variant: "primary" },
    ]

    const html = renderToStaticMarkup(
      <TabActionHeader
        tabs={tabs}
        activeTab="all"
        onTabChange={vi.fn()}
        primaryActions={primaryActions}
      />
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain("Tất cả")
    expect(html).toContain("Chờ duyệt")
    expect(html).toContain("Thêm mới")
    expect(html).toContain("bg-primary")
    expect(html).toContain("12")
    expect(html).toContain("3")
  })
})
