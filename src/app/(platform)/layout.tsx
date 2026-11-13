// Console Vận hành Nền tảng — ngữ cảnh song song với `(app)/layout.tsx`
// (chốt 18/09, kế hoạch mục 4.2/4.6). Giải `PlatformContext` từ CÙNG
// cookie phiên (`floraos_session`) nhưng KHÔNG qua `resolveAppSession` —
// hai bảng nguồn (`memberships`, `platform_operators`) độc lập, một tài
// khoản có thể vừa là thành viên tổ chức vừa là người vận hành.
//
// Không phải người vận hành (chưa đăng nhập, hoặc đã đăng nhập nhưng
// không có dòng `platform_operators` đang hoạt động) → về "/", không lộ
// rằng route này tồn tại.

import { requestCookieHeader } from "@/lib/request-cookie-header"
import { redirect } from "next/navigation"

import { resolvePlatformSession } from "@/modules/platform/use-cases/resolve-platform-session"
import { SessionProvider } from "@/lib/session"
import { I18nProvider } from "@/lib/i18n"
import { AppShell } from "@/components/layout/app-shell"
import { resolveUiTheme } from "@/lib/ui-system/resolve-ui-theme"

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const cookieHeader = await requestCookieHeader()
  const request = new Request("http://localhost/", { headers: { cookie: cookieHeader } })

  const pctx = await resolvePlatformSession(request)
  if (!pctx) redirect("/")

  const platformSession = {
    userName: "Quản trị Nền tảng",
    userInitials: "AD",
    orgName: "Vận hành Nền tảng",
    workspaceKind: "PRODUCTION" as const,
    capabilities: Array.from(pctx.capabilities),
    roleKey: "platform_admin",
    organizationType: "PLATFORM" as const,
  }

  const isDev = process.env.NODE_ENV !== "production"
  const uiTheme = resolveUiTheme(platformSession)

  return (
    <SessionProvider session={platformSession}>
      <I18nProvider>
        <AppShell
          theme={uiTheme}
          isDev={isDev}
          withUiStudio
        >
          {children}
        </AppShell>
      </I18nProvider>
    </SessionProvider>
  )
}

