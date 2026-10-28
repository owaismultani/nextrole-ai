// Vercel's Hobby function limit is 300 seconds (vercel.json). Rotate long-lived
// resume subscriptions with enough time for oRPC to finish and release resources.
const VERCEL_RESUME_STREAM_MS = 240_000;

export function getResumeUpdateStreamSignal(signal?: AbortSignal, isVercel = process.env.VERCEL === "1") {
	if (!isVercel) return signal;
	const deadline = AbortSignal.timeout(VERCEL_RESUME_STREAM_MS);
	return signal ? AbortSignal.any([signal, deadline]) : deadline;
}
