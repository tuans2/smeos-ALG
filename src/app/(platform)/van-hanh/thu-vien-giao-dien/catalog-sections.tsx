"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { FormField, FormLabel, FormDescription } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog } from "@/components/ui/dialog"
import { Drawer } from "@/components/ui/drawer"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TabActionHeader, type TabItem } from "@/components/ui/tab-header"
import { DataTable, Pagination, type ColumnDef } from "@/components/ui/data-table"
import { SearchFilterBar } from "@/components/ui/search-filter-bar"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { KpiTile } from "@/components/ui/kpi-tile"
import { Avatar } from "@/components/ui/avatar"
import { DateField } from "@/components/ui/date-field"
import { Separator } from "@/components/ui/separator"
import { InfoTip } from "@/components/ui/info-tip"
import { Card } from "@/components/ui/card"

export function CatalogSections() {
  const toast = useToast()

  // Overlay states
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  // Selection & form states
  const [checkboxVal, setCheckboxVal] = React.useState(true)
  const [switchVal, setSwitchVal] = React.useState(true)
  const [radioVal, setRadioVal] = React.useState("opt1")
  const [selectVal, setSelectVal] = React.useState("moc-lan")
  const [activeTab, setActiveTab] = React.useState("tab1")

  // Table sample data
  interface DemoRow {
    id: string
    name: string
    status: string
    price: number
  }

  const tableColumns: ColumnDef<DemoRow>[] = [
    { id: "name", header: "Sản phẩm", cell: (r) => r.name, sortable: true },
    { id: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} /> },
    { id: "price", header: "Giá niêm yết", cell: (r) => `${r.price.toLocaleString("vi-VN")} đ` },
  ]

  const tableData: DemoRow[] = [
    { id: "1", name: "Bộ sản phẩm quà tặng Pastel", status: "ACTIVE", price: 450000 },
    { id: "2", name: "Hộp quà thiết kế cao cấp", status: "PROCESSING", price: 850000 },
    { id: "3", name: "Bình gốm thủ công nghệ thuật", status: "COMPLETED", price: 1200000 },
  ]

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set(["1"]))

  const demoTabs: TabItem[] = [
    { id: "tab1", label: "Tổng quan", badge: 3, badgeTone: "accent" },
    { id: "tab2", label: "Cấu hình", badge: "Mới", badgeTone: "success" },
    { id: "tab3", label: "Nhật ký", badgeTone: "neutral" },
  ]

  return (
    <div className="space-y-10">
      {/* 1. Buttons */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">1. Nút bấm (Button)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => toast.success("Đã bấm nút chính")}>Nút chính (Primary)</Button>
          <Button variant="secondary" onClick={() => toast.info("Đã bấm nút phụ")}>Nút phụ (Secondary)</Button>
          <Button variant="outline" onClick={() => {}}>Đường viền (Outline)</Button>
          <Button variant="ghost" onClick={() => {}}>Bóng ma (Ghost)</Button>
          <Button variant="warning" onClick={() => {}}>Cảnh báo (Warning)</Button>
          <Button variant="danger" onClick={() => {}}>Nguy hiểm (Danger)</Button>
          <Button variant="subtle" onClick={() => {}}>Nhẹ nhàng (Subtle)</Button>
          <Button variant="primary" loading onClick={() => {}}>Đang lưu dữ liệu…</Button>
          <Button variant="secondary" size="sm" onClick={() => {}}>Kích cỡ SM</Button>
          <Button variant="secondary" size="xs" onClick={() => {}}>Kích cỡ XS (Touch 44px)</Button>
        </div>
      </Card>

      {/* 2. Form Controls */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">2. Biểu mẫu & Nhập liệu (FormField, Input, Textarea, Select, DateField)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="demo-name" required>
            <FormLabel>Tên cửa hàng</FormLabel>
            <Input placeholder="Nhập tên thương hiệu…" />
            <FormDescription>Tên sẽ hiển thị cho khách hàng</FormDescription>
          </FormField>

          <FormField id="demo-select">
            <FormLabel>Preset giao diện</FormLabel>
            <Select value={selectVal} onValueChange={setSelectVal}>
              <SelectTrigger aria-label="Preset giao diện">
                <SelectValue placeholder="Chọn preset…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moc-lan">Mộc Lan (Quà tặng & thủ công mỹ nghệ)</SelectItem>
                <SelectItem value="modern-slate">Modern Slate (Hệ thống điều hành)</SelectItem>
                <SelectItem value="pure-swiss">Pure Swiss (Tối giản cao cấp)</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>Chọn phong cách màu sắc thương hiệu</FormDescription>
          </FormField>

          <FormField id="demo-date">
            <FormLabel>Ngày bắt đầu áp dụng</FormLabel>
            <DateField defaultValue="2026-11-01" />
          </FormField>

          <FormField id="demo-textarea">
            <FormLabel showOptional>Ghi chú chính sách</FormLabel>
            <Textarea placeholder="Nhập quy định đổi trả…" rows={2} />
          </FormField>
        </div>
      </Card>

      {/* 3. Selection Controls */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">3. Điều khiển lựa chọn (Checkbox, Switch, RadioGroup)</h2>
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-2">
            <Checkbox id="c1" checked={checkboxVal} onCheckedChange={(v) => setCheckboxVal(Boolean(v))} />
            <label htmlFor="c1" className="text-body-sm font-medium text-text">Đồng ý điều khoản</label>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="s1" checked={switchVal} onCheckedChange={(v) => setSwitchVal(Boolean(v))} />
            <label htmlFor="s1" className="text-body-sm font-medium text-text">Bật đồng bộ tự động</label>
          </div>

          <RadioGroup value={radioVal} onValueChange={(v) => setRadioVal(String(v))} className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="opt1" id="r1" />
              <label htmlFor="r1" className="text-body-sm font-medium text-text">Ca ngày</label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="opt2" id="r2" />
              <label htmlFor="r2" className="text-body-sm font-medium text-text">Ca tối</label>
            </div>
          </RadioGroup>
        </div>
      </Card>

      {/* 4. Badges & Status Badges */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">4. Huy hiệu & Trạng thái nghiệp vụ (Badge, StatusBadge)</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status="ACTIVE" />
          <StatusBadge status="PENDING" />
          <StatusBadge status="PROCESSING" />
          <StatusBadge status="CONFIRMED" />
          <StatusBadge status="SHIPPED" />
          <StatusBadge status="COMPLETED" />
          <StatusBadge status="FAILED" />
          <StatusBadge status="CANCELLED" />
          <StatusBadge status="DRAFT" />
          <StatusBadge status="APPROVED" />
          <StatusBadge status="ARCHIVED" />
          <StatusBadge status="OUT_OF_STOCK" />
        </div>
        <Separator className="my-2" />
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="success">Thành công</Badge>
          <Badge tone="warning">Cảnh báo</Badge>
          <Badge tone="danger">Nguy hiểm</Badge>
          <Badge tone="accent">Nổi bật</Badge>
          <Badge tone="info">Thông tin</Badge>
          <Badge tone="neutral">Mặc định</Badge>
        </div>
      </Card>

      {/* 5. KPI Tiles */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">5. Thẻ chỉ số hiệu năng (KpiTile)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiTile
            label="Doanh thu hôm nay"
            value="18.250.000 đ"
            trend={{ value: "+14.2%", direction: "up" }}
            tip="Tổng giá trị đơn hàng phát sinh trong ngày sau khi trừ giảm giá"
          />
          <KpiTile
            label="Lợi nhuận ròng (Ẩn số nhạy cảm)"
            value="6.420.000 đ"
            sensitive
            trend={{ value: "-2.8%", direction: "down" }}
            tip="Doanh thu trừ giá vốn nguyên vật liệu và chi phí nhân công"
          />
          <KpiTile
            label="Số đơn hoàn tất"
            value="38"
            trend={{ value: "0.0%", direction: "neutral" }}
            description="38 đơn hàng đã giao thành công tới người nhận"
          />
        </div>
      </Card>

      {/* 6. Overlays & Toasts */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">6. Lớp phủ & Thông báo (Dialog, Drawer, BottomSheet, Confirm, Toast)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>Mở Dialog</Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>Mở Drawer</Button>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>Mở BottomSheet</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Mở ConfirmDialog</Button>

          <Button variant="primary" onClick={() => toast.success("Đã cập nhật cấu hình thành công!")}>Toast Success</Button>
          <Button variant="outline" onClick={() => toast.error("Không thể kết nối máy chủ", "Lỗi dữ liệu")}>Toast Error</Button>
          <Button variant="ghost" onClick={() => toast.warning("Dung lượng bộ nhớ sắp đầy")}>Toast Warning</Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Hộp thoại cấu hình" description="Xem trước Dialog tiêu chuẩn">
          <p className="text-body-sm text-text">Nội dung bên trong hộp thoại, hỗ trợ cuộn và các nút hành động chân trang.</p>
        </Dialog>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Bảng trượt cạnh phải">
          <p className="text-body-sm text-text">Drawer trượt vào từ cạnh phải màn hình với bẫy tiêu điểm hoàn chỉnh.</p>
        </Drawer>

        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Bảng chọn nhanh di động">
          <p className="text-body-sm text-text">BottomSheet trượt từ đáy màn hình lên, tối ưu cho màn hình cảm ứng.</p>
        </BottomSheet>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={() => {
            toast.success("Đã xoá mục mẫu")
          }}
          title="Xác nhận xoá mục này?"
          consequence="Thao tác này sẽ xoá mục được chọn khỏi hệ thống vĩnh viễn."
          confirmLabel="Xoá vĩnh viễn"
          tone="danger"
        />
      </Card>

      {/* 7. Tabs & TabActionHeader */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">7. Tab điều hướng & Hành động (Tabs, TabActionHeader)</h2>
        <TabActionHeader
          tabs={demoTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          primaryActions={[
            { id: "act1", label: "Tạo mới", onClick: () => { toast.info("Bấm tạo mới") }, variant: "primary" },
          ]}
          overflowActions={[
            { id: "ov1", label: "Xuất dữ liệu Excel", onClick: () => { toast.info("Đang xuất…") } },
            { id: "ov2", label: "Xóa toàn bộ bộ nhớ tạm", onClick: () => { toast.warning("Đã dọn cache") }, destructive: true },
          ]}
        />
      </Card>

      {/* 8. DataTable, Pagination, SearchFilterBar */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">8. Bảng dữ liệu & Bộ lọc (DataTable, Pagination, SearchFilterBar)</h2>
        <SearchFilterBar
          searchValue=""
          onSearchChange={() => {}}
          activeFilterCount={1}
          onResetFilters={() => toast.info("Đã đặt lại bộ lọc")}
        />
        <DataTable
          columns={tableColumns}
          data={tableData}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowId={(r) => r.id}
        />
        <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />
      </Card>

      {/* 9. EmptyState */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">9. Trạng thái rỗng 4 biến thể (EmptyState)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmptyState kind="none" action={{ label: "Tạo sản phẩm mới", onClick: () => {} }} />
          <EmptyState kind="filtered" action={{ label: "Xoá bộ lọc", onClick: () => {} }} />
          <EmptyState kind="forbidden" />
          <EmptyState kind="error" action={{ label: "Thử tải lại", onClick: () => {} }} />
        </div>
      </Card>

      {/* 10. Avatar, InfoTip & Miscellaneous */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">10. Thành phần bổ trợ (Avatar, InfoTip)</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar fallback="TL" size="xl" />
          <Avatar fallback="ML" size="lg" />
          <Avatar fallback="SM" size="md" />
          <Avatar fallback="NV" size="sm" />
          <Avatar fallback="A" size="xs" />
          <div className="flex items-center gap-1.5 ml-4">
            <span className="text-body-sm text-text font-medium">Giải thích chính sách hoa hồng:</span>
            <InfoTip label="Chính sách hoa hồng">
              Mức hoa hồng được tính dựa trên doanh số sau giảm giá và chia theo cấp bậc thợ cắm hoa.
            </InfoTip>
          </div>
        </div>
      </Card>
    </div>
  )
}
