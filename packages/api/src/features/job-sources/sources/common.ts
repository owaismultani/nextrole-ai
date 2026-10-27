import type { DiscoveryFilters } from "@reactive-resume/schema/career";
import type z from "zod";
import { SourceError } from "../http";

/** The response's outer shape, or a malformed-source failure. */
export function shape<T>(schema: z.ZodType<T>, value: unknown): T {
	const parsed = schema.safeParse(value);
	if (!parsed.success) throw new SourceError("malformed");
	return parsed.data;
}

/** The items that read cleanly; one odd posting never sinks the rest. */
export function items<T>(schema: z.ZodType<T>, values: readonly unknown[]): T[] {
	return values.flatMap((value) => {
		const parsed = schema.safeParse(value);
		return parsed.success ? [parsed.data] : [];
	});
}

/** Sources that take one place per search run once per place (up to five); no places is one search anywhere. */
export const placesOf = (filters: DiscoveryFilters): (string | null)[] =>
	filters.locations.length ? filters.locations.slice(0, 5) : [null];

/** Pages needed for `limit` results, bounded so one source can't take the whole run. */
export const pagesFor = (limit: number, size: number, max = 5) => Math.max(1, Math.min(max, Math.ceil(limit / size)));

export const onlyEmployment = (filters: DiscoveryFilters, kind: DiscoveryFilters["employment"][number]) =>
	filters.employment.length === 1 && filters.employment[0] === kind;

export const remoteOnly = (filters: DiscoveryFilters) =>
	filters.workplace.length === 1 && filters.workplace[0] === "remote";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
export const countryName = (code: string | null) => {
	if (!code) return null;
	try {
		return regionNames.of(code) ?? null;
	} catch {
		return null;
	}
};

export const kmToMiles = (km: number) => Math.max(1, Math.round(km * 0.621371));
