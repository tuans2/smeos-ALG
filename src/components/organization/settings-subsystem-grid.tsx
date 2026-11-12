"use client"

import Link from "next/link"
import type { Route } from "next"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Server } from "@/components/ui/icon-set/server"
import { Users } from "@/components/ui/icon-set/users"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"

export function SettingsSubsystemGrid() {
  return (
    <div>
      <h2 className="text-body-sm font-bold text-text uppercase tracking-wider mb-3">
        Liên Kết Thiết Lập Chuyên Sâu
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        <Link
          href={"/ho-so" as Route}
          className="p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="space-y-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div className="text-body-sm font-bold text-text group-hover:text-primary transition-colors">
              Hồ sơ và thương hiệu
            </div>
            <p className="text-caption text-text-muted leading-relaxed">
              Logo, màu sắc thương hiệu, chính sách cọc, cam kết và dịp lễ.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-caption font-semibold text-primary pt-2 border-t border-border/60">
            <span>Mở hồ sơ</span> <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href={"/cai-dat-ai" as Route}
          className="p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="space-y-2">
            <div className="h-9 w-9 rounded-xl bg-accent/10 text-accent-text flex items-center justify-center">
              <Cpu size={18} />
            </div>
            <div className="text-body-sm font-bold text-text group-hover:text-accent-text transition-colors">
              Thiết lập AI
            </div>
            <p className="text-caption text-text-muted leading-relaxed">
              Bảo vệ thông tin khách hàng, giới hạn chi phí dùng AI và chọn nhà cung cấp AI.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-caption font-semibold text-accent-text pt-2 border-t border-border/60">
            <span>Thiết lập AI</span> <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href={"/ket-noi" as Route}
          className="p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="space-y-2">
            <div className="h-9 w-9 rounded-xl bg-accent/10 text-accent-text flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div className="text-body-sm font-bold text-text group-hover:text-accent-text transition-colors">
              Kết nối mạng xã hội
            </div>
            <p className="text-caption text-text-muted leading-relaxed">
              Kết nối Facebook, Instagram, TikTok và Zalo OA.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-caption font-semibold text-accent-text pt-2 border-t border-border/60">
            <span>Kết nối kênh</span> <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href={"/bo-may" as Route}
          className="p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="space-y-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Server size={18} />
            </div>
            <div className="text-body-sm font-bold text-text group-hover:text-primary transition-colors">
              Phân tích sản phẩm
            </div>
            <p className="text-caption text-text-muted leading-relaxed">
              Chọn cách AI nhận diện và phân tích dữ liệu cho toàn bộ cửa hàng.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-caption font-semibold text-primary pt-2 border-t border-border/60">
            <span>Thiết lập nhận diện</span> <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href={"/cai-dat/thanh-vien" as Route}
          className="p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="space-y-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users size={18} />
            </div>
            <div className="text-body-sm font-bold text-text group-hover:text-primary transition-colors">
              Thành viên và phân quyền
            </div>
            <p className="text-caption text-text-muted leading-relaxed">
              Mời thành viên mới, phân vai trò và chi nhánh làm việc.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-caption font-semibold text-primary pt-2 border-t border-border/60">
            <span>Quản lý thành viên</span> <ArrowRight size={13} />
          </div>
        </Link>
      </div>
    </div>
  )
}
