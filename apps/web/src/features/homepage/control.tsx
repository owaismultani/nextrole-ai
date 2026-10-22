import type { IconName } from "@reactive-resume/ui/components/icon";
import type { CSSProperties } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { SCENE } from "./scroll";
import { headlineClass, labelClass, leadClass } from "./ui";

/**
 * 06 Control: the pipeline as the app's "How it's working" panel draws it, eight steps of which the last two are the
 * visitor's, and the promises that keep it that way. The line through the steps draws in as the section scrolls in.
 */
export function Control() {
	const pipeline = [t`Schedule`, t`Search`, t`Read pages`, t`Filter`, t`Save jobs`, t`Prepare documents`];
	const yours = [t`You review`, t`You apply`];

	const promises: { icon: IconName; title: string; body: string }[] = [
		{
			icon: "paper-plane-tilt",
			title: t`Nothing sent for you`,
			body: t`No application is submitted and no message is sent in your name. Follow-ups are drafts you send yourself.`,
		},
		{
			icon: "pause",
			title: t`Pause any time`,
			body: t`Pause discovery or turn either document type off. The jobs and documents you have stay.`,
		},
		{
			icon: "key",
			title: t`Your own AI key`,
			body: t`Bring OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama or another provider. Without one, nothing goes to an AI service.`,
		},
		{
			icon: "timer",
			title: t`A daily limit`,
			body: t`Cap how many documents are written each day, so your AI bill never surprises you.`,
		},
		{
			icon: "seal-check",
			title: t`No invented claims`,
			body: t`A rewrite that adds a figure you never had is thrown out, and your original wording is kept.`,
		},
		{
			icon: "code",
			title: t`Open and portable`,
			body: t`Open source under the MIT License. Host it yourself and export everything, any time.`,
		},
	];

	return (
		<section
			id="control"
			data-scene={SCENE.control}
			aria-labelledby="control-title"
			className="relative mx-auto flex max-w-[1440px] flex-col gap-12 border-t border-line px-(--gutter) py-[14vh]"
		>
			<div className="flex max-w-[44em] flex-col gap-5">
				<span className={cn(labelClass, "text-accent-text")}>{t`06 · Control`}</span>
				<h2 id="control-title" className={cn(headlineClass, "text-[clamp(32px,4.4vw,68px)] leading-[1.02]")}>
					<Trans>
						It stops where <span className="text-accent-text">you start.</span>
					</Trans>
				</h2>
				<p className={leadClass}>
					{t`The system does the searching, reading, filtering and drafting, and shows each step as it happens. The last two steps are always yours. If something stops working, it says what and links to the fix.`}
				</p>
			</div>

			<ol
				className="relative grid grid-cols-2 gap-2 min-[640px]:grid-cols-4 min-[1100px]:grid-cols-8"
				style={{ "--draw": "clamp(0, (var(--p) - .15) / .6, 1)" } as CSSProperties}
			>
				<span
					aria-hidden="true"
					className="absolute inset-x-4 top-[22px] hidden h-0.5 origin-left [transform:scaleX(var(--draw))] bg-accent min-[1100px]:block rtl:origin-right"
				/>
				{pipeline.map((step, index) => (
					<li
						key={step}
						className="relative flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 font-ui shadow-e1"
					>
						<span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-text">
							{index + 1}
						</span>
						<span className="text-[13.5px] font-semibold text-ink">{step}</span>
						<span className="text-[12px] text-ink-3">{t`Automatic`}</span>
					</li>
				))}
				{yours.map((step, index) => (
					<li
						key={step}
						className="relative flex flex-col gap-2 rounded-xl border-2 border-accent bg-accent-soft p-3 font-ui"
					>
						<span className="grid size-7 place-items-center rounded-full bg-accent text-[12px] font-bold text-on-accent">
							{pipeline.length + index + 1}
						</span>
						<span className="text-[13.5px] font-semibold text-ink">{step}</span>
						<span className="text-[12px] font-semibold text-accent-text">{t`Yours`}</span>
					</li>
				))}
			</ol>

			<ul className="grid gap-x-8 gap-y-8 border-t border-line pt-10 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
				{promises.map((promise) => (
					<li key={promise.title} className="flex items-start gap-3.5">
						<span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-accent-text shadow-e1">
							<Icon name={promise.icon} size={20} />
						</span>
						<span className="font-ui">
							<span className="block font-display text-[17px] font-bold tracking-[-.02em] text-ink">
								{promise.title}
							</span>
							<span className="mt-1 block text-[14.5px] leading-normal text-ink-2">{promise.body}</span>
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
