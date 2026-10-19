import { describe, expect, it } from "vitest";
import { fromZonedDateTime } from "./timezone";

describe("wall-clock timezone conversion", () => {
	it.each([
		["2027-03-28", "01:30", "Europe/Berlin", "2027-03-28T00:30:00.000Z"],
		["2027-03-28", "03:30", "Europe/Berlin", "2027-03-28T01:30:00.000Z"],
		["2027-01-01", "09:00", "Asia/Kathmandu", "2027-01-01T03:15:00.000Z"],
	])("preserves the requested clock minute: %s %s %s", (date, time, zone, expected) => {
		expect(fromZonedDateTime(date, time, zone)?.toISOString()).toBe(expected);
	});

	it.each([
		["2027-03-28", "02:30", "Europe/Berlin"],
		["2027-03-14", "02:30", "America/New_York"],
		["2027-02-30", "09:00", "UTC"],
		["2027-01-01", "24:30", "UTC"],
		["2027-01-01", "09:00", "Invalid/Timezone"],
	])("rejects nonexistent clock minutes: %s %s %s", (date, time, zone) => {
		expect(fromZonedDateTime(date, time, zone)).toBeNull();
	});
});
