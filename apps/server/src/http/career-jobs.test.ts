import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	run: vi.fn<() => Promise<{ processed: number }>>(),
	env: {
		CRON_SECRET: "synthetic-career-runner-secret-32-characters" as string | undefined,
	},
}));
vi.mock("@reactive-resume/env/server", () => ({ env: mocks.env }));
vi.mock("@reactive-resume/api/features/career/jobs", () => ({ runCareerJobs: mocks.run }));

beforeEach(() => {
	mocks.run.mockReset().mockResolvedValue({ processed: 2 });
	mocks.env.CRON_SECRET = "synthetic-career-runner-secret-32-characters";
});

describe("career scheduler authentication", () => {
	it("hides an unconfigured runner", async () => {
		mocks.env.CRON_SECRET = undefined;
		const { handleCareerJobs } = await import("./career-jobs");
		const response = await handleCareerJobs(new Request("http://localhost:3000/api/career/run", { method: "POST" }));
		expect(response.status).toBe(404);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mocks.run).not.toHaveBeenCalled();
	});

	it.each([undefined, "Bearer short", "Bearer synthetic-career-runner-secret-32-characterX"])(
		"rejects invalid authorization %s without running paid work",
		async (authorization) => {
			const { handleCareerJobs } = await import("./career-jobs");
			const response = await handleCareerJobs(
				new Request("http://localhost:3000/api/career/run", {
					method: "POST",
					headers: authorization ? { authorization } : {},
				}),
			);
			expect(response.status).toBe(401);
			expect(response.headers.get("cache-control")).toBe("no-store");
			expect(await response.text()).toBe("");
			expect(mocks.run).not.toHaveBeenCalled();
		},
	);

	it.each(["GET", "POST"])("runs one bounded %s tick for CRON_SECRET", async (method) => {
		const { handleCareerJobs } = await import("./career-jobs");
		const response = await handleCareerJobs(
			new Request("http://localhost:3000/api/career/run", {
				method,
				headers: { authorization: `Bearer ${mocks.env.CRON_SECRET}` },
			}),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		await expect(response.json()).resolves.toEqual({ processed: 2 });
		expect(mocks.run).toHaveBeenCalledTimes(1);
	});
});
