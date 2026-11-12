"use client";

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react";
import { Clock } from "@/components/ui/icon-set/clock"
import { Settings } from "@/components/ui/icon-set/settings"
import { Bell } from "@/components/ui/icon-set/bell"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Layers } from "@/components/ui/icon-set/layers"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Flame } from "@/components/ui/icon-set/flame"
import { Shield } from "@/components/ui/icon-set/shield"
import { History } from "@/components/ui/icon-set/history"
;
import type { RunItem } from "./research-runs-table";

/** Cấu hình lịch quét xu hướng định kỳ của tiệm, gửi lên khi bấm lưu. */
export interface TenantPulseScheduleConfig {
  enabled: boolean;
  dailyExecutionTime: string;
  trackedTopics: string[];
  notifyChannels: Array<"IN_APP_COPILOT" | "EMAIL">;
}

interface ScheduledPulsePanelProps {
  runs: RunItem[];
  isSaaSAdmin: boolean;
  onSaveTenantSchedule?: (config: TenantPulseScheduleConfig) => Promise<void>;
}

export function ScheduledPulsePanel({
  runs,
  isSaaSAdmin,
  onSaveTenantSchedule,
}: ScheduledPulsePanelProps) {
  const [scheduleTime, setScheduleTime] = useState("06:30");
  const [isEnabled, setIsEnabled] = useState(true);
  const [trackedKeywords, setTrackedKeywords] = useState<string[]>([
    "Hoa tulip pastel",
    "Sản phẩm tốt nghiệp Hàn Quốc",
    "Lan hồ điệp khai trương",
  ]);
  const [newKeyword, setNewKeyword] = useState("");
  const [notifyCopilot, setNotifyCopilot] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !trackedKeywords.includes(trimmed) && trackedKeywords.length < 10) {
      setTrackedKeywords([...trackedKeywords, trimmed]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setTrackedKeywords(trackedKeywords.filter((k) => k !== kw));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveTenantSchedule) {
      await onSaveTenantSchedule({
        enabled: isEnabled,
        dailyExecutionTime: scheduleTime,
        trackedTopics: trackedKeywords,
        notifyChannels: [
          notifyCopilot ? "IN_APP_COPILOT" : null,
          notifyEmail ? "EMAIL" : null,
        ].filter((c): c is "IN_APP_COPILOT" | "EMAIL" => c !== null),
      });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Khu vực Thiết lập Lịch Quét Tự Động */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-bg text-warning-text border border-warning-border/60">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-text text-body-sm">
                  {isSaaSAdmin
                    ? "Cấu hình lịch quét cho từng cửa hàng"
                    : "Lịch quét sáng của tiệm"}
                </h3>
                <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-success-bg text-success-text border border-success-border/80">
                  {isEnabled ? "Đang kích hoạt" : "Đã tạm dừng"}
                </span>
              </div>
              <p className="text-caption text-text-muted mt-0.5">
                {isSaaSAdmin
                  ? "Điều phối lịch quét tự động toàn hệ thống và đặt lịch quét riêng cho từng cửa hàng"
                  : "Mỗi sáng AI tự động quét thị trường theo danh mục hoa của tiệm và gửi bản tin tóm tắt lúc mở cửa"}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-caption font-semibold text-text cursor-pointer select-none">
            <Checkbox
              checked={isEnabled}
              onCheckedChange={(checked) => setIsEnabled((checked === true))}
              className="h-4 w-4 rounded accent-primary"
            />
            Bật tự động quét mỗi ngày
          </label>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Giờ quét */}
            <div className="space-y-1.5">
              <label className="text-caption font-bold text-text flex items-center gap-1.5">
                <Clock size={14} className="text-warning-text" />
                Giờ quét tự động mỗi sáng
              </label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-bg/50 px-3 text-caption font-semibold text-text outline-none focus:border-primary focus:bg-white transition"
              />
              <span className="text-caption text-text-muted block">
                Khuyến nghị: 06:00 - 07:00 sáng trước giờ mở cửa tiệm
              </span>
            </div>

            {/* Thông báo */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-caption font-bold text-text flex items-center gap-1.5">
                <Bell size={14} className="text-warning-text" />
                Kênh nhận bản tin sau khi quét
              </label>
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-caption text-text cursor-pointer">
                  <Checkbox
                    checked={notifyCopilot}
                    onCheckedChange={(checked) => setNotifyCopilot((checked === true))}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span>smeOS Copilot chào buổi sáng</span>
                </label>
                <label className="flex items-center gap-2 text-caption text-text cursor-pointer">
                  <Checkbox
                    checked={notifyEmail}
                    onCheckedChange={(checked) => setNotifyEmail((checked === true))}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span>Gửi email báo cáo hàng ngày</span>
                </label>
              </div>
            </div>
          </div>

          {/* Danh mục từ khóa tiệm theo dõi */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-caption font-bold text-text flex items-center gap-1.5">
                <Layers size={14} className="text-warning-text" />
                Từ khóa & Chủ đề hoa tiệm theo dõi thường trực ({trackedKeywords.length}/10)
              </label>
              <span className="text-caption text-text-muted">
                AI sẽ quét sâu các từ khóa này để tạo Bản Tin Sáng
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border bg-bg/50 min-h-[50px]">
              {trackedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-border text-caption font-semibold text-text shadow-2xs"
                >
                  {kw}
                  <Button variant="ghost"
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 text-text-muted hover:text-primary transition"
                  >
                    ×
                  </Button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Thêm từ khóa hoa riêng của tiệm (VD: Hoa cúc tana, Hoa baby bó lớn)..."
                className="h-9 flex-1 rounded-xl border border-border bg-white px-3 text-caption text-text outline-none focus:border-primary transition"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button variant="outline"
                type="button"
                onClick={handleAddKeyword}
                className="h-auto gap-0 px-4 py-1.5 rounded-xl border border-border bg-surface-alt text-caption font-bold text-text hover:bg-primary-muted hover:text-primary transition"
              >
                + Thêm
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {isSaved ? (
              <span className="inline-flex items-center gap-1.5 text-caption font-bold text-success-text">
                <CheckCircle2 size={15} />
                Đã lưu lịch quét tự động thành công!
              </span>
            ) : <span />}

            <Button variant="ghost"
              type="submit"
              className="h-auto inline-flex items-center gap-1.5 rounded-xl bg-text px-4 py-2 text-caption font-bold text-white hover:bg-text shadow-sm transition"
            >
              <Settings size={14} />
              Lưu thiết lập lịch quét
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Bản Tin Nhịp Đập Buổi Sáng (Morning Daily Pulse Brief) */}
      <div className="rounded-2xl border border-warning-border/80 bg-gradient-to-br from-warning-bg/50 via-white to-primary-muted/40 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning text-text">
              <Sparkles size={16} />
            </span>
            <div>
              <h4 className="text-body-sm font-extrabold text-text">Bản tin sáng: Gợi ý hôm nay</h4>
              <span className="text-caption text-text-muted">
                Cập nhật tự động lúc {scheduleTime} sáng hôm nay
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-primary-border/70 bg-white p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-caption font-bold text-primary">
              <Flame size={14} />
              <span>3 Xu hướng tăng vọt 24h</span>
            </div>
            <ul className="text-caption text-text space-y-1 pt-1">
              <li>• <strong>Hoa tulip pastel</strong> (+45% tìm kiếm)</li>
              <li>• <strong>Tone cam cháy vintage</strong> (+32% Reels)</li>
              <li>• <strong>Bó tốt nghiệp Hàn Quốc</strong> (+28% Group FB)</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-white p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-caption font-bold text-text">
              <AlertTriangle size={14} className="text-warning-text" />
              <span>Cảnh báo mẫu hạ nhiệt</span>
            </div>
            <p className="text-caption text-text-muted leading-relaxed pt-1">
              Các sản phẩm giấy gói màu đậm truyền thống đang giảm tương tác 18%. Khách hàng trẻ chuyển dịch mạnh sang <strong>giấy mờ phong cách Pháp</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-success-border/70 bg-white p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-caption font-bold text-success-text">
              <TrendingUp size={14} />
              <span>Đề xuất cắm & đăng bán hôm nay</span>
            </div>
            <p className="text-caption text-text-muted leading-relaxed pt-1">
              Ưu tiên cắm 1 bó mẫu <strong>Hoa Tulip phối Thủy tiên tone kem</strong> chụp cận cảnh đăng lúc 11:30 trưa để đón đầu nhu cầu sinh nhật cuối tuần.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Lịch Sử Các Phiên Quét Tự Động */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-text font-bold text-body-sm">
            <History size={16} className="text-text-muted" />
            <span>Lịch Sử Các Phiên Quét Tự Động & Hàng Đợi Hệ Thống</span>
          </div>
          <span className="text-caption text-text-muted">
            Tổng cộng: {runs.length} phiên đã lưu
          </span>
        </div>

        {runs.length === 0 ? (
          <p className="text-center py-8 text-caption text-text-muted">
            Chưa có phiên quét tự động nào được ghi nhận.
          </p>
        ) : (
          <div className="divide-y divide-border text-caption">
            {runs.slice(0, 5).map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-semibold text-text">
                    <span className="px-2 py-0.5 rounded bg-surface-alt text-caption font-mono">
                      {r.run_type}
                    </span>
                    <span>Lượt quét lúc {new Date(r.created_at).toLocaleString("vi-VN")}</span>
                  </div>
                  <span className="text-caption text-text-muted">
                    Thu thập {r.records_collected || 0} tín hiệu · Tạo {r.opportunities_created || 0} cơ hội
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-caption font-bold ${
                  r.status === "COMPLETED"
                    ? "bg-success-bg text-success-text"
                    : "bg-warning-bg text-warning-text"
                }`}>
                  {r.status === "COMPLETED" ? "Thành công" : r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
