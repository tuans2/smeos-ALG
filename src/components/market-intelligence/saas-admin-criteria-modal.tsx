"use client";

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState, useMemo } from "react";
import { Shield } from "@/components/ui/icon-set/shield"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Sliders } from "@/components/ui/icon-set/sliders"
import { Globe } from "@/components/ui/icon-set/globe"
import { Layers } from "@/components/ui/icon-set/layers"
import { Search } from "@/components/ui/icon-set/search"
import { Check } from "@/components/ui/icon-set/check"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { CheckSquare } from "@/components/ui/icon-set/check-square"
;
import {
  MARKET_TAXONOMY_CATEGORIES,
  ALL_CORE_KEYWORDS,
  getSeasonalRecommendedKeywords,
} from "@/modules/market-intelligence/domain/market-taxonomy";

interface SaaSAdminCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndTrigger: (config: SaaSAdminCriteriaConfig) => Promise<void>;
  isSaving: boolean;
}

export interface SaaSAdminCriteriaConfig {
  macroTopics: string[];
  weights: {
    trend: number;
    viral: number;
    commercial: number;
  };
  channels: string[];
  geoScope: string;
  autoBroadcastToTenants: boolean;
}

export function SaaSAdminCriteriaModal({
  isOpen,
  onClose,
  onSaveAndTrigger,
  isSaving,
}: SaaSAdminCriteriaModalProps) {
  // Mặc định chọn bộ đề xuất theo mùa thu (20/10, tốt nghiệp, quà tặng cưới)
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() =>
    getSeasonalRecommendedKeywords()
  );
  const [activeCategory, setActiveCategory] = useState<string>("recommended");
  const [filterQuery, setFilterQuery] = useState("");
  const [newCustomInput, setNewCustomInput] = useState("");

  const [trendWeight, setTrendWeight] = useState(40);
  const [viralWeight, setViralWeight] = useState(30);
  const [commercialWeight, setCommercialWeight] = useState(30);
  const [geoScope, setGeoScope] = useState("VN");
  const [autoBroadcast, setAutoBroadcast] = useState(true);

  // Danh sách keywords hiển thị theo tab đang chọn
  const displayKeywords = useMemo(() => {
    let list: readonly string[] = [];
    if (activeCategory === "recommended") {
      list = getSeasonalRecommendedKeywords();
    } else if (activeCategory === "all") {
      list = ALL_CORE_KEYWORDS;
    } else {
      const cat = MARKET_TAXONOMY_CATEGORIES.find((c) => c.id === activeCategory);
      list = cat ? cat.keywords : [];
    }

    if (!filterQuery.trim()) return list;
    const lower = filterQuery.toLowerCase().trim();
    return list.filter((k) => k.toLowerCase().includes(lower));
  }, [activeCategory, filterQuery]);

  if (!isOpen) return null;

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSelectAllInView = () => {
    const toAdd = displayKeywords.filter((k) => !selectedTopics.includes(k));
    setSelectedTopics([...selectedTopics, ...toAdd]);
  };

  const handleDeselectAllInView = () => {
    setSelectedTopics(selectedTopics.filter((t) => !displayKeywords.includes(t)));
  };

  const handleSelectAll210 = () => {
    setSelectedTopics([...ALL_CORE_KEYWORDS]);
  };

  const handleResetToSeasonal = () => {
    setSelectedTopics(getSeasonalRecommendedKeywords());
  };

  const handleAddCustom = () => {
    const trimmed = newCustomInput.trim();
    if (trimmed && !selectedTopics.includes(trimmed)) {
      setSelectedTopics([trimmed, ...selectedTopics]);
      setNewCustomInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndTrigger({
      macroTopics: selectedTopics.length > 0 ? selectedTopics : getSeasonalRecommendedKeywords(),
      weights: {
        trend: trendWeight,
        viral: viralWeight,
        commercial: commercialWeight,
      },
      channels: ["google", "tiktok", "youtube"],
      geoScope,
      autoBroadcastToTenants: autoBroadcast,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }} size="lg"
      title={<span className="flex items-center gap-2"><Shield size={18} className="text-accent-text" />Thiết Lập Tiêu Chí Xu Hướng Thị Trường Vĩ Mô</span>}
      description="Kho 210 Core Keywords phân loại 9 nhóm nghiệp vụ & thư viện ý định thương mại">
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Thanh công cụ chọn nhanh theo nhóm */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-caption font-bold text-text flex items-center gap-1.5">
                <Layers size={14} className="text-accent-text" />
                Danh mục phân nhóm nghiệp vụ (Đang chọn:{" "}
                <span className="text-accent-text font-extrabold">{selectedTopics.length}</span> / 210)
              </label>

              <div className="flex items-center gap-1.5 text-caption">
                <Button variant="outline"
                  type="button"
                  onClick={handleSelectAll210}
                  className="text-[length:inherit] h-auto gap-0 px-2 py-0.5 rounded-md bg-accent-bg text-accent-text font-semibold hover:bg-accent-bg border border-accent-border/70 transition"
                >
                  Chọn cả 210
                </Button>
                <Button variant="ghost"
                  type="button"
                  onClick={handleResetToSeasonal}
                  className="text-[length:inherit] h-auto gap-0 px-2 py-0.5 rounded-md bg-surface-alt text-text font-medium hover:bg-border transition"
                  title="Gợi ý mùa thu: 20/10, tốt nghiệp, quà tặng cưới"
                >
                  Đề xuất mùa này
                </Button>
                <Button variant="ghost"
                  type="button"
                  onClick={() => setSelectedTopics([])}
                  className="text-[length:inherit] h-auto font-[inherit] gap-0 px-2 py-0.5 rounded-md text-text-muted hover:text-danger-text transition"
                >
                  Xóa hết
                </Button>
              </div>
            </div>

            {/* Tabs danh mục */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-caption no-scrollbar">
              <Button variant="ghost"
                type="button"
                onClick={() => setActiveCategory("recommended")}
                className={`text-[length:inherit] h-auto gap-0 flex-shrink-0 px-2.5 py-1 rounded-lg font-bold transition ${
                  activeCategory === "recommended"
                    ? "bg-accent text-white shadow-xs hover:bg-accent"
                    : "bg-surface-alt text-text-muted hover:bg-border"
                }`}
              >
                ✨ Đề xuất mùa thu ({getSeasonalRecommendedKeywords().length})
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`text-[length:inherit] h-auto gap-0 flex-shrink-0 px-2.5 py-1 rounded-lg font-bold transition ${
                  activeCategory === "all"
                    ? "bg-accent text-white shadow-xs hover:bg-accent"
                    : "bg-surface-alt text-text-muted hover:bg-border"
                }`}
              >
                Tất cả (210)
              </Button>
              {MARKET_TAXONOMY_CATEGORIES.map((cat) => (
                <Button variant="ghost"
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-[length:inherit] h-auto gap-0 flex-shrink-0 px-2.5 py-1 rounded-lg font-medium transition ${
                    activeCategory === cat.id
                      ? "bg-accent text-white shadow-xs hover:bg-accent"
                      : "bg-surface-alt text-text-muted hover:bg-border"
                  }`}
                >
                  {cat.shortName} ({cat.keywords.length})
                </Button>
              ))}
            </div>

            {/* Tìm kiếm & Thao tác chọn theo nhóm hiện tại */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  type="text"
                  value={filterQuery} aria-label="Lọc từ khóa trong nhóm"
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Lọc từ khóa trong nhóm này..."
                  className="h-8 w-full rounded-lg border border-border bg-bg/70 pl-7 pr-3 text-caption outline-none focus:border-accent focus:bg-white transition"
                />
              </div>
              <Button variant="outline"
                type="button"
                onClick={handleSelectAllInView}
                className="py-0 inline-flex items-center gap-1 text-caption font-semibold text-accent-text bg-accent-bg hover:bg-accent-bg px-2.5 h-8 rounded-lg border border-accent-border transition"
              >
                <CheckSquare size={13} />
                Chọn nhóm này
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={handleDeselectAllInView}
                className="py-0 gap-0 text-caption font-medium text-text-muted hover:text-text px-2 h-8 rounded-lg hover:bg-surface-alt transition"
              >
                Bỏ chọn
              </Button>
            </div>

            {/* Lưới chọn Keywords */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border bg-bg/50 max-h-48 overflow-y-auto">
              {displayKeywords.map((k, idx) => {
                const isSelected = selectedTopics.includes(k);
                return (
                  <Button variant="ghost"
                    key={`${k}-${idx}`}
                    type="button"
                    onClick={() => toggleTopic(k)}
                    className={`h-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium transition ${
                      isSelected
                        ? "bg-accent text-white shadow-2xs hover:bg-accent"
                        : "bg-white border border-border text-text hover:border-accent-border hover:bg-accent-bg/50"
                    }`}
                  >
                    {isSelected ? <Check size={12} className="stroke-[3]" /> : null}
                    <span>{k}</span>
                  </Button>
                );
              })}
              {displayKeywords.length === 0 && (
                <p className="text-caption text-text-muted py-3 text-center w-full">
                  Không tìm thấy từ khóa phù hợp với bộ lọc
                </p>
              )}
            </div>

            {/* Nhập từ khóa tùy biến thủ công nếu cần */}
            <div className="flex gap-2 pt-1">
              <Input
                type="text"
                value={newCustomInput} aria-label="Thêm từ khóa tùy chỉnh"
                onChange={(e) => setNewCustomInput(e.target.value)}
                placeholder="Thêm từ khóa tùy chỉnh khác ngoài 210 từ SSOT..."
                className="h-8 flex-1 rounded-lg border border-border bg-white px-3 text-caption text-text outline-none focus:border-accent transition"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
              />
              <Button variant="outline"
                type="button"
                onClick={handleAddCustom}
                className="py-0 gap-0 px-3 h-8 rounded-lg border border-border bg-surface-alt text-caption font-semibold text-text hover:bg-accent-bg hover:text-accent-text transition"
              >
                + Thêm
              </Button>
            </div>
          </div>

          {/* 2. Trọng số đánh giá 3 trục */}
          <div className="space-y-2 rounded-xl border border-border bg-bg/60 p-3.5 text-caption">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text flex items-center gap-1.5">
                <Sliders size={14} className="text-accent-text" />
                Cân bằng trọng số tính Điểm Cơ Hội Thị Trường:
              </span>
              <span className="text-caption font-bold text-accent-text">
                Tổng: {trendWeight + viralWeight + commercialWeight}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-caption text-text-muted block mb-1">
                  Độ nóng tìm kiếm ({trendWeight}%)
                </label>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={trendWeight} aria-label="Trọng số độ nóng tìm kiếm"
                  onChange={(e) => setTrendWeight(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
              <div>
                <label className="text-caption text-text-muted block mb-1">
                  Lan tỏa TikTok/Reels ({viralWeight}%)
                </label>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={viralWeight} aria-label="Trọng số lan truyền"
                  onChange={(e) => setViralWeight(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
              <div>
                <label className="text-caption text-text-muted block mb-1">
                  Thương mại chốt đơn ({commercialWeight}%)
                </label>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={commercialWeight} aria-label="Trọng số thương mại"
                  onChange={(e) => setCommercialWeight(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </div>

          {/* 3. Phạm vi & Tự động phát hành */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-caption font-bold text-text flex items-center gap-1.5">
                <Globe size={14} className="text-accent-text" />
                Khu vực địa lý tổng thể
              </label>
              <NativeSelect
                value={geoScope} aria-label="Khu vực địa lý tổng thể"
                onChange={(e) => setGeoScope(e.target.value)}
                className="h-8 w-full rounded-lg border border-border bg-white px-2.5 text-caption text-text outline-none focus:border-accent transition"
              >
                <option value="VN">Toàn quốc (Việt Nam)</option>
                <option value="VN-HN">Trọng điểm Hà Nội & Miền Bắc</option>
                <option value="VN-SG">Trọng điểm TP.HCM & Miền Nam</option>
              </NativeSelect>
            </div>

            <div className="flex items-center gap-2 pt-3 sm:pt-5">
              <Checkbox
                id="autoBroadcast"
                checked={autoBroadcast}
                onCheckedChange={(checked) => setAutoBroadcast((checked === true))}
                className="h-4 w-4 rounded accent-accent"
              />
              <label htmlFor="autoBroadcast" className="text-caption text-text select-none cursor-pointer">
                Tự động đồng bộ báo cáo cho tất cả doanh nghiệp sau khi quét
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button variant="outline"
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-auto gap-0 rounded-xl border border-border px-4 py-2 text-caption font-semibold text-text hover:bg-surface-alt transition"
            >
              Đóng
            </Button>
            <Button variant="ghost"
              type="submit"
              disabled={isSaving}
              className="h-auto inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-white hover:bg-accent-text shadow-sm transition disabled:opacity-50"
            >
              <Sparkles size={14} />
              {isSaving
                ? "Đang lưu & phát lệnh quét..."
                : `Lưu ${selectedTopics.length} tiêu chí & Kích hoạt quét vĩ mô`}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
