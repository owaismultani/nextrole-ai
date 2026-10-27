import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useRef } from "react";
import { templateSchema } from "@reactive-resume/schema/templates";
import { localeSchema } from "@reactive-resume/utils/locale";
import { cn } from "@reactive-resume/utils/style";
import { githubUrl } from "./header";
import { STAGE } from "./progress";
import { GhostLink, headlineClass, kickerClass, leadClass, StartLink } from "./ui";

const bandClass = "relative pt-[18vh] pb-[8vh]";

/** The six promises that keep the visitor in charge. */
export function Rules() {
	const rules = [
		{
			title: t`Nothing sent in your name`,
			body: t`No application submitted, no message sent. Follow-ups and replies are drafts you send yourself.`,
		},
		{
			title: t`Your AI, your key`,
			body: t`OpenAI, Anthropic, Gemini, DeepSeek, Mistral, Groq, xAI, OpenRouter, Ollama, or any compatible endpoint.`,
		},
		{
			title: t`No invented claims`,
			body: t`Drafts come only from what you confirmed. A made-up figure is discarded and your wording kept.`,
		},
		{
			title: t`A bill with a ceiling`,
			body: t`Cap documents per day. Every AI action says what it sends and to whom.`,
		},
		{
			title: t`Private by default`,
			body: t`Passkeys, two-step sign-in, password-protected links. The ATS checker reads your PDF in your browser.`,
		},
		{
			title: t`Open and portable`,
			body: t`MIT licensed. Self-host with one Docker image, and export everything as JSON whenever you like.`,
		},
	];

	return (
		<section id="rules" data-stage={STAGE.rules} aria-labelledby="rules-title" className={bandClass}>
			<div className="mx-auto max-w-[1280px] px-(--gutter)">
				<div className="mb-[34px] grid max-w-[720px] gap-3.5">
					<p className={kickerClass}>{t`Your rules`}</p>
					<h2 id="rules-title" className={headlineClass}>
						{t`Powerful by default. Yours by design.`}
					</h2>
				</div>
				<ol className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2 min-[980px]:grid-cols-3">
					{rules.map((rule, index) => (
						<li key={rule.title} className="nr-pane p-[22px]">
							<span className="font-landing-mono text-nr-accent mb-3.5 block text-[11px]">
								{String(index + 1).padStart(2, "0")}
							</span>
							<h3 className="font-landing-display mb-2 text-2xl leading-[1.05] font-extrabold tracking-[-.02em] [font-stretch:85%]">
								{rule.title}
							</h3>
							<p className="text-nr-ink-2 text-[14.5px]">{rule.body}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}

/** The tour: the real app, recorded on a fictional account, with chapters that jump the video. */
export function Tour() {
	const video = useRef<HTMLVideoElement>(null);
	const chapters = [
		{ at: 0, label: t`Import and baseline` },
		{ at: 10, label: t`A discovery run` },
		{ at: 20, label: t`Fit and tailoring` },
		{ at: 32, label: t`The studio` },
		{ at: 42, label: t`Interview prep` },
		{ at: 52, label: t`Board and offer` },
	];

	const jump = (seconds: number) => {
		const player = video.current;
		if (!player) return;
		player.currentTime = seconds;
		void player.play().catch(() => undefined);
	};

	return (
		<section id="tour" data-stage={STAGE.rules} aria-labelledby="tour-title" className={bandClass}>
			<div className="mx-auto max-w-[1280px] px-(--gutter)">
				<div className="mx-auto mb-[34px] grid max-w-[720px] justify-items-center gap-3.5 text-center">
					<p className={kickerClass}>
						<Trans>
							The tour <span className="text-nr-ink-3">· filmed in the real app</span>
						</Trans>
					</p>
					<h2 id="tour-title" className={headlineClass}>
						{t`A whole job search in sixty seconds.`}
					</h2>
					<p
						className={leadClass}
					>{t`Not a mockup. The real product on a fictional account, from first import to offer.`}</p>
				</div>
				<div className="nr-pane mx-auto max-w-[1100px] rounded-[26px] p-2.5">
					<video
						ref={video}
						controls
						muted
						playsInline
						preload="none"
						poster="/landing/tour-poster.webp"
						aria-label={t`Product tour of NextRole AI, without sound`}
						className="border-nr-line bg-nr-night aspect-[16/10] w-full rounded-[18px] border"
					>
						<source src="/landing/tour.webm" type="video/webm" />
						<source src="/landing/tour.mp4" type="video/mp4" />
					</video>
					<ol aria-label={t`Chapters`} className="mt-2.5 grid grid-cols-2 gap-2 min-[860px]:grid-cols-6">
						{chapters.map((chapter) => (
							<li key={chapter.at}>
								<button
									type="button"
									onClick={() => jump(chapter.at)}
									className="border-nr-line bg-nr-void/40 text-nr-ink hover:border-nr-line-2 w-full rounded-[14px] border p-3 text-start text-[13px] font-semibold transition-colors"
								>
									<span className="font-landing-mono text-nr-accent block text-[11px] font-medium">
										0:{String(chapter.at).padStart(2, "0")}
									</span>
									{chapter.label}
								</button>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	);
}

/** Pricing, which is the absence of it. */
export function Free() {
	const { i18n } = useLingui();
	const figures = [
		{
			value: i18n.number(0, { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
			label: t`for every feature, forever`,
		},
		{ value: i18n.number(templateSchema.options.length), label: t`templates, all included` },
		{ value: i18n.number(5), label: t`export formats` },
		{ value: i18n.number(localeSchema.options.length), label: t`languages` },
	];

	return (
		<section id="free" data-stage={STAGE.rules} aria-labelledby="free-title" className={bandClass}>
			<div className="mx-auto max-w-[1280px] px-(--gutter)">
				<div className="mb-[34px] grid max-w-[720px] gap-3.5">
					<p className={kickerClass}>{t`Pricing`}</p>
					<h2 id="free-title" className={headlineClass}>
						{t`Free. Not freemium.`}
					</h2>
					<p className={leadClass}>
						{t`No premium tier and no paywalled exports. If you use AI or web search, you pay your own provider directly. Or run the whole thing on your own server.`}
					</p>
				</div>
				<dl className="grid grid-cols-2 gap-3 min-[860px]:grid-cols-4">
					{figures.map((figure) => (
						<div key={figure.label} className="nr-pane flex flex-col-reverse gap-2 p-[22px]">
							<dt className="text-nr-ink-2 text-sm">{figure.label}</dt>
							<dd className="font-landing-display text-[clamp(40px,5vw,64px)] leading-[.9] font-extrabold tracking-[-.03em] [font-stretch:80%]">
								{figure.value}
							</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}

/** The close, under the N mark the field forms. */
export function Finale() {
	return (
		<section
			id="finale"
			data-stage={STAGE.finale}
			aria-labelledby="finale-title"
			className="relative grid min-h-[150vh] items-end max-[900px]:min-h-0"
		>
			<div className="mx-auto grid w-full max-w-[1280px] justify-items-center gap-[22px] px-(--gutter) pb-[22vh] text-center max-[900px]:pt-[50svh] max-[900px]:pb-[14vh]">
				<p className={kickerClass}>{t`Your move`}</p>
				<h2 id="finale-title" className={cn(headlineClass, "max-w-[14ch] text-[clamp(46px,7vw,108px)] leading-[.88]")}>
					<Trans>
						Your next role is out there.{" "}
						<span className="nr-spectrum motion-safe:animate-nr-spectrum">Send the crew.</span>
					</Trans>
				</h2>
				<p className={leadClass}>
					{t`Bring the resume you have, set up one search, and wake up to work that's ready for your review.`}
				</p>
				<div className="flex flex-wrap justify-center gap-3">
					<StartLink size="lg" />
					<GhostLink href={githubUrl} external>
						{t`Star on GitHub`}
					</GhostLink>
				</div>
			</div>
		</section>
	);
}
