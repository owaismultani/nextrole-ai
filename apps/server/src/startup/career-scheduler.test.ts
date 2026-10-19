import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startCareerScheduler } from "./career-scheduler";

const run = vi.hoisted(() => vi.fn<() => Promise<{ processed: number }>>());
vi.mock("@reactive-resume/api/features/career/jobs", () => ({ runCareerJobs: run }));

beforeEach(() => {
	vi.useFakeTimers();
	run.mockReset().mockResolvedValue({ processed: 0 });
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

it("starts immediately, skips overlapping ticks, and drains active work before stopping", async () => {
	const first = Promise.withResolvers<{ processed: number }>();
	run.mockReturnValueOnce(first.promise);
	const scheduler = startCareerScheduler();
	await vi.advanceTimersByTimeAsync(0);
	expect(run).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(120_000);
	expect(run).toHaveBeenCalledTimes(1);
	first.resolve({ processed: 1 });
	await vi.advanceTimersByTimeAsync(60_000);
	expect(run).toHaveBeenCalledTimes(2);

	const active = Promise.withResolvers<{ processed: number }>();
	run.mockReturnValueOnce(active.promise);
	await vi.advanceTimersByTimeAsync(60_000);
	expect(run).toHaveBeenCalledTimes(3);
	const stopped = vi.fn();
	const drain = scheduler.stop().then(stopped);
	await vi.advanceTimersByTimeAsync(120_000);
	expect(stopped).not.toHaveBeenCalled();
	expect(run).toHaveBeenCalledTimes(3);
	active.resolve({ processed: 1 });
	await drain;
	expect(stopped).toHaveBeenCalledOnce();
	await vi.advanceTimersByTimeAsync(60_000);
	expect(run).toHaveBeenCalledTimes(3);
});

it("recovers on the next tick without logging job payloads", async () => {
	const log = vi.spyOn(console, "error").mockImplementation(() => {});
	run.mockRejectedValueOnce(new Error("private provider payload"));
	const scheduler = startCareerScheduler();
	try {
		await vi.advanceTimersByTimeAsync(0);
		expect(log).toHaveBeenCalledOnce();
		expect(JSON.stringify(log.mock.calls)).not.toContain("private provider payload");
		await vi.advanceTimersByTimeAsync(60_000);
		expect(run).toHaveBeenCalledTimes(2);
	} finally {
		await scheduler.stop();
	}
});
