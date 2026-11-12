"use client"

import React from "react"
import { Landmark } from "@/components/ui/icon-set/landmark"
import { CreditCard } from "@/components/ui/icon-set/credit-card"
import { Truck } from "@/components/ui/icon-set/truck"
import { Store } from "@/components/ui/icon-set/store"
import { Smartphone } from "@/components/ui/icon-set/smartphone"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { VietQrSample } from "./vietqr-sample"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import type {
  StorePaymentMethodsConfig,
  CardProviderKey,
  EWalletProviderKey,
} from "@/modules/greeting-card/domain/store-payment-methods"

interface SectionProps {
  config: StorePaymentMethodsConfig
  updateConfig: (patch: Partial<StorePaymentMethodsConfig>) => void
}

/** 1. Chuyển khoản ngân hàng (VietQR) */
export function BankTransferSection({ config, updateConfig }: SectionProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Landmark size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">1. Chuyển khoản ngân hàng (VietQR)</h3>
            <p className="text-caption text-text-muted">Tự động sinh mã VietQR động theo đơn hàng</p>
          </div>
        </div>
        <Switch
          checked={config.enableVietQr}
          onCheckedChange={(checked) => updateConfig({ enableVietQr: checked })}
          aria-label="Bật VietQR"
        />
      </div>

      {config.enableVietQr && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1">
            <label htmlFor="pay-bank-id" className="text-caption font-bold text-text">Mã ngân hàng (VietQR)</label>
            <Input
              id="pay-bank-id"
              value={config.bankId}
              onChange={(e) => updateConfig({ bankId: e.target.value.toUpperCase() })}
              placeholder="VD: VCB, MB, TCB, ACB, TPB..."
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="pay-bank-name" className="text-caption font-bold text-text">Tên ngân hàng hiển thị</label>
            <Input
              id="pay-bank-name"
              value={config.bankName}
              onChange={(e) => updateConfig({ bankName: e.target.value })}
              placeholder="VD: Vietcombank, Ngân hàng Quân Đội..."
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="pay-account-no" className="text-caption font-bold text-text">Số tài khoản nhận tiền</label>
            <Input
              id="pay-account-no"
              value={config.accountNo}
              onChange={(e) => updateConfig({ accountNo: e.target.value })}
              placeholder="VD: 0071001234567"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="pay-account-name" className="text-caption font-bold text-text">Tên chủ tài khoản</label>
            <Input
              id="pay-account-name"
              value={config.accountName}
              onChange={(e) => updateConfig({ accountName: e.target.value.toUpperCase() })}
              placeholder="VD: NGUYEN VAN A"
              className="uppercase"
            />
          </div>
          <VietQrSample bankId={config.bankId} accountNo={config.accountNo} accountName={config.accountName} />
        </div>
      )}
    </div>
  )
}

