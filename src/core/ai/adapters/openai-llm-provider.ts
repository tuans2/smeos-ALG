import type { LLMProvider, LLMRequest, LLMResponse } from "@/core/ports/llm-provider";
import { env } from "@/lib/env";

type OpenAIContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } }

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenAIContentPart[];
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  response_format?: { type: "json_object" } | undefined;
  max_tokens?: number;
  temperature?: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

/**
 * Khoá trong sổ đăng ký (`ai_models.key`) → mã mô hình của OpenAI.
 *
 * Bộ định tuyến của cổng AI chọn theo KHOÁ; chỉ adapter mới được biết khoá
 * đó gọi ra mã nào phía nhà cung cấp — đúng chỗ duy nhất SDK và tên mô hình
 * của nhà cung cấp được phép xuất hiện (PRD mục 7.15).
 */
const MA_MO_HINH_THEO_KHOA: Readonly<Record<string, string>> = {
  openai_structured: "gpt-4o",
  openai_direct: "gpt-4o-mini",
};

const MA_MO_HINH_MAC_DINH = "gpt-4o-mini";

/**
 * Thời hạn chờ mặc định khi người gọi không nêu `timeoutMs`. Trước đây
 * không có hạn nào: OpenAI treo là request người dùng và job `PROCESSING`
 * treo theo cho tới khi `scan-stuck-jobs` quét. 120 giây đủ rộng cho lượt
 * sinh dài nhất hiện có (kịch bản Chặng 05, gpt-4o).
 */
export const OPENAI_DEFAULT_TIMEOUT_MS = 120_000;

/** Giá công bố, USD cho mỗi triệu token. Dùng để ghi `cost_usd` vào sổ. */
const GIA_TOKEN: Readonly<Record<string, { vao: number; ra: number }>> = {
  "gpt-4o": { vao: 2.5, ra: 10 },
  "gpt-4o-mini": { vao: 0.15, ra: 0.6 },
};

export class OpenAILLMProvider implements LLMProvider {
  readonly name = "openai";

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY không được cấu hình");
    }
    this.apiKey = apiKey;
    this.baseUrl = "https://api.openai.com/v1";
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const images = request.images ?? [];
    const messages: OpenAIMessage[] = [
      { role: "system", content: request.system ?? "Bạn là chuyên viên viết nội dung bán hàng cho cửa hàng hoa. Luôn trả về JSON hợp lệ theo schema được cung cấp." },
      {
        role: "user",
        content:
          images.length === 0
            ? request.prompt
            : [
                { type: "text", text: request.prompt },
                ...images.map((img): OpenAIContentPart => ({
                  type: "image_url",
                  image_url: { url: `data:${img.mimeType};base64,${img.base64}`, detail: "high" },
                })),
              ],
      },
    ];

    const maMoHinh =
      (request.model ? MA_MO_HINH_THEO_KHOA[request.model] : undefined) ?? MA_MO_HINH_MAC_DINH;

    const openAIRequest: OpenAIRequest = {
      model: maMoHinh,
      messages,
      max_tokens: request.maxTokens ?? 1000,
      temperature: 0.7,
    };

    if (request.jsonSchema) {
      openAIRequest.response_format = { type: "json_object" };
    }

    const timeoutMs = request.timeoutMs ?? OPENAI_DEFAULT_TIMEOUT_MS;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(openAIRequest),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error(`OpenAI không phản hồi sau ${timeoutMs} ms`);
      }
      throw error;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: OpenAIResponse = await response.json();
    
    const text = data.choices[0]?.message?.content ?? "";
    const modelVersion = data.model;
    
    let costUsd: number | undefined;
    if (data.usage) {
      // Giá theo ĐÚNG mô hình đã chạy. Tính giá của `gpt-4o-mini` cho một
      // lượt chạy `gpt-4o` là ghi sai sổ gấp mười sáu lần, và sổ chi phí sai
      // thì không đối soát được với hoá đơn nhà cung cấp.
      const gia = GIA_TOKEN[maMoHinh] ?? GIA_TOKEN[MA_MO_HINH_MAC_DINH];
      if (gia) {
        costUsd =
          (data.usage.prompt_tokens / 1_000_000) * gia.vao +
          (data.usage.completion_tokens / 1_000_000) * gia.ra;
      }
    }

    const result: LLMResponse = {
      text,
      model: this.name,
      modelVersion,
    };
    if (costUsd !== undefined) {
      result.costUsd = costUsd;
    }
    if (data.usage) {
      Object.assign(result, {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      });
    }
    return result;
  }
}