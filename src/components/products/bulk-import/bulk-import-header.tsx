"use client"

import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Download } from "@/components/ui/icon-set/download"
import { Store } from "@/components/ui/icon-set/store"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"

type ActiveTab = "products" | "branches"

type Props = {
  restoredCount: number
  validCount: number
  isImporting: boolean
  activeTab: ActiveTab
  onBack: () => void
  onClearRestored: () => void
  onDownloadTemplate: () => void
  onImport: () => void
  onTabChange: (tab: ActiveTab) => void
  /** Chỉ tổ chức mô hình Chuỗi mới có tab nhập danh sách cửa hàng chuỗi */
  showBranchesTab: boolean
}

export function BulkImportHeader({ restoredCount, validCount, isImporting, activeTab, onBack, onClearRestored, onDownloadTemplate, onImport, onTabChange, showBranchesTab }: Props) {
  return (
    <header className="flex flex-shrink-0 flex-col border-b border-border bg-surface">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onBack}
            aria-label="Quay lại"
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft size={16} />
          </Button>
          <PageHeader
            title={activeTab === "branches" ? "Nhập danh sách chi nhánh" : "Nhập từ Excel & ảnh"}
            description={
              restoredCount > 0 && activeTab === "products" ? (
                <span className="mt-0.5 inline-flex items-center gap-1.5 text-caption font-semibold text-success">
                  <CheckCircle2 size={12} />
                  <span>Đã khôi phục {restoredCount} sản phẩm từ phiên trước</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearRestored}
                    className="ml-1 h-auto p-0 font-normal text-danger hover:bg-transparent hover:underline"
                    aria-label="Xóa dữ liệu đã khôi phục"
                  >
                    (Xóa)
                  </Button>
                </span>
              ) : undefined
            }
          />
        </div>

        {activeTab === "products" && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadTemplate}
              className="flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Tải file Excel mẫu</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onImport}
              disabled={isImporting || validCount === 0}
              className="flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} strokeWidth={2.2} />
              <span>{isImporting ? "Đang thêm sản phẩm vào kho…" : `Thêm vào kho sản phẩm (${validCount})`}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      {showBranchesTab && (
      <div className="flex items-center gap-0 px-4 pb-0 -mb-px">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onTabChange("products")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-body-sm font-bold border-b-2 rounded-none h-auto transition-colors ${
            activeTab === "products"
              ? "border-primary text-primary hover:bg-transparent"
              : "border-transparent text-text-muted hover:text-text hover:bg-transparent"
          }`}
        >
          <FileSpreadsheet size={15} />
          Kho Sản Phẩm &amp; Ảnh
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onTabChange("branches")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-body-sm font-bold border-b-2 rounded-none h-auto transition-colors ${
            activeTab === "branches"
              ? "border-primary text-primary hover:bg-transparent"
              : "border-transparent text-text-muted hover:text-text hover:bg-transparent"
          }`}
        >
          <Store size={15} />
          🏪 Cửa Hàng Chuỗi
        </Button>
      </div>
      )}
    </header>
  )
}
