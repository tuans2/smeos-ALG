"use client"

import * as React from "react"
import { BottomNav } from "@/components/layout/bottom-nav"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer"
import { GlobalImageZoom } from "@/components/ui/global-image-zoom"
import { SessionTakeoverWatcher } from "@/components/layout/session-takeover-watcher"
import { LiveRegionProvider } from "@/components/ui/live-region"
import { ToastProvider } from "@/components/ui/toast"
import { FloatingLayerProvider } from "@/components/layout/floating-layer"
import { ToolLockGuard } from "@/components/layout/tool-lock-guard"
import { UiStudioAvailabilityProvider } from "@/components/layout/ui-studio-availability"
import { UiStudioDrawer } from "@/components/layout/ui-studio-drawer"
import { FloraOSGlobalCopilot } from "@/components/chat/floraos-global-copilot"
import { UiSystemProvider, useUiSystem } from "@/lib/ui-system/ui-provider"
import type { ResolvedUiTheme } from "@/lib/ui-system/resolve-ui-theme"

export interface AppShellProps {
  children: React.ReactNode
  theme: ResolvedUiTheme
  isDev?: boolean
  withToolGuard?: boolean
  withCopilot?: boolean
  withImageZoom?: boolean
  withUiStudio?: boolean
}

/**
 * Theme máy chủ phân giải theo tầng (`resolveUiTheme`) là cấu hình gốc của UiSystemProvider;
 * UI Studio / density người dùng tự chọn đè lên trên. Provider đặt ở đây (không ở root layout)
 * vì chỉ AppShell biết theme của phiên — provider ở root luôn mang preset mặc định.
 */
export function AppShell(props: AppShellProps) {
  return (
    <UiSystemProvider initialConfig={{ preset: props.theme.preset, density: props.theme.density }}>
      <AppShellFrame {...props} />
    </UiSystemProvider>
  )
}

function AppShellFrame({
  children,
  theme,
  isDev = process.env.NODE_ENV !== "production",
  withToolGuard = false,
  withCopilot = false,
  withImageZoom = false,
  withUiStudio = true,
}: AppShellProps) {
  const { config } = useUiSystem()
  const activePreset = config.preset
  const activeDensity = config.density

  const content = withToolGuard ? <ToolLockGuard>{children}</ToolLockGuard> : children

  return (
    <LiveRegionProvider>
      {/* Thông báo nổi dùng chung thay alert() của trình duyệt (03c UX-015) */}
      <ToastProvider>
        <UiStudioAvailabilityProvider value={withUiStudio}>
          <FloatingLayerProvider>
            <a
              href="#noi-dung-chinh"
              className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--radius-button)] focus:bg-primary focus:px-4 focus:py-2.5 focus:text-body-sm focus:font-bold focus:text-white focus:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Bỏ qua tới nội dung
            </a>
            <div
              data-theme={activePreset}
              data-density={activeDensity}
              style={theme.brandStyle}
              className="mx-auto flex min-h-dvh w-full flex-col md:flex-row"
            >
              <MobileNavDrawer>
                <DesktopNav isDev={isDev} />
                <main
                  id="noi-dung-chinh"
                  tabIndex={-1}
                  className="min-h-0 min-w-0 flex-1 focus:outline-none pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
                >
                  {content}
                </main>
              </MobileNavDrawer>
              <BottomNav />
            </div>
            {withImageZoom && <GlobalImageZoom />}
            <SessionTakeoverWatcher />
            {withCopilot && <FloraOSGlobalCopilot />}
            {/* Layout quyết định theo ADR-011 D-UI-01: (app) chỉ ngoài production, (platform) luôn có */}
            {withUiStudio && <UiStudioDrawer />}
          </FloatingLayerProvider>
        </UiStudioAvailabilityProvider>
      </ToastProvider>
    </LiveRegionProvider>
  )
}
