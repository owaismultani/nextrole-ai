import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ betterAuth: vi.fn() }));

vi.mock("better-auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("better-auth")>()),
	betterAuth: mocks.betterAuth,
}));
vi.mock("@reactive-resume/db/client", () => ({ db: {} }));
vi.mock("@reactive-resume/email/transport", () => ({ sendEmail: vi.fn() }));
vi.mock("@reactive-resume/env/server", () => ({
	env: { APP_URL: "http://localhost:3000", AUTH_SECRET: "auth-lifecycle-test" },
}));

function createInstance(context = Promise.resolve({})) {
	return {
		$context: context,
		api: { getSession: vi.fn().mockResolvedValue(null) },
		handler: vi.fn().mockResolvedValue(new Response("ok")),
	};
}

beforeEach(() => {
	vi.resetModules();
	mocks.betterAuth.mockReset();
});

describe("auth initialization lifecycle", () => {
	it("does not construct auth during module import", async () => {
		await import("./config");
		expect(mocks.betterAuth).not.toHaveBeenCalled();
	});

	it("propagates transient initialization failure and rebuilds on the next call", async () => {
		const failure = new Error("Connection terminated due to connection timeout");
		const recovered = createInstance();
		mocks.betterAuth.mockImplementationOnce(() => createInstance(Promise.reject(failure))).mockReturnValue(recovered);
		const { auth, initializeAuth } = await import("./config");

		await expect(initializeAuth()).rejects.toBe(failure);
		expect(mocks.betterAuth).toHaveBeenCalledTimes(1);
		await initializeAuth();
		expect(auth.api).toBe(recovered.api);
		expect(mocks.betterAuth).toHaveBeenCalledTimes(2);
	});
});
