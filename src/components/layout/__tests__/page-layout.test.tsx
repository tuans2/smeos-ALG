import React from "react"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Button } from "@/components/ui/button"
import {
  PageLayout,
  PageHeader,
  DashboardLayout,
  ListLayout,
  DetailLayout,
  FormLayout,
  BuilderLayout,
  SettingsLayout,
} from "../page-layout"

describe("PageLayout & PageHeader (S3-02)", () => {
  describe("PageHeader v2", () => {
    it("renders semantic header with exactly 20px h1 and breadcrumbs", () => {
      const html = renderToStaticMarkup(
        <PageHeader
          title="Quản lý sản phẩm"
          description="Danh sách sản phẩm trong kho"
          breadcrumbItems={[
            { label: "Trang chủ", href: "/" },
            { label: "Sản phẩm" },
          ]}
        />
      )

      expect(html).toContain("<header")
      expect(html).toContain("<h1")
      expect(html).toContain("text-display")
      expect(html).toContain("Quản lý sản phẩm")
      expect(html).toContain("Danh sách sản phẩm trong kho")
      expect(html).toContain('aria-label="Breadcrumb"')
      expect(html).toContain('href="/"')
    })

    it("renders back button with accessible label when backHref is provided", () => {
      const html = renderToStaticMarkup(
        <PageHeader
          title="Chỉnh sửa sản phẩm"
          backHref="/san-pham"
          backLabel="Quay lại danh sách"
        />
      )

      expect(html).toContain('href="/san-pham"')
      expect(html).toContain('aria-label="Quay lại danh sách"')
    })

    it("renders badge and tip when provided", () => {
      const html = renderToStaticMarkup(
        <PageHeader
          title="Đơn hàng"
          badge={<span id="test-badge">Đang xử lý</span>}
          tip="Đơn hàng cần xử lý trong ngày"
        />
      )

      expect(html).toContain("test-badge")
      expect(html).toContain('aria-label="Giải thích: Đơn hàng"')
    })
  })

  describe("PageLayout Archetypes A–F", () => {
    it("renders Archetype A (DashboardLayout)", () => {
      const html = renderToStaticMarkup(
        <PageLayout
          archetype="A"
          header={<PageHeader title="Tổng quan kinh doanh" />}
          kpis={<div id="kpi-grid">KPIs</div>}
          sidebar={<div id="activity-feed">Hoạt động</div>}
        >
          <div>Biểu đồ doanh thu</div>
        </PageLayout>
      )

      expect(html).toContain("Tổng quan kinh doanh")
      expect(html).toContain("kpi-grid")
      expect(html).toContain("activity-feed")
      expect(html).toContain("Biểu đồ doanh thu")
    })

    it("renders Archetype B (ListLayout)", () => {
      const html = renderToStaticMarkup(
        <PageLayout
          archetype="B"
          header={<PageHeader title="Danh sách đơn hàng" />}
          filters={<div id="filter-bar">Bộ lọc</div>}
          pagination={<div id="pagination">Trang 1 / 10</div>}
        >
          <div id="table-content">Bảng dữ liệu</div>
        </PageLayout>
      )

      expect(html).toContain("Danh sách đơn hàng")
      expect(html).toContain("filter-bar")
      expect(html).toContain("table-content")
      expect(html).toContain("pagination")
    })

    it("renders Archetype C (DetailLayout)", () => {
      const html = renderToStaticMarkup(
        <PageLayout
          archetype="C"
          header={<PageHeader title="Chi tiết sản phẩm #SP001" />}
          sidebar={<div id="meta-sidebar">Thông tin tác giả</div>}
        >
          <div id="main-detail">Nội dung chi tiết</div>
        </PageLayout>
      )

      expect(html).toContain("Chi tiết sản phẩm #SP001")
      expect(html).toContain("meta-sidebar")
      expect(html).toContain("main-detail")
    })

    it("renders Archetype D (FormLayout)", () => {
      const html = renderToStaticMarkup(
        <PageLayout
          archetype="D"
          width="narrow"
          header={<PageHeader title="Thêm mới sản phẩm" />}
          footer={<Button type="submit">Lưu sản phẩm</Button>}
        >
          <div id="form-fields">Các trường nhập</div>
        </PageLayout>
      )

      expect(html).toContain("max-w-3xl")
      expect(html).toContain("Thêm mới sản phẩm")
      expect(html).toContain("form-fields")
      expect(html).toContain("Lưu sản phẩm")
    })

    it("renders Archetype E (BuilderLayout)", () => {
      const html = renderToStaticMarkup(
        <PageLayout
          archetype="E"
          header={<PageHeader title="Studio Thiết kế" />}
          controls={<div id="controls-pane">Thanh công cụ</div>}
          preview={<div id="preview-canvas">Vùng xem trước</div>}
        />
      )

      expect(html).toContain("Studio Thiết kế")
      expect(html).toContain("controls-pane")
      expect(html).toContain("preview-canvas")
    })

    it("renders Archetype F (SettingsLayout)", () => {
      const html = renderToStaticMarkup(
        <PageLayout
          archetype="F"
          header={<PageHeader title="Cài đặt hệ thống" />}
          nav={<div id="settings-nav">Menu cài đặt</div>}
        >
          <div id="settings-content">Nội dung cấu hình</div>
        </PageLayout>
      )

      expect(html).toContain("Cài đặt hệ thống")
      expect(html).toContain("settings-nav")
      expect(html).toContain("settings-content")
    })
  })
})
