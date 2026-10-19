import { afterEach, describe, expect, it, vi } from "vitest";

const { limit, settings } = vi.hoisted(() => ({
	limit: vi.fn(),
	settings: { FLAG_DISABLE_API_RATE_LIMIT: false },
}));

vi.mock("../../redis", () => ({ createRateLimiter: () => ({ limit }) }));
vi.mock("@reactive-resume/env/server", () => ({ env: settings }));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
	limit.mockReset();
});

describe("public resume rate limits", () => {
	it.each([false, true])("honors FLAG_DISABLE_API_RATE_LIMIT=%s in production", async (disabled) => {
		vi.stubEnv("NODE_ENV", "production");
		settings.FLAG_DISABLE_API_RATE_LIMIT = disabled;
		limit.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60_000 });
		const { resumePasswordRateLimit } = await import("./index");
		const next = vi.fn(async () => "allowed");
		const request = resumePasswordRateLimit(
			{ context: { trustedClient: "203.0.113.9" }, next } as never,
			{ username: "owner", slug: "resume" },
			vi.fn(),
		);
		if (disabled) {
			await expect(request).resolves.toBe("allowed");
			expect(limit).not.toHaveBeenCalled();
		} else {
			await expect(request).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
			expect(next).not.toHaveBeenCalled();
		}
	});

	it("changing spoofed headers cannot rotate the password-limit key", async () => {
		vi.stubEnv("NODE_ENV", "production");
		settings.FLAG_DISABLE_API_RATE_LIMIT = false;
		limit.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60_000 });
		const { resumePasswordRateLimit } = await import("./index");
		for (const spoofedIp of ["198.51.100.1", "198.51.100.2"]) {
			await resumePasswordRateLimit(
				{
					context: {
						trustedClient: "203.0.113.9",
						reqHeaders: new Headers({ "x-forwarded-for": spoofedIp, "cf-connecting-ip": spoofedIp }),
					},
					next: vi.fn(async () => "allowed"),
				} as never,
				{ username: "owner", slug: "resume" },
				vi.fn(),
			);
		}
		expect(limit.mock.calls.map(([key]) => key)).toEqual([
			"resume-password:owner:resume:ip:203.0.113.9",
			"resume-password:owner:resume:ip:203.0.113.9",
		]);
	});
});
