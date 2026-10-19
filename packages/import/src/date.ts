import type { ResumeDates, YearMonth } from "@reactive-resume/schema/resume/dates";

// ponytail: Intl replaces the 12-line MONTH_NAMES array; pinned to en-US so output is stable
const fmt = new Intl.DateTimeFormat("en-US", { month: "long" });

function getMonthName(month: string | undefined): string {
	const index = Number.parseInt(month ?? "1", 10) - 1;
	if (index < 0 || index > 11) return "undefined";
	return fmt.format(new Date(2000, index, 1));
}

/** Formats a partial ISO 8601 date (YYYY, YYYY-MM or YYYY-MM-DD) as "January 2024", or the year alone. */
export function formatDate(date: string): string {
	const parts = date.split("-");

	if (parts.length >= 2) {
		const [year, month] = parts;
		return `${getMonthName(month)} ${year}`;
	}

	// YYYY only
	return date;
}

/** The year and month of an ISO 8601 date ("2024-01-15" → "2024-01"); null when it isn't one. */
function toYearMonth(date?: string): YearMonth | null {
	const match = /^(\d{4})(?:-(0[1-9]|1[0-2]))?/.exec(date?.trim() ?? "");
	if (!match?.[1]) return null;
	return match[2] ? `${match[1]}-${match[2]}` : match[1];
}

/** Structured dates for a range of ISO dates; a start with no end is ongoing. */
export function toRangeDates(startDate?: string, endDate?: string): ResumeDates {
	const start = toYearMonth(startDate);
	const end = toYearMonth(endDate);
	return { start, end, present: Boolean(start) && !endDate };
}

/** Structured dates for a single ISO date. The day, if any, doesn't print. */
export const toSingleDates = (date?: string): ResumeDates => ({ start: toYearMonth(date), end: null, present: false });
