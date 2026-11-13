"use client"

import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ViDateInput } from "@/components/greeting-card/customer/vi-date-input"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { User } from "@/components/ui/icon-set/user"
import { Button } from "@/components/ui/button"
import type { SalesOrderIntakeForm } from "./use-sales-order-intake-form"

/** Chọn nhanh mẫu + phần 1: khách hàng, người nhận, địa chỉ giao, giờ hẹn. */
export function SalesOrderIntakeCustomerSection({ form }: { form: SalesOrderIntakeForm }) {
  const {
    customerName, setCustomerName, customerPhone, setCustomerPhone, customerTier, setCustomerTier,
    customerId, customerQuery, setCustomerQuery, customerMatches, customerSearching, recipientName,
    setRecipientName, recipientPhone, setRecipientPhone, addressStreet, setAddressStreet, addressWard,
    setAddressWard, addressDistrict, setAddressDistrict, addressCity, setAddressCity, addressCountry,
    setAddressCountry, deliveryDate, setDeliveryDate, deliveryTime, setDeliveryTime, handlePrefillSampleAddressHN,
    handlePrefillSampleAddressHCM, handleClearAddress, masterProducts, handleSelectCustomer, handleClearCustomer, handleSelectMasterProduct,
  } = form
  return (
    <>
    {/* Quick Select from Master Index */}
    {masterProducts.length > 0 && (
      <div className="p-4 rounded-xl border border-danger-border bg-danger-bg/50 flex flex-col gap-2">
        <div className="font-bold text-danger-text flex items-center gap-1.5">
          <Sparkles size={14} className="text-danger-text" />
          <span>⚡ Chọn mẫu nhanh từ Danh Mục Sản Phẩm Mẫu:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {masterProducts.slice(0, 5).map((p) => (
            <Button variant="outline"
              key={p.id}
              type="button"
              onClick={() => handleSelectMasterProduct(p)}
              className="text-[length:inherit] h-auto justify-start font-[inherit] gap-0 px-2.5 py-1.5 rounded-lg border border-danger-border bg-surface hover:border-danger text-left shrink-0 transition-colors hover:bg-surface"
            >
              <div className="font-bold text-text truncate max-w-[140px]">{p.name}</div>
              <div className="text-caption text-text-muted">{p.code}</div>
            </Button>
          ))}
        </div>
      </div>
    )}

    {/* Section 1: Customer & Recipient */}
    <div className="flex flex-col gap-3">
      <span className="font-extrabold text-text text-body-sm flex items-center gap-1.5 border-b border-border pb-1">
        <User size={15} className="text-danger-text" />
        1. Khách Hàng & Người Nhận Hoa
      </span>

      {/* ĐP-2.9: tìm khách đã có trong Customer Master Index trước khi cho nhập
          tay — chọn được thì tên/SĐT/hạng bên dưới khoá lại, máy chủ lấy từ CMI. */}
      <div className="relative">
        <label className="font-bold text-text block mb-1">Tìm khách đã có (tên hoặc SĐT)</label>
        {customerId ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-success-border bg-success-bg text-success-text">
            <span className="font-bold truncate">
              ✓ {customerName} {customerPhone && `— ${customerPhone}`} ({customerTier})
            </span>
            <Button variant="ghost"
              type="button"
              onClick={handleClearCustomer}
              className="h-auto p-0 gap-0 text-caption font-bold text-success-text hover:text-success-text shrink-0 ml-2"
            >
              Đổi thành khách lẻ
            </Button>
          </div>
        ) : (
          <Input
            type="text"
            placeholder="Gõ tên hoặc SĐT để tìm trong hồ sơ khách…"
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        )}
        {!customerId && (customerSearching || customerMatches.length > 0) && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
            {customerSearching && (
              <div className="px-3 py-2 text-text-muted">Đang tìm…</div>
            )}
            {!customerSearching &&
              customerMatches.map((c) => (
                <Button variant="ghost"
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCustomer(c)}
                  className="text-[length:inherit] h-auto justify-start font-[inherit] gap-0 w-full text-left px-3 py-2 hover:bg-surface-alt border-b border-border/60 last:border-0"
                >
                  <div className="font-bold text-text">{c.name}</div>
                  <div className="text-caption text-text-muted">
                    {c.phone} {c.metrics?.tier ? `· ${c.metrics.tier}` : ""}
                  </div>
                </Button>
              ))}
          </div>
        )}
        {!customerId && (
          <p className="text-caption text-text-muted mt-1">
            Không tìm thấy? Điền thẳng bên dưới — sẽ lưu là khách lẻ.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="font-bold text-text block mb-1">Tên khách đặt *</label>
          <Input
            type="text"
            required
            disabled={Boolean(customerId)}
            placeholder="Ví dụ: Nguyễn Văn An"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger disabled:opacity-60"
          />
        </div>

        <div>
          <label className="font-bold text-text block mb-1">Số điện thoại khách</label>
          <Input
            type="text"
            disabled={Boolean(customerId)}
            placeholder="0901234567"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger disabled:opacity-60"
          />
        </div>

        <div>
          <label className="font-bold text-text block mb-1">Phân hạng khách hàng</label>
          <NativeSelect
            disabled={Boolean(customerId)}
            value={customerTier}
            onChange={(e) => setCustomerTier(e.target.value as typeof customerTier)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger disabled:opacity-60"
          >
            <option value="NEW">Mới (NEW)</option>
            <option value="BRONZE">Đồng (BRONZE)</option>
            <option value="SILVER">Bạc (SILVER)</option>
            <option value="GOLD">Vàng (GOLD)</option>
            <option value="VIP">VIP Đặc Biệt</option>
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-text block mb-1">Tên người nhận hàng *</label>
          <Input
            type="text"
            required
            placeholder="Ví dụ: Trần Thị Bình"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>

        <div>
          <label className="font-bold text-text block mb-1">Số điện thoại người nhận *</label>
          <Input
            type="text"
            required
            placeholder="0912345678"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>
      </div>

      {/* Phân cấp địa chỉ 5 tầng: Số nhà/ngõ + Phường/xã + Quận/huyện + Tỉnh/TP + Quốc gia */}
      <div className="p-3.5 rounded-xl border border-danger-border/80 bg-danger-bg/40 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold text-danger-text flex items-center gap-1.5">
            <MapPin size={14} className="text-danger-text" />
            ĐỊA CHỈ GIAO HÀNG PHÂN CẤP (ATOMIC STRUCTURED ADDRESS) *
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline"
              type="button"
              onClick={handlePrefillSampleAddressHN}
              className="h-auto gap-0 text-caption text-text bg-white border border-border hover:bg-bg px-2 py-0.5 rounded-md font-bold transition-colors"
            >
              ⚡ Mẫu HN
            </Button>
            <Button variant="outline"
              type="button"
              onClick={handlePrefillSampleAddressHCM}
              className="h-auto gap-0 text-caption text-text bg-white border border-border hover:bg-bg px-2 py-0.5 rounded-md font-bold transition-colors"
            >
              ⚡ Mẫu HCM
            </Button>
            {addressStreet && (
              <Button variant="ghost"
                type="button"
                onClick={handleClearAddress}
                className="py-0 h-auto gap-0 text-caption text-danger-text hover:text-danger-text font-bold px-1"
              >
                Xóa
              </Button>
            )}
            <span className="text-caption text-danger-text bg-danger-bg px-2 py-0.5 rounded-full font-bold">
              Chuẩn 5 Tầng
            </span>
          </div>
        </div>

        {/* Tầng 1: Số nhà, ngõ/tên đường */}
        <div>
          <label className="font-bold text-text block mb-1">
            1. Số nhà, ngõ / hẻm / ngách, tên đường (Số phòng / Tòa nhà nếu có) *
          </label>
          <Input
            type="text"
            required
            placeholder="Ví dụ: 195 Lương Thế Vinh (hoặc P.802 Toà Lotte Center, 54 Liễu Giai)"
            value={addressStreet}
            onChange={(e) => setAddressStreet(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger font-medium"
          />
        </div>

        {/* Tầng 2, 3, 4: Phường/Xã + Quận/Huyện + Tỉnh/Thành phố */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="font-bold text-text block mb-1">2. Phường / Xã / Thị trấn *</label>
            <Input
              type="text"
              required
              placeholder="Ví dụ: Phường Trung Văn"
              value={addressWard}
              onChange={(e) => setAddressWard(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-text block mb-1">3. Quận / Huyện / Thị xã *</label>
            <Input
              type="text"
              required
              placeholder="Ví dụ: Quận Nam Từ Liêm"
              value={addressDistrict}
              onChange={(e) => setAddressDistrict(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-text block mb-1">4. Tỉnh / Thành phố *</label>
            <Input
              type="text"
              required
              placeholder="Ví dụ: Hà Nội"
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger font-medium"
            />
          </div>
        </div>

        {/* Tầng 5: Quốc gia & Khung Xem Trước Ghép Chuẩn */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="font-bold text-text block mb-1">5. Quốc gia</label>
            <Input
              type="text"
              value={addressCountry}
              onChange={(e) => setAddressCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger font-medium"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col justify-end">
            <div className="p-2 rounded-xl bg-surface border border-border/80 text-caption flex items-start gap-1.5">
              <span className="font-bold text-danger-text shrink-0">Ghép chuẩn Cẩm nang hệ thống:</span>
              <span className="text-text font-medium line-clamp-2">
                {[addressStreet, addressWard, addressDistrict, addressCity, addressCountry].filter(Boolean).join(", ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-text block mb-1">Ngày giao hẹn</label>
          <ViDateInput ariaLabel="Ngày giao hẹn" value={deliveryDate} onChange={setDeliveryDate} className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text" />
        </div>

        <div>
          <label className="font-bold text-text block mb-1">Giờ giao hẹn *</label>
          <Input
            type="time"
            required
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>
      </div>
    </div>

    </>
  )
}
