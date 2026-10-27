/**
 * The seven acts of the journey, each a slice of the real product on glass. The people and companies in the panes are
 * fictional; names stay literal, everything else is translated.
 */
import type { CSSProperties } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { templateSchema } from "@reactive-resume/schema/templates";
import { localeSchema } from "@reactive-resume/utils/locale";
import { cn } from "@reactive-resume/utils/style";
import { STAGE } from "./progress";
import { Act, Chips, monoClass, Pane } from "./ui";

/** Keyless and keyed job sources discovery searches, besides followed company boards and web search. */
const jobBoards = [
	"Himalayas",
	"Remote OK",
	"The Muse",
	"Arbeitnow",
	"Jobicy",
	"We Work Remotely",
	"Bundesagentur",
	"Adzuna",
	"Reed",
	"Jooble",
	"USAJOBS",
];

const paneTitle = "text-[14.5px] font-semibold text-nr-ink";
const rowClass =
	"grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-nr-line py-2 first:border-t-0";

export function Know() {
	const parts = [
		{ label: t`Situation`, text: t`New users stalled at setup` },
		{ label: t`Task`, text: t`Own activation` },
		{ label: t`Action`, text: t`Cut three friction points` },
		{ label: t`Result`, text: t`+17 points in a quarter` },
		{ label: t`Reflection`, text: t`Ship the smallest test` },
	];

	return (
		<Act
			id="know"
			stage={STAGE.know}
			side="end"
			kicker={
				<Trans>
					Act 01 · Know you <span className="text-nr-ink-3">· Knowledge</span>
				</Trans>
			}
			title={t`Tell your story once. Use it everywhere.`}
			lead={t`Import your resume from PDF, Word, LinkedIn or JSON. Save the facts you can stand behind and the stories that prove them. Every draft the crew writes starts from here, and goes no further.`}
		>
			<Pane>
				<div className="mb-3 flex items-center justify-between gap-3">
					<span className={paneTitle}>{t`Turning onboarding friction into a 17-point activation lift`}</span>
					<span className="border-nr-accent/40 text-nr-accent rounded-full border px-2.5 py-1 text-[12px] font-medium">
						{t`Story`}
					</span>
				</div>
				<dl className="grid grid-cols-2 gap-1.5 min-[560px]:grid-cols-5">
					{parts.map((part) => (
						<div
							key={part.label}
							className="border-nr-line bg-nr-void/35 text-nr-ink-2 min-w-0 rounded-[10px] border p-2 text-[12px]"
						>
							<dt className="font-landing-mono text-nr-accent mb-0.5 text-[10.5px] tracking-[.05em] uppercase">
								{part.label}
							</dt>
							<dd>{part.text}</dd>
						</div>
					))}
				</dl>
				<p className={cn(monoClass, "mt-2.5")}>{t`Backed by 2 facts · used in 3 applications`}</p>
			</Pane>
			<Chips
				items={[
					t`Facts`,
					t`Five-part stories`,
					t`Job preferences`,
					t`Baseline resume`,
					t`Import PDF · Word · LinkedIn · JSON`,
				]}
			/>
		</Act>
	);
}

export function Scout() {
	const requirements = [
		{ name: t`Customer discovery`, evidence: t`2 stories`, met: true },
		{ name: t`Experiment design`, evidence: t`1 fact`, met: true },
		{ name: t`B2B SaaS onboarding`, evidence: t`3 facts`, met: true },
		{ name: t`Pricing ownership`, evidence: t`no evidence yet`, met: false },
	];

	return (
		<Act
			id="scout"
			stage={STAGE.scout}
			side="start"
			kicker={
				<Trans>
					Act 02 · The Scout <span className="text-nr-ink-3">· Discover and Fit</span>
				</Trans>
			}
			title={t`Eleven job boards, your companies and the open web.`}
			lead={t`Discovery runs every hour, three hours, six hours or once a day. It skips roles it has seen and rejects what breaks your preferences, with a reason. Then Fit shows which requirements your evidence supports, and which have none yet.`}
		>
			<Pane>
				<div className="mb-3 flex items-center justify-between gap-3">
					<span className={paneTitle}>{t`Fit · Senior PM, Mosaic Cloud`}</span>
					<span className={monoClass}>{t`kept from 40 checked`}</span>
				</div>
				<ul>
					{requirements.map((requirement) => (
						<li key={requirement.name} className={rowClass}>
							<span aria-hidden="true" className={requirement.met ? "text-nr-mint" : "text-nr-ink-3"}>
								{requirement.met ? "●" : "○"}
							</span>
							<span className="text-nr-ink">{requirement.name}</span>
							<span className={monoClass}>{requirement.evidence}</span>
						</li>
					))}
				</ul>
			</Pane>
			<Chips items={jobBoards} accent={[t`Followed company boards`, t`Web search`]} />
		</Act>
	);
}

