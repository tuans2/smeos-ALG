"use client"

import React, { useState } from "react"
import { Palette } from "@/components/ui/icon-set/palette"
import { X } from "@/components/ui/icon-set/x"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Minimize2 } from "@/components/ui/icon-set/minimize2"
import { Eye } from "@/components/ui/icon-set/eye"
import { useUiSystem } from "@/lib/ui-system/ui-provider"
import type { UiPresetId, UiDensity } from "@/lib/ui-system/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UiStudioPresetList } from "./ui-studio-preset-list"

export function UiStudioDrawer() {
  const [isOpen, setIsOpen] = useState(false)

  const {
    config,
    currentPreset,
    availablePresets,
    setPreset,
    setDensity,
    resetToDefault,
  } = useUiSystem()

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener("open-ui-studio", handleOpen)
    return () => window.removeEventListener("open-ui-studio", handleOpen)
  }, [])

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <Button variant="outline"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-[length:inherit] h-auto font-[inherit] group relative flex items-center gap-2 px-3 py-2.5 rounded-full bg-surface border border-border shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-text cursor-pointer hover:bg-surface"
          title="Tùy biến Giao diện & UI Presets"
          aria-label="Mở bảng điều khiển giao diện"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-fg shadow-xs">
            <Palette className="w-3.5 h-3.5" />
          </div>
          <span className="text-caption font-semibold pr-1 hidden sm:inline-block">
            UI Studio
          </span>
          <span className="text-caption uppercase font-mono px-1.5 py-0.5 rounded-full bg-primary-muted text-primary border border-primary/20">
            {currentPreset.name.split(" ")[0]}
          </span>
        </Button>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-fg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-body-sm font-bold text-text leading-tight">
                      smeOS UI Studio
                    </h2>
                    <p className="text-caption text-text-muted mt-0.5">
                      Chuyển đổi phong cách & mật độ giao diện (ADR-011 D-UI-03)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Đóng bảng điều khiển"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <UiStudioPresetList
                  availablePresets={availablePresets}
                  selectedPresetId={config.preset}
                  onSelectPreset={(id: UiPresetId) => setPreset(id)}
                />

                {/* Density Control (ADR-011 D-UI-03: compact vs comfortable) */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="text-caption font-bold text-text uppercase tracking-wider block">
                    Mật độ khoảng cách (Density)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "compact" as UiDensity, label: "Nhỏ gọn (Compact)", desc: "Kho vận & kế toán", icon: Minimize2 },
                      { id: "comfortable" as UiDensity, label: "Tiêu chuẩn (Comfortable)", desc: "Mặc định hệ thống", icon: Eye },
                    ].map((item) => {
                      const isSelected = config.density === item.id
                      const Icon = item.icon
                      return (
                        <Button variant="outline"
                          type="button"
                          key={item.id}
                          onClick={() => setDensity(item.id)}
                          className={`text-[length:inherit] h-auto p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary-muted text-primary font-bold shadow-xs hover:bg-primary-muted"
                              : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text hover:bg-surface"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-caption font-semibold leading-tight">{item.label}</span>
                          <span className="text-caption text-text-muted leading-tight">{item.desc}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Live Preview Specs */}
                <Card className="p-3.5 space-y-2 bg-surface-alt/50" variant="default">
                  <div className="text-caption font-bold text-text uppercase tracking-wider">
                    Thông số hiển thị thực tế
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-caption font-mono text-text-muted">
                    <div>Preset: <span className="text-text font-bold">{config.preset}</span></div>
                    <div>Density: <span className="text-text font-bold">{config.density}</span></div>
                    <div>Primary: <span className="text-text font-bold">{currentPreset.tokens.primary}</span></div>
                    <div>Bo góc: <span className="text-text font-bold">{currentPreset.radius.card}</span></div>
                  </div>
                </Card>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between bg-surface">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Đặt lại mặc định
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Xong
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
