import type { RefObject } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { readStages, STAGE, stageAt } from "./progress";
import { Brand, StartLink } from "./ui";
import { orpc } from "@/libs/orpc/client";

export const githubUrl = "https://github.com/owaismultani/nextrole-ai";
/** A count this small reads as an empty room, so it isn't shown. */
const smallestStarCountShown = 100;

/** A floating glass bar: the mark, the page's sections, the GitHub star count and "Start free". */
export function LandingHeader() {
	const links = [
		{ href: "#crew", label: t`The crew` },
		{ href: "#know", label: t`How it works` },
		{ href: "#tour", label: t`Tour` },
		{ href: "#free", label: t`Pricing` },
	];

	return (
		<header className="sticky top-0 z-50 px-(--gutter) pt-3">
			<div className="border-nr-line mx-auto flex max-w-[1280px] items-center gap-7 rounded-full border bg-[rgb(8_10_22/.55)] py-2 ps-3.5 pe-2 backdrop-blur-lg backdrop-saturate-150">
				<a href="#top" aria-label={t`NextRole AI, back to top`} className="rounded-md">
					<Brand />
				</a>
				<nav
					aria-label={t`Sections`}
					className="text-nr-ink-2 ms-auto hidden items-center gap-6 text-sm min-[900px]:flex"
				>
					{links.map((link) => (
						<a key={link.href} href={link.href} className="hover:text-nr-ink transition-colors duration-quick">
							{link.label}
						</a>
					))}
				</nav>
				<div className="ms-auto flex items-center gap-1 min-[900px]:ms-0">
					<GithubLink />
					<StartLink size="sm" />
				</div>
			</div>
		</header>
	);
}

/** The repository's live star count. */
function GithubLink() {
	const { i18n } = useLingui();
	const { data: stars } = useQuery(orpc.statistics.github.getStarCount.queryOptions());
	const count = stars == null ? null : i18n.number(stars);
	const compact =
		stars == null || stars < smallestStarCountShown
			? null
			: new Intl.NumberFormat(i18n.locale, { notation: "compact", maximumFractionDigits: 1 }).format(stars);
	const label = count ? t`Star NextRole AI on GitHub, ${count} stars` : t`Star NextRole AI on GitHub`;

	return (
		<a
			href={githubUrl}
			aria-label={label}
			className="text-nr-ink-2 hover:text-nr-ink hidden h-[38px] items-center gap-2 rounded-full px-3 text-[13px] font-semibold tabular-nums transition-colors lg:flex"
		>
			<svg aria-hidden="true" width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
				<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
			</svg>
			{compact && (
				<span className="flex items-center gap-1">
					<Icon name="star" filled size={14} className="text-nr-amber" />
					{compact}
				</span>
			)}
		</a>
	);
}

/** The acts down the side of wide screens, the current one drawn longer. */
export function JourneyRail({ root }: { root: RefObject<HTMLElement | null> }) {
	const [active, setActive] = useState<number>(STAGE.hero);
	const acts = [
		{ stage: STAGE.know, href: "#know", label: t`Know you` },
		{ stage: STAGE.scout, href: "#scout", label: t`Scout` },
		{ stage: STAGE.write, href: "#write", label: t`Write` },
		{ stage: STAGE.studio, href: "#studio", label: t`Studio` },
		{ stage: STAGE.coach, href: "#coach", label: t`Coach` },
		{ stage: STAGE.track, href: "#track", label: t`Track` },
		{ stage: STAGE.everywhere, href: "#everywhere", label: t`Everywhere` },
	];

	useEffect(() => {
		const page = root.current;
		if (!page) return;
		let frame = 0;
		const measure = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => setActive(Math.round(stageAt(readStages(page), window.innerHeight))));
		};
		measure();
		window.addEventListener("scroll", measure, { passive: true });
		window.addEventListener("resize", measure);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", measure);
			window.removeEventListener("resize", measure);
		};
	}, [root]);

	return (
		<nav
			aria-label={t`Acts`}
			className="font-landing-mono text-nr-ink-3 fixed start-[max(26px,env(safe-area-inset-left,0px))] top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 text-[11px] leading-none tracking-[.08em] uppercase min-[1320px]:flex"
		>
			{acts.map((act) => {
				const on = act.stage === active;
				return (
					<a
						key={act.href}
						href={act.href}
						aria-current={on ? "step" : undefined}
						className={cn(
							"flex items-center gap-2.5 transition-colors duration-standard",
							"before:h-px before:w-4 before:bg-current before:transition-[width] before:duration-emphasized before:ease-in-out-strong",
							on && "text-nr-ink before:bg-nr-accent before:w-[34px]",
						)}
					>
						{act.label}
					</a>
				);
			})}
		</nav>
	);
}
