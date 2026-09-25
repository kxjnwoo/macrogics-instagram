import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import config from "../config/integrations.json";
import { required } from "./io";

/** Standalone SDK transport. Codex plugin OAuth is a separate connection. */
export function speechClient() {
  return new ElevenLabsClient({ apiKey: required("ELEVENLABS_API_KEY") });
}

export async function textToSpeech(text: string) {
  return speechClient().textToSpeech.convertWithTimestamps(
    process.env.ELEVENLABS_VOICE_ID || config.speech.voiceId,
    {
      text,
      modelId: config.speech.model,
      voiceSettings: {
        stability: 0.65,
        similarityBoost: 0.8,
        style: 0.1,
        speed: config.speech.speed,
      },
      outputFormat: "mp3_44100_128",
    },
    { maxRetries: 0 },
  );
}
