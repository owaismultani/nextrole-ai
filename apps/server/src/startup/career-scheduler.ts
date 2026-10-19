import { runCareerJobs } from "@reactive-resume/api/features/career/jobs";

/** The long-running Node server owns ticks; PostgreSQL coordinates work across server instances. */
export function startCareerScheduler() {
	let stopped = false;
	let inFlight: Promise<void> | null = null;

	const tick = () => {
		if (stopped || inFlight) return;
		inFlight = Promise.resolve()
			.then(runCareerJobs)
			.then(() => undefined)
			.catch(() => {
				console.error("[career] Scheduled work failed. Eligible jobs will retry on a later tick.");
			})
			.finally(() => {
				inFlight = null;
			});
	};

	const interval = setInterval(tick, 60_000);
	interval.unref();
	tick();

	return {
		stop: async () => {
			stopped = true;
			clearInterval(interval);
			await inFlight;
		},
	};
}
