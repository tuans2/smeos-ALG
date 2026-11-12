"use client"

import React, { useState } from "react"
import { CheckCircle2, Copy, ExternalLink, MessageCircle, RefreshCw } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi } from "@/components/greeting-card/greeting-api"

interface ZaloBranchLink {
  branchCode: string
  name: string
  linkCode: string
  linked: boolean
}

interface ZaloDispatchResponse {
  data: {
    configured: boolean
    followUrl: string | null
    branches: ZaloBranchLink[]
  }
}

/** Liên kết Zalo cho từng chi nhánh: nhân viên quan tâm Zalo OA rồi nhắn mã của chi nhánh. */
export function ZaloDispatchConnector() {
  const { data, isLoading, isValidating, mutate } = useApi<ZaloDispatchResponse>(
    "/api/v1/greeting-card/integrations/zalo-dispatch"
  )
  const [copied, setCopied] = useState<string | null>(null)
  const info = data?.data
  const branches = info?.branches ?? []
  const linkedCount = branches.filter((b) => b.linked).length

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MessageCircle size={22} />
          </div>
          <div>
            <h3 className="text-body font-extrabold text-text">Nhận đơn gia công qua Zalo</h3>
            <p className="text-caption text-text-muted mt-0.5">
              Chi nhánh chưa dùng Telegram vẫn nhận được lời mời và nhắc việc qua Zalo
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading || isValidating}
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isValidating ? "animate-spin motion-reduce:animate-none" : ""} />
          <span>Cập nhật</span>
        </Button>
      </div>

      {!isLoading && info && !info.configured && (
        <p className="text-body-sm text-text-muted">
          Kênh Zalo chưa được bật trên hệ thống. Vui lòng liên hệ bộ phận hỗ trợ để kích hoạt.
        </p>
      )}

      {info?.configured && (
        <>
          <ol className="text-body-sm text-text flex flex-col gap-1 list-decimal pl-5">
            <li>
              Nhân viên chi nhánh mở Zalo, bấm Quan tâm trang Zalo của hệ thống
              {info.followUrl && (
                <a href={info.followUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 ml-1">
                  tại đây <ExternalLink size={12} />
                </a>
              )}
              .
            </li>
            <li>Nhắn đúng mã của chi nhánh mình vào khung chat. Hệ thống sẽ trả lời khi liên kết xong.</li>
            <li>Zalo chỉ cho gửi tin khi nhân viên có nhắn tin với trang trong 7 ngày gần nhất — nên nhắn lại định kỳ.</li>
          </ol>

          <p className="text-caption text-text-muted">
            Đã liên kết {linkedCount}/{branches.length} chi nhánh
          </p>

          <div className="flex flex-col gap-2">
            {branches.map((b) => (
              <div key={b.branchCode} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border">
                <div className="min-w-0">
                  <div className="text-body-sm font-bold text-text truncate">{b.name}</div>
                  <div className="text-caption text-text-muted flex items-center gap-1">
                    {b.linked ? (
                      <>
                        <CheckCircle2 size={12} className="text-success" /> Đã liên kết Zalo
                      </>
                    ) : (
                      "Chưa liên kết"
                    )}
                  </div>
                </div>
                <Button variant="outline"
                  type="button"
                  onClick={() => copy(b.linkCode)}
                  className="h-auto font-mono text-body-sm font-bold px-3 py-1.5 rounded-lg bg-surface-alt border border-border inline-flex items-center gap-1.5 shrink-0 hover:bg-surface-alt"
                  aria-label={`Sao chép mã liên kết của ${b.name}`}
                >
                  {b.linkCode}
                  {copied === b.linkCode ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                </Button>
              </div>
            ))}
            {branches.length === 0 && (
              <p className="text-body-sm text-text-muted">Chưa có chi nhánh nào. Hãy nhập danh sách chi nhánh trước.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
