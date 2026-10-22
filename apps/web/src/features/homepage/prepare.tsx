import type { CSSProperties } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { lastStep, SCENE, useStep } from "./scroll";
import { Sheet } from "./sheet";
import { labelClass, MockCard, PinnedScene, Reveal } from "./ui";

/** Prepare's steps: four phrases matched to the posting, then the letter, then the review panel. */
const STEP = { letter: 5 } as const;

/** The cover letter's first lines, on paper, in the serif every document keeps. */
function LetterPage() {
	return (
		<div className="@container absolute inset-0 overflow-hidden rounded-[2px] bg-paper px-[10cqw] py-[11cqw] text-start font-serif-display text-[oklch(0.3_0.01_265)]">
			<p className="text-[5.4cqw] leading-tight font-medium text-[oklch(0.22_0.01_265)]">{t`Alex Morgan`}</p>
			<p className="mt-[1cqw] text-[2.6cqw] text-[oklch(0.45_0.02_265)]">{t`Cover letter · Fieldnote`}</p>
			<div className="mt-[8cqw] grid gap-[3cqw] text-[3.1cqw] leading-[1.55]">
				<p>{t`Dear Fieldnote team,`}</p>
				<p>
					{t`Your posting asks for someone who can grow a design system across teams. At Northwind I built one that six product teams now use, and review time fell by 40%.`}
				</p>
				<p className="rounded-[.6cqw] bg-[oklch(0.95_0.05_85)] px-[1cqw] text-[oklch(0.42_0.09_70)] shadow-[0_0_0_.4cqw_oklch(0.95_0.05_85)]">
					{t`[Your notice period: the posting asks, your resume doesn’t say.]`}
				</p>
			</div>
		</div>
	);
}

/**
 * The tailored copy of Alex's resume, its matched phrases lighting up one by one, the cover letter beside it, and the
 * review panel that says what changed, what was never touched, and what's left for a person to fill in.
 */
function PrepareStage() {
	const step = useStep(SCENE.prepare);
	const keywords = {
		"--kwa": +(step >= 1),
		"--kwb": +(step >= 2),
		"--kwc": +(step >= 3),
		"--kwd": +(step >= 4),
	} as CSSProperties;

	const changes = [
		{ icon: "check-circle", tone: "text-ok-text", text: t`Summary reworded for design systems` },
		{ icon: "check-circle", tone: "text-ok-text", text: t`Skills reordered, one added from your facts` },
		{ icon: "lock", tone: "text-ink-3", text: t`Dates, titles and employers untouched` },
		{ icon: "warning-circle", tone: "text-warn-text", text: t`1 gap to fill in the letter` },
	] as const;

	return (
		<div aria-hidden="true" className="relative h-full max-h-[640px] w-full max-w-[740px]">
			<Reveal
				on={step >= STEP.letter}
				className="absolute end-[4%] top-[4%] aspect-[612/792] h-[min(84%,540px)] rotate-3 rounded-[2px] shadow-page max-[900px]:hidden"
			>
				<LetterPage />
			</Reveal>

			<div
				className="absolute start-[4%] top-0 aspect-[612/792] h-[min(94%,600px)] -rotate-1 rounded-[2px] shadow-page max-[900px]:start-0 max-[900px]:h-[86%]"
				style={keywords}
			>
				<Sheet />
				<span className="absolute start-4 -top-3 rounded-full bg-ink px-2.5 py-1 font-ui text-[11.5px] font-semibold text-bg shadow-e2">
					{t`Tailored for Fieldnote`}
				</span>
			</div>

			<Reveal on={step >= lastStep(SCENE.prepare)} className="absolute end-0 bottom-0 w-[min(330px,86%)]">
				<MockCard className="p-4 shadow-e3">
					<div className="flex items-center justify-between gap-2">
						<p className="font-display text-[15px] font-bold tracking-[-.02em] text-ink">{t`Ready for review`}</p>
						<span className={cn(labelClass, "text-ink-3")}>{t`Generation 1`}</span>
					</div>
					<ul className="mt-2.5 grid gap-1.5 font-ui text-[13px] text-ink-2">
						{changes.map((change) => (
							<li key={change.text} className="flex items-start gap-2">
								<Icon name={change.icon} size={16} className={cn("mt-px", change.tone)} />
								{change.text}
							</li>
						))}
					</ul>
					<div className="mt-3.5 flex gap-2">
						<span className="inline-flex h-8 items-center rounded-lg bg-accent px-3 font-ui text-[13px] font-semibold whitespace-nowrap text-on-accent">
							{t`Review changes`}
						</span>
						<span className="inline-flex h-8 items-center rounded-lg border border-line-2 px-3 font-ui text-[13px] font-semibold whitespace-nowrap text-ink">
							{t`See baseline`}
						</span>
					</div>
				</MockCard>
			</Reveal>
		</div>
	);
}

/** 03 Prepare: a tailored resume and a cover letter for each new role, as drafts for the visitor to review. */
export function Prepare() {
	return (
		<PinnedScene
			id="prepare"
			scene={SCENE.prepare}
			number="03"
			kicker={t`Prepare`}
			title={<Trans>Drafts, not decisions.</Trans>}
			height="h-[280vh] min-[900px]:h-[320vh]"
			stage={<PrepareStage />}
		>
			<p>
				{t`For each new role, it can write a tailored copy of your resume and a cover letter, using your own AI key. Your baseline is never changed.`}
			</p>
			<p>
				{t`Wording is adjusted and skills reordered. Dates, employers and titles stay as you wrote them, a figure your resume never had is thrown out, and anything a letter needs but you haven’t said is left for you to fill in.`}
			</p>
		</PinnedScene>
	);
}
