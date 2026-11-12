"use client"

import React, { useState } from "react"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { ExceptionResolutionCard } from "@/components/templates/coordinator/exception-resolution-card"
import {
  coordinatorApi,
  errorMessage,
  type CoordinationOrder,
} from "./coordinator-api"
import { EXCEPTION_TYPE_LABELS, fmtTime } from "./coordinator-helpers"

export interface CoordinatorExceptionTabProps {
  order: CoordinationOrder
  onUpdate: (order: CoordinationOrder) => void
  onError: (err: string | null) => void
}

export function CoordinatorExceptionTab({
  order,
  onUpdate,
  onError,
}: CoordinatorExceptionTabProps) {
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({})
  const [newException, setNewException] = useState({
    type: "CUSTOMER_CHANGE",
    severity: "MEDIUM",
    description: "",
  })

  const fieldClass =
    "px-3 py-2 rounded-xl border border-border bg-surface text-text text-caption focus:outline-none focus:border-primary"

  const handleResolve = async (exceptionId: string) => {
    const resolution = resolutionDrafts[exceptionId]?.trim()
    if (!resolution) {
      onError("Ghi cách đã xử lý sự cố trước khi đóng.")
      return
    }
    onError(null)
    try {
      const updated = await coordinatorApi.resolveException(exceptionId, resolution)
      onUpdate(updated)
      setResolutionDrafts((prev) => ({ ...prev, [exceptionId]: "" }))
    } catch (err) {
      onError(errorMessage(err))
    }
  }

  const handleOpen = async () => {
    if (!newException.description.trim()) {
      onError("Mô tả sự cố trước khi mở.")
      return
    }
    onError(null)
    try {
      const updated = await coordinatorApi.openException(order.id, {
        ...newException,
        description: newException.description.trim(),
      })
      onUpdate(updated)
      setNewException({ type: "CUSTOMER_CHANGE", severity: "MEDIUM", description: "" })
    } catch (err) {
      onError(errorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4 text-caption">
      {order.exceptions.length === 0 && (
        <div className="text-text-muted">Đơn chưa có sự cố nào.</div>
      )}
      {order.exceptions.map((exc) => {
        const open = exc.status === "OPEN" || exc.status === "IN_PROGRESS"
        return (
          <div key={exc.id} className="flex flex-col gap-2">
            <ExceptionResolutionCard
              orderCode={order.orderCode}
              exceptionCode={exc.code}
              type={EXCEPTION_TYPE_LABELS[exc.type] ?? exc.type}
              severity={exc.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"}
              description={exc.description}
              resolutionPlan={exc.resolution}
              status={exc.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED"}
              reportedAt={fmtTime(exc.createdAt)}
            />
            {open && (
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Đã xử lý thế nào (bắt buộc)"
                  value={resolutionDrafts[exc.id] ?? ""}
                  onChange={(e) =>
                    setResolutionDrafts((prev) => ({ ...prev, [exc.id]: e.target.value }))
                  }
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleResolve(exc.id)}
                  className="font-bold"
                >
                  Đóng sự cố
                </Button>
              </div>
            )}
          </div>
        )
      })}

      {order.stage !== "COMPLETED" && order.stage !== "CANCELLED" && (
        <div className="p-3 rounded-xl border border-dashed border-danger/40 flex flex-col gap-2">
          <span className="font-bold text-text">Mở sự cố mới</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <NativeSelect
              value={newException.type}
              onChange={(e) => setNewException({ ...newException, type: e.target.value })}
            >
              {Object.entries(EXCEPTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={newException.severity}
              onChange={(e) => setNewException({ ...newException, severity: e.target.value })}
            >
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="CRITICAL">Khẩn cấp</option>
            </NativeSelect>
          </div>
          <Input
            placeholder="Mô tả sự cố"
            value={newException.description}
            onChange={(e) => setNewException({ ...newException, description: e.target.value })}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleOpen()}
            className="w-fit text-danger border-danger/40 gap-1"
          >
            <AlertCircle size={13} /> Mở sự cố
          </Button>
        </div>
      )}
    </div>
  )
}
