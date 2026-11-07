"use client"

import { Dialog } from "@/components/ui/dialog"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Button } from "@/components/ui/button"
import type { SalesOrderIntakeModalProps } from "./sales-order-intake-types"
import { useSalesOrderIntakeForm } from "./use-sales-order-intake-form"
import { SalesOrderIntakeCustomerSection } from "./sales-order-intake-customer-section"
import { SalesOrderIntakeProductSection } from "./sales-order-intake-product-section"
import { SalesOrderIntakeBomSection } from "./sales-order-intake-bom-section"
import { SalesOrderIntakeDetailsSection } from "./sales-order-intake-details-section"

export type { SalesOrderIntakeModalProps } from "./sales-order-intake-types"

export function SalesOrderIntakeModal(props: SalesOrderIntakeModalProps) {
  const { isOpen, onClose } = props
  const form = useSalesOrderIntakeForm(props)
  const { isUploading, isSubmitting, formError, handleSubmit } = form
  if (!isOpen) return null

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="lg"
      className="max-w-3xl"
      title={
        <span className="flex items-center gap-2">
          <Flower2 size={18} className="text-danger-text" />
          Tiếp Nhận Đơn Hàng Mới
        </span>
      }
      description="Tạo đơn hàng từ bộ phận bán hàng và đưa ngay vào Tháp điều phối đơn"
    >
        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-caption">
          <SalesOrderIntakeCustomerSection form={form} />
          {/* Section 2: Product & Atomic BOM */}
          <div className="flex flex-col gap-4">
            <SalesOrderIntakeProductSection form={form} />
            <SalesOrderIntakeBomSection form={form} />
          </div>

          <SalesOrderIntakeDetailsSection form={form} />

          {/* Submit Actions */}
          {formError && (
            <div role="alert" className="p-3 rounded-xl border border-danger-border bg-danger-bg text-danger-text text-caption font-semibold">
              {formError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="bg-danger hover:bg-danger-text text-white font-bold gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? "Đang tạo đơn…" : "Khởi Tạo Đơn & Đưa Vào Tháp Điều Phối"}</span>
            </Button>
          </div>
        </form>
    </Dialog>
  )
}
