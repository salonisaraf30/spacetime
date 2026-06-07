const BASE_URL = "https://api-gateway.merge.dev/v1";
export const HAIKU = "anthropic/claude-haiku-4-5-20251001";

interface MergeOptions {
  model?: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  max_tokens: number;
  tools?: Array<{ name: string; description: string; input_schema: any }>;
  tool_choice?: "any" | "auto";
}

export async function mergeCreate(options: MergeOptions): Promise<any> {
  const apiKey = process.env.MERGE_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("MERGE_GATEWAY_API_KEY not set");

  const body: any = {
    model: options.model ?? HAIKU,
    input: options.messages.map(m => ({
      type: "message",
      role: m.role,
      content: m.content,
    })),
    max_output_tokens: options.max_tokens,
    stream: false,
  };

  if (options.tools?.length) {
    // Convert Anthropic tool format (input_schema) → OpenAI Responses format (parameters)
    body.tools = options.tools.map(t => ({
      type: "function",
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    }));
    // "any" in Anthropic = "required" in OpenAI Responses API
    body.tool_choice = options.tool_choice === "any" ? "required" : "auto";
  }

  const res = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Merge Gateway ${res.status}: ${errText}`);
  }

  return res.json();
}

// Pull text from the Responses API output array
export function extractText(response: any): string | null {
  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text") return part.text as string;
      }
    }
  }
  return null;
}

// Pull the first tool_use from the Responses API output array.
// Merge Gateway wraps tool calls inside output[].content[] as type:"tool_use",
// not as a top-level type:"function_call" item.
export function extractToolCall(response: any): { name: string; input: any } | null {
  for (const item of response.output ?? []) {
    // Top-level function_call (OpenAI native format)
    if (item.type === "function_call") {
      const input = typeof item.arguments === "string" ? JSON.parse(item.arguments) : item.arguments;
      return { name: item.name as string, input };
    }
    // Nested inside a message content block (Merge Gateway / Anthropic-via-gateway format)
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "tool_use") {
          return { name: part.name as string, input: part.input };
        }
      }
    }
  }
  return null;
}

// Log token usage to the Next.js server console
export function logTokens(route: string, response: any) {
  const u = response.usage;
  if (!u) return;
  const inp = u.input_tokens ?? u.prompt_tokens ?? "?";
  const out = u.output_tokens ?? u.completion_tokens ?? "?";
  console.log(`[${route}] tokens: ${inp} in / ${out} out`);
}
