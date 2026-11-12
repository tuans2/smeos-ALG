"use client"

import React from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { Button } from "@/components/ui/button"

interface PolicyRowProps {
  icon: React.ReactNode
  title: string
  badge?: string | undefined
  description: string
  isOn: boolean
  onToggle: (val: boolean) => void
  extraControl?: React.ReactNode | undefined
  statusText?: string | undefined
  highlight?: boolean | undefined
  disabled?: boolean | undefined
}

export function PolicyRow({
  icon,
  title,
  badge,
  description,
  isOn,
  onToggle,
  extraControl,
  statusText,
  highlight = false,
  disabled = false,
}: PolicyRowProps) {
  return (
    <tr className={`transition-colors ${highlight ? "bg-primary/5" : "hover:bg-surface-alt/30"}`}>
      <td className="py-3.5 px-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text">{title}</span>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-bold bg-primary/15 text-primary">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-caption text-text-muted mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-3 text-center align-middle">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onToggle(true)}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-bold border transition-colors ${
            isOn
              ? "bg-success-bg border-success text-success shadow-xs"
              : "bg-surface border-border text-text-muted hover:bg-surface-alt"
          }`}
        >
          <CheckCircle2 size={13} />
          <span>BẬT</span>
        </Button>
      </td>
      <td className="py-3.5 px-3 text-center align-middle">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onToggle(false)}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-bold border transition-colors ${
            !isOn
              ? "bg-surface-alt border-border text-text shadow-xs"
              : "bg-surface border-border text-text-muted hover:bg-surface-alt"
          }`}
        >
          <XCircle size={13} />
          <span>TẮT</span>
        </Button>
      </td>
      <td className="py-3.5 px-4 align-middle">
        {extraControl ? (
          <div>{extraControl}</div>
        ) : (
          <span className="text-caption text-text-muted">{statusText}</span>
        )}
      </td>
    </tr>
  )
}
