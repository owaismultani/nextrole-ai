import { describe, expect, it } from "vitest";
import { providerInput, updateProviderInput } from "./inputs";

describe("AI provider router input", () => {
	it("allows a keyless Ollama provider while requiring other providers' keys", () => {
		const input = {
			label: "Local",
			provider: "ollama",
			model: "llama3.2",
			apiKey: "",
			baseURL: "http://localhost:11434/v1",
		};
		expect(providerInput.safeParse(input).success).toBe(true);
		expect(providerInput.safeParse({ ...input, provider: "openai" }).success).toBe(false);
	});
	it("does not default baseURL on switch-only updates", () => {
		expect(updateProviderInput.parse({ id: "provider-1", enabled: false })).not.toHaveProperty("baseURL");
	});
});