/** 2. Tiền mặt khi nhận hàng (COD) */
export function CodPaymentSection({ config, updateConfig }: SectionProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent-text">
            <Truck size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">2. Tiền mặt khi nhận hàng (COD)</h3>
            <p className="text-caption text-text-muted">Shipper thu tiền mặt khi giao hàng tận nơi</p>
          </div>
        </div>
        <Switch
          checked={config.enableCod}
          onCheckedChange={(checked) => updateConfig({ enableCod: checked })}
          aria-label="Bật COD"
        />
      </div>

      {config.enableCod && (
        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-2 text-body-sm font-semibold text-text cursor-pointer">
            <Checkbox
              checked={config.codRequiresDeposit}
              onCheckedChange={(checked) => updateConfig({ codRequiresDeposit: checked === true })}
            />
            <span>Yêu cầu đặt cọc trước (khách cọc theo tỷ lệ ở mục 4, phần còn lại thu COD khi giao)</span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-body-sm text-text-muted">Áp dụng COD cho đơn tối đa:</span>
            <Input
              type="number"
              value={config.codMaxVnd ?? ""}
              onChange={(e) => updateConfig({ codMaxVnd: e.target.value ? Number(e.target.value) : null })}
              placeholder="Để trống = Không giới hạn"
              className="w-56"
            />
            <span className="text-caption text-text-muted">VNĐ (Đơn trên mức này bắt buộc thanh toán 100%)</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** 3. Thẻ quốc tế & Cổng thanh toán (Visa / Mastercard) */
export function InternationalCardSection({ config, updateConfig }: SectionProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">3. Cổng thanh toán thẻ quốc tế (Visa / Mastercard)</h3>
            <p className="text-caption text-text-muted">Phục vụ khách hàng Việt kiều & quốc tế thanh toán từ xa</p>
          </div>
        </div>
        <Switch
          checked={config.enableCard}
          onCheckedChange={(checked) => updateConfig({ enableCard: checked })}
          aria-label="Bật thanh toán thẻ"
        />
      </div>

      {config.enableCard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-caption font-bold text-text">Nhà cung cấp cổng thanh toán</label>
            <Select
              value={config.cardProvider}
              onValueChange={(val) => updateConfig({ cardProvider: val as CardProviderKey })}
            >
              <SelectTrigger aria-label="Nhà cung cấp cổng thanh toán" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONEPAY">OnePay (Hỗ trợ Visa, Master, JCB, Napas)</SelectItem>
                <SelectItem value="VNPAY">VNPay Gateway (Cổng thanh toán quốc tế & QR)</SelectItem>
                <SelectItem value="STRIPE">Stripe (Dành cho tài khoản doanh nghiệp quốc tế)</SelectItem>
                <SelectItem value="CUSTOM">Cổng liên kết đối tác riêng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-caption font-bold text-text">Hướng dẫn / Cam kết hiển thị cho khách</label>
            <Input
              value={config.cardInstructions}
              onChange={(e) => updateConfig({ cardInstructions: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** 4. Thanh toán tại quầy khi nhận hàng & Ví điện tử */
export function InStoreAndEWalletSection({ config, updateConfig }: SectionProps) {
  return (
    <>
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-bg text-success">
              <Store size={18} />
            </div>
            <div>
              <h3 className="text-body-sm font-bold text-text">4. Thanh toán tại cửa hàng khi nhận hàng</h3>
              <p className="text-caption text-text-muted">Áp dụng cho khách đến lấy trực tiếp tại shop</p>
            </div>
          </div>
          <Switch
            checked={config.enableInStore}
            onCheckedChange={(checked) => updateConfig({ enableInStore: checked })}
            aria-label="Bật thanh toán tại cửa hàng"
          />
        </div>

        {config.enableInStore && (
          <div className="space-y-1 pt-1">
            <label className="text-caption font-bold text-text">Hướng dẫn thanh toán tại quầy</label>
            <Input
              aria-label="Hướng dẫn thanh toán tại quầy"
              value={config.inStoreInstructions}
              onChange={(e) => updateConfig({ inStoreInstructions: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="text-body-sm font-bold text-text">5. Ví điện tử (MoMo / ZaloPay)</h3>
              <p className="text-caption text-text-muted">Nhận tiền qua số điện thoại ví điện tử</p>
            </div>
          </div>
          <Switch
            checked={config.enableEWallet}
            onCheckedChange={(checked) => updateConfig({ enableEWallet: checked })}
            aria-label="Bật ví điện tử"
          />
        </div>

        {config.enableEWallet && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-caption font-bold text-text">Loại ví</label>
              <Select
                value={config.eWalletProvider}
                onValueChange={(val) => updateConfig({ eWalletProvider: val as EWalletProviderKey })}
              >
                <SelectTrigger aria-label="Loại ví" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MOMO">Ví MoMo</SelectItem>
                  <SelectItem value="ZALOPAY">ZaloPay</SelectItem>
                  <SelectItem value="VNPAY">VNPay Ví</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-caption font-bold text-text">Số điện thoại nhận tiền</label>
              <Input
                value={config.eWalletPhone}
                onChange={(e) => updateConfig({ eWalletPhone: e.target.value })}
                placeholder="VD: 0908123456"
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
