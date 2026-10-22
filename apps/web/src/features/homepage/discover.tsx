import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { lastStep, SCENE, useStep } from "./scroll";
import { Chip, CompanyTile, labelClass, MockCard, PinnedScene, Reveal } from "./ui";

/** Discover's steps: the run starts, then its counts land one by one, then the roles it kept. */
const STEP = { running: 1, found: 2, known: 3, rejected: 4, kept: 5, roles: 6 } as const;

type Match = { label: string; tone: "ok" | "warn" };

/**
 * One discovery run, told openly: how many results the search returned, which were already known, which were dropped
 * and why, and the roles it kept, each with what it matches in the visitor's preferences and what it doesn't say.
 */
function DiscoverStage() {
	const { i18n } = useLingui();
	const step = useStep(SCENE.discover);
	const n = (value: number) => i18n.number(value);

	const counts = [
		{ at: STEP.found, label: t`Results found`, value: n(40), detail: t`4 queries, 9 sources` },
		{ at: STEP.known, label: t`Already known`, value: n(18), detail: t`Skipped, not read again` },
		{
			at: STEP.rejected,
			label: t`Rejected`,
			value: n(19),
			detail: t`11 not a job posting · 5 closed · 3 off your preferences`,
		},
		{ at: STEP.kept, label: t`New roles`, value: n(3), detail: t`Saved to Applications` },
	];

	const roles: { company: string; role: string; matches: Match[] }[] = [
		{
			company: "Fieldnote",
			role: t`Senior Product Designer`,
			matches: [
				{ label: t`Remote`, tone: "ok" },
				{ label: t`Design systems`, tone: "ok" },
				{ label: t`Salary not listed`, tone: "warn" },
			],
		},
		{
			company: "Northwind",
			role: t`Lead Product Designer`,
			matches: [
				{ label: t`Lisbon`, tone: "ok" },
				{ label: t`2 office days`, tone: "ok" },
			],
		},
	];

	return (
		<div
			aria-hidden="true"
			className="grid w-full max-w-[760px] gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] min-[900px]:items-start"
		>
			<MockCard className="p-4">
				<div className="flex items-center gap-3">
					<span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-text">
						<Icon name="clock" size={18} />
					</span>
					<div className="min-w-0 flex-1 font-ui">
						<p className="truncate text-[14px] font-semibold text-ink">{t`Senior product design, EU`}</p>
						<p className="truncate text-[12.5px] text-ink-3">{t`Every 6 hours · 20 results per search`}</p>
					</div>
					<Chip tone={step >= STEP.kept ? "ok" : step >= STEP.running ? "info" : "neutral"}>
						{step >= STEP.kept ? t`Done` : step >= STEP.running ? t`Running` : t`Scheduled`}
					</Chip>
				</div>
				<dl className="mt-3 grid border-t border-line">
					{counts.map((count) => (
						<Reveal
							key={count.label}
							on={step >= count.at}
							className="flex items-baseline gap-3 border-b border-line py-2.5 last:border-b-0"
						>
							<dt className="min-w-0 flex-1 font-ui">
								<span className="block text-[13px] font-semibold text-ink">{count.label}</span>
								<span className="block text-[12px] leading-snug text-ink-3 max-[900px]:hidden">{count.detail}</span>
							</dt>
							<dd
								className={cn(
									"font-display text-[22px] font-extrabold tracking-[-.03em] tabular-nums",
									count.at === STEP.kept ? "text-accent-text" : "text-ink",
								)}
							>
								{count.value}
							</dd>
						</Reveal>
					))}
				</dl>
			</MockCard>

			<div className="grid gap-3">
				<p className={cn(labelClass, "text-ink-3 max-[900px]:hidden")}>{t`New opportunities`}</p>
				{roles.map((role, index) => (
					<Reveal key={role.company} on={step >= STEP.roles} className={cn(index > 0 && "max-[900px]:hidden")}>
						<MockCard className="p-4">
							<div className="flex items-center gap-3">
								<CompanyTile name={role.company} />
								<div className="min-w-0 flex-1 font-ui">
									<p className="truncate text-[14px] font-semibold text-ink">{role.role}</p>
									<p className="truncate text-[12.5px] text-ink-3">{role.company}</p>
								</div>
								<Icon name="arrow-square-out" size={16} className="text-ink-3" />
							</div>
							<div className="mt-3 flex flex-wrap gap-1.5">
								{role.matches.map((match) => (
									<Chip key={match.label} tone={match.tone}>
										<Icon name={match.tone === "ok" ? "check" : "question"} size={13} />
										{match.label}
									</Chip>
								))}
							</div>
						</MockCard>
					</Reveal>
				))}
				<Reveal on={step >= lastStep(SCENE.discover)} className="max-[900px]:hidden">
					<div className="flex items-start gap-3 rounded-2xl border border-dashed border-line-2 p-4 font-ui">
						<Icon name="eye-slash" size={18} className="mt-0.5 text-ink-3" />
						<p className="text-[13px] leading-snug text-ink-2">
							<span className="font-semibold text-ink">{t`Kestrel · Product Designer, not kept.`}</span>{" "}
							{t`It asks for 4 office days a week; you allow 2.`}
						</p>
					</div>
				</Reveal>
			</div>
		</div>
	);
}

/** 02 Discover: a saved search that runs on a schedule, while the browser is closed, and shows its working. */
export function Discover() {
	return (
		<PinnedScene
			id="discover"
			scene={SCENE.discover}
			number="02"
			kicker={t`Discover`}
			title={<Trans>It looks while you work.</Trans>}
			height="h-[280vh] min-[900px]:h-[320vh]"
			stage={<DiscoverStage />}
		>
			<p>
				{t`Set a search once: the roles, places and companies you want, and how often to look, from every hour to once a week. It runs on the server, even with your browser closed.`}
			</p>
			<p>
				{t`Every run shows its working: what it searched, what it skipped, why a role was dropped, and what a posting didn’t say. Unknown salary stays unknown.`}
			</p>
		</PinnedScene>
	);
}
