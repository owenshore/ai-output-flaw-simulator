import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function extractJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function toClientError(error) {
  const message = `${error?.message || ""} ${error?.cause?.message || ""}`;

  if (message.includes("Missing DEEPSEEK_API_KEY")) {
    return "未配置 DeepSeek API Key，请检查 .env.local。";
  }

  if (message.includes("DEEPSEEK_HTTP_401") || message.includes("DEEPSEEK_HTTP_403")) {
    return "DeepSeek 拒绝了当前 API Key，请检查 Key 是否正确或是否有可用额度。";
  }

  if (
    message.includes("EACCES") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("fetch failed")
  ) {
    return "服务器当前无法连接 DeepSeek API。Key 已读取，但网络出口可能被拦截或代理未生效。";
  }

  return "生成失败，DeepSeek 返回异常，请稍后重试。";
}

async function callDeepSeek(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.8,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`DEEPSEEK_HTTP_${response.status}: ${detail}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DeepSeek returned an empty response");
  }

  return extractJson(content);
}

export async function POST(request) {
  try {
    const { scenario, difficulty } = await request.json();

    if (!scenario || !difficulty) {
      return NextResponse.json({ error: "缺少场景或难度" }, { status: 400 });
    }

    const result = await callDeepSeek([
      {
        role: "system",
        content:
          "你是批判性思维 RED 模型训练设计师。你要生成课堂练习素材：一段看起来专业、可信，但故意包含推理漏洞的 AI 输出。必须只返回 JSON。"
      },
      {
        role: "user",
        content: `请为以下训练配置生成一个案例。

场景：${scenario}
难度：${difficulty}

要求：
1. ai_output 是给学员阅读的文本，长度 280-450 字，语气专业、自然，不要明说自己有漏洞。
2. hidden_flaws 是标准答案，只给教师和评分使用。请列出 3-5 个漏洞，每个漏洞包含：
   - type：事实错误 / 推断跳跃 / 隐藏假设 / 证据不足 / 结论过度 中的一项
   - description：漏洞说明
   - red_dimension：Recognize Assumptions / Evaluate Arguments / Draw Conclusions 中的一项
   - severity：低 / 中 / 高
   - verification：建议如何验证
3. difficulty_note 简要说明本题难点。

返回 JSON 格式：
{
  "ai_output": "...",
  "hidden_flaws": [
    {
      "type": "...",
      "description": "...",
      "red_dimension": "...",
      "severity": "...",
      "verification": "..."
    }
  ],
  "difficulty_note": "..."
}`
      }
    ]);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: toClientError(error) }, { status: 500 });
  }
}
