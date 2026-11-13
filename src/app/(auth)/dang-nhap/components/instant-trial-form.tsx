"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "@/components/ui/icon-set/check"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Zap } from "@/components/ui/icon-set/zap"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PendingApprovalNotice } from "./pending-approval-notice"
import { listAllIndustries, getIndustryDefinition, DEFAULT_INDUSTRY } from "@/modules/organization/domain/industry-profile"

interface InstantTrialFormProps {
  onSwitchToLogin: () => void
}

export function InstantTrialForm({ onSwitchToLogin }: InstantTrialFormProps) {
  const router = useRouter()
  const [industryKey, setIndustryKey] = useState<string>(DEFAULT_INDUSTRY)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [loi, setLoi] = useState<string | null>(null)
  const [choDuyet, setChoDuyet] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)

  const allIndustries = listAllIndustries()
  const selectedIndDef = getIndustryDefinition(industryKey)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoi(null)
    setDangGui(true)
    try {
      const res = await fetch("/api/v1/auth/instant-trial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Chủ cửa hàng dùng thử",
          phone: phone.trim(),
          email: email.trim(),
          industry_key: industryKey,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setLoi(data?.error?.message ?? "Không thể gửi đăng ký dùng thử lúc này — vui lòng thử lại sau")
        return
      }
      // 202: đăng ký dùng thử chờ quản trị viên duyệt, chưa có phiên đăng nhập
      if (res.status === 202) {
        setChoDuyet(data?.message ?? "Đăng ký đang chờ quản trị viên duyệt.")
        return
      }
      router.push("/")
      router.refresh()
    } catch {
      setLoi("Không kết nối được máy chủ — vui lòng kiểm tra lại kết nối mạng")
    } finally {
      setDangGui(false)
    }
  }

  if (choDuyet) {
    return (
      <PendingApprovalNotice
        message={choDuyet}
        hint="Khi được duyệt, quản trị viên gửi mật khẩu đăng nhập qua số điện thoại hoặc Zalo bạn để lại."
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

      {/* Banner thông báo dùng thử tức thì */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
          <Zap size={18} />
        </div>
        <div className="text-body-sm">
          <div className="font-bold text-primary">Cửa hàng mẫu theo ngành nghề</div>
          <div className="text-text-muted text-caption mt-0.5 leading-relaxed">
            Cửa hàng mẫu có đầy đủ sản phẩm, danh mục và 50 lượt trải nghiệm AI. Quản trị viên duyệt đăng ký rồi gửi mật khẩu đăng nhập cho bạn qua số điện thoại hoặc Zalo.
          </div>
        </div>
      </div>

      {/* 1. Chọn ngành nghề */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-body-sm font-bold text-text flex items-center gap-1.5">
            <span>1. Chọn ngành nghề bạn muốn trải nghiệm</span>
            <span className="text-danger">*</span>
          </div>
          <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {selectedIndDef.name}
          </span>
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

      {/* 2. Thông tin tiếp nhận Lead */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-3">
        <div className="text-body-sm font-bold text-text">
          2. Thông tin kết nối & nhận hỗ trợ
        </div>

        <div>
          <div className="mb-1.5 text-body-sm font-semibold">
            Họ và tên của bạn <span className="text-danger">*</span>
          </div>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn An"
            required
            className="h-[46px] w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5 text-body-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="mb-1.5 text-body-sm font-semibold">
              Số điện thoại / Zalo <span className="text-danger">*</span>
            </div>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912 345 678"
              required
              className="h-[46px] w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5 text-body-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="mb-1.5 text-body-sm font-semibold">
              Email nhận tài liệu <span className="text-danger">*</span>
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@gmail.com"
              required
              className="h-[46px] w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5 text-body-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="mt-1 h-12 w-full text-body font-bold shadow-md" disabled={dangGui}>
        {dangGui ? (
          "Đang gửi đăng ký…"
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles size={18} />
            <span>Đăng ký dùng thử Cửa hàng mẫu {selectedIndDef.name}</span>
          </span>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-caption text-text-muted">
        <ShieldCheck size={14} className="text-success" />
        <span>Không yêu cầu thẻ tín dụng · Quản trị viên duyệt trước khi dùng</span>
      </div>

      <div className="my-1 flex items-center gap-2.5">
        <div className="h-px flex-1 bg-border" />
        <div className="text-caption text-text-muted">hoặc</div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="text-center text-body text-text-muted">
        Đã có tài khoản trước đó?{" "}
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
