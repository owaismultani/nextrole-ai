import { describe, expect, it } from "vitest";
import { matchOpportunity } from "./matching";

const phrases = ["Senior Product Manager", "Product Lead — Onboarding", "Berlin", "Remote within Europe"];

describe("matchOpportunity", () => {
	it("matches a preference only when all its words appear, in the user's own wording", () => {
		const posting =
			"Senior Product Manager – Mosaic Cloud. Lead onboarding and product-led growth. Berlin hybrid; customer discovery.";
		expect(matchOpportunity(posting, phrases).matches).toEqual([
			"Senior Product Manager",
			"Product Lead — Onboarding",
			"Berlin",
		]);
		expect(matchOpportunity("Remote roles in Europe", phrases).matches).toEqual(["Remote within Europe"]);
	});

	it.each([
		["Remote within Europe, €90,000–€105,000", []],
		["Hybrid, 3 days on-site. 95k base", []],
		["Own the new-customer journey", ["salary", "office"]],
		["Fully remote team", ["salary"]],
		["Salary 80 000 EUR", ["office"]],
	])("names what %j leaves out", (posting, unknowns) => {
		expect(matchOpportunity(posting, []).unknowns).toEqual(unknowns);
	});
});
