import { t } from "@lingui/core/macro";
import { useRef } from "react";
import { LandingBackground } from "./background";
import { Baseline } from "./baseline";
import { Builder } from "./builder";
import { Control } from "./control";
import { Discover } from "./discover";
import { Faq } from "./faq";
import { LandingFooter } from "./footer";
import { LandingHeader, ThemeCord } from "./header";
import { Hero } from "./hero";
import { Pipeline } from "./pipeline";
import { Prepare } from "./prepare";
import { useScrollScenes } from "./scroll";
import { Closing, Languages, Numbers, Support } from "./sections";

/**
 * The public landing page for NextRole AI: one scroll-driven story, "Your next role, found and prepared." A morning's
 * Overview, then the loop it runs: one baseline resume, a scheduled search that shows its working, tailored drafts for
 * review, and the visitor's own turn, applying and interviewing with the app's help. Then the resume builder it grew
 * from, what stays in the visitor's control, community proof, languages, support, common questions, a closing call
 * to action and the footer. The server prerenders it (prerender.tsx), so every word is in the first response.
 */
export function Homepage() {
	const root = useRef<HTMLDivElement>(null);
	useScrollScenes(root);

	return (
		<div ref={root} className="landing relative isolate overflow-x-clip bg-bg font-ui text-ink">
			<LandingBackground />
			<a
				href="#main"
				className="fixed start-4 top-2.5 z-100 -translate-y-[160%] rounded-md bg-ink px-3.5 py-2.5 font-ui text-sm font-semibold text-bg transition-transform focus:translate-y-0"
			>
				{t`Skip to content`}
			</a>
			<LandingHeader />
			<ThemeCord />
			<main id="main" className="relative">
				<Hero />
				<Baseline />
				<Discover />
				<Prepare />
				<Pipeline />
				<Builder />
				<Control />
				<Numbers />
				<Languages />
				<Support />
				<Faq />
				<Closing />
			</main>
			<LandingFooter />
		</div>
	);
}