export function Write() {
	return (
		<Act
			id="write"
			stage={STAGE.write}
			side="end"
			kicker={
				<Trans>
					Act 03 · The Writer <span className="text-nr-ink-3">· Tailoring</span>
				</Trans>
			}
			title={t`A tailored resume, letter and answers for every role.`}
			lead={t`Wording and order bend toward the posting. Dates, employers and titles never move, and a rewrite that invents a figure is thrown out. When a letter needs something your resume doesn't say, it asks instead of guessing.`}
		>
			<Pane>
				<div className="bg-nr-paper rounded-[10px] px-4 py-3.5 font-serif-display text-[15px] leading-[1.55] text-[#1b1e2c]">
					<p className="mb-2">
						<del className="text-[#8d91a7]">{t`Led onboarding improvements for a B2B product.`}</del>
					</p>
					<p>
						<Trans>
							Led <mark className="rounded-[3px] bg-[#e4ddff] px-[3px] text-[#2a1f8f]">product-led onboarding</mark> for
							a B2B SaaS platform, running{" "}
							<mark className="rounded-[3px] bg-[#e4ddff] px-[3px] text-[#2a1f8f]">customer discovery</mark> and weekly{" "}
							<mark className="rounded-[3px] bg-[#e4ddff] px-[3px] text-[#2a1f8f]">experiments</mark>.
						</Trans>
					</p>
				</div>
				<div className="border-nr-line bg-nr-void/35 mt-2.5 rounded-xl border px-3.5 py-3">
					<p className="text-nr-ink mb-1 font-medium">{t`Why do you want to work at Mosaic Cloud?`}</p>
					<p className={monoClass}>{t`Drafted from 2 stories · 148 / 150 words`}</p>
					<div className="mt-2 h-1 overflow-hidden rounded bg-white/8">
						<div className="from-nr-accent to-nr-cyan h-full w-[98%] bg-linear-to-r" />
					</div>
				</div>
			</Pane>
			<Chips
				items={[
					t`Tailored resume`,
					t`Cover letter`,
					t`Form answers`,
					t`Regenerate with a focus`,
					t`Compare versions`,
					t`Daily limit`,
				]}
			/>
		</Act>
	);
}

export function Studio() {
	const templates = templateSchema.options.length;

	return (
		<Act
			id="studio"
			stage={STAGE.studio}
			side="start"
			kicker={
				<Trans>
					Act 04 · The Editor <span className="text-nr-ink-3">· built on Reactive Resume</span>
				</Trans>
			}
			title={t`Underneath it all, a world-class resume studio.`}
			lead={t`${templates} templates drawn with your own content and about 500 fonts. Fit to one page in a click. An ATS check pins every issue to its line, and the assistant proposes edits you accept one at a time. Download five formats or share a private link.`}
		>
			<Pane>
				<div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
					<div
						aria-hidden="true"
						className="after:bg-nr-night relative grid size-16 place-items-center rounded-full bg-[conic-gradient(var(--color-nr-mint)_0_91%,rgb(255_255_255/.08)_91%_100%)] after:absolute after:inset-1.5 after:rounded-full"
					>
						<span className="font-landing-display relative z-1 text-[22px] font-extrabold">91</span>
					</div>
					<div>
						<p className={paneTitle}>{t`Readable by applicant tracking software`}</p>
						<p className={cn(monoClass, "mt-1")}>{t`Score 91 · 2 issues, pinned to their lines`}</p>
					</div>
				</div>
				<ul>
					<li className={rowClass}>
						<span aria-hidden="true" className="text-nr-amber">
							!
						</span>
						<span className="text-nr-ink">{t`Line 14 · “Q3 ’24” may not read as a date`}</span>
						<span className={monoClass}>{t`Fix`}</span>
					</li>
					<li className={rowClass}>
						<span aria-hidden="true" className="text-nr-amber">
							!
						</span>
						<span className="text-nr-ink">{t`Header · icons aren't read as text`}</span>
						<span className={monoClass}>{t`Fix`}</span>
					</li>
				</ul>
				<div className="border-nr-accent/35 text-nr-ink mt-2.5 flex items-center justify-between gap-2.5 rounded-xl border bg-[rgb(81_70_217/.16)] px-3 py-2.5 text-[13px]">
					<span>{t`Assistant: tighten your summary to two lines`}</span>
					<span aria-hidden="true" className="flex gap-1.5">
						<span className="border-nr-line-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold">{t`Reject`}</span>
						<span className="bg-nr-accent text-nr-on-accent rounded-lg px-2.5 py-1.5 text-[12px] font-semibold">{t`Accept`}</span>
					</span>
				</div>
			</Pane>
			<Chips
				items={[
					t`${templates} templates`,
					t`About 500 fonts`,
					"PDF · Word · ODT · Markdown · JSON",
					t`Password links with view counts`,
					t`Version history`,
					t`⌘K command bar`,
				]}
			/>
		</Act>
	);
}

