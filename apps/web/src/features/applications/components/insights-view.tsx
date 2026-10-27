import type { Application } from "../types";
import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { toast } from "@reactive-resume/ui/components/toast";
import { computeInsights, computeOutcomes, computeTimeline } from "../insights";
import { getStageColor, getStageLabel } from "../stages";
import { stagger } from "@/libs/motion";
import { orpc } from "@/libs/orpc/client";

/** The page's shape while stats load: the funnel, the two figures, then the charts. */
export function InsightsSkeleton() {
	return (
		<div className="flex max-w-4xl flex-col gap-4">
			<Skeleton className="h-56 rounded-xl" />
			<div className="grid gap-4 sm:grid-cols-2">
				<Skeleton className="h-[102px] rounded-xl" />
				<Skeleton className="h-[102px] rounded-xl" />
			</div>
			<Skeleton className="h-80 rounded-xl" />
		</div>
	);
}

export function ApplicationInsights({ applications }: { applications: Application[] }) {
	const { data } = useQuery(orpc.applications.stats.queryOptions({}));
	const { data: documents } = useQuery(orpc.documents.list.queryOptions({ input: { trashed: false } }));

	// A resume is tailored for an application when it was made for it (Copy for a job).
	const madeFor = new Map(
		(documents ?? []).flatMap((document) => (document.application ? [[document.id, document.application.id]] : [])),
	);
	const outcomes = computeOutcomes(applications, (application) =>
		Boolean(application.resumeId && madeFor.get(application.resumeId) === (application as Application).id),
	);

	// Sending history includes applications that later closed, and excludes jobs never sent.
	const timeline = computeTimeline(applications);
	const maxWeek = Math.max(1, ...timeline.map((bucket) => bucket.count));

	if (!data) return <InsightsSkeleton />;

	const insights = computeInsights(data.byStage);
	const maxSource = Math.max(1, ...data.bySource.map((s) => s.count));
	const widest = Math.max(1, ...outcomes.funnel.map((row) => row.reached));

	if (outcomes.sent === 0) {
		return (
			<p className="py-16 text-center text-sm text-ink-2">
				<Trans>Once you've sent a few applications, this shows how far they get and how quickly people reply.</Trans>
			</p>
		);
	}

	return (
		<div className="flex max-w-4xl flex-col gap-4 overflow-y-auto pb-6">
			<section aria-labelledby="insights-funnel" className="grid gap-3 rounded-xl border border-line p-5">
				<h2 id="insights-funnel" className="text-sm font-semibold">
					<Trans>How far applications get</Trans>
				</h2>
				<ol className="grid gap-2">
					{outcomes.funnel.map((row, index) => (
						<li key={row.status} className="grid grid-cols-[92px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
							<span className="flex items-center gap-1.5 text-ink-2">
								<span
									aria-hidden="true"
									className="size-2 rounded-full"
									style={{ background: getStageColor(row.status) }}
								/>
								{getStageLabel(row.status)}
							</span>
							<span className="h-5 overflow-hidden rounded bg-sunken">
								<span
									className="block h-full origin-left rounded transition-[scale] delay-(--stagger) duration-emphasized ease-enter motion-reduce:delay-0 rtl:origin-right starting:scale-x-0"
									style={{
										...stagger(index),
										width: `${(row.reached / widest) * 100}%`,
										background: getStageColor(row.status),
									}}
								/>
							</span>
							<span className="text-end font-display text-base tabular-nums">{row.reached}</span>
						</li>
					))}
				</ol>
				<p className="text-xs text-ink-3">
					<Trans>Counts every application that reached each stage, including ones now closed.</Trans>
				</p>
			</section>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-xl border border-line p-5">
					<div className="font-display text-[32px] leading-[1.3] font-[750] tracking-[-0.05em] tabular-nums">
						{Math.round((outcomes.heardBack / outcomes.sent) * 100)}%
					</div>
					<div className="text-sm text-ink-2">
						<Trans>heard back</Trans>
					</div>
				</div>
				<div className="rounded-xl border border-line p-5">
					<div className="font-display text-[32px] leading-[1.3] font-[750] tracking-[-0.05em] tabular-nums">
						{outcomes.medianDaysToReply === null ? (
							"—"
						) : (
							<Plural value={outcomes.medianDaysToReply} one="# day" other="# days" />
						)}
					</div>
					<div className="text-sm text-ink-2">
						<Trans>median to first reply</Trans>
					</div>
				</div>
			</div>

			{outcomes.tailored.sent + outcomes.base.sent > 0 && (
				<section aria-labelledby="insights-tailored" className="grid gap-1 rounded-xl border border-line p-5">
					<h2 id="insights-tailored" className="text-sm font-semibold">
						<Trans>Tailored vs. base resume</Trans>
					</h2>
					<p className="text-sm leading-6 text-ink-2">
						<Trans>
							{outcomes.tailored.replied} of {outcomes.tailored.sent} tailored applications got a reply;{" "}
							{outcomes.base.replied} of {outcomes.base.sent} sent with another resume.
						</Trans>{" "}
						{outcomes.tailored.sent + outcomes.base.sent < 10 && <Trans>Small numbers, but worth noticing.</Trans>}
					</p>
				</section>
			)}

			<PipelineFlow insights={insights} />

			<div className="grid gap-4 lg:grid-cols-2">
				{/* application velocity over time */}
				<div className="rounded-xl border border-line p-5">
					<h3 className="text-sm font-semibold">
						<Trans>Applications over time</Trans>
					</h3>
					<p className="mt-0.5 text-xs text-ink-3">
						<Trans>Applications sent per week (last 8 weeks)</Trans>
					</p>
					<div className="mt-4 flex items-end gap-2">
						{timeline.map((bucket, index) => (
							<div key={bucket.label} className="flex flex-1 flex-col items-center gap-1">
								<div className="flex h-28 w-full flex-col justify-end">
									<span className="mb-1 text-center text-[10px] text-ink-3 tabular-nums">{bucket.count || ""}</span>
									<div
										className="w-full origin-bottom rounded-t bg-accent transition-[scale] delay-(--stagger) duration-emphasized ease-enter motion-reduce:delay-0 starting:scale-y-0"
										style={{
											...stagger(index),
											height: `${bucket.count ? Math.max((bucket.count / maxWeek) * 100, 8) : 0}%`,
										}}
									/>
								</div>
								<span className="text-[10px] text-ink-3 tabular-nums">{bucket.label}</span>
							</div>
						))}
					</div>
				</div>

				{/* sources */}
				<div className="rounded-xl border border-line p-5">
					<h3 className="text-sm font-semibold">
						<Trans>Where applications come from</Trans>
					</h3>
					<p className="mt-0.5 text-xs text-ink-3">
						<Trans>Count by source</Trans>
					</p>
					<div className="mt-4 flex flex-col gap-3">
						{data.bySource.length === 0 ? (
							<p className="text-sm text-ink-3">
								<Trans>No source data yet.</Trans>
							</p>
						) : (
							data.bySource.map((row, index) => (
								<div key={row.source} className="flex items-center gap-3 text-xs">
									<span className="w-28 shrink-0 truncate font-medium">{row.source}</span>
									<div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken">
										<div
											className="h-full origin-left rounded-full bg-ink-2 transition-[scale] delay-(--stagger) duration-emphasized ease-enter motion-reduce:delay-0 rtl:origin-right starting:scale-x-0"
											style={{ ...stagger(index), width: `${Math.max((row.count / maxSource) * 100, 3)}%` }}
										/>
									</div>
									<span className="w-6 text-right text-ink-3">{row.count}</span>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// Vibrant, dark-mode palette for the pipeline snapshot — brighter than the muted board stage
// colors so the chart pops both on screen (preview) and in the exported PNG.
const FLOW_COLORS = ["#a5b4fc", "#818cf8", "#22d3ee", "#fbbf24", "#34d399"];
const FLOW_BG = "#0a0a0f";
const FLOW_REJECTED = "#fb7185";
const FLOW_FONT = "var(--font-ui)";
// NextRole AI tile ~18px wide in the 64-unit icon viewBox.
const ICON_SCALE = 18 / 64;

function toBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

// A rasterized SVG (loaded as an <img>) can't reach the page's webfonts, so the exported PNG falls
// back to a system font unless the font is inlined. Find the UI woff2 the app already
// loaded (basic-latin subset covers the chart's English labels), base64 it, and return an
// @font-face the export SVG can embed. Returns null on any failure so export still proceeds.
async function uiFontFace(): Promise<string | null> {
	const uiFamily = getComputedStyle(document.documentElement)
		.getPropertyValue("--font-ui")
		.split(",")[0]
		?.trim()
		.replace(/["']/g, "");
	if (!uiFamily) return null;
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList | undefined;
		try {
			rules = sheet.cssRules;
		} catch {
			continue; // cross-origin stylesheet — not readable
		}
		for (const rule of Array.from(rules ?? [])) {
			if (!(rule instanceof CSSFontFaceRule)) continue;
			const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "");
			if (family !== uiFamily) continue;
			if ((rule.style.getPropertyValue("font-style") || "normal") !== "normal") continue;
			// Keep only the basic-latin subset (covers the chart's English labels). CSSOM normalizes
			// its range to "U+0-FF" — i.e. "U+" then all-zero start — so match that, not "U+0000".
			const range = rule.style.getPropertyValue("unicode-range");
			if (range && !/U\+0{1,4}-/i.test(range)) continue;
			const url = rule.style.getPropertyValue("src").match(/url\(["']?([^"')]+\.woff2)["']?\)/)?.[1];
			if (!url) continue;
			try {
				const res = await fetch(url);
				if (!res.ok) return null;
				const buffer = await res.arrayBuffer();
				return `@font-face{font-family:"${family}";font-style:normal;font-weight:${rule.style.getPropertyValue("font-weight")};src:url(data:font/woff2;base64,${toBase64(buffer)}) format("woff2");}`;
			} catch {
				return null;
			}
		}
	}
	return null;
}

// A funnel-flow snapshot (the shareable picture). Hand-drawn SVG with inline fills so it exports to
// PNG without any library. Rendered dark + vibrant so the on-screen preview matches the export;
// the NextRole AI mark is injected only when exporting.
function PipelineFlow({ insights }: { insights: ReturnType<typeof computeInsights> }) {
	const svgRef = useRef<SVGSVGElement>(null);
	const W = 800;
	const H = 340;
	const padX = 40;
	const midY = 190;
	const maxBarH = 150;
	const barW = 34;
	const n = insights.funnel.length;
	const slotW = (W - padX * 2) / n;
	const maxReached = Math.max(1, ...insights.funnel.map((f) => f.reached));

	const bars = insights.funnel.map((f, i) => {
		const h = Math.max((f.reached / maxReached) * maxBarH, 4);
		const x = padX + slotW * i + slotW / 2 - barW / 2;
		const yTop = midY - h / 2;
		return { ...f, color: FLOW_COLORS[i] ?? f.color, x, yTop, h, cx: x + barW / 2 };
	});

	const exportPng = async () => {
		const svg = svgRef.current;
		if (!svg) return;
		// Reveal the export-only watermark on a clone so the on-screen chart stays clean.
		const clone = svg.cloneNode(true) as SVGSVGElement;
		clone.style.fontFamily = getComputedStyle(svg).fontFamily;
		for (const el of clone.querySelectorAll<SVGElement>("[data-export-only]")) el.style.display = "";
		// Inline the UI font so the rasterized PNG uses the same type as the app.
		const fontFace = await uiFontFace();
		if (fontFace) {
			const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
			styleEl.textContent = fontFace;
			clone.querySelector("defs")?.prepend(styleEl);
		}
		const xml = new XMLSerializer().serializeToString(clone);
		const svg64 = `data:image/svg+xml;base64,${btoa(String.fromCharCode(...new TextEncoder().encode(xml)))}`;
		const image = new Image();
		image.onload = () => {
			const scale = 3; // high-resolution output
			const canvas = document.createElement("canvas");
			canvas.width = W * scale;
			canvas.height = H * scale;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			ctx.fillStyle = FLOW_BG;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
			const link = document.createElement("a");
			link.download = "pipeline-flow.png";
			link.href = canvas.toDataURL("image/png");
			link.click();
			toast.add({ type: "success", description: t`Exported pipeline-flow.png` });
		};
		image.src = svg64;
	};

	return (
		<div className="rounded-xl border border-line p-5">
			<div className="flex items-start justify-between gap-4">
				<h3 className="text-sm font-semibold">
					<Trans>Where your applications went</Trans>
				</h3>
				<Button size="sm" variant="secondary" onClick={() => void exportPng()}>
					<Icon name="download-simple" size={16} />
					<Trans>Export PNG</Trans>
				</Button>
			</div>

			<svg
				ref={svgRef}
				viewBox={`0 0 ${W} ${H}`}
				className="mt-3 w-full rounded-xl"
				style={{ fontFamily: FLOW_FONT }}
				role="img"
				aria-label={t`Pipeline flow`}
			>
				<defs>
					{bars.slice(0, -1).map((bar, i) => {
						const next = bars[i + 1];
						if (!next) return null;
						return (
							<linearGradient key={`grad-${bar.label}`} id={`flow-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor={bar.color} />
								<stop offset="100%" stopColor={next.color} />
							</linearGradient>
						);
					})}
				</defs>

				<rect x={0} y={0} width={W} height={H} rx={16} fill={FLOW_BG} />

				<text x={padX} y={40} fontSize={17} fontWeight={700} fill="#fafafa">
					{t`Job search pipeline`}
				</text>
				<text x={padX} y={60} fontSize={12} fill="#71717a">
					{t`${insights.total} active applications`}
				</text>
				{insights.closed > 0 && (
					<g>
						<circle cx={W - padX - 96} cy={54} r={4} fill={FLOW_REJECTED} />
						<text x={W - padX - 86} y={58} fontSize={12} fill="#a1a1aa">
							{t`${insights.closed} closed`}
						</text>
					</g>
				)}

				{/* connecting bands — drawn center-to-center so they pass *behind* the bars (rendered
				    next, on top), leaving a single continuous flow with no seam at each stage. */}
				{bars.slice(0, -1).map((bar, i) => {
					const next = bars[i + 1];
					if (!next) return null;
					const x1 = bar.cx;
					const x2 = next.cx;
					const cxa = (x1 + x2) / 2;
					return (
						<path
							key={`band-${bar.label}`}
							d={`M${x1},${bar.yTop} C${cxa},${bar.yTop} ${cxa},${next.yTop} ${x2},${next.yTop} L${x2},${next.yTop + next.h} C${cxa},${next.yTop + next.h} ${cxa},${bar.yTop + bar.h} ${x1},${bar.yTop + bar.h} Z`}
							fill={`url(#flow-grad-${i})`}
							opacity={0.32}
						/>
					);
				})}

				{/* bars + labels */}
				{bars.map((bar, i) => (
					<g key={`bar-${bar.label}`}>
						<rect x={bar.x} y={bar.yTop} width={barW} height={bar.h} rx={6} fill={bar.color} />
						<text x={bar.cx} y={bar.yTop - 10} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fafafa">
							{bar.reached}
						</text>
						<text x={bar.cx} y={H - 42} textAnchor="middle" fontSize={12} fontWeight={500} fill="#e4e4e7">
							{bar.label}
						</text>
						{i > 0 && (
							<text x={bar.cx} y={H - 26} textAnchor="middle" fontSize={11} fill={bar.color}>
								{bar.conv}
							</text>
						)}
					</g>
				))}

				{/* export-only watermark: the NextRole AI mark, bottom-right, 8px from each edge.
				    Shapes are apps/web/public/icon/dark.svg, recoloured for the dark export (#FAFAFA tile). */}
				<g
					data-export-only
					style={{ display: "none" }}
					transform={`translate(${W - 8 - 64 * ICON_SCALE}, ${H - 8 - 64 * ICON_SCALE}) scale(${ICON_SCALE})`}
				>
					<rect width={64} height={64} rx={16} fill="#FAFAFA" />
					<path d="M20 46V18h7.2l10.6 16.3V18H44v28h-7.1L26.2 29.7V46z" fill={FLOW_BG} />
				</g>
			</svg>
		</div>
	);
}
