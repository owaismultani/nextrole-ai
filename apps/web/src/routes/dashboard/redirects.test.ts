import { expect, it } from "vitest";
import { isRedirect } from "@tanstack/react-router";
import { Route as careerIndex } from "./career/index";
import { Route as knowledgeFacts } from "./career/knowledge/facts";
import { Route as knowledgePreferences } from "./career/knowledge/preferences";
import { Route as careerOffers } from "./career/offers";
import { Route as careerPipeline } from "./career/pipeline";
import { Route as settingsAutomation } from "./settings/automation";

type Redirectable = { options: { beforeLoad?: (context: never) => unknown } };

/** What a former address sends you to: the redirect it throws, with its parameters. */
function redirectsFrom(route: unknown, context: Record<string, unknown> = {}) {
	try {
		(route as Redirectable).options.beforeLoad?.({ params: {}, search: {}, ...context } as never);
	} catch (error) {
		if (isRedirect(error)) return error.options;
		throw error;
	}
	throw new Error("Expected a redirect.");
}

it("sends the old Career pages to where their features live now", () => {
	expect(redirectsFrom(careerPipeline)).toMatchObject({ to: "/dashboard/discover/activity" });
	expect(redirectsFrom(settingsAutomation)).toMatchObject({ to: "/dashboard/automation" });
	expect(redirectsFrom(knowledgePreferences)).toMatchObject({ to: "/dashboard/profile/preferences" });
});

it("keeps the parameters a link carried", () => {
	expect(redirectsFrom(careerOffers, { search: { a: "offer-1", b: "offer-2" } })).toMatchObject({
		to: "/dashboard/applications/offers",
		search: { a: "offer-1", b: "offer-2" },
	});
	expect(redirectsFrom(knowledgeFacts, { search: { highlight: "fact-1" } })).toMatchObject({
		to: "/dashboard/profile/facts",
		search: { highlight: "fact-1" },
	});
});

it("opens a schedule a notification linked to, and otherwise lands on Overview", () => {
	expect(redirectsFrom(careerIndex, { search: { schedule: "schedule-1" } })).toMatchObject({
		to: "/dashboard/automation",
		search: { schedule: "schedule-1" },
	});
	expect(redirectsFrom(careerIndex)).toMatchObject({ to: "/dashboard/overview" });
});