const voiceBars = [40, 80, 55, 95, 60, 85, 45, 70, 90, 50, 75, 40, 65, 85, 55];

export function Coach() {
	const plan = [
		{ minutes: 10, task: t`Your onboarding case study`, done: true },
		{ minutes: 10, task: t`Trade-offs and collaboration`, done: false },
		{ minutes: 5, task: t`Questions for Maya Chen`, done: false },
		{ minutes: 5, task: t`Say it aloud`, done: false },
	];

	return (
		<Act
			id="coach"
			stage={STAGE.coach}
			side="end"
			kicker={
				<Trans>
					Act 05 · The Coach <span className="text-nr-ink-3">· Interviews</span>
				</Trans>
			}
			title={t`Walk into every interview ready.`}
			lead={t`A briefing waits before the call: who you'll meet, the stories to bring, the questions to ask. Practise an answer out loud and get feedback on what you said. Afterwards, a debrief turns what you learned into facts, so the next round starts smarter.`}
		>
			<Pane>
				<div className="mb-3 flex items-center justify-between gap-3">
					<span className={paneTitle}>{t`A focused 30-minute plan`}</span>
					<span className={monoClass}>{t`Thu 17:58 · in 3 hours`}</span>
				</div>
				<ul>
					{plan.map((step) => (
						<li
							key={step.task}
							className="border-nr-line grid grid-cols-[18px_56px_minmax(0,1fr)] items-center gap-2.5 border-t py-2 first:border-t-0"
						>
							<span aria-hidden="true" className={step.done ? "text-nr-mint" : "text-nr-ink-3"}>
								{step.done ? "✓" : "○"}
							</span>
							<span className={monoClass}>{t`${step.minutes} min`}</span>
							<span className={step.done ? "text-nr-ink-3 line-through" : "text-nr-ink"}>{step.task}</span>
						</li>
					))}
				</ul>
				<div className="border-nr-magenta/35 bg-nr-magenta/8 mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5">
					<span className={cn(monoClass, "text-nr-magenta")}>● {t`Practising`}</span>
					<span aria-hidden="true" className="flex h-[26px] min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
						{voiceBars.map((height, index) => (
							<i
								key={index}
								className="bg-nr-magenta motion-safe:animate-nr-talk w-[3px] rounded-sm"
								style={{ height: `${height}%`, animationDelay: `${(index * 70) % 400}ms` } as CSSProperties}
							/>
						))}
					</span>
					<span className={monoClass}>0:42 / 1:30</span>
				</div>
			</Pane>
			<Chips items={[t`Briefings`, t`Practise aloud`, t`Feedback`, t`Coach chat`, t`Debrief`, t`Calendar · .ics`]} />
		</Act>
	);
}

