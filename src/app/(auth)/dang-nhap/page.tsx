"use client"

// Trang xác thực smeOS — Hỗ trợ 3 luồng:
// 1. Đăng nhập tài khoản có sẵn (POST /api/v1/auth/login)
// 2. Đăng ký tài khoản chính thức (POST /api/v1/auth/signup)
// 3. Đăng ký dùng thử, chờ quản trị viên duyệt (POST /api/v1/auth/instant-trial)
// Cấp session cookie và điều hướng vào Dashboard ("/").

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Zap } from "@/components/ui/icon-set/zap"
import { LoginForm } from "./components/login-form"
import { SignupForm } from "./components/signup-form"
import { InstantTrialForm } from "./components/instant-trial-form"

type CheDo = "dang-nhap" | "dang-ky" | "dung-thu"

export default function DangNhapPage() {
  const { t } = useI18n()
  const [cheDo, setCheDo] = useState<CheDo>("dang-nhap")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      if (p.get("che-do") === "dung-thu" || p.get("trial") === "true" || p.get("demo") === "true") {
        setCheDo("dung-thu")
      } else if (p.get("che-do") === "dang-ky" || p.get("mode") === "register" || p.get("dang-ky") === "true") {
        setCheDo("dang-ky")
      }
    }
  }, [])

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-bg px-[20px] sm:px-[30px] py-9">
      <svg width="260" height="260" viewBox="0 0 260 260" className="pointer-events-none absolute -right-24 -top-24 opacity-50">
        <circle cx="130" cy="130" r="130" fill="var(--color-flora-leaf)" />
      </svg>

      <div className={`mx-auto flex w-full ${cheDo === "dang-nhap" ? "max-w-sm" : "max-w-xl"} flex-col gap-6 transition-all duration-300`}>
        <div className="flex flex-col items-center gap-2.5">
          <svg width="50" height="50" viewBox="0 0 100 100">
            <path d="M50,50 C48.5,45 41.5,38 50,32 C58.5,38 51.5,45 50,50 Z" fill="var(--color-flora-petal)" transform="rotate(258 50 50)" />
            <path d="M50,50 C47,40 33,26 50,14 C67,26 53,40 50,50 Z" fill="var(--color-flora-green)" />
            <path d="M50,50 C47,40 33,26 50,14 C67,26 53,40 50,50 Z" fill="var(--color-flora-sage)" transform="rotate(140 50 50)" />
            <circle cx="50" cy="50" r="3" fill="var(--color-flora-green)" />
          </svg>
          <h1 className="text-display-xl font-extrabold tracking-tight text-primary">smeOS</h1>
          <div className="text-center text-body-sm text-text-muted">
            {cheDo === "dung-thu"
              ? "Đăng ký dùng thử Cửa hàng mẫu theo ngành nghề — quản trị viên duyệt trước khi dùng"
              : cheDo === "dang-ky"
                ? "Đăng ký không gian vận hành cho doanh nghiệp của bạn"
                : "Hệ điều hành vận hành & quản trị Doanh nghiệp Vừa và Nhỏ"}
          </div>
        </div>

        {/* Tab 3 chế độ trực quan */}
        <div className="grid grid-cols-3 rounded-2xl border border-border bg-surface-alt/80 p-1 shadow-xs">
          <Button variant="ghost"
            type="button"
            onClick={() => setCheDo("dang-nhap")}
            className={`px-0 h-auto gap-0 cursor-pointer py-2 text-center text-body-sm font-bold rounded-xl transition-all ${
              cheDo === "dang-nhap"
                ? "bg-surface text-primary shadow-xs border border-border/60 hover:bg-surface"
                : "text-text hover:text-primary"
            }`}
          >
            Đăng nhập
          </Button>

          <Button variant="ghost"
            type="button"
            onClick={() => setCheDo("dang-ky")}
            className={`px-0 h-auto gap-0 cursor-pointer py-2 text-center text-body-sm font-bold rounded-xl transition-all ${
              cheDo === "dang-ky"
                ? "bg-surface text-primary shadow-xs border border-border/60 hover:bg-surface"
                : "text-text hover:text-primary"
            }`}
          >
            Đăng ký mới
          </Button>

          <Button variant="ghost"
            type="button"
            onClick={() => setCheDo("dung-thu")}
            className={`px-0 h-auto cursor-pointer py-2 text-center text-body-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              cheDo === "dung-thu"
                ? "bg-primary text-text-inverse shadow-xs font-extrabold hover:bg-primary"
                : "text-primary hover:text-primary-dark font-semibold"
            }`}
          >
            <Zap size={14} className={cheDo === "dung-thu" ? "text-text-inverse" : "text-primary"} />
            <span>Dùng thử</span>
          </Button>
        </div>

        <Suspense fallback={null}>
          <ThongBaoThietBiKhac />
        </Suspense>

        {cheDo === "dang-nhap" && (
          <LoginForm
            onSwitchToSignup={() => setCheDo("dang-ky")}
            onSwitchToInstantTrial={() => setCheDo("dung-thu")}
          />
        )}

        {cheDo === "dang-ky" && (
          <SignupForm onSwitchToLogin={() => setCheDo("dang-nhap")} />
        )}

        {cheDo === "dung-thu" && (
          <InstantTrialForm onSwitchToLogin={() => setCheDo("dang-nhap")} />
        )}
      </div>

      <div className="pb-1 pt-9 text-center text-caption text-text-muted">
        © smeOS — Hệ điều hành vận hành & quản trị Doanh nghiệp Vừa và Nhỏ
      </div>
    </main>
  )
}

/** Bị đẩy về đây vì tài khoản vừa đăng nhập ở thiết bị khác (một tài khoản chỉ một phiên). */
function ThongBaoThietBiKhac() {
  const params = useSearchParams()
  if (params.get("ly-do") !== "thiet-bi-khac") return null
  return (
    <div role="alert" className="rounded-xl border-[1.5px] border-warning/30 bg-warning/10 px-3.5 py-2.5 text-body-sm font-medium text-warning-text">
      Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác nên phiên ở đây đã kết thúc. Nếu
      đó không phải bạn, hãy đăng nhập lại và đổi mật khẩu.
    </div>
  )
}
