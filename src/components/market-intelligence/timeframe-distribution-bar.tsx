"use client";

import { Button } from "@/components/ui/button"
import React, { useMemo } from "react";
import { Zap } from "@/components/ui/icon-set/zap"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { CalendarDays } from "@/components/ui/icon-set/calendar-days"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Layers } from "@/components/ui/icon-set/layers"
import { Clock } from "@/components/ui/icon-set/clock"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Filter } from "@/components/ui/icon-set/filter"
;
import {
  type MarketTimeframeKey,
  type TimeframeDistribution,
  type PeriodBucket,
  TIMEFRAME_CONFIGS,
  generateDailyBuckets,
  generateWeeklyBuckets,
  generateMonthlyBuckets,
  generateQuarterlyBuckets,
} from "@/modules/market-intelligence/domain/trend-timeframe";
import type { OpportunityItem } from "./opportunity-card";

interface TimeframeDistributionBarProps {
  activeTimeframe: MarketTimeframeKey;
  onSelectTimeframe: (key: MarketTimeframeKey) => void;
  selectedBucket: PeriodBucket | null;
  onSelectBucket: (bucket: PeriodBucket | null) => void;
  distribution: TimeframeDistribution;
  items: OpportunityItem[];
  className?: string;
}

const SCOPE_BUTTONS: Array<{
  key: MarketTimeframeKey;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  activeBg: string;
  activeText: string;
  ringColor: string;
}> = [
  {
    key: "DAY",
    label: "Theo Ngày",
    subLabel: "Từng ngày",
    icon: Zap,
    activeBg: "bg-warning hover:bg-warning",
    activeText: "text-white",
    ringColor: "ring-warning-border/70 border-warning",
  },
  {
    key: "WEEK",
    label: "Theo Tuần",
    subLabel: "Từng tuần",
    icon: Calendar,
    activeBg: "bg-primary hover:bg-primary",
    activeText: "text-white",
    ringColor: "ring-primary-border/70 border-primary",
  },
  {
    key: "MONTH",
    label: "Theo Tháng",
    subLabel: "Từng tháng",
    icon: CalendarDays,
    activeBg: "bg-info hover:bg-info",
    activeText: "text-white",
    ringColor: "ring-info-border/70 border-info",
  },
  {
    key: "QUARTER",
    label: "Theo 3 Tháng",
    subLabel: "Từng quý",
    icon: TrendingUp,
    activeBg: "bg-accent hover:bg-accent",
    activeText: "text-white",
    ringColor: "ring-accent-border/70 border-accent",
  },
  {
    key: "ALL",
    label: "Tất Cả",
    subLabel: "Toàn bộ",
    icon: Layers,
    activeBg: "bg-text hover:bg-text",
    activeText: "text-white",
    ringColor: "ring-text-muted/70 border-text",
  },
];

