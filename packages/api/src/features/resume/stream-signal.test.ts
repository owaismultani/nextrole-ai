import { afterEach, describe, expect, it, vi } from "vitest";
import { getResumeUpdateStreamSignal } from "./stream-signal";

afterEach(() => vi.restoreAllMocks());

describe("getResumeUpdateStreamSignal", () => {
	it("keeps the request signal unchanged outside Vercel", () => {
		const request = new AbortController();
		expect(getResumeUpdateStreamSignal(request.signal, false)).toBe(request.signal);
		expect(getResumeUpdateStreamSignal(undefined, false)).toBeUndefined();
	});

	it("stops the subscription when the request disconnects", () => {
		const deadline = new AbortController();
		vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
		const request = new AbortController();
		const combined = getResumeUpdateStreamSignal(request.signal, true);
		request.abort();
		expect(combined?.aborted).toBe(true);
		expect(deadline.signal.aborted).toBe(false);
	});

	it("ends the stream before the Vercel function deadline", () => {
		const deadline = new AbortController();
		const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
		const request = new AbortController();
		const combined = getResumeUpdateStreamSignal(request.signal, true);
		expect(timeout).toHaveBeenCalledWith(240_000);
		deadline.abort();
		expect(combined?.aborted).toBe(true);
		expect(request.signal.aborted).toBe(false);
	});
});
