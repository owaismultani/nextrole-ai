import { z } from "zod";

const AI_PROVIDERS = [
	"openai",
	"anthropic",
	"gemini",
	"vercel-ai-gateway",
	"openrouter",
	"mistral",
	"cohere",
	"xai",
	"groq",
	"deepseek",
	"togetherai",
	"fireworks",
	"cerebras",
	"perplexity",
	"ollama",
	"openai-compatible",
] as const;

export type AIProvider = (typeof AI_PROVIDERS)[number];

export const aiProviderSchema = z.enum(AI_PROVIDERS);

export const AI_PROVIDER_DEFAULT_BASE_URLS: Record<AIProvider, string> = {
	openai: "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com/v1",
	gemini: "https://generativelanguage.googleapis.com/v1beta",
	"vercel-ai-gateway": "https://ai-gateway.vercel.sh/v3/ai",
	openrouter: "https://openrouter.ai/api/v1",
	mistral: "https://api.mistral.ai/v1",
	cohere: "https://api.cohere.com/v2",
	xai: "https://api.x.ai/v1",
	groq: "https://api.groq.com/openai/v1",
	deepseek: "https://api.deepseek.com/v1",
	togetherai: "https://api.together.xyz/v1",
	fireworks: "https://api.fireworks.ai/inference/v1",
	cerebras: "https://api.cerebras.ai/v1",
	perplexity: "https://api.perplexity.ai",
	ollama: "https://ollama.com/api",
	"openai-compatible": "",
};

// Brand names, used when a message has to name the provider outside a translated UI string. Every
// such message opens with this value, so the generic fallback is capitalised to match.
export const AI_PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
	openai: "OpenAI",
	anthropic: "Anthropic",
	gemini: "Google Gemini",
	"vercel-ai-gateway": "Vercel AI Gateway",
	openrouter: "OpenRouter",
	mistral: "Mistral",
	cohere: "Cohere",
	xai: "xAI",
	groq: "Groq",
	deepseek: "DeepSeek",
	togetherai: "Together AI",
	fireworks: "Fireworks AI",
	cerebras: "Cerebras",
	perplexity: "Perplexity",
	ollama: "Ollama",
	"openai-compatible": "The provider",
};

/**
 * Speech models each provider offers through the AI SDK, default first: `transcription` turns a recorded answer into
 * text, `speech` reads a question aloud. A provider without a list (or with an empty one) has none, and voice practice
 * uses the browser's own speech instead. xAI's speech model takes no id; its one entry only names it.
 */
export const AI_VOICE_MODELS: Partial<
	Record<AIProvider, { transcription: readonly string[]; speech: readonly string[] }>
> = {
	openai: {
		transcription: ["gpt-4o-mini-transcribe", "gpt-4o-transcribe", "whisper-1"],
		speech: ["gpt-4o-mini-tts", "tts-1"],
	},
	gemini: {
		transcription: ["gemini-3.5-transcribe"],
		speech: ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"],
	},
	mistral: { transcription: ["voxtral-mini-latest"], speech: ["voxtral-mini-tts-latest"] },
	xai: { transcription: ["grok-voice-transcribe-2.0"], speech: ["grok-tts"] },
	groq: { transcription: ["whisper-large-v3-turbo", "whisper-large-v3"], speech: [] },
	"vercel-ai-gateway": {
		transcription: ["openai/gpt-4o-mini-transcribe", "google/gemini-3.5-transcribe", "openai/whisper-1"],
		speech: ["openai/tts-1", "google/gemini-3.8-flash-tts"],
	},
};