export function Track() {
	const { i18n } = useLingui();
	const columns = [
		{ label: t`Saved`, count: 12, color: "#b5b1a4" },
		{ label: t`Applied`, count: 9, color: "#79acdf" },
		{ label: t`Screening`, count: 5, color: "#2fc4ca" },
		{ label: t`Interview`, count: 3, color: "#d4a654" },
		{ label: t`Offer`, count: 1, color: "#7cc48d" },
		{ label: t`Closed`, count: 4, color: "#e08f86" },
	];
	const insights = [
		{ value: i18n.number(0.56, { style: "percent" }), label: t`heard back` },
		{ value: t`8 days`, label: t`median first reply` },
		{ value: "2.1×", label: t`tailored vs base` },
	];

	return (
		<Act
			id="track"
			stage={STAGE.track}
			side="start"
			kicker={
				<Trans>
					Act 06 · Tracker and Advisor <span className="text-nr-ink-3">· Applications</span>
				</Trans>
			}
			title={t`From saved to signed, on one board.`}
			lead={t`List, board, calendar and insights. See how often people reply and whether tailored resumes do better. Recruiter emails get a drafted reply, follow-ups get a reminder, and when offers land, they're compared against what you said matters.`}
		>
			<Pane>
				<ul className="grid grid-cols-3 gap-1.5 min-[560px]:grid-cols-6">
					{columns.map((column) => (
						<li key={column.label} className="border-nr-line bg-nr-void/35 min-w-0 rounded-[10px] border p-2">
							<span className="font-landing-display block text-[22px] leading-none font-extrabold">
								{i18n.number(column.count)}
							</span>
							<span className="text-nr-ink-3 mt-1 flex items-center gap-1.5 truncate text-[11px]">
								<span
									aria-hidden="true"
									className="size-[7px] shrink-0 rounded-full"
									style={{ backgroundColor: column.color }}
								/>
								{column.label}
							</span>
						</li>
					))}
				</ul>
				<ul className="mt-2 grid grid-cols-3 gap-1.5">
					{insights.map((insight) => (
						<li key={insight.label} className="border-nr-line bg-nr-void/35 min-w-0 rounded-[10px] border p-2.5">
							<span className="font-landing-display block text-[22px] leading-[1.05] font-extrabold">
								{insight.value}
							</span>
							<span className="text-nr-ink-3 text-[11.5px]">{insight.label}</span>
						</li>
					))}
				</ul>
				<p className={cn(monoClass, "mt-2.5")}>{t`Example figures from a fictional search`}</p>
			</Pane>
			<Chips
				items={[
					t`Board · List · Calendar · Insights`,
					t`Drafted recruiter replies`,
					t`Follow-up reminders`,
					t`Offer comparison`,
					t`CSV import and export`,
				]}
			/>
		</Act>
	);
}

export function Everywhere() {
	const languages = localeSchema.options.length;

	return (
		<Act
			id="everywhere"
			stage={STAGE.everywhere}
			side="end"
			kicker={
				<Trans>
					Act 07 · Everywhere <span className="text-nr-ink-3">· apps and agents</span>
				</Trans>
			}
			title={t`In your pocket, in your language, inside your AI.`}
			lead={t`Native iPhone and Android apps with the same features as the web, in ${languages} languages. Connect Claude, Cursor or Codex through MCP, let the AI in your browser work the page with WebMCP, or script everything with the REST and JSON Patch APIs.`}
		>
			<Pane>
				<div className="border-nr-line font-landing-mono text-nr-ink-2 overflow-x-auto rounded-xl border bg-[rgb(2_3_8/.6)] px-3.5 py-3 text-[12.5px] leading-[1.65] whitespace-pre">
					<span className="text-nr-cyan">{t`you ›`}</span> {t`Move Mosaic Cloud to Interview on Thursday at 17:58.`}
					{"\n"}
					<span className="text-nr-mint">✓</span> {t`stage changed · Saved → Interview`}
					{"\n"}
					<span className="text-nr-mint">✓</span> {t`interview added · Thu 17:58 · 45 min`}
					{"\n"}
					<span className="text-nr-mint">✓</span> {t`thank-you note drafted · not sent`}
				</div>
			</Pane>
			<Chips
				items={[t`iPhone`, t`Android`, t`Web`, t`MCP server`, "WebMCP", t`REST and JSON Patch`, t`8 agent skills`]}
			/>
		</Act>
	);
}
