"""Máy chủ GIẢ LẬP OpenAI cho e2e (25/09/2026) — chỉ thư viện chuẩn.

Worker media gọi OpenAI Vision cho Identity Guard (`OpenAIStructuredProvider`).
Máy không có khoá thật (CI, sandbox) thì chạy tệp này và trỏ worker vào nó:

    python tests/e2e/gia-lap-openai.py &            # nghe 127.0.0.1:4010
    OPENAI_BASE_URL=http://127.0.0.1:4010/v1 OPENAI_API_KEY=e2e npm run worker:media

Mọi `POST /v1/chat/completions` trả MỘT kết quả phân tích thật đã lưu trong bộ
ảnh vàng (`golden/ai-proposals-openai-direct/g001.json`) — hai lượt phân tích
(ảnh gốc + ảnh đã tối ưu) giống nhau nên Guard ra SAFE. Toàn bộ mã FloraOS vẫn
chạy thật; chỉ nhà cung cấp bên ngoài là giả. Không dùng để đo chất lượng.
"""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

GOC = Path(__file__).resolve().parents[2]
KET_QUA = json.loads((GOC / "golden" / "ai-proposals-openai-direct" / "g001.json").read_text("utf-8"))


class XuLy(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 — tên do http.server đặt
        do_dai = int(self.headers.get("content-length") or 0)
        yeu_cau = json.loads(self.rfile.read(do_dai) or b"{}")
        if not self.path.endswith("/chat/completions"):
            self._tra(404, {"error": {"message": f"giả lập không hỗ trợ {self.path}"}})
            return
        self._tra(200, {
            "id": "chatcmpl-e2e",
            "object": "chat.completion",
            "created": 0,
            "model": yeu_cau.get("model", "gpt-4o-mini"),
            "choices": [{
                "index": 0,
                "finish_reason": "stop",
                "message": {"role": "assistant", "content": json.dumps(KET_QUA, ensure_ascii=False), "refusal": None},
            }],
            "usage": {"prompt_tokens": 1000, "completion_tokens": 500, "total_tokens": 1500},
        })

    def _tra(self, ma: int, than: dict) -> None:
        du_lieu = json.dumps(than).encode("utf-8")
        self.send_response(ma)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(du_lieu)))
        self.end_headers()
        self.wfile.write(du_lieu)

    def log_message(self, *_: object) -> None:
        pass


if __name__ == "__main__":
    cong = int(os.environ.get("GIA_LAP_OPENAI_PORT") or (sys.argv[1] if len(sys.argv) > 1 else 4010))
    ThreadingHTTPServer(("127.0.0.1", cong), XuLy).serve_forever()
