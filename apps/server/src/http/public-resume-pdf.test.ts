import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createPublicResumePdf: vi.fn(),
}));

vi.mock("@reactive-resume/api/features/resume/public-pdf", () => ({
	createPublicResumePdf: mocks.createPublicResumePdf,
}));

const { handlePublicResumePdf } = await import("./public-resume-pdf");
const trustedClient = "203.0.113.9";

describe("handlePublicResumePdf", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns the authorized on-demand PDF without forwarding compatibility metadata", async () => {
		const body = new File(["%PDF"], "Ada_Lovelace.pdf", { type: "text/plain" });
		mocks.createPublicResumePdf.mockResolvedValueOnce({
			body,
			filename: "Ada_Lovelace.pdf",
		});
		const request = new Request("https://example.com/api/resumes/jane/resume/pdf?ignored=true", {
			headers: { "x-forwarded-for": "203.0.113.7" },
		});

		const response = await handlePublicResumePdf(request, "jane", "resume", trustedClient);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		expect(response.headers.get("Content-Disposition")).toBe('inline; filename="Ada_Lovelace.pdf"');
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(await response.text()).toBe("%PDF");
		expect(mocks.createPublicResumePdf).toHaveBeenCalledWith({
			username: "jane",
			slug: "resume",
			requestHeaders: request.headers,
			trustedClient,
		});
	});
});
