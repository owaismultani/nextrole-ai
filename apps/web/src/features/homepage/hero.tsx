import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { SCENE, useStep } from "./scroll";
import { Chip, CompanyTile, CtaLink, headlineClass, labelClass, leadClass, MockCard, Reveal } from "./ui";

/** The hero's steps: the morning search runs, a role lands, its documents are written, an interview is booked. */
const STEP = { searching: 1, found: 2, writing: 3, ready: 4, interview: 5 } as const;

type ActionRow = { company: string; role: string; meta: string; action: string };

function ActionItem({ row, status }: { row: ActionRow; status?: ReactNode }) {
	return (
		<div className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
			<CompanyTile name={row.company} />
			<div className="min-w-0 flex-1">
				<p className="truncate font-ui text-[14px] font-semibold text-ink">{row.role}</p>
				<p className="truncate font-ui text-[12.5px] text-ink-3">
					{row.company} · {row.meta}
				</p>
			</div>
			{status}
			<span className="hidden h-8 shrink-0 items-center rounded-lg border border-line-2 px-3 font-ui text-[13px] font-semibold text-ink min-[480px]:inline-flex">
				{row.action}
			</span>
		</div>
	);
}

/**
 * The Overview, as the app shows it in the morning. Scrolling runs the day forward: the scheduled search runs, a new
 * role is saved, its tailored resume and cover letter are written, and an interview appears under Coming up.
 */
function OverviewMock() {
	const { i18n } = useLingui();
	const step = useStep(SCENE.hero);
	const searched = step >= STEP.found;
	const time = i18n.date(new Date(2026, 9, 22, 8, 0), { hour: "numeric", minute: "2-digit" });

	const fieldnote: ActionRow = {
		company: "Fieldnote",
		role: t`Senior Product Designer`,
		meta: t`Remote, EU`,
		action: t`Review`,
	};
	const rows: ActionRow[] = [
		{ company: "Northwind", role: t`Lead Product Designer`, meta: t`Lisbon · Hybrid`, action: t`Review` },
		{ company: "Meridian", role: t`Design Systems Lead`, meta: t`Follow-up due today`, action: t`Follow up` },
	];

	return (
		<div aria-hidden="true" className="relative w-full max-w-[620px]">
			<MockCard className="overflow-hidden">
				<div
					className={cn(
						"flex items-center gap-3 border-b px-5 py-3.5 transition-colors duration-standard",
						searched ? "border-ok/20 bg-ok-soft" : "border-line bg-sunken",
					)}
				>
					<span
						className={cn(
							"grid size-8 place-items-center rounded-lg bg-surface",
							searched ? "text-ok-text" : "text-accent-text",
						)}
					>
						<Icon
							name={searched ? "check-circle" : "magnifying-glass"}
							size={18}
							className={cn(step === STEP.searching && "motion-safe:animate-pulse")}
						/>
					</span>
					<div className="min-w-0 flex-1 font-ui">
						<p className="truncate text-[13.5px] font-semibold text-ink">
							{searched
								? t`Discovery found 3 new roles`
								: step === STEP.searching
									? t`Searching 4 queries…`
									: t`Next search at ${time}`}
						</p>
						<p className="truncate text-[12px] text-ink-3">
							{searched
								? t`40 results checked · 18 already known · 19 rejected`
								: t`Every 6 hours · from your preferences`}
						</p>
					</div>
				</div>

				<div className="px-5 pt-4 pb-2">
					<div className="flex items-center justify-between">
						<p className="font-display text-[17px] font-bold tracking-[-.02em] text-ink">{t`Your next actions`}</p>
						<span className="font-ui text-[12px] text-ink-3">{searched ? t`3 to review` : t`2 to review`}</span>
					</div>
					<div
						className="grid [grid-template-rows:0fr] transition-[grid-template-rows] duration-emphasized ease-enter data-on:[grid-template-rows:1fr]"
						data-on={searched || undefined}
					>
						<div className="min-h-0 overflow-hidden">
							<ActionItem
								row={fieldnote}
								status={
									<Chip tone={step >= STEP.ready ? "ok" : "info"} className="max-[420px]:hidden">
										{step >= STEP.ready ? (
											<>
												<Icon name="check" size={13} />
												{t`Resume + letter ready`}
											</>
										) : (
											<>
												<Icon name="pencil-line" size={13} />
												{t`Writing drafts…`}
											</>
										)}
									</Chip>
								}
							/>
						</div>
					</div>
					{rows.map((row, index) => (
						<ActionItem
							key={row.company}
							row={row}
							status={
								index === 0 ? (
									<Chip tone="ok" className="max-[420px]:hidden">
										{t`Ready`}
									</Chip>
								) : (
									<Chip tone="warn" className="max-[420px]:hidden">
										{t`Follow-up`}
									</Chip>
								)
							}
						/>
					))}
				</div>
			</MockCard>

			<Reveal
				on={step >= STEP.interview}
				className="absolute end-[-2vw] top-[calc(100%-28px)] w-[min(300px,70%)] max-[900px]:hidden"
			>
				<MockCard className="p-4 shadow-e3">
					<p className={cn(labelClass, "text-ink-3")}>{t`Coming up`}</p>
					<div className="mt-2.5 flex items-center gap-3">
						<span className="grid size-12 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent-soft font-display leading-none text-accent-text">
							<span className="text-[19px] font-extrabold">{i18n.number(29)}</span>
						</span>
						<div className="min-w-0 font-ui">
							<p className="truncate text-[14px] font-semibold text-ink">{t`Portfolio interview`}</p>
							<p className="truncate text-[12.5px] text-ink-3">{t`Fieldnote · 45 min`}</p>
						</div>
					</div>
					<div className="mt-3 flex flex-wrap gap-1.5">
						<Chip tone="ok">{t`Briefing ready`}</Chip>
						<Chip tone="neutral">{t`Practice not started`}</Chip>
					</div>
				</MockCard>
			</Reveal>
		</div>
	);
}

