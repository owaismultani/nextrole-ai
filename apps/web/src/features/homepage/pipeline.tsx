import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { lastStep, SCENE, useStep } from "./scroll";
import { Chip, labelClass, MockCard, PinnedScene, Reveal } from "./ui";

/** The pipeline's steps: Fieldnote is applied to, a follow-up comes due, the interview is booked and prepared. */
const STEP = { applied: 1, followUp: 2, interview: 3, briefing: 4, practice: 5 } as const;

const stages = [
	{ id: "saved", dot: "bg-stage-saved" },
	{ id: "applied", dot: "bg-stage-applied" },
	{ id: "interview", dot: "bg-stage-interview" },
	{ id: "offer", dot: "bg-stage-offer" },
] as const;

function BoardCard({ company, detail, highlight }: { company: string; detail: string; highlight?: boolean }) {
	return (
		<div
			className={cn(
				"rounded-xl border bg-raised px-2.5 py-2 font-ui shadow-e1 transition-[border-color,box-shadow] duration-standard",
				highlight ? "border-accent/50 shadow-e2" : "border-line",
			)}
		>
			<p className="truncate text-[12.5px] font-semibold text-ink">{company}</p>
			<p className="truncate text-[11.5px] text-ink-3">{detail}</p>
		</div>
	);
}

/**
 * The applications board, where the visitor moves Fieldnote along themselves: applied, a follow-up nudge for another
 * role, an interview, then the interview's briefing, practice and a word from the coach.
 */
function PipelineStage() {
	const step = useStep(SCENE.pipeline);
	const labels = { saved: t`Saved`, applied: t`Applied`, interview: t`Interview`, offer: t`Offer` };
	const fieldnoteAt = step >= STEP.interview ? "interview" : step >= STEP.applied ? "applied" : "saved";

	const others: Record<(typeof stages)[number]["id"], { company: string; detail: string }[]> = {
		saved: [{ company: "Atlas", detail: t`Documents ready` }],
		applied: [{ company: "Meridian", detail: t`Applied 8 days ago` }],
		interview: [],
		offer: [{ company: "Parcel & Co.", detail: t`Offer to compare` }],
	};

	return (
		<div aria-hidden="true" className="grid w-full max-w-[760px] gap-4">
			<MockCard className="p-3">
				<div className="grid grid-cols-3 gap-2 min-[560px]:grid-cols-4">
					{stages.map((stage) => (
						<div
							key={stage.id}
							className={cn("flex min-w-0 flex-col gap-2", stage.id === "offer" && "max-[559px]:hidden")}
						>
							<p className="flex items-center gap-1.5 px-1 font-ui text-[11.5px] font-semibold text-ink-2">
								<span className={cn("size-2 rounded-full", stage.dot)} />
								{labels[stage.id]}
							</p>
							<div className="flex min-h-[112px] flex-col gap-2 rounded-xl bg-sunken p-1.5">
								{fieldnoteAt === stage.id && (
									<div
										key={stage.id}
										className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
									>
										<BoardCard
											company="Fieldnote"
											detail={
												stage.id === "interview"
													? t`Thu, 10:30`
													: stage.id === "applied"
														? t`You applied today`
														: t`Resume + letter ready`
											}
											highlight
										/>
									</div>
								)}
								{others[stage.id].map((card) => (
									<BoardCard key={card.company} {...card} />
								))}
							</div>
						</div>
					))}
				</div>
			</MockCard>

			<div className="grid gap-3 min-[700px]:grid-cols-2">
				<Reveal on={step >= STEP.followUp} className={cn(step >= STEP.briefing && "max-[699px]:hidden")}>
					<MockCard className="flex items-start gap-3 p-4">
						<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warn-soft text-warn-text">
							<Icon name="envelope-simple" size={18} />
						</span>
						<div className="min-w-0 font-ui">
							<p className="text-[13.5px] font-semibold text-ink">{t`Follow up with Meridian`}</p>
							<p className="text-[12.5px] leading-snug text-ink-3">{t`A draft is ready. Edit it and send it from your own inbox.`}</p>
						</div>
					</MockCard>
				</Reveal>

				<Reveal on={step >= STEP.briefing}>
					<MockCard className="p-4">
						<div className="flex items-center justify-between gap-2">
							<p className="font-display text-[15px] font-bold tracking-[-.02em] text-ink">{t`Interview prep`}</p>
							<Chip tone={step >= STEP.practice ? "ok" : "info"}>
								{step >= STEP.practice ? t`3 of 5 practised` : t`Briefing ready`}
							</Chip>
						</div>
						<ul className="mt-2.5 grid gap-1.5 font-ui text-[13px] text-ink-2">
							<li className="flex items-center gap-2">
								<Icon name="check-circle" size={16} className="text-ok-text" />
								{t`What Fieldnote is building`}
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check-circle" size={16} className="text-ok-text" />
								{t`3 of your stories that fit`}
							</li>
							<li className="flex items-center gap-2">
								<Icon
									name={step >= STEP.practice ? "check-circle" : "microphone"}
									size={16}
									className={step >= STEP.practice ? "text-ok-text" : "text-ink-3"}
								/>
								{t`Practise out loud, with feedback`}
							</li>
						</ul>
					</MockCard>
				</Reveal>
			</div>

			<Reveal on={step >= lastStep(SCENE.pipeline)} className="max-[900px]:short:hidden">
				<div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft p-4 font-ui">
					<Icon name="sparkle" size={18} className="mt-0.5 text-accent-text" />
					<div className="min-w-0">
						<p className={cn(labelClass, "text-accent-text")}>{t`Coach`}</p>
						<p className="mt-1 text-[13.5px] leading-snug text-ink">
							{t`Asked about influencing without authority? Tell the Northwind onboarding story and lead with the result: 31% to 44%.`}
						</p>
					</div>
				</div>
			</Reveal>
		</div>
	);
}

/** 04 Your turn: the visitor applies, follows up and interviews; the app keeps track and gets them ready. */
export function Pipeline() {
	return (
		<PinnedScene
			id="interview"
			scene={SCENE.pipeline}
			number="04"
			kicker={t`Your turn`}
			title={<Trans>You apply. It has your back.</Trans>}
			height="h-[280vh] min-[900px]:h-[320vh]"
			stage={<PipelineStage />}
		>
			<p>
				{t`Nothing is ever sent to an employer for you. When you apply, move the role along your board, and it reminds you when a follow-up is due, with a draft to send yourself.`}
			</p>
			<p>
				{t`When an interview is booked, you get a briefing, the stories of yours that fit, practice with feedback and a coach that knows your history. When offers come in, compare them side by side.`}
			</p>
		</PinnedScene>
	);
}
