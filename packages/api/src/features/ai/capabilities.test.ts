import { describe, expect, it } from "vitest";
import { isDirectOpenAIProvider } from "./capabilities";

describe("AI provider capabilities", () => {
	it("identifies direct OpenAI base URL configs", () => {
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "" })).toBe(true);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://api.openai.com/v1/" })).toBe(true);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://example.com/v1" })).toBe(false);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://api.openai.com/v1?proxy=1" })).toBe(false);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://api.openai.com/v1#fragment" })).toBe(false);
		expect(isDirectOpenAIProvider({ provider: "openrouter", baseURL: "https://api.openai.com/v1" })).toBe(false);
	});
});