/**
 * 00 Hero, "Your next role, found and prepared." The headline, the promise and the call to action sit beside the
 * Overview, which runs a morning forward as the visitor scrolls. The copy paints first, with no dependency on the
 * scroll engine.
 */
export function Hero() {
	return (
		<section
			id="top"
			data-scene={SCENE.hero}
			data-pin
			aria-labelledby="hero-title"
			className="relative h-[200vh] motion-reduce:h-auto min-[900px]:h-[240vh]"
		>
			<div className="sticky top-0 mx-auto grid h-svh max-w-[1440px] grid-rows-[auto_minmax(0,1fr)] items-center gap-8 px-(--gutter) pt-[92px] pb-8 motion-reduce:static motion-reduce:h-auto min-[900px]:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] min-[900px]:grid-rows-1 min-[900px]:gap-[5vw] min-[900px]:pt-16 min-[900px]:pb-0">
				<div className="flex flex-col items-start gap-5 min-[900px]:gap-7">
					<p className={cn(labelClass, "flex items-center gap-2 text-accent-text")}>
						<Icon name="sparkle" size={15} />
						{t`Your job search, on autopilot. Your call, every time.`}
					</p>
					<h1 id="hero-title" className={cn(headlineClass, "text-[clamp(44px,6.2vw,104px)] leading-[.95]")}>
						<Trans>
							Your next role, <span className="text-accent-text">found and prepared.</span>
						</Trans>
					</h1>
					<p className={cn(leadClass, "max-[900px]:short:hidden max-w-[32em]")}>
						{t`NextRole AI searches for roles on your schedule, drafts a tailored resume and cover letter for each one, and gets you ready for the interview. You review everything and apply yourself.`}
					</p>
					<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
						<CtaLink size="hero" />
						<p className="font-ui text-[13px] leading-normal text-ink-3">
							{t`Free and open source · Built on Reactive Resume`}
						</p>
					</div>
				</div>
				<div className="max-[900px]:short:hidden flex h-full min-h-0 items-start justify-center min-[900px]:items-center">
					<OverviewMock />
				</div>
			</div>
		</section>
	);
}
