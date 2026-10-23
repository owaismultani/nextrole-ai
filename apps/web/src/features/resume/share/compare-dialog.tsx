import type { VersionSummary } from "./format";
import type { SidebarSection } from "@/libs/resume/section";
import type { FieldChange, LetterSnapshot, SectionChange, TextPart } from "@reactive-resume/resume/diff";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { plural, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { diffLetters, diffResumes } from "@reactive-resume/resume/diff";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { IconButton } from "@reactive-resume/ui/components/icon-button";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { formatVersionTime, getVersionTitle } from "./format";
import { getSectionTitle } from "@/libs/resume/section";

/** The side of a comparison that is the document as it is now. */
export const NOW = "now";
/** The side for the baseline a tailored resume was made from. */
export const BASELINE = "baseline";

/** Something to compare against besides History's versions, such as the baseline a tailored resume came from. */
export type CompareSide = { id: string; label: string };

/** How History reads a document at a version, or now, for Compare. */
export type CompareSource =
	| { kind: "resume"; documentId: string; extras: CompareSide[]; load: (side: string) => Promise<ResumeData> }
	| { kind: "letter"; documentId: string; extras: CompareSide[]; load: (side: string) => Promise<LetterSnapshot> };

type Version = Pick<VersionSummary, "id" | "kind" | "name" | "createdAt">;

type Props = {
	source: CompareSource;
	versions: Version[];
	/** The older side and the newer side to start from. */
	from: string;
	to: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/** Two versions of a resume or letter side by side in one list: what was added, removed and reworded. */
export function CompareDialog({ source, versions, from: initialFrom, to: initialTo, open, onOpenChange }: Props) {
	const { i18n } = useLingui();
	const [from, setFrom] = useState(initialFrom);
	const [to, setTo] = useState(initialTo);

	const options = [
		{ id: NOW, label: t`Now` },
		...source.extras,
		...versions.map((version) => ({
			id: version.id,
			label: `${getVersionTitle(version)} · ${formatVersionTime(version.createdAt, i18n.locale)}`,
		})),
	];

	const side = (id: string) => ({
		queryKey: ["history-compare", source.kind, source.documentId, id],
		queryFn: () => source.load(id) as Promise<unknown>,
		// "Now" changes while the editor is open; versions never do.
		staleTime: id === NOW ? 0 : Number.POSITIVE_INFINITY,
		enabled: open,
	});
	const older = useQuery(side(from));
	const newer = useQuery(side(to));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>
						<Trans>Compare versions</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>Removed text is struck through in red; added text is green.</Trans>
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
					<SidePicker label={t`From`} value={from} options={options} onChange={setFrom} />
					<IconButton
						icon="arrows-left-right"
						label={t`Swap`}
						variant="ghost"
						onClick={() => {
							setFrom(to);
							setTo(from);
						}}
					/>
					<SidePicker label={t`To`} value={to} options={options} onChange={setTo} />
				</div>

				{from === to ? (
					<p className="text-ink-2">
						<Trans>Pick two different versions to compare.</Trans>
					</p>
				) : older.isError || newer.isError ? (
					<p className="text-danger-text">
						<Trans>Couldn't load one of the versions. Try again.</Trans>
					</p>
				) : !older.data || !newer.data ? (
					<div className="flex justify-center py-8">
						<Spinner />
					</div>
				) : source.kind === "resume" ? (
					<ResumeComparison before={older.data as ResumeData} after={newer.data as ResumeData} />
				) : (
					<LetterComparison before={older.data as LetterSnapshot} after={newer.data as LetterSnapshot} />
				)}
			</DialogContent>
		</Dialog>
	);
}

function SidePicker({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: CompareSide[];
	onChange: (value: string) => void;
}) {
	return (
		<label className="grid min-w-0 gap-1 text-xs font-medium text-ink-2">
			{label}
			<NativeSelect value={value} onChange={(event) => onChange(event.target.value)}>
				{options.map((option) => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</NativeSelect>
		</label>
	);
}

// ---- Resumes ----

function ResumeComparison({ before, after }: { before: ResumeData; after: ResumeData }) {
	const diff = useMemo(() => diffResumes(before, after), [before, after]);
	if (!diff.total) return <NoDifferences />;
	return (
		<div className="grid gap-5">
			<Overview total={diff.total} design={diff.design} />
			{diff.basics.length > 0 && (
				<Group title={t`Personal details`}>
					<Fields changes={diff.basics} />
				</Group>
			)}
			{diff.summary.length > 0 && (
				<Group title={t`Summary`}>
					<Fields changes={diff.summary} />
				</Group>
			)}
			{diff.sections.map((section) => (
				<SectionComparison key={section.id} section={section} />
			))}
		</div>
	);
}

function SectionComparison({ section }: { section: SectionChange }) {
	const title = section.title || (section.custom ? t`Untitled section` : getSectionTitle(section.id as SidebarSection));
	return (
		<Group title={title} status={section.status === "changed" ? undefined : section.status}>
			{section.reordered && (
				<p className="text-xs text-ink-2">
					<Trans>Entries are in a different order.</Trans>
				</p>
			)}
			<Fields changes={section.fields} />
			{section.items.map((item) => (
				<div key={item.id} className="grid gap-1.5 rounded-lg border border-line p-3">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium">{item.title || t`Untitled entry`}</span>
						{item.status !== "changed" && <StatusPill status={item.status} />}
					</div>
					<Fields changes={item.fields} whole={item.status === "changed" ? undefined : item.status} />
				</div>
			))}
		</Group>
	);
}

// ---- Letters ----

function LetterComparison({ before, after }: { before: LetterSnapshot; after: LetterSnapshot }) {
	const diff = useMemo(() => diffLetters(before, after), [before, after]);
	if (!diff.total) return <NoDifferences />;
	return (
		<div className="grid gap-5">
			<Overview total={diff.total} design={diff.design} />
			{diff.fields.length > 0 && (
				<Group title={t`Details`}>
					<Fields changes={diff.fields} />
				</Group>
			)}
			{diff.bodyChanged && (
				<Group title={t`Body`}>
					<p className="text-xs text-ink-2">
						<Trans>
							{diff.words.before} → {diff.words.after} words
						</Trans>
					</p>
					<Parts parts={diff.body} />
				</Group>
			)}
		</div>
	);
}

// ---- Pieces ----

function Overview({ total, design }: { total: number; design: boolean }) {
	return (
		<p className="rounded-lg bg-sunken px-3 py-2 text-[13px]">
			{plural(total, { one: "# change", other: "# changes" })}
			{design && (
				<>
					{" · "}
					<Trans>includes design changes (template, fonts, colours or layout), not listed here</Trans>
				</>
			)}
		</p>
	);
}

function NoDifferences() {
	return (
		<p className="text-ink-2">
			<Trans>No differences. These two versions read the same.</Trans>
		</p>
	);
}

function Group({
	title,
	status,
	children,
}: {
	title: string;
	status?: "added" | "removed" | undefined;
	children: React.ReactNode;
}) {
	return (
		<section className="grid gap-2">
			<h3 className="flex items-center gap-2 text-[13px] font-semibold">
				{title}
				{status && <StatusPill status={status} />}
			</h3>
			{children}
		</section>
	);
}

function StatusPill({ status }: { status: "added" | "removed" }) {
	return (
		<span
			className={cn(
				"rounded-full px-2 py-0.5 text-[11px] font-medium",
				status === "added" ? "bg-ok-soft text-ok-text" : "bg-danger-soft text-danger-text",
			)}
		>
			{status === "added" ? t`Added` : t`Removed`}
		</span>
	);
}

/** Changed fields, each with its words marked; for a whole added or removed entry, its text in one colour. */
function Fields({ changes, whole }: { changes: FieldChange[]; whole?: "added" | "removed" | undefined }) {
	if (!changes.length) return null;
	return (
		<dl className="grid gap-1.5">
			{changes.map((change) => (
				<div key={change.key} className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-3">
					<dt className="text-xs text-ink-3">{fieldLabel(change.key)}</dt>
					<dd>
						{whole ? (
							<Parts parts={[{ value: whole === "added" ? change.after : change.before, change: "same" }]} />
						) : (
							<Parts parts={change.parts} />
						)}
					</dd>
				</div>
			))}
		</dl>
	);
}

function Parts({ parts }: { parts: TextPart[] }) {
	return (
		<p className="text-[13px] leading-5 wrap-break-word whitespace-pre-wrap">
			{parts.map((part, index) =>
				part.change === "added" ? (
					<ins key={index} className="rounded-sm bg-ok-soft text-ok-text no-underline">
						{part.value}
					</ins>
				) : part.change === "removed" ? (
					<del key={index} className="rounded-sm bg-danger-soft text-danger-text">
						{part.value}
					</del>
				) : (
					<span key={index}>{part.value}</span>
				),
			)}
		</p>
	);
}

/** A field's name in the app's words; unknown keys read as words ("recipientCompany" → "Recipient company"). */
function fieldLabel(key: string) {
	const labels: Record<string, string> = {
		name: t`Name`,
		headline: t`Headline`,
		email: t`Email`,
		phone: t`Phone`,
		location: t`Location`,
		"website.url": t`Website`,
		"website.label": t`Website label`,
		customFields: t`Other details`,
		content: t`Text`,
		description: t`Description`,
		title: t`Title`,
		hidden: t`Hidden`,
		position: t`Position`,
		company: t`Company`,
		period: t`Dates`,
		school: t`School`,
		degree: t`Degree`,
		area: t`Field of study`,
		grade: t`Grade`,
		keywords: t`Keywords`,
		level: t`Level`,
		proficiency: t`Proficiency`,
		recipient: t`Recipient`,
		recipientName: t`Recipient name`,
		recipientCompany: t`Company`,
		greeting: t`Greeting`,
		signOff: t`Sign-off`,
		letterDate: t`Date`,
	};
	if (labels[key]) return labels[key];
	const words = (key.split(".").at(-1) ?? key).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
}
