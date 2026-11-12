"use client";

import { Button } from "@/components/ui/button"
import React from "react";
import { Flame } from "@/components/ui/icon-set/flame"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Lightbulb } from "@/components/ui/icon-set/lightbulb"
import { CalendarDays } from "@/components/ui/icon-set/calendar-days"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
;

export type ExecutiveFilterType = "ALL" | "IMPORTANT" | "RISING" | "TOPICS" | "OCCASIONS";

interface ExecutiveSummaryProps {
  totalCount?: number;
  opportunityCount: number;
  risingTrendCount: number;
  topicCount: number;
  occasionCount?: number;
  upcomingOccasions?: string[];
  activeFilter?: ExecutiveFilterType;
  onSelectCategory?: (category: ExecutiveFilterType) => void;
}

export function ExecutiveSummaryCards({
  totalCount = 0,
  opportunityCount,
  risingTrendCount,
  topicCount,
  occasionCount,
  upcomingOccasions,
  activeFilter = "ALL",
  onSelectCategory,
}: ExecutiveSummaryProps) {
  const currentMonth = new Date().getMonth() + 1;
  const defaultOccasions = [
    currentMonth === 9 || currentMonth === 10
      ? "Ngày Phụ nữ 20/10"
      : currentMonth === 11
      ? "Ngày Nhà giáo 20/11"
      : currentMonth === 12 || currentMonth === 1
      ? "Giáng sinh & Tết"
      : "Valentine & 8/3",
    `Sinh nhật tháng ${currentMonth}`,
    "Kỷ niệm ngày cưới",
    "Lễ tốt nghiệp đại học",
  ];
  const occasionsToDisplay = upcomingOccasions || defaultOccasions;
  const displayTotal = totalCount || opportunityCount || 10;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-primary-muted/20 to-bg p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
            <Sparkles size={15} />
          </span>
          <div>
            <h2 className="text-caption sm:text-body-sm font-extrabold uppercase tracking-wider text-text flex items-center gap-1.5">
              Tổng quan hôm nay
            </h2>
            <p className="text-caption text-text-muted font-medium">Bấm vào thẻ để xem chi tiết</p>
          </div>
        </div>

        {/* Nút Xem tất cả (ALL) & Chỉ báo thời gian thực */}
        <div className="flex items-center gap-2">
          <Button variant="outline"
            type="button"
            onClick={() => onSelectCategory?.("ALL")}
            className={`h-auto inline-flex items-center gap-1.5 text-caption font-bold px-3 py-1 rounded-full border transition ${
              activeFilter === "ALL"
                ? "bg-primary text-white border-primary shadow-xs hover:bg-primary"
                : "bg-white text-text-muted hover:text-primary hover:bg-primary-muted/60 border-border"
            }`}
          >
            <LayoutGrid size={12} />
            <span>Tất cả ({displayTotal})</span>
          </Button>

          <div className="flex items-center gap-1 text-caption font-bold text-text-muted bg-surface-alt/90 px-2.5 py-1 rounded-full border border-border/50">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse motion-reduce:animate-none" />
            Dữ liệu trực tiếp
          </div>
        </div>
      </div>

      {/* 4 Thẻ chỉ số tương tác (Interactive Clickable Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Cơ hội quan trọng */}
        <Button variant="outline"
          type="button"
          onClick={() => onSelectCategory?.(activeFilter === "IMPORTANT" ? "ALL" : "IMPORTANT")}
          className={`text-[length:inherit] h-auto flex-col items-stretch justify-start font-[inherit] gap-0 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer group relative ${
            activeFilter === "IMPORTANT"
              ? "border-primary bg-primary-muted/80 ring-2 ring-primary/50 shadow-xs hover:bg-primary-muted/80"
              : "border-primary-border/80 bg-white hover:border-primary-border hover:shadow-xs hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text group-hover:text-primary transition">
              Cơ hội quan trọng
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-muted text-primary group-hover:scale-110 transition">
              <Flame size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-display font-black text-primary">{opportunityCount}</span>
            <span className="text-caption text-text-muted font-medium">cơ hội hot</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-caption">
            <span className="text-text-muted line-clamp-1">Điểm cơ hội &ge; 60</span>
            <span className="text-primary font-bold flex shrink-0 items-center gap-0.5 whitespace-nowrap">
              {activeFilter === "IMPORTANT" ? "Đang chọn ✓" : "Lọc xem →"}
            </span>
          </div>
        </Button>

        {/* Metric 2: Xu hướng đang tăng */}
        <Button variant="outline"
          type="button"
          onClick={() => onSelectCategory?.(activeFilter === "RISING" ? "ALL" : "RISING")}
          className={`text-[length:inherit] h-auto flex-col items-stretch justify-start font-[inherit] gap-0 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer group relative ${
            activeFilter === "RISING"
              ? "border-success bg-success-bg/80 ring-2 ring-success/50 shadow-xs hover:bg-success-bg/80"
              : "border-success-border/80 bg-white hover:border-success-border hover:shadow-xs hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text group-hover:text-success transition">
              Xu hướng bứt phá
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success-bg text-success-text group-hover:scale-110 transition">
              <TrendingUp size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-display font-black text-success-text">{risingTrendCount}</span>
            <span className="text-caption text-text-muted font-medium">trend tăng mạnh</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-caption">
            <span className="text-text-muted line-clamp-1">Viral &amp; Trend cao</span>
            <span className="text-success-text font-bold flex shrink-0 items-center gap-0.5 whitespace-nowrap">
              {activeFilter === "RISING" ? "Đang chọn ✓" : "Lọc xem →"}
            </span>
          </div>
        </Button>

        {/* Metric 3: Chủ đề nội dung */}
        <Button variant="outline"
          type="button"
          onClick={() => onSelectCategory?.(activeFilter === "TOPICS" ? "ALL" : "TOPICS")}
          className={`text-[length:inherit] h-auto flex-col items-stretch justify-start font-[inherit] gap-0 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer group relative ${
            activeFilter === "TOPICS"
              ? "border-warning bg-warning-bg/80 ring-2 ring-warning/50 shadow-xs hover:bg-warning-bg/80"
              : "border-warning-border/80 bg-white hover:border-warning-border hover:shadow-xs hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text group-hover:text-warning-text transition">
              Chủ đề nên làm
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-warning-bg text-warning-text group-hover:scale-110 transition">
              <Lightbulb size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-display font-black text-warning-text">{topicCount}</span>
            <span className="text-caption text-text-muted font-medium">kịch bản sẵn có</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-caption">
            <span className="text-text-muted line-clamp-1">Có sẵn Hook &amp; Mẫu</span>
            <span className="text-warning-text font-bold flex shrink-0 items-center gap-0.5 whitespace-nowrap">
              {activeFilter === "TOPICS" ? "Đang chọn ✓" : "Lọc xem →"}
            </span>
          </div>
        </Button>

        {/* Metric 4: Dịp lễ & Mùa vụ tới */}
        <Button variant="outline"
          type="button"
          onClick={() => onSelectCategory?.(activeFilter === "OCCASIONS" ? "ALL" : "OCCASIONS")}
          className={`text-[length:inherit] h-auto flex-col items-stretch justify-start font-[inherit] gap-0 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer group relative ${
            activeFilter === "OCCASIONS"
              ? "border-accent bg-accent-bg/80 ring-2 ring-accent/50 shadow-xs hover:bg-accent-bg/80"
              : "border-accent-border/80 bg-white hover:border-accent-border hover:shadow-xs hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text group-hover:text-accent-text transition">
              Mùa vụ &amp; Dịp tới
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-bg text-accent-text group-hover:scale-110 transition">
              <CalendarDays size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-display font-black text-accent-text">
              {occasionCount !== undefined ? occasionCount : occasionsToDisplay.length}
            </span>
            <span className="text-caption text-text-muted font-medium">mẫu theo sự kiện</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-caption">
            <span className="text-text-muted line-clamp-1">
              {occasionsToDisplay.slice(0, 2).join(" · ")}
            </span>
            <span className="text-accent-text font-bold flex shrink-0 items-center gap-0.5 whitespace-nowrap">
              {activeFilter === "OCCASIONS" ? "Đang chọn ✓" : "Lọc xem →"}
            </span>
          </div>
        </Button>
      </div>
    </div>
  );
}
