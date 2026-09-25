import config from "../config/integrations.json";
import { required } from "./io";

export type ModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function chatCompletion(messages: ModelMessage[]) {
  const response = await fetch(process.env.EDITOR_API_URL || config.model.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${required("EDITOR_API_KEY")}`,
    },
    body: JSON.stringify({
      model: process.env.EDITOR_MODEL || config.model.model,
      reasoning_effort:
        process.env.EDITOR_REASONING_EFFORT || config.model.reasoningEffort,
      messages,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw Error(`Model API HTTP ${response.status}`);
  return response.json();
}
