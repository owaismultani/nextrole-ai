import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("buildIcs", () => {
	it("writes one UTC event with escaped text and CRLF lines", () => {
		const ics = buildIcs(
			{
				uid: "i1",
				title: "Panel interview, Lumen",
				start: new Date("2026-10-02T12:00:00Z"),
				end: new Date("2026-10-02T13:00:00Z"),
				location: "Berlin; Room 4",
				description: "Bring the portfolio\\nand notes",
			},
			new Date("2026-09-28T08:30:00Z"),
		);

		expect(ics.split("\r\n")).toEqual([
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//Reactive Resume//Applications//EN",
			"CALSCALE:GREGORIAN",
			"BEGIN:VEVENT",
			"UID:i1@reactive-resume",
			"DTSTAMP:20260928T083000Z",
			"DTSTART:20261002T120000Z",
			"DTEND:20261002T130000Z",
			"SUMMARY:Panel interview\\, Lumen",
			"LOCATION:Berlin\\; Room 4",
			"DESCRIPTION:Bring the portfolio\\\\nand notes",
			"END:VEVENT",
			"END:VCALENDAR",
			"",
		]);
	});

	it("folds long lines at 75 characters", () => {
		const ics = buildIcs({ uid: "x", title: "A".repeat(100), start: new Date(0), end: new Date(0) });
		const summary = ics.split("\r\n").filter((line) => line.startsWith("SUMMARY") || line.startsWith(" "));
		expect(summary[0]).toHaveLength(75);
		expect(summary[1]?.startsWith(" ")).toBe(true);
	});
});
