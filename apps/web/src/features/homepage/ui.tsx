import type { ReactNode } from "react";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { cn } from "@reactive-resume/utils/style";

/** A mono kicker above a headline: the act, its role and the part of the app it lives in. */
export const kickerClass = "font-landing-mono text-[12px] leading-[1.3] tracking-[.1em] uppercase text-nr-accent";

/** The section headline: Bricolage Grotesque, heavy and condensed. */
export const headlineClass =
	"font-landing-display font-extrabold [font-stretch:82%] tracking-[-.03em] leading-[.92] text-balance text-nr-ink text-[clamp(38px,4.8vw,70px)]";

/** Body copy beside a headline. */
export const leadClass = "text-[clamp(16px,1.3vw,18px)] leading-[1.62] text-pretty text-nr-ink-2 max-w-[60ch]";

/** Small tabular metadata inside a pane. */
export const monoClass = "font-landing-mono text-[12px] leading-[1.4] tabular-nums text-nr-ink-3";

type BrandProps = { className?: string };

/** The NextRole AI mark: an "N" tile, the wordmark and its AI badge. */
export function Brand({ className }: BrandProps) {
	return (
		<span className={cn("flex items-center gap-2.5", className)}>
			<span
				aria-hidden="true"
				className="bg-nr-accent font-landing-display text-nr-on-accent grid size-7 place-items-center rounded-lg text-base font-extrabold"
			>
				N
			</span>
			<span className="font-landing-display text-nr-ink flex items-center gap-2 text-[19px] font-extrabold tracking-[-.03em]">
				NextRole
				<span className="border-nr-line-2 font-landing-mono text-nr-ink-2 rounded-md border px-1.5 py-px text-[10px] font-medium tracking-normal">
					AI
				</span>
			</span>
		</span>
	);
}

const buttonClass =
	"inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color] duration-quick ease-enter motion-safe:hover:-translate-y-px";

type ButtonSize = "sm" | "lg";
const buttonSize: Record<ButtonSize, string> = { sm: "h-[38px] px-4 text-sm", lg: "h-14 px-7 text-base" };

/** "Start free": the page's one call to action, in the header, the hero and the finale. */
export function StartLink({ size, className }: { size: ButtonSize; className?: string }) {
	return (
		<Link
			to="/dashboard/overview"
			className={cn(
				buttonClass,
				buttonSize[size],
				"bg-nr-accent text-nr-on-accent hover:shadow-[0_12px_44px_-10px_rgb(179_166_255/.7)]",
				className,
			)}
		>
			<Trans>Start free</Trans>
		</Link>
	);
}

type GhostLinkProps = { href: string; children: ReactNode; external?: boolean };

/** A secondary action on glass. */
export function GhostLink({ href, children, external }: GhostLinkProps) {
	return (
		<a
			href={href}
			{...(external ? { target: "_blank", rel: "noopener" } : {})}
			className={cn(
				buttonClass,
				buttonSize.lg,
				"border-nr-line-2 text-nr-ink border bg-[rgb(214_218_255/.06)] backdrop-blur-md hover:bg-[rgb(214_218_255/.1)]",
			)}
		>
			{children}
		</a>
	);
}

/** A glass panel holding a slice of the product. */
export function Pane({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("nr-pane p-[18px] text-sm", className)}>{children}</div>;
}

/** A row of feature names under an act. */
export function Chips({ items, accent = [] }: { items: string[]; accent?: string[] }) {
	return (
		<ul className="flex flex-wrap gap-1.5">
			{[...items, ...accent].map((item) => (
				<li
					key={item}
					className={cn(
						"rounded-full border px-2.5 py-1.5 text-[12px] leading-none font-medium whitespace-nowrap",
						accent.includes(item)
							? "border-nr-accent/40 text-nr-accent bg-[rgb(81_70_217/.16)]"
							: "border-nr-line-2 bg-nr-void/35 text-nr-ink-2",
					)}
				>
					{item}
				</li>
			))}
		</ul>
	);
}

type ActProps = {
	id: string;
	stage: number;
	/** Which side the copy holds; the field takes the other. */
	side: "start" | "end";
	kicker: ReactNode;
	title: ReactNode;
	lead: ReactNode;
	children: ReactNode;
};

/**
 * One act of the journey. On wide screens the copy holds still (sticky) while the field morphs beside it; on phones
 * the field rides above the copy instead.
 */
export function Act({ id, stage, side, kicker, title, lead, children }: ActProps) {
	return (
		<section
			id={id}
			data-stage={stage}
			aria-labelledby={`${id}-title`}
			className="relative grid min-h-[160vh] max-[900px]:min-h-0"
		>
			<div className="mx-auto w-full max-w-[1280px] px-(--gutter)">
				<div
					className={cn(
						"sticky top-[14vh] grid max-w-[540px] gap-[22px] py-6 max-[900px]:static max-[900px]:pt-[48svh] max-[900px]:pb-[10vh]",
						side === "end" ? "ms-auto" : "min-[1320px]:ms-24",
					)}
				>
					<p className={kickerClass}>{kicker}</p>
					<h2 id={`${id}-title`} className={headlineClass}>
						{title}
					</h2>
					<p className={leadClass}>{lead}</p>
					{children}
				</div>
			</div>
		</section>
	);
}
