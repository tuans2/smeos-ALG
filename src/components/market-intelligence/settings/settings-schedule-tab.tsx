"use client";

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React from "react";
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
;

export type FeatureKey = "market" | "keyword" | "product";

export interface SettingsScheduleTabProps {
  activeFeature: FeatureKey;
  marketSchedule: {
    enabled: boolean;
    time: string;
    notifyCopilot: boolean;
    notifyEmail: boolean;
  };
  setMarketSchedule: React.Dispatch<
    React.SetStateAction<{
      enabled: boolean;
      time: string;
      notifyCopilot: boolean;
      notifyEmail: boolean;
    }>
  >;
  keywordSchedule: {
    enabled: boolean;
    time: string;
    trackedKeywords: string[];
  };
  setKeywordSchedule: React.Dispatch<
    React.SetStateAction<{
      enabled: boolean;
      time: string;
      trackedKeywords: string[];
    }>
  >;
  newKeywordInput: string;
  setNewKeywordInput: React.Dispatch<React.SetStateAction<string>>;
  productMatching: {
    fitThreshold: number;
    autoMatchWeeklyTrends: boolean;
  };
  setProductMatching: React.Dispatch<
    React.SetStateAction<{
      fitThreshold: number;
      autoMatchWeeklyTrends: boolean;
    }>
  >;
}

export function SettingsScheduleTab({
  activeFeature,
  marketSchedule,
  setMarketSchedule,
  keywordSchedule,
  setKeywordSchedule,
  newKeywordInput,
  setNewKeywordInput,
  productMatching,
  setProductMatching,
}: SettingsScheduleTabProps) {
  const handleAddKeyword = () => {
    const trimmed = newKeywordInput.trim();
    if (trimmed && !keywordSchedule.trackedKeywords.includes(trimmed)) {
      setKeywordSchedule({
        ...keywordSchedule,
        trackedKeywords: [...keywordSchedule.trackedKeywords, trimmed],
      });
      setNewKeywordInput("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywordSchedule({
      ...keywordSchedule,
      trackedKeywords: keywordSchedule.trackedKeywords.filter((k) => k !== kw),
    });
  };

  return (
    <div className="space-y-4">
      {activeFeature === "market" && (
        <div className="space-y-3 bg-bg p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-text block text-body-sm">Tự động quét mỗi sáng</span>
              <span className="text-text-muted text-caption">Cập nhật xu hướng thị trường trước giờ mở cửa</span>
            </div>
            <Checkbox
              checked={marketSchedule.enabled}
              onCheckedChange={(checked) => setMarketSchedule({ ...marketSchedule, enabled: (checked === true) })}
              aria-label="Bật quét xu hướng tự động" className="h-6 w-6 rounded text-primary focus:ring-primary"
            />
          </div>
          <div className="pt-2 border-t border-border flex items-center gap-3">
            <label className="font-semibold text-text">Giờ quét tự động:</label>
            <Input
              type="time"
              value={marketSchedule.time} aria-label="Giờ quét xu hướng tự động"
              onChange={(e) => setMarketSchedule({ ...marketSchedule, time: e.target.value })}
              className="h-8 rounded-lg border border-border px-2 font-bold text-text bg-white"
            />
          </div>
        </div>
      )}

      {activeFeature === "keyword" && (
        <div className="space-y-3 bg-bg p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-text block text-body-sm">Tự động quét từ khóa đã ghim</span>
              <span className="text-text-muted text-caption">Chạy ngầm mỗi sáng cho danh sách từ khóa chủ lực của tiệm</span>
            </div>
            <Checkbox
              checked={keywordSchedule.enabled}
              onCheckedChange={(checked) => setKeywordSchedule({ ...keywordSchedule, enabled: (checked === true) })}
              aria-label="Bật quét từ khóa tự động" className="h-6 w-6 rounded text-primary focus:ring-primary"
            />
          </div>
          <div className="pt-2 border-t border-border flex items-center gap-3">
            <label className="font-semibold text-text">Giờ quét mở cửa:</label>
            <Input
              type="time"
              value={keywordSchedule.time} aria-label="Giờ quét từ khóa tự động"
              onChange={(e) => setKeywordSchedule({ ...keywordSchedule, time: e.target.value })}
              className="h-8 rounded-lg border border-border px-2 font-bold text-text bg-white"
            />
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border">
            <label className="font-semibold text-text">Danh mục từ khóa ghim theo dõi thường trực:</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                placeholder="Thêm từ khóa hoa (vd: Lan hồ điệp vàng)..."
                className="h-8 flex-1 rounded-lg border border-border px-2.5 bg-white text-caption"
              />
              <Button variant="primary"
                type="button"
                onClick={handleAddKeyword}
                className="py-0 text-[length:inherit] px-3 h-8 rounded-lg bg-primary text-white font-bold inline-flex items-center gap-1 hover:bg-primary-dark"
              >
                <Plus size={13} /> Thêm
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {keywordSchedule.trackedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-border text-text font-medium"
                >
                  {kw}
                  <Button variant="ghost"
              aria-label="Xóa" type="button" onClick={() => handleRemoveKeyword(kw)} className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 text-text-muted hover:text-primary">
                    <Trash2 size={11} />
                  </Button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeFeature === "product" && (
        <div className="space-y-3 bg-bg p-4 rounded-xl border border-border">
          <span className="font-bold text-text block text-body-sm">Tự động ghép sản phẩm với xu hướng</span>
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-text">Ngưỡng điểm phù hợp xu hướng:</label>
              <span className="font-black text-primary text-body-sm">{productMatching.fitThreshold}/100</span>
            </div>
            <Slider
              aria-label="Ngưỡng điểm phù hợp xu hướng"
              min={50}
              max={95}
              step={5}
              value={productMatching.fitThreshold}
              onValueChange={(v) => setProductMatching({ ...productMatching, fitThreshold: v })}
              getValueText={(v) => `${v} trên 100`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
