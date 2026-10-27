import { t } from "@lingui/core/macro";
import { useRef } from "react";
import { Coach, Everywhere, Know, Scout, Studio, Track, Write } from "./acts";
import { Finale, Free, Rules, Tour } from "./closing";
import { LandingFooter } from "./footer";
import { JourneyRail, LandingHeader } from "./header";
import { Crew, Hero } from "./hero";
import { ParticleStage } from "./stage";

/**
 * The public landing page for NextRole AI: "A career team that works while you sleep." The crew of six specialists,
 * then one act per part of the job search, each beside a formation of the particle field (stage.tsx, scene.ts) that
 * reshapes as the visitor scrolls. Then the rules that keep the visitor in charge, the recorded tour, pricing and the
 * close. The server prerenders it (prerender.tsx), so every word is in the first response; the field loads after.
 */
export function Homepage() {
	const root = useRef<HTMLDivElement>(null);

	return (
		<div ref={root} className="landing bg-nr-void font-landing text-nr-ink relative isolate overflow-x-clip text-base">
			<ParticleStage root={root} />
			<a
				href="#main"
				className="bg-nr-ink text-nr-void fixed start-4 top-2.5 z-100 -translate-y-[160%] rounded-md px-3.5 py-2.5 text-sm font-semibold transition-transform focus:translate-y-0"
			>
				{t`Skip to content`}
			</a>
			<LandingHeader />
			<JourneyRail root={root} />
			<main id="main" className="relative">
				<Hero />
				<Crew />
				<Know />
				<Scout />
				<Write />
				<Studio />
				<Coach />
				<Track />
				<Everywhere />
				<Rules />
				<Tour />
				<Free />
				<Finale />
			</main>
			<LandingFooter />
		</div>
	);
}
