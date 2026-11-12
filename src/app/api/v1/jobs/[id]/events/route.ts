import { notFound } from "@/core/http/errors"
import { getJobEvents } from "@/modules/jobs/use-cases/get-job-events"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { isTerminalStatus } from "@/modules/jobs/domain/job-rules"
import { defineRoute } from "@/core/http/define-route"

const POLL_INTERVAL_MS = 1000
const MAX_STREAM_MS = 15 * 60 * 1000 // trần một kết nối — cùng ngưỡng YC-J10

function sseFrame(event: string, id: number, data: unknown): string {
  return `event: ${event}\nid: ${id}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * `GET /jobs/:id/events` (`G4`, đặc tả 06 mục 7) — SSE. Hai loại sự kiện
 * (`stage`, `log`) đọc từ `job_events`; `done` phát khi job vào trạng thái
 * cuối, không phải một dòng lưu trong bảng.
 *
 * Nối tiếp qua `Last-Event-ID` (`YC-J9`): client gửi header này (hoặc
 * `?after=`) với `seq` cuối đã thấy, server chỉ gửi phần còn thiếu — không
 * phát lại từ đầu.
 *
 * P3 chưa có worker thật ghi vào `job_events` (M01/M04a ở P5/P9), nên route
 * này chạy đúng cơ chế nhưng thường chỉ phát `done` ngay khi job đã ở trạng
 * thái cuối lúc mở kết nối. Đánh thức bằng polling ngắn (không phải
 * `LISTEN/NOTIFY` — đó là giữa core và worker, không phải giữa core và
 * trình duyệt), dừng khi job vào trạng thái cuối, client ngắt kết nối, hoặc
 * quá ${MAX_STREAM_MS}ms.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G4" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const url = new URL(request.url)
    const lastEventIdHeader = request.headers.get("last-event-id") ?? url.searchParams.get("after")
    const afterSeq = lastEventIdHeader ? Number(lastEventIdHeader) || 0 : 0

    const jobRepo = new GenerationJobRepository()
    const initialJob = await jobRepo.findById(ctx, id)
    if (!initialJob) throw notFound()

    let cursor = afterSeq
    const startedAt = Date.now()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (event: string, seq: number, data: unknown) =>
          controller.enqueue(encoder.encode(sseFrame(event, seq, data)))

        let closed = false
        const onAbort = () => {
          closed = true
        }
        request.signal.addEventListener("abort", onAbort)

        try {
          while (!closed) {
            const events = await getJobEvents(ctx, id, cursor)
            for (const event of events) {
              send(event.event, event.seq, event.payload)
              cursor = event.seq
            }

            const job = await jobRepo.findById(ctx, id)
            if (!job || isTerminalStatus(job.status)) {
              cursor += 1
              send("done", cursor, { status: job?.status ?? "CANCELLED", result: job?.result ?? null })
              break
            }

            if (Date.now() - startedAt > MAX_STREAM_MS) break
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
          }
        } finally {
          request.signal.removeEventListener("abort", onAbort)
          controller.close()
        }
      },
      cancel() {
        // Client đóng kết nối — vòng lặp trong `start` tự thoát qua `onAbort`.
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    })
  },
})
