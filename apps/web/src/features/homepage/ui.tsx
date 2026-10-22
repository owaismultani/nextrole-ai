import type { ReactNode } from "react";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";

/** A small uppercase label: section kickers, scene numbers, metadata. */
export const labelClass = "font-ui font-bold text-[11.5px] uppercase leading-[1.4] tracking-[.1em]";

/** The landing page's display headline: Manrope, heavy and tight. */
export const headlineClass = "font-display font-extrabold tracking-[-.045em] text-ink text-balance";

/** Body copy beside a headline. */
export const leadClass = "font-ui text-[clamp(16px,1.25vw,19px)] leading-[1.55] text-pretty text-ink-2";

type BrandProps = { className?: string; size?: "header" | "footer" };

/** The NextRole AI mark: an "N" tile, the wordmark and its AI badge, as the app's sidebar shows it. */
export function Brand({ className, size = "header" }: BrandProps) {
	return (
		<span className={cn("flex items-center gap-2.5", className)}>
			<span
				aria-hidden="true"
				className={cn(
					"grid place-items-center rounded-lg bg-accent font-display font-extrabold text-on-accent",
					size === "header" ? "size-8 text-lg" : "size-10 text-[22px]",
				)}
			>
				N
			</span>
			<span
				className={cn(
					"flex items-center gap-1.5 font-display font-extrabold tracking-[-.055em] text-ink",
					size === "header" ? "text-[21px]" : "text-[26px]",
				)}
			>
				NextRole
				<span className="rounded-md bg-accent-soft px-1.5 py-px font-ui text-[11px] font-bold tracking-normal text-accent-text">
					AI
				</span>
			</span>
		</span>
	);
}

type CtaLinkProps = { size: "header" | "hero" | "closing"; className?: string };

/** "Set up your search": the page's one call to action, in the header, the hero and the closing section. */
export function CtaLink({ size, className }: CtaLinkProps) {
	return (
		<Link
			to="/dashboard/overview"
			className={cn(
				"inline-flex shrink-0 items-center rounded-full bg-accent font-ui font-semibold text-on-accent transition-[background-color,transform] duration-quick ease-out-strong hover:bg-accent-hover motion-safe:active:[transform:scale(.97)]",
				size === "header" && "h-[38px] px-4 text-sm",
				size === "hero" && "h-[54px] gap-2.5 px-6 text-base shadow-e2",
				size === "closing" && "h-14 gap-2.5 px-7 text-[17px] shadow-e2",
				className,
			)}
		>
			<Trans>Set up your search</Trans>
			{size !== "header" && <Icon name="arrow-right" size={20} />}
		</Link>
	);
}

type PinnedSceneProps = {
	id: string;
	scene: number;
	number: string;
	kicker: string;
	title: ReactNode;
	children: ReactNode;
	/** The scene's illustration, beside the caption from 900px and under it below. */
	stage: ReactNode;
	/** Section heights, below and from 900px; reduced motion collapses them to one screen. */
	height: string;
};

/**
 * A pinned scene: a sticky one-screen stage whose progress the scroll engine writes as --p. The caption holds the
 * scene's heading and copy, so every word is in the prerendered HTML; the stage is the illustration.
 */
export function PinnedScene({ id, scene, number, kicker, title, children, stage, height }: PinnedSceneProps) {
	return (
		<section
			id={id}
			data-scene={scene}
			data-pin
			aria-labelledby={`${id}-title`}
			className={cn("relative motion-reduce:h-auto", height)}
		>
			<div className="sticky top-0 mx-auto grid h-svh max-w-[1440px] grid-rows-[auto_minmax(0,1fr)] items-center gap-6 px-(--gutter) pt-[88px] pb-6 motion-reduce:static motion-reduce:h-auto motion-reduce:py-[12vh] min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[900px]:grid-rows-1 min-[900px]:gap-[5vw] min-[900px]:pt-16 min-[900px]:pb-0">
				<div className="flex flex-col gap-3 min-[900px]:gap-5">
					<span className={cn(labelClass, "text-accent-text")}>
						{number} · {kicker}
					</span>
					<h2 id={`${id}-title`} className={cn(headlineClass, "text-[clamp(32px,4.4vw,68px)] leading-[1.02]")}>
						{title}
					</h2>
					<div
						className={cn(
							leadClass,
							"max-[900px]:short:hidden flex max-w-[30em] flex-col gap-3 max-[900px]:text-[15px] max-[900px]:[&>p+p]:hidden",
						)}
					>
						{children}
					</div>
				</div>
				<div className="relative flex h-full min-h-0 items-center justify-center motion-reduce:h-auto">{stage}</div>
			</div>
		</section>
	);
}

type RevealProps = {
	on: boolean;
	children: ReactNode;
	className?: string;
	/** The element to render; a list item keeps a list's semantics. */
	as?: "div" | "li" | "span";
};

/** Fades and lifts its content in once a scene's step reaches it. The content is in the page either way. */
export function Reveal({ on, children, className, as: Element = "div" }: RevealProps) {
	return (
		<Element
			data-on={on || undefined}
			className={cn(
				"transition-[opacity,translate] duration-emphasized ease-enter",
				on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
				className,
			)}
		>
			{children}
		</Element>
	);
}

/** A surface from the app: a raised card with the app's border and shadow. */
export function MockCard({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("rounded-2xl border border-line bg-surface shadow-e2", className)}>{children}</div>;
}

const chipTones = {
	ok: "bg-ok-soft text-ok-text border-ok/25",
	warn: "bg-warn-soft text-warn-text border-warn/30",
	info: "bg-info-soft text-info-text border-info-text/20",
	danger: "bg-danger-soft text-danger-text border-danger/25",
	accent: "bg-accent-soft text-accent-text border-accent/25",
	neutral: "bg-sunken text-ink-2 border-line",
} as const;

type ChipProps = { tone: keyof typeof chipTones; children: ReactNode; className?: string };

/** A status label, as the app shows one: color always comes with words. */
export function Chip({ tone, children, className }: ChipProps) {
	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 font-ui text-[12px] leading-none font-semibold whitespace-nowrap",
				chipTones[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}

/** A company's initial on a soft tile, as the app's lists show it. */
export function CompanyTile({ name, className }: { name: string; className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft font-display text-[15px] font-extrabold text-accent-text",
				className,
			)}
		>
			{name.charAt(0)}
		</span>
	);
}
