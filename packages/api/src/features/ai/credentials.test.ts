import { describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
	ENCRYPTION_SECRET: "test-secret-with-enough-entropy",
}));

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));

const { decryptCredential, encryptCredential } = await import("./credentials");

describe("AI credential encryption", () => {
	it("round-trips an empty key for a local Ollama provider", () => {
		expect(decryptCredential(encryptCredential("").encryptedApiKey)).toBe("");
	});
	it("explains how to recover a key encrypted under a different secret", () => {
		const encrypted = encryptCredential("sk-original");
		const previous = envMock.ENCRYPTION_SECRET;
		try {
			envMock.ENCRYPTION_SECRET = "changed-secret-with-enough-entropy";
			expect(() => decryptCredential(encrypted.encryptedApiKey)).toThrow(
				expect.objectContaining({
					code: "AI_CREDENTIAL_DECRYPTION_FAILED",
					status: 412,
					message: expect.stringContaining("again"),
				}),
			);
		} finally {
			envMock.ENCRYPTION_SECRET = previous;
		}
	});
	it("encrypts and decrypts provider API keys without storing plaintext", () => {
		const encrypted = encryptCredential("sk-test-secret");

		expect(encrypted.encryptedApiKey).not.toContain("sk-test-secret");
		expect(encrypted.apiKeyPreview).toBe("sk-t...cret");
		expect(decryptCredential(encrypted.encryptedApiKey)).toBe("sk-test-secret");
	});
});
