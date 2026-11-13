import * as React from "react"
import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

// Mock Base-UI Dialog for Node environment so portals render inline
vi.mock("@base-ui/react", () => {
  return {
    Dialog: {
      Root: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-root">{children}</div>,
      Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-portal">{children}</div>,
      Backdrop: ({ className }: { className: string }) => <div data-testid="dialog-backdrop" className={className} />,
      Popup: ({ children, className }: { children: React.ReactNode; className: string }) => (
        <div data-testid="dialog-popup" className={className}>{children}</div>
      ),
      Title: ({ children, className }: { children: React.ReactNode; className: string }) => (
        <h2 data-testid="dialog-title" className={className}>{children}</h2>
      ),
      Description: ({ children, className }: { children: React.ReactNode; className: string }) => (
        <p data-testid="dialog-description" className={className}>{children}</p>
      ),
      Close: ({ children, className, "aria-label": ariaLabel }: { children: React.ReactNode; className: string; "aria-label": string }) => (
        <button type="button" data-testid="dialog-close" className={className} aria-label={ariaLabel}>{children}</button>
      ),
    },
  }
})

import { Dialog } from "../dialog"
import { Drawer } from "../drawer"
import { BottomSheet } from "../bottom-sheet"
import { ConfirmDialog } from "../confirm-dialog"
import { PromptDialog } from "../prompt-dialog"

describe("Overlay Primitives (Dialog, Drawer, BottomSheet, ConfirmDialog)", () => {
  it("renders Dialog with backdrop, title, close button, and content when open", () => {
    const handleOpenChange = vi.fn()
    const html = renderToStaticMarkup(
      <Dialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Thêm sản phẩm"
        description="Nhập thông tin sản phẩm mới"
      >
        <p>Nội dung form sản phẩm</p>
      </Dialog>
    )

    expect(html).toContain("Thêm sản phẩm")
    expect(html).toContain("Nhập thông tin sản phẩm mới")
    expect(html).toContain("Nội dung form sản phẩm")
    expect(html).toContain('aria-label="Đóng hộp thoại"')
    expect(html).toContain("max-h-[90dvh]")
    expect(html).toContain("rounded-[var(--radius-dialog)]")
    expect(html).toContain("shadow-[var(--shadow-dialog)]")
  })

  it("renders Drawer on the right side with proper transitions and safe area padding", () => {
    const html = renderToStaticMarkup(
      <Drawer
        open={true}
        onOpenChange={() => {}}
        title="Bộ lọc nâng cao"
        side="right"
        footer={<button type="button">Áp dụng</button>}
      >
        <p>Các bộ lọc</p>
      </Drawer>
    )

    expect(html).toContain("Bộ lọc nâng cao")
    expect(html).toContain("Các bộ lọc")
    expect(html).toContain("Áp dụng")
    expect(html).toContain('aria-label="Đóng bảng trượt"')
    expect(html).toContain("right-0")
    expect(html).toContain("border-l")
  })

  it("renders BottomSheet with grab handle and rounded top", () => {
    const html = renderToStaticMarkup(
      <BottomSheet
        open={true}
        onOpenChange={() => {}}
        title="Tuỳ chọn nhanh"
      >
        <p>Danh sách hành động</p>
      </BottomSheet>
    )

    expect(html).toContain("Tuỳ chọn nhanh")
    expect(html).toContain("Danh sách hành động")
    expect(html).toContain("rounded-t-[20px]")
    expect(html).toContain("bottom-0")
    expect(html).toContain("h-1.5 w-12") // Grab handle
  })

  it("renders ConfirmDialog with danger tone and action buttons", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        onConfirm={() => {}}
        title="Xóa danh mục này?"
        consequence="Hành động này không thể hoàn tác."
        confirmLabel="Xóa vĩnh viễn"
        tone="danger"
      />
    )

    expect(html).toContain("Xóa danh mục này?")
    expect(html).toContain("Hành động này không thể hoàn tác.")
    expect(html).toContain("Xóa vĩnh viễn")
    expect(html).toContain("Không, quay lại")
    expect(html).toContain("bg-danger")
  })

  it("renders PromptDialog with labelled textarea; confirm locked while required input is empty", () => {
    const html = renderToStaticMarkup(
      <PromptDialog
        open={true}
        onOpenChange={() => {}}
        onSubmit={() => {}}
        title="Từ chối bản nội dung này?"
        label="Lý do từ chối"
        confirmLabel="Từ chối"
        tone="danger"
      />
    )

    expect(html).toContain("Từ chối bản nội dung này?")
    expect(html).toMatch(/<label for="([^"]+)"[^>]*>Lý do từ chối<\/label><textarea[^>]*id="\1"/)
    expect(html).toContain('aria-required="true"')
    expect(html).toContain("Không, quay lại")
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Từ chối<\/button>/)
  })

  it("PromptDialog không bắt buộc nhập thì nút xác nhận mở ngay", () => {
    const html = renderToStaticMarkup(
      <PromptDialog open onOpenChange={() => {}} onSubmit={() => {}} title="Ghi chú" label="Ghi chú" confirmLabel="Lưu" required={false} />
    )
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Lưu<\/button>/)
  })
})
