"use client"

import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import type { SalesOrderIntakeForm } from "./use-sales-order-intake-form"

/** Phần 2 (cuối): công thức cành hoa và lá/gói/phụ kiện của mẫu. */
export function SalesOrderIntakeBomSection({ form }: { form: SalesOrderIntakeForm }) {
  const {
    selectedProductBom, flowers, handleAddFlower, handleRemoveFlower, handleFlowerChange,
  } = form
  return (
    <>
      {/* Atomic Flowers Table */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-bold text-text">Công thức định lượng chi tiết:</label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddFlower} className="h-6 text-caption gap-1">
            <Plus size={11} />
            Thêm nguyên phụ liệu
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left text-caption">
            <thead className="bg-surface-alt border-b border-border font-bold text-text-muted">
              <tr>
                <th className="px-3 py-2">Tên nguyên phụ liệu</th>
                <th className="px-3 py-2 w-20">Số lượng</th>
                <th className="px-3 py-2 w-24">Đơn vị</th>
                <th className="px-3 py-2">Màu sắc</th>
                <th className="px-3 py-2 w-28">Vai trò</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {flowers.map((fl, idx) => (
                <tr key={idx}>
                  <td className="p-1.5">
                    <Input
                      type="text"
                      required
                      placeholder="Tên nguyên vật liệu / thành phần..."
                      value={fl.flowerName}
                      onChange={(e) => handleFlowerChange(idx, "flowerName", e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-border bg-surface text-text"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      min="1"
                      value={fl.quantity}
                      onChange={(e) => handleFlowerChange(idx, "quantity", Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg border border-border bg-surface text-text"
                    />
                  </td>
                  <td className="p-1.5">
                    <NativeSelect
                      value={fl.unit}
                      onChange={(e) => handleFlowerChange(idx, "unit", e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-border bg-surface text-text"
                    >
                      <option value="cành">cành</option>
                      <option value="bông">bông</option>
                      <option value="lá">lá</option>
                      <option value="cây">cây</option>
                    </NativeSelect>
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="text"
                      placeholder="Màu sắc..."
                      value={fl.color}
                      onChange={(e) => handleFlowerChange(idx, "color", e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-border bg-surface text-text"
                    />
                  </td>
                  <td className="p-1.5">
                    <NativeSelect
                      value={fl.role}
                      onChange={(e) => handleFlowerChange(idx, "role", e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-border bg-surface text-text font-bold"
                    >
                      <option value="Chủ đạo">Chủ đạo</option>
                      <option value="Phụ">Phụ</option>
                      <option value="Điểm xuyến">Điểm xuyến</option>
                      <option value="Lấp đầy">Lấp đầy</option>
                    </NativeSelect>
                  </td>
                  <td className="p-1.5 text-center">
                    {flowers.length > 1 && (
                      <Button variant="ghost"
        aria-label="Xóa"
                        type="button"
                        onClick={() => handleRemoveFlower(idx)}
                        className="text-[length:inherit] h-auto font-[inherit] gap-0 text-text-muted hover:text-danger-text p-1"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ĐP-2.10 (26/09/2026): lá/gói/phụ kiện của mẫu đã chọn — CHỈ ĐỌC ở bản
          này (sửa được, có vết ghi ở ĐP-4a). Hiện đúng cấu trúc BOM thay vì
          nhồi vào ghi chú nội bộ như bản trước. */}
      {selectedProductBom &&
        (selectedProductBom.foliage.length > 0 ||
          selectedProductBom.wrapping.length > 0 ||
          selectedProductBom.accessories.length > 0) && (
          <div className="rounded-xl border border-border bg-surface-alt/60 p-3 flex flex-col gap-2 text-caption">
            <span className="font-bold text-text-muted">
              Lá/gói/phụ kiện theo mẫu đã chọn (từ Danh Mục Mẫu — chỉ đọc):
            </span>
            {selectedProductBom.foliage.length > 0 && (
              <div>
                <span className="font-bold text-text">Lá/cành trang trí: </span>
                {selectedProductBom.foliage
                  .map((f) => `${f.name} (${f.color}, ${f.role})${f.substitutionAllowed ? " · được thay thế" : ""}`)
                  .join("; ")}
              </div>
            )}
            {selectedProductBom.wrapping.length > 0 && (
              <div>
                <span className="font-bold text-text">Gói: </span>
                {selectedProductBom.wrapping
                  .map((w) => {
                    const extra = [w.pattern, typeof w.quantity === "number" ? `SL ${w.quantity}` : null, w.substitutionAllowed ? "được thay thế" : null]
                      .filter(Boolean)
                      .join(", ")
                    return `${w.layer}: ${w.material}, ${w.color}${extra ? ` (${extra})` : ""}`
                  })
                  .join("; ")}
              </div>
            )}
            {selectedProductBom.accessories.length > 0 && (
              <div>
                <span className="font-bold text-text">Phụ kiện: </span>
                {selectedProductBom.accessories
                  .map((a) => {
                    const extra = [a.unit ? `${a.quantity ?? ""}${a.unit}` : null, a.substitutionAllowed ? "được thay thế" : null]
                      .filter(Boolean)
                      .join(", ")
                    return `${a.name} (${a.material}, ${a.color}${extra ? `, ${extra}` : ""})`
                  })
                  .join("; ")}
              </div>
            )}
          </div>
        )}
    </>
  )
}
