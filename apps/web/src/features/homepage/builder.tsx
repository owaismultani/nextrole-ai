import type { IconName } from "@reactive-resume/ui/components/icon";
import type { CSSProperties } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { templateSchema } from "@reactive-resume/schema/templates";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { SCENE } from "./scroll";
import { Sheet, sheetTemplates } from "./sheet";
import { headlineClass, labelClass, leadClass } from "./ui";

/**
 * 05 Builder: under the automation is the resume builder it grew from. The demo page fans out in five of its looks as
 * the section scrolls in, beside what the editor does.
 */
export function Builder() {
	const { i18n } = useLingui();
	const templateCount = i18n.number(templateSchema.options.length);
	const middle = (sheetTemplates.length - 1) / 2;

	const features: { icon: IconName; title: string; body: string }[] = [
		{ icon: "pencil-line", title: t`Edit beside a live page`, body: t`It saves as you type and keeps every version.` },
		{
			icon: "palette",
			title: t`${templateCount} templates`,
			body: t`Change type, color and spacing; the words stay put.`,
		},
		{
			icon: "seal-check",
			title: t`Built to be parsed`,
			body: t`Text-based PDFs, in reading order, for applicant tracking systems.`,
		},
		{
			icon: "export",
			title: t`Yours to take`,
			body: t`PDF, Word, Markdown and JSON, or a public link with a password.`,
		},
	];

	return (
		<section
			id="builder"
			data-scene={SCENE.builder}
			aria-labelledby="builder-title"
			className="relative mx-auto grid max-w-[1440px] items-center gap-x-[5vw] gap-y-14 border-t border-line px-(--gutter) py-[14vh] min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
		>
			<div className="flex flex-col gap-5">
				<span className={cn(labelClass, "text-accent-text")}>{t`05 · The foundation`}</span>
				<h2 id="builder-title" className={cn(headlineClass, "text-[clamp(32px,4.4vw,68px)] leading-[1.02]")}>
					<Trans>Still a very good resume builder.</Trans>
				</h2>
				<p className={cn(leadClass, "max-w-[30em]")}>
					{t`Every tailored copy starts from a resume you control. Use the editor on its own if that’s all you need: it was here first.`}
				</p>
				<ul className="mt-2 grid gap-x-6 gap-y-5 min-[560px]:grid-cols-2">
					{features.map((feature) => (
						<li key={feature.title} className="flex items-start gap-3">
							<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text">
								<Icon name={feature.icon} size={18} />
							</span>
							<span className="font-ui">
								<span className="block text-[14.5px] font-semibold text-ink">{feature.title}</span>
								<span className="block text-[13.5px] leading-snug text-ink-2">{feature.body}</span>
							</span>
						</li>
					))}
				</ul>
				<Link
					to="/ats-checker"
					className="mt-1 inline-flex w-fit items-center gap-1.5 font-ui text-[14.5px] font-semibold text-accent-text underline-offset-4 hover:underline"
				>
					{t`Check any resume with the free ATS checker`}
					<Icon name="arrow-right" size={16} />
				</Link>
			</div>

			<div aria-hidden="true" className="relative mx-auto h-[min(64vw,520px)] w-full max-w-[720px]">
				{sheetTemplates.map((template, index) => {
					const offset = index - middle;
					return (
						<div
							key={i18n._(template.name)}
							className="absolute top-1/2 left-1/2 aspect-[612/792] w-[min(34%,240px)] rounded-[2px] shadow-page [transition:transform_.5s_var(--ease)]"
							style={
								{
									"--o": offset,
									"--a": Math.abs(offset),
									zIndex: 10 - Math.abs(offset),
									// The pages spread as the section scrolls in; --dir mirrors the fan in right-to-left layouts.
									transform:
										"translate(-50%, -50%) translateX(calc(var(--o) * var(--dir) * clamp(0, var(--p) * 1.4 - .1, 1) * 46%)) translateY(calc(var(--a) * 4%)) rotate(calc(var(--o) * var(--dir) * clamp(0, var(--p) * 1.4 - .1, 1) * 5deg))",
								} as CSSProperties
							}
						>
							<Sheet template={template} />
						</div>
					);
				})}
			</div>
		</section>
	);
}
