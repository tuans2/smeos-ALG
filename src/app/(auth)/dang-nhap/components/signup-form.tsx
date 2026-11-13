"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye } from "@/components/ui/icon-set/eye"
import { EyeOff } from "@/components/ui/icon-set/eye-off"
import { Check } from "@/components/ui/icon-set/check"
import { Store } from "@/components/ui/icon-set/store"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PendingApprovalNotice } from "./pending-approval-notice"
import { listAllIndustries, getIndustryDefinition, DEFAULT_INDUSTRY } from "@/modules/organization/domain/industry-profile"

interface SignupFormProps {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [ten, setTen] = useState("")
  const [tenToChuc, setTenToChuc] = useState("")
  const [industryKey, setIndustryKey] = useState<string>(DEFAULT_INDUSTRY)
  const [organizationType, setOrganizationType] = useState<"SINGLE" | "CHAIN">("SINGLE")
  const [loi, setLoi] = useState<string | null>(null)
  const [choDuyet, setChoDuyet] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)

  const allIndustries = listAllIndustries()
  const selectedIndDef = getIndustryDefinition(industryKey)

  const getIndustryPlaceholder = (ind: string) => {
    switch (ind) {
      case "FASHION":
        return "Ví dụ: Thời Trang Thiết Kế Lin Boutique"
      case "FNB":
        return "Ví dụ: Tiệm Bánh & Cà Phê Mùa Hạ"
      case "CRAFT_GIFT":
        return "Ví dụ: Gốm Mộc & Quà Tặng An Nhiên"
      case "RETAIL_GENERAL":
        return "Ví dụ: Siêu Thị Tiện Lợi Gia Hưng"
      case "SERVICES":
        return "Ví dụ: Spa & Viện Chăm Sóc Sắc Đẹp Mộc Lan"
      case "FLORAL":
      default:
        return "Ví dụ: Cửa Hàng Thảo Mộc Xanh"
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoi(null)
    setDangGui(true)
    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: ten || null,
          organization_name: tenToChuc,
          industry_key: industryKey,
          organization_type: organizationType,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setLoi(data?.error?.message ?? "Đăng ký thất bại — vui lòng thử lại sau")
        return
      }
      // 202: tài khoản chờ quản trị viên duyệt, chưa có phiên đăng nhập
      if (res.status === 202) {
        setChoDuyet(data?.message ?? "Đăng ký đang chờ quản trị viên duyệt.")
        return
      }
      router.push("/")
      router.refresh()
    } catch {
      setLoi("Không kết nối được máy chủ — vui lòng kiểm tra kết nối mạng")
    } finally {
      setDangGui(false)
    }
  }

  if (choDuyet) {
    return (
      <PendingApprovalNotice
        message={choDuyet}
        hint="Khi được duyệt, bạn đăng nhập bằng địa chỉ thư và mật khẩu vừa đăng ký."
        onSwitchToLogin={onSwitchToLogin}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {loi && (
        <div className="rounded-xl border-[1.5px] border-danger/30 bg-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-danger">
          {loi}
        </div>
      )}

      <div className="rounded-2xl border-2 border-primary/20 bg-surface p-4 sm:p-5 shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-body-sm font-bold text-text">
              1. Chọn lĩnh vực hoạt động của bạn <span className="text-danger">*</span>
            </div>
            <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {selectedIndDef.name}
            </span>
          </div>
          <div className="text-caption text-text-muted mb-3">
            Giao diện, danh mục sản phẩm, mẫu in ấn và trợ lý AI sẽ tự động kích hoạt theo đúng ngành này khi bạn đăng nhập
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {allIndustries.map((ind) => {
              const isSelected = ind.key === industryKey
              return (
                <Button variant="outline"
                  type="button"
                  key={ind.key}
                  onClick={() => setIndustryKey(ind.key)}
                  className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs hover:bg-primary/10"
                      : "border-border bg-surface-alt/60 hover:border-primary/50 hover:bg-surface-alt/60"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-body-sm font-bold text-text">{ind.name}</span>
                    {isSelected && <Check size={14} className="text-primary font-bold" />}
                  </div>
                  <p className="text-caption text-text-muted line-clamp-2 leading-relaxed">
                    {ind.description}
                  </p>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <div className="text-body-sm font-bold text-text">
              2. Chọn mô hình vận hành <span className="text-danger">*</span>
            </div>
            <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent-text border border-accent/20">
              {organizationType === "SINGLE" ? "1 Cửa hàng độc lập" : "Chuỗi nhiều chi nhánh"}
            </span>
          </div>
          <div className="text-caption text-text-muted">
            Quy trình duyệt đơn sẽ tự động áp dụng tương ứng (có thể xin chuyển đổi sau với Admin SaaS)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <Button variant="outline"
              type="button"
              onClick={() => setOrganizationType("SINGLE")}
              className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                organizationType === "SINGLE"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs hover:bg-primary/10"
                  : "border-border bg-surface-alt/60 hover:border-primary/50 hover:bg-surface-alt/60"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-body-sm font-bold text-text flex items-center gap-1.5">
                  <Store size={15} className="text-primary shrink-0" />
                  <span>1 Cửa hàng độc lập</span>
                </span>
                {organizationType === "SINGLE" && <Check size={14} className="text-primary font-bold" />}
              </div>
              <p className="text-caption text-text-muted leading-relaxed">
                Một cơ sở duy nhất. Điều hành duyệt thanh toán là tự động tiếp nhận sản xuất ngay.
              </p>
            </Button>

            <Button variant="outline"
              type="button"
              onClick={() => setOrganizationType("CHAIN")}
              className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                organizationType === "CHAIN"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs hover:bg-primary/10"
                  : "border-border bg-surface-alt/60 hover:border-primary/50 hover:bg-surface-alt/60"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-body-sm font-bold text-text flex items-center gap-1.5">
                  <Building2 size={15} className="text-primary shrink-0" />
                  <span>Chuỗi cửa hàng</span>
                </span>
                {organizationType === "CHAIN" && <Check size={14} className="text-primary font-bold" />}
              </div>
              <p className="text-caption text-text-muted leading-relaxed">
                Hệ thống nhiều chi nhánh. Bắt đầu như 1 cửa hàng; mô hình Chuỗi được mở sau khi Admin SaaS duyệt yêu cầu.
              </p>
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-3">
          <div className="text-body-sm font-bold text-text">
            3. Thông tin cơ sở kinh doanh
          </div>

          <div>
            <div className="mb-1.5 text-body-sm font-semibold">
              Tên cơ sở / thương hiệu <span className="text-danger">*</span>
            </div>
            <Input
              type="text"
              value={tenToChuc}
              onChange={(e) => setTenToChuc(e.target.value)}
              placeholder={getIndustryPlaceholder(industryKey)}
              required
              className="h-[46px] w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5 text-body-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div>
            <div className="mb-1.5 text-body-sm font-semibold">Họ tên người điều hành (tuỳ chọn)</div>
            <Input
              type="text"
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="h-[46px] w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5 text-body-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-body-sm font-semibold">
          Email đăng nhập <span className="text-danger">*</span>
        </div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@cuahang.vn"
          required
          autoComplete="username"
          className="h-[46px] w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5 text-body-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <div>
        <div className="mb-1.5 text-body-sm font-semibold">
          Mật khẩu <span className="text-danger">*</span>
        </div>
        <div className="relative">
          <Input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
            required
            autoComplete="new-password"
            className="h-[46px] w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5 pr-11 text-body-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={showPw}
            className="absolute right-1.5 top-1.5 flex h-[34px] w-[34px] p-0 items-center justify-center text-text-muted"
          >
            {showPw ? <EyeOff size={19} strokeWidth={1.8} /> : <Eye size={19} strokeWidth={1.8} />}
          </Button>
        </div>
      </div>

      <Button type="submit" className="mt-1.5 w-full" disabled={dangGui}>
        {dangGui ? "Đang khởi tạo không gian kinh doanh…" : `Đăng ký & Thiết lập ${selectedIndDef.name}`}
      </Button>

      <div className="my-1 flex items-center gap-2.5">
        <div className="h-px flex-1 bg-border" />
        <div className="text-caption text-text-muted">hoặc</div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="text-center text-body text-text-muted">
        Đã có tài khoản?{" "}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSwitchToLogin}
          className="h-auto p-0 font-bold text-accent-text hover:underline inline"
        >
          Đăng nhập
        </Button>
      </div>
    </form>
  )
}