export function TimeframeDistributionBar({
  activeTimeframe,
  onSelectTimeframe,
  selectedBucket,
  onSelectBucket,
  distribution,
  items,
  className = "",
}: TimeframeDistributionBarProps) {
  // Sinh danh sách buckets rời rạc tương ứng với Scope đã chọn
  const dailyBuckets = useMemo(() => generateDailyBuckets(items, 7), [items]);
  const weeklyBuckets = useMemo(() => generateWeeklyBuckets(items, 4), [items]);
  const monthlyBuckets = useMemo(() => generateMonthlyBuckets(items, 4), [items]);
  const quarterlyBuckets = useMemo(() => generateQuarterlyBuckets(items, 4), [items]);

  const currentBuckets: PeriodBucket[] = useMemo(() => {
    switch (activeTimeframe) {
      case "DAY":
        return dailyBuckets;
      case "WEEK":
        return weeklyBuckets;
      case "MONTH":
        return monthlyBuckets;
      case "QUARTER":
        return quarterlyBuckets;
      case "ALL":
      default:
        return [];
    }
  }, [activeTimeframe, dailyBuckets, weeklyBuckets, monthlyBuckets, quarterlyBuckets]);

  const getScopeTotal = (key: MarketTimeframeKey): number => {
    switch (key) {
      case "DAY":
        return distribution.day;
      case "WEEK":
        return distribution.week;
      case "MONTH":
        return distribution.month;
      case "QUARTER":
        return distribution.quarter;
      case "ALL":
      default:
        return distribution.all;
    }
  };

  const handleScopeChange = (key: MarketTimeframeKey) => {
    onSelectTimeframe(key);
    // Khi đổi tầng 1, reset chọn mốc rời rạc về xem toàn bộ khung hoặc mốc mới nhất
    onSelectBucket(null);
  };

  const activeConfig = TIMEFRAME_CONFIGS[activeTimeframe];

  return (
    <div
      className={`rounded-2xl border border-border/90 bg-white p-3.5 sm:p-4 shadow-xs space-y-3 ${className}`}
    >
      {/* TẦNG 1: Thanh chọn chế độ xem (Scope Selector) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <Clock size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-caption sm:text-body-sm font-extrabold text-text">
                Chế độ phân bổ:
              </span>
              <span className="text-caption font-bold text-primary bg-primary-muted px-2 py-0.5 rounded-full border border-primary-border">
                {activeConfig.label}
              </span>
              {selectedBucket && (
                <>
                  <ChevronRight size={12} className="text-text-muted" />
                  <span className="text-caption font-bold text-warning-text bg-warning-bg px-2 py-0.5 rounded-full border border-warning-border">
                    {selectedBucket.label}
                  </span>
                </>
              )}
            </div>
            <p className="text-caption text-text-muted font-medium">
              {selectedBucket
                ? `Đang lọc hiển thị các cơ hội thuộc ${selectedBucket.label}`
                : activeConfig.description}
            </p>
          </div>
        </div>

        {/* 5 Nút bấm chọn Chế độ xem */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-surface-alt/90 p-1 rounded-xl border border-border/60">
          {SCOPE_BUTTONS.map((btn) => {
            const Icon = btn.icon;
            const count = getScopeTotal(btn.key);
            const isSelected = activeTimeframe === btn.key;

            return (
              <Button variant="ghost"
                key={btn.key}
                type="button"
                onClick={() => handleScopeChange(btn.key)}
                className={`h-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-caption font-bold transition duration-150 flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? `${btn.activeBg} ${btn.activeText} shadow-xs border ring-2 ${btn.ringColor}`
                    : "text-text-muted hover:text-text hover:bg-white/80"
                }`}>
                <Icon size={13} className={isSelected ? "animate-pulse motion-reduce:animate-none" : "text-text-muted"} />
                <span>{btn.label}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-caption font-black ${
                    isSelected ? "bg-white/20 text-white" : "bg-border/90 text-text"
                  }`}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* TẦNG 2: Thanh chọn Mốc Rời Rạc Cụ Thể (Discrete Period Picker) */}
      {activeTimeframe !== "ALL" && currentBuckets.length > 0 && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-caption">
            <span className="font-bold text-text-muted flex items-center gap-1">
              <Filter size={12} className="text-primary" />
              Chọn mốc {activeConfig.shortLabel.toLowerCase()} muốn xem:
            </span>
            {selectedBucket && (
              <Button variant="ghost"
                type="button"
                onClick={() => onSelectBucket(null)}
                className="h-auto p-0 gap-0 text-caption font-semibold text-primary hover:text-primary underline transition"
              >
                Xóa lọc mốc (Xem gộp {activeConfig.shortLabel.toLowerCase()})
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {/* Nút Xem Gộp Toàn Bộ Khung */}
            <Button variant="outline"
              type="button"
              onClick={() => onSelectBucket(null)}
              className={`h-auto gap-0 flex-shrink-0 px-2.5 py-1.5 rounded-lg text-caption font-bold transition cursor-pointer border ${
                selectedBucket === null
                  ? "bg-primary text-white border-primary shadow-xs hover:bg-primary"
                  : "bg-bg text-text-muted border-border hover:bg-surface-alt hover:text-text"
              }`}
            >
              Toàn bộ {activeConfig.shortLabel.toLowerCase()} ({getScopeTotal(activeTimeframe)})
            </Button>

            {/* Các nút bấm từng ngày/tuần/tháng cụ thể */}
            {currentBuckets.map((bucket) => {
              const isSelected = selectedBucket?.id === bucket.id;
              const hasItems = bucket.count > 0;

              return (
                <Button variant="outline"
                  key={bucket.id}
                  type="button"
                  onClick={() => onSelectBucket(bucket)}
                  className={`h-auto flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-caption transition cursor-pointer border ${
                    isSelected
                      ? "bg-warning-text text-white border-warning-text font-bold shadow-xs ring-2 ring-warning-border/60 hover:bg-warning-text/90"
                      : hasItems
                      ? "bg-white text-text border-border hover:border-warning hover:bg-warning-bg/40 font-semibold"
                      : "bg-bg text-text-muted border-border/60 hover:bg-surface-alt"
                  }`}
                >
                  <span>{bucket.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-caption font-black ${
                      isSelected
                        ? "bg-warning-text text-white"
                        : hasItems
                        ? "bg-warning-bg text-warning-text"
                        : "bg-border text-text-muted"
                    }`}
                  >
                    {bucket.count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
