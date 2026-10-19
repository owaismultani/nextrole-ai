import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const env = { REDIS_URL: "", DEPLOYMENT_NAMESPACE: "default" };
	const on = vi.fn();
	const Redis = vi.fn(
		class {
			on = on;
		},
	);
	return { env, on, Redis };
});

vi.mock("@reactive-resume/env/server", () => ({ env: mocks.env }));
vi.mock("ioredis", () => ({ Redis: mocks.Redis }));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	mocks.env.REDIS_URL = "";
});

describe("shared Redis", () => {
	it("lazily creates one shared client", async () => {
		mocks.env.REDIS_URL = "rediss://example.test:6379";
		const { getRedis } = await import("./redis");
		expect(mocks.Redis).not.toHaveBeenCalled();
		const client = getRedis();
		expect(getRedis()).toBe(client);
		expect(mocks.Redis).toHaveBeenCalledExactlyOnceWith(mocks.env.REDIS_URL, {
			lazyConnect: true,
			maxRetriesPerRequest: 2,
			connectTimeout: 5_000,
			commandTimeout: 5_000,
		});
		expect(mocks.on).toHaveBeenCalledWith("error", expect.any(Function));
	});
});
