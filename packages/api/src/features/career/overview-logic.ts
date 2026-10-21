import type { ApplicationStatus } from "@reactive-resume/schema/applications/data";
import type { CareerRunReport } from "@reactive-resume/schema/career";

/** The slice of an application the dashboard reads: its status, and the dated stage and interview entries. */
export type OverviewApplication = {
	id: string;
	company: string;
	role: string;
	status: ApplicationStatus;
	activity: Array<{ type: string; stage?: string; at: Date | string; kind?: string }>;
};

const time = (value: Date | string) => new Date(value).getTime();

/** How many applications reached `stage` at or after `since`: one count per application, however often it moved. */
export function reachedSince(applications: OverviewApplication[], stage: ApplicationStatus, since: Date) {
	return applications.filter((application) =>
		application.activity.some(
			(entry) => entry.type === "stage" && entry.stage === stage && time(entry.at) >= since.getTime(),
		),
	).length;
}

/** Interviews starting from `now` through `now + days`, soonest first, skipping closed applications. */
export function upcomingInterviews(applications: OverviewApplication[], now: Date, days = 7) {
	const end = now.getTime() + days * 86_400_000;
	return applications
		.filter((application) => application.status !== "closed")
		.flatMap((application) =>
			application.activity
				.filter((entry) => entry.type === "interview" && time(entry.at) >= now.getTime() && time(entry.at) <= end)
				.map((entry) => ({
					applicationId: application.id,
					company: application.company,
					role: application.role,
					at: new Date(entry.at),
					kind: entry.kind ?? "other",
				})),
		)
		.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * What a run of reports says about discovery. `failing`: the latest run failed (or the last three all did). `repeating`:
 * the last five runs all completed but none found anything new while still seeing known jobs, so scheduling works and
 * the search keeps returning the same results.
 */
export function discoveryHealth(reports: CareerRunReport[]) {
	const recent = reports.slice(-5);
	const failing = reports.at(-1)?.outcome === "failed";
	const repeating =
		recent.length === 5 &&
		recent.every((report) => report.outcome !== "failed" && report.matches === 0 && report.duplicates > 0);
	return { failing, repeating };
}

export function sumReports(reports: CareerRunReport[]) {
	const total = { runs: reports.length, failed: 0, found: 0, matches: 0, duplicates: 0, rejected: 0, readFailures: 0 };
	for (const report of reports) {
		if (report.outcome === "failed") total.failed++;
		total.found += report.found;
		total.matches += report.matches;
		total.duplicates += report.duplicates;
		total.rejected += report.rejected;
		total.readFailures += report.readFailures;
	}
	return total;
}
