import type { AIProvider } from "@reactive-resume/ai/types";
import { AI_PROVIDER_DEFAULT_BASE_URLS } from "@reactive-resume/ai/types";

type AiProviderCapabilityInput = {
	provider: AIProvider;
	baseURL?: string | null;
};

function normalizeDirectBaseUrl(baseURL: string) {
	try {
		const parsed = new URL(baseURL);
		if (parsed.search || parsed.hash || parsed.username || parsed.password) return null;
		return parsed.toString().replace(/\/+$/, "");
	} catch {
		return null;
	}
}

export function isDirectOpenAIProvider(input: Pick<AiProviderCapabilityInput, "provider" | "baseURL">) {
	return input.provider === "openai" && isDirectProvider(input);
}

function isDirectProvider(input: Pick<AiProviderCapabilityInput, "provider" | "baseURL">) {
	if (!input.baseURL?.trim()) return true;

	const baseURL = normalizeDirectBaseUrl(input.baseURL);
	if (!baseURL) return false;

	return baseURL === normalizeDirectBaseUrl(AI_PROVIDER_DEFAULT_BASE_URLS[input.provider]);
}
