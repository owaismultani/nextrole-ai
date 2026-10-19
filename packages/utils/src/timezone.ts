import z from "zod";

/** An IANA timezone this runtime knows, such as "Europe/Berlin". */
export const timezoneSchema = z
	.string()
	.max(100)
	.refine((value) => {
		try {
			new Intl.DateTimeFormat("en", { timeZone: value });
			return true;
		} catch {
			return false;
		}
	}, "Choose a valid timezone.");

/** Resolve a wall-clock minute without silently normalizing invalid dates or skipped DST times. */
export function fromZonedDateTime(date: string, time: string, timeZone: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
	const wall = Date.parse(`${date}T${time}:00Z`);
	if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== `${date}T${time}`) return null;
	try {
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		});
		const localMinute = (at: number) => {
			const parts = Object.fromEntries(formatter.formatToParts(at).map(({ type, value }) => [type, value]));
			return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
		};
		const offset = (at: number) => Date.parse(`${localMinute(at)}:00Z`) - at;
		const guess = wall - offset(wall);
		const instant = wall - offset(guess);
		return localMinute(instant) === `${date}T${time}` ? new Date(instant) : null;
	} catch {
		return null;
	}
}
