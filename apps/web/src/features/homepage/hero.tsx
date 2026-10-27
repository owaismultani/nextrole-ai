import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { templateSchema } from "@reactive-resume/schema/templates";
import { localeSchema } from "@reactive-resume/utils/locale";
import { cn } from "@reactive-resume/utils/style";
import { STAGE } from "./progress";
import { GhostLink, headlineClass, kickerClass, leadClass, StartLink } from "./ui";

/** The opening: the promise, the two ways in, and the facts that make it easy to say yes. */
export function Hero() {
	const languages = localeSchema.options.length;
	const facts = [
		t`No credit card, no premium tier`,
		t`Web, iPhone and Android`,
		t`${languages} languages`,
		t`MIT licensed`,
	];

	return (
		<section
			id="top"
			data-stage={STAGE.hero}
			aria-labelledby="hero-title"
			className="relative grid min-h-[118vh] max-[900px]:min-h-0"
		>
			<div className="mx-auto w-full max-w-[1280px] px-(--gutter)">
				<div className="sticky top-[16vh] grid max-w-[700px] gap-[26px] pt-[4vh] pb-6 max-[900px]:static max-[900px]:pt-[42svh] max-[900px]:pb-[8vh] min-[1320px]:ms-24">
					<p className={kickerClass}>
						<Trans>
							NextRole AI <span className="text-nr-ink-3">· free and open source</span>
						</Trans>
					</p>
					<h1
						id="hero-title"
						className="font-landing-display text-nr-ink text-[clamp(54px,8vw,128px)] leading-[.86] font-extrabold tracking-[-.035em] text-balance [font-stretch:78%]"
					>
						<Trans>
							A career team that works{" "}
							<span className="nr-spectrum motion-safe:animate-nr-spectrum">while you sleep.</span>
						</Trans>
					</h1>
					<p className={leadClass}>
						<Trans>
							NextRole AI scouts roles on your schedule, tailors a resume, letter and answers for each one, coaches you
							through the interview and helps you weigh the offer. It runs on your own AI key and stops at every
							decision, so you make it.
						</Trans>
					</p>
					<div className="flex flex-wrap gap-3">
						<StartLink size="lg" />
						<GhostLink href="#tour">
							<span aria-hidden="true">▶</span>
							<Trans>Watch it work · 1:00</Trans>
						</GhostLink>
					</div>
					<ul className="text-nr-ink-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13.5px]">
						{facts.map((fact) => (
							<li
								key={fact}
								className="before:bg-nr-accent flex items-center gap-2 before:size-[5px] before:rounded-full before:shadow-[0_0_10px_var(--color-nr-accent)]"
							>
								{fact}
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

/** Meet the crew: the whole product at a glance, one specialist per part of the job search. */
export function Crew() {
	const templates = templateSchema.options.length;
	const crew = [
		{
			href: "#scout",
			role: t`The Scout`,
			act: "02",
			title: t`Finds roles worth your time`,
			body: t`Searches 11 job boards, the companies you follow and the open web on your schedule, and tells you why it passed on the rest.`,
			gives: t`A shortlist, with a fit check for each role`,
		},
		{
			href: "#write",
			role: t`The Writer`,
			act: "03",
			title: t`Writes like you on your best day`,
			body: t`Tailors your resume, cover letter and form answers to each posting, using only experience you've confirmed.`,
			gives: t`Drafts ready to review, never sent`,
		},
		{
			href: "#studio",
			role: t`The Editor`,
			act: "04",
			title: t`Makes every page look the part`,
			body: t`${templates} templates, about 500 fonts and an ATS check that points to the exact line. Its suggestions wait for your yes.`,
			gives: t`A resume both software and people can read`,
		},
		{
			href: "#coach",
			role: t`The Coach`,
			act: "05",
			title: t`Gets you ready to walk in`,
			body: t`Briefs you before each interview, listens while you practise out loud, and turns every debrief into material for the next round.`,
			gives: t`A 30-minute plan for every interview`,
		},
		{
			href: "#track",
			role: t`The Tracker`,
			act: "06",
			title: t`Remembers everything, so you don't`,
			body: t`One board for every application, with interviews on your calendar, follow-up reminders and replies drafted for recruiters.`,
			gives: t`Your next step on every application`,
		},
		{
			href: "#track",
			role: t`The Advisor`,
			act: "06",
			title: t`Helps you say yes to the right offer`,
			body: t`Lines offers up against what you said matters, and keeps the unknown terms in plain sight.`,
			gives: t`The questions to ask before you sign`,
		},
	];

	return (
		<section id="crew" data-stage={STAGE.hero} aria-labelledby="crew-title" className="relative pt-[6vh] pb-[22vh]">
			<div className="mx-auto max-w-[1280px] px-(--gutter)">
				<div className="mb-[30px] grid max-w-[640px] gap-3.5">
					<p className={kickerClass}>{t`Meet your crew`}</p>
					<h2 id="crew-title" className={headlineClass}>
						{t`Six specialists. One boss: you.`}
					</h2>
					<p className={leadClass}>
						{t`Each one takes a part of the job search off your plate and hands you finished work to review. Nobody acts in your name.`}
					</p>
				</div>
				<ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[980px]:grid-cols-3">
					{crew.map((member) => (
						<li key={member.role} className="flex">
							<a
								href={member.href}
								className={cn(
									"nr-pane flex w-full flex-col gap-2 p-[22px] transition-[translate,border-color] duration-standard ease-enter",
									"hover:border-nr-line-2 motion-safe:hover:-translate-y-[3px]",
								)}
							>
								<span className="font-landing-mono text-nr-ink-3 flex justify-between text-[11px] leading-none tracking-[.1em] uppercase">
									{member.role}
									<span>{t`Act ${member.act}`}</span>
								</span>
								<h3 className="font-landing-display text-nr-ink text-[28px] leading-none font-extrabold tracking-[-.02em] [font-stretch:85%]">
									{member.title}
								</h3>
								<p className="text-nr-ink-2 text-[14.5px]">{member.body}</p>
								<p className="border-nr-line font-landing-mono text-nr-ink-2 mt-auto border-t pt-3.5 text-[12.5px] leading-[1.45]">
									<span className="text-nr-accent mb-0.5 block text-[10.5px] tracking-[.1em] uppercase">{t`Hands you`}</span>
									{member.gives}
								</p>
							</a>
						</li>
					))}
				</ul>
				<p className="font-landing-mono text-nr-ink-3 mt-[18px] text-[13px]">{t`They prepare. You decide. Nothing leaves without you.`}</p>
			</div>
		</section>
	);
}
