import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { lastStep, SCENE, useStep } from "./scroll";
import { Sheet } from "./sheet";
import { Chip, labelClass, MockCard, PinnedScene, Reveal } from "./ui";

/** The step at which the facts card appears; the story card follows at the last step. */
const FACTS_AT = 8;

/**
 * Setup's baseline check over Alex's resume: each part of the resume ticks off as the scan reaches it and the ATS
 * score climbs, then the facts and stories the drafts will draw on appear beside it.
 */
function BaselineStage() {
	const { i18n } = useLingui();
	const step = useStep(SCENE.baseline);
	const checks = [
		t`Name and email`,
		t`Headline`,
		t`Summary`,
		t`Dated experience`,
		t`Described roles`,
		t`Education`,
		t`Skills`,
	];
	const passed = Math.min(step, checks.length);
	const score = i18n.number(Math.round(52 + (passed / checks.length) * 39));

	return (
		<div aria-hidden="true" className="relative grid h-full max-h-[640px] w-full max-w-[720px] place-items-center">
			<div className="absolute start-[2%] top-1/2 aspect-[612/792] h-[min(96%,600px)] -translate-y-1/2 -rotate-2 rounded-[2px] shadow-page max-[900px]:start-0 max-[900px]:h-[88%]">
				<Sheet />
			</div>

			<MockCard className="absolute end-0 top-[6%] w-[min(300px,62%)] p-4 max-[900px]:top-0">
				<div className="flex items-center justify-between gap-2">
					<p className="font-display text-[15px] font-bold tracking-[-.02em] text-ink">{t`Baseline check`}</p>
					<span className="font-ui text-[12px] font-semibold text-ink-3 tabular-nums">{t`ATS ${score}`}</span>
				</div>
				<div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sunken">
					<div
						className="h-full rounded-full bg-ok transition-[width] duration-standard ease-enter"
						style={{ width: `${(passed / checks.length) * 100}%` }}
					/>
				</div>
				<ul className="max-[900px]:short:hidden mt-3 grid gap-1.5 font-ui text-[13px]">
					{checks.map((check, index) => {
						const done = index < passed;
						return (
							<li
								key={check}
								className={cn(
									"flex items-center gap-2 transition-colors duration-standard",
									done ? "text-ink" : "text-ink-3",
								)}
							>
								<Icon
									name={done ? "check-circle" : "circle"}
									filled={done}
									size={16}
									className={done ? "text-ok-text" : "text-line-2"}
								/>
								{check}
							</li>
						);
					})}
				</ul>
			</MockCard>

			<Reveal
				on={step >= FACTS_AT}
				className="absolute end-[6%] bottom-[22%] w-[min(280px,58%)] max-[900px]:end-0 max-[900px]:bottom-[16%]"
			>
				<MockCard className="p-4 shadow-e3">
					<p className={cn(labelClass, "text-ink-3")}>{t`Knowledge`}</p>
					<div className="mt-2 flex flex-wrap gap-1.5">
						<Chip tone="ok">
							<Icon name="seal-check" size={13} />
							{t`14 facts approved`}
						</Chip>
						<Chip tone="accent">{t`6 stories`}</Chip>
					</div>
				</MockCard>
			</Reveal>

			<Reveal
				on={step >= lastStep(SCENE.baseline)}
				className="absolute end-[14%] bottom-0 w-[min(320px,66%)] max-[900px]:end-2"
			>
				<MockCard className="p-4 shadow-e3">
					<div className="flex items-center gap-2 text-accent-text">
						<Icon name="book-open-text" size={16} />
						<p className={labelClass}>{t`Story`}</p>
					</div>
					<p className="mt-1.5 font-ui text-[14px] font-semibold text-ink">{t`Onboarding redesign at Northwind`}</p>
					<p className="mt-0.5 font-ui text-[12.5px] leading-snug text-ink-2">
						{t`Led the research, rebuilt the first-run flow, activation rose from 31% to 44%.`}
					</p>
				</MockCard>
			</Reveal>
		</div>
	);
}

/** 01 Tell it once: one baseline resume, checked, plus the facts and stories every draft is built from. */
export function Baseline() {
	return (
		<PinnedScene
			id="baseline"
			scene={SCENE.baseline}
			number="01"
			kicker={t`Tell it once`}
			title={<Trans>Start with the resume you already have.</Trans>}
			height="h-[260vh] min-[900px]:h-[300vh]"
			stage={<BaselineStage />}
		>
			<p>
				{t`Import a PDF, a Word file or a LinkedIn export, or start fresh. Setup checks it for what employers and applicant tracking systems look for, and links each gap to the fix.`}
			</p>
			<p>
				{t`Add facts you have approved and stories worth retelling. Every draft is written from these, and nothing you haven’t confirmed is invented.`}
			</p>
		</PinnedScene>
	);
}
