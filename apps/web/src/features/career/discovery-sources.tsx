import type { RouterOutput } from "@/libs/orpc/client";
import type {
	DiscoveryFilters,
	DiscoverySources,
	Employment,
	FilterReason,
	JobSearchSource,
	Workplace,
} from "@reactive-resume/schema/career";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { JOB_SEARCH_SOURCES } from "@reactive-resume/schema/career";
import { Button } from "@reactive-resume/ui/components/button";
import { Checkbox } from "@reactive-resume/ui/components/checkbox";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { SwitchRow } from "@reactive-resume/ui/components/switch";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { ChipField } from "./knowledge/preferences";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

// ---- Names ----

const NAMES: Record<string, string> = {
	web: "Web search",
	adzuna: "Adzuna",
	reed: "Reed",
	jooble: "Jooble",
	usajobs: "USAJOBS",
	bundesagentur: "Bundesagentur für Arbeit",
	himalayas: "Himalayas",
	jobicy: "Jobicy",
	themuse: "The Muse",
	arbeitnow: "Arbeitnow",
	remoteok: "Remote OK",
	weworkremotely: "We Work Remotely",
	greenhouse: "Greenhouse",
	lever: "Lever",
	ashby: "Ashby",
	smartrecruiters: "SmartRecruiters",
	recruitee: "Recruitee",
	personio: "Personio",
	workable: "Workable",
	workday: "Workday",
};

/** Sources whose terms ask for a visible, followed link back beside their postings. */
const SITES: Partial<Record<string, string>> = {
	adzuna: "https://www.adzuna.com",
	himalayas: "https://himalayas.app",
	jobicy: "https://jobicy.com",
	themuse: "https://www.themuse.com",
	arbeitnow: "https://www.arbeitnow.com",
	remoteok: "https://remoteok.com",
	weworkremotely: "https://weworkremotely.com",
	bundesagentur: "https://www.arbeitsagentur.de/jobsuche",
};

/** "greenhouse:acme" reads "Greenhouse"; "web" reads "Web search". */
export const sourceName = (source: string) => NAMES[source.split(":")[0] ?? source] ?? source;

/** A source with its followed company: "greenhouse:acme" reads "Greenhouse · acme". */
export const sourceLabel = (source: string) => {
	const [kind = source, ...board] = source.split(":");
	return board.length ? `${NAMES[kind] ?? kind} · ${board.join(":")}` : (NAMES[kind] ?? kind);
};

const CONNECTIONS: Record<string, string> = { tavily: "Tavily", exa: "Exa", firecrawl: "Firecrawl" };
/** A web search connection by name; empty for none. */
export const connectionName = (provider: string | null | undefined) => (provider ? (CONNECTIONS[provider] ?? "") : "");

/** How a web role's page was read: by the built-in reader, or by the search connection when that couldn't. */
export const readerName = (readVia: string | null | undefined) =>
	readVia === "builtin" ? t`the built-in reader` : connectionName(readVia);

/**
 * Where a role came from, in words: "Web search · Tavily, read by the built-in reader", or "Greenhouse · acme".
 * Roles found before sources existed only know they came from the web.
 */
export function foundVia(role: {
	source: string;
	board: string | null;
	searchedVia: string | null;
	readVia: string | null;
}) {
	if (role.source !== "web") return sourceLabel(role.board ?? role.source);
	const searched = connectionName(role.searchedVia);
	const reader = readerName(role.readVia);
	const web = searched ? `${NAMES.web} · ${searched}` : (NAMES.web ?? "Web search");
	return reader ? t`${web}, read by ${reader}` : web;
}

/**
 * The sources a run searched, in one line: "Web search · Tavily, Adzuna, Greenhouse · acme". Runs before sources
 * existed list their search connection and the sites results came from.
 */
export function runSources(report: {
	provider: string;
	sources: string[];
	bySource?: { source: string; status: string }[] | undefined;
}) {
	if (!report.bySource?.length)
		return [connectionName(report.provider) || report.provider, ...report.sources].filter(Boolean).join(" · ");
	return report.bySource
		.filter((source) => source.status === "ok")
		.map((source) =>
			source.source === "web" && connectionName(report.provider)
				? `${NAMES.web} · ${connectionName(report.provider)}`
				: sourceLabel(source.source),
		)
		.join(", ");
}

/** What a source did in a run: "12 of 40 kept", or why it didn't run. */
export const sourceOutcome = (source: { status: string; found: number; kept: number; reason: string | null }) =>
	source.status === "ok" ? t`${source.kept} of ${source.found} kept` : failureLabel(source.reason);
export const sourceSite = (source: string) => SITES[source.split(":")[0] ?? source];

/** A source's credit: its name, linked to its site when its terms ask for that. */
export function SourceCredit({ source, className }: { source: string; className?: string }) {
	const site = sourceSite(source);
	const name = sourceName(source);
	if (!site) return <span className={className}>{name}</span>;
	return (
		<a href={site} target="_blank" rel="noopener" className={cn("underline underline-offset-2", className)}>
			{t`via ${name}`}
		</a>
	);
}

const NOTES = (): Record<JobSearchSource, string> => ({
	adzuna: t`About 20 countries, every kind of job. Choose a country below.`,
	reed: t`United Kingdom.`,
	jooble: t`Worldwide.`,
	usajobs: t`US federal government.`,
	bundesagentur: t`Germany's public job exchange.`,
	himalayas: t`Remote roles worldwide.`,
	jobicy: t`Remote roles worldwide.`,
	themuse: t`Mostly US companies, by place.`,
	arbeitnow: t`Europe, mostly Germany.`,
	remoteok: t`Remote roles worldwide.`,
	weworkremotely: t`Remote roles worldwide.`,
});

/** Countries that some sources are bound to. */
const COUNTRY_BOUND: Partial<Record<JobSearchSource, string>> = { reed: "GB", usajobs: "US", bundesagentur: "DE" };

const COUNTRIES = [
	"AE",
	"AT",
	"AU",
	"BE",
	"BR",
	"CA",
	"CH",
	"DE",
	"DK",
	"ES",
	"FI",
	"FR",
	"GB",
	"IE",
	"IN",
	"IT",
	"JP",
	"MX",
	"NL",
	"NO",
	"NZ",
	"PL",
	"PT",
	"SE",
	"SG",
	"US",
	"ZA",
];

function countryName(code: string, locale: string) {
	try {
		return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
}

export const filterReasonLabel = (reason: FilterReason): string =>
	({
		title: t`Title doesn't match`,
		excluded: t`Excluded word`,
		location: t`Other place`,
		workplace: t`Other workplace`,
		posted: t`Too old`,
		employment: t`Other employment type`,
		salary: t`Pays less`,
		company: t`Excluded company`,
	})[reason];

export const failureLabel = (reason: string | null): string =>
	reason === "needs-key"
		? t`needs a key`
		: reason === "country"
			? t`not for this country`
			: reason === "auth"
				? t`key rejected`
				: reason === "quota"
					? t`limit reached`
					: reason === "not-found"
						? t`not found`
						: t`didn't answer`;

// ---- Where to look ----

type SourcesProps = {
	sources: DiscoverySources;
	country: string | null;
	onChange: (sources: DiscoverySources) => void;
};

export function SourcesEditor({ sources, country, onChange }: SourcesProps) {
	const id = useId();
	const { data: webAccess } = useQuery(orpc.webAccess.status.queryOptions());
	const { data: keys } = useQuery(orpc.jobSources.status.queryOptions());
	const notes = NOTES();
	const toggle = (source: JobSearchSource, on: boolean) =>
		onChange({
			...sources,
			apis: on ? [...sources.apis, source] : sources.apis.filter((item) => item !== source),
		});

	return (
		<section aria-labelledby={`${id}-heading`} className="grid gap-3">
			<div>
				<h3 id={`${id}-heading`} className="text-sm font-semibold">
					<Trans>Where to look</Trans>
				</h3>
				<p className="text-xs text-ink-3">
					<Trans>Each source is searched on every run. Most need no setup.</Trans>
				</p>
			</div>

			<SwitchRow
				checked={sources.web}
				onCheckedChange={(web) => onChange({ ...sources, web })}
				label={<span className="font-medium">{NAMES.web}</span>}
				description={
					webAccess?.search
						? t`Searches the whole web through your search connection.`
						: t`Needs a search connection in Settings; skipped until then.`
				}
				className="rounded-none border-y border-line py-3"
			/>

			<ul className="grid gap-1" aria-label={t`Job sources`}>
				{JOB_SEARCH_SOURCES.map((source) => {
					const key = keys?.find((item) => item.source === source);
					const needsKey = key && !key.optional && !key.managed && !key.saved;
					const bound = COUNTRY_BOUND[source];
					const wrongCountry = bound !== undefined && country !== bound;
					const adzunaWithoutCountry = source === "adzuna" && !country;
					const checkboxId = `${id}-${source}`;
					return (
						<li key={source} className="flex items-start gap-2.5 py-1.5">
							<Checkbox
								id={checkboxId}
								checked={sources.apis.includes(source)}
								onCheckedChange={(checked) => toggle(source, checked === true)}
								className="mt-0.5"
							/>
							<label htmlFor={checkboxId} className="grid flex-1 gap-0.5">
								<span className="text-[13px] font-medium">{NAMES[source]}</span>
								<span className="text-xs text-ink-3">
									{notes[source]}
									{needsKey && (
										<>
											{" "}
											<Link to="/dashboard/settings/ai" className="text-accent-text underline underline-offset-2">
												<Trans>Add its free key in Settings.</Trans>
											</Link>
										</>
									)}
									{(wrongCountry || adzunaWithoutCountry) && sources.apis.includes(source) && (
										<span className="block text-warn-text">
											{adzunaWithoutCountry
												? t`Runs once you choose a country below.`
												: t`Runs only when the country below is ${countryName(bound ?? "", "en")}.`}
										</span>
									)}
								</span>
							</label>
						</li>
					);
				})}
			</ul>

			<Companies sources={sources} onChange={onChange} />

			<SwitchRow
				checked={sources.followFromSearch}
				onCheckedChange={(followFromSearch) => onChange({ ...sources, followFromSearch })}
				label={<span className="font-medium">{t`Follow companies web search finds`}</span>}
				description={t`When web search turns up a role on a company job board, every role that company posts is found from then on.`}
				className="rounded-none border-t border-line py-3"
			/>
		</section>
	);
}

function Companies({ sources, onChange }: Omit<SourcesProps, "country">) {
	const id = useId();
	const [url, setUrl] = useState("");
	const resolve = useMutation(orpc.jobSources.resolveCompany.mutationOptions());
	const add = () => {
		const value = url.trim();
		if (!value) return;
		resolve.mutate(
			{ url: /^https?:\/\//i.test(value) ? value : `https://${value}` },
			{
				onSuccess: (company) => {
					setUrl("");
					if (sources.companies.some((item) => item.kind === company.kind && item.slug === company.slug)) return;
					onChange({
						...sources,
						companies: [...sources.companies, { kind: company.kind, slug: company.slug, name: company.name }],
					});
					toast.add({ description: t`Following ${company.name}: ${company.openRoles} open roles` });
				},
				onError: (error) =>
					toast.add({
						type: "error",
						description: getOrpcErrorMessage(error, {
							fallback: t`That address isn't a company job board we can read.`,
							allowServerMessage: true,
						}),
					}),
			},
		);
	};

	return (
		<div className="grid gap-1.5">
			<label htmlFor={id} className="text-xs font-medium text-ink-2">
				<Trans>Companies you follow</Trans>
			</label>
			{sources.companies.length > 0 && (
				<ul className="flex flex-wrap gap-[5px]">
					{sources.companies.map((company) => (
						<li
							key={`${company.kind}:${company.slug}`}
							className="flex h-7 items-center gap-1 rounded-sm bg-sunken ps-2.5 pe-1 text-[13px] font-medium"
						>
							{company.name || company.slug}
							<span className="text-xs font-normal text-ink-3">{NAMES[company.kind]}</span>
							<button
								type="button"
								aria-label={t`Stop following ${company.name || company.slug}`}
								onClick={() =>
									onChange({
										...sources,
										companies: sources.companies.filter(
											(item) => !(item.kind === company.kind && item.slug === company.slug),
										),
									})
								}
								className="touch-target relative flex size-[22px] items-center justify-center rounded-[5px] text-ink-3 transition-colors duration-quick hover:bg-hover hover:text-ink"
							>
								<Icon name="x" size={16} />
							</button>
						</li>
					))}
				</ul>
			)}
			<div className="flex gap-2">
				<Input
					id={id}
					value={url}
					inputMode="url"
					placeholder={t`Paste a careers page or job link`}
					onChange={(event) => setUrl(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.nativeEvent.isComposing) {
							event.preventDefault();
							add();
						}
					}}
					className="pointer-coarse:text-base"
				/>
				<Button variant="secondary" loading={resolve.isPending} disabled={!url.trim()} onClick={add}>
					<Trans>Follow</Trans>
				</Button>
			</div>
			<p className="text-xs text-ink-3">
				<Trans>
					Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, Workable and Workday boards list every open
					role, so nothing a followed company posts is missed.
				</Trans>
			</p>
		</div>
	);
}

// ---- What to keep ----

const WORKPLACES = (): { value: Workplace; label: string }[] => [
	{ value: "remote", label: t`Remote` },
	{ value: "hybrid", label: t`Hybrid` },
	{ value: "onsite", label: t`On-site` },
];
const EMPLOYMENT = (): { value: Employment; label: string }[] => [
	{ value: "full-time", label: t`Full-time` },
	{ value: "part-time", label: t`Part-time` },
	{ value: "contract", label: t`Contract` },
	{ value: "temporary", label: t`Temporary` },
	{ value: "internship", label: t`Internship` },
];

type FiltersProps = { filters: DiscoveryFilters; locale: string; onChange: (filters: DiscoveryFilters) => void };

export function FiltersEditor({ filters, locale, onChange }: FiltersProps) {
	const id = useId();
	const set = (patch: Partial<DiscoveryFilters>) => onChange({ ...filters, ...patch });
	const toggle = <T extends string>(list: T[], value: T) =>
		list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

	return (
		<section aria-labelledby={`${id}-heading`} className="grid gap-4">
			<div>
				<h3 id={`${id}-heading`} className="text-sm font-semibold">
					<Trans>What to keep</Trans>
				</h3>
				<p className="text-xs text-ink-3">
					<Trans>Every source's postings pass these. A posting that doesn't say (no salary, no place) is kept.</Trans>
				</p>
			</div>
			<ChipField
				label={t`Job titles`}
				placeholder={t`Add a title, then Enter`}
				hint={t`A title must match one. Empty uses what you look for.`}
				value={filters.titles}
				max={30}
				onChange={(titles) => set({ titles })}
			/>
			<ChipField
				label={t`Leave out titles with`}
				placeholder={t`Such as intern or principal`}
				value={filters.exclude}
				max={50}
				onChange={(exclude) => set({ exclude })}
			/>
			<ChipField
				label={t`Places`}
				placeholder={t`Add a city or region, then Enter`}
				hint={t`Empty is anywhere. Remote roles open worldwide are kept.`}
				value={filters.locations}
				onChange={(locations) => set({ locations })}
			/>
			<div className="grid grid-cols-2 gap-3">
				<div className="grid gap-1.5">
					<label htmlFor={`${id}-country`} className="text-xs font-medium text-ink-2">
						<Trans>Country</Trans>
					</label>
					<NativeSelect
						id={`${id}-country`}
						value={filters.country ?? ""}
						onChange={(event) => set({ country: event.target.value || null })}
						className="pointer-coarse:text-base"
					>
						<option value="">{t`Any country`}</option>
						{COUNTRIES.map((code) => ({ code, name: countryName(code, locale) }))
							.sort((a, b) => a.name.localeCompare(b.name, locale))
							.map(({ code, name }) => (
								<option key={code} value={code}>
									{name}
								</option>
							))}
					</NativeSelect>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={`${id}-radius`} className="text-xs font-medium text-ink-2">
						<Trans>Within</Trans>
					</label>
					<NativeSelect
						id={`${id}-radius`}
						value={filters.radiusKm === null ? "" : String(filters.radiusKm)}
						onChange={(event) => set({ radiusKm: event.target.value ? Number(event.target.value) : null })}
						className="pointer-coarse:text-base"
					>
						<option value="">{t`Any distance`}</option>
						{[10, 25, 50, 100].map((km) => (
							<option key={km} value={km}>
								{t`${km} km`}
							</option>
						))}
					</NativeSelect>
				</div>
			</div>
			<Toggles
				label={t`Workplace`}
				options={WORKPLACES()}
				value={filters.workplace}
				onToggle={(value) => set({ workplace: toggle(filters.workplace, value) })}
			/>
			<Toggles
				label={t`Employment`}
				options={EMPLOYMENT()}
				value={filters.employment}
				onToggle={(value) => set({ employment: toggle(filters.employment, value) })}
			/>
			<div className="grid gap-1.5">
				<label htmlFor={`${id}-posted`} className="text-xs font-medium text-ink-2">
					<Trans>Posted within</Trans>
				</label>
				<NativeSelect
					id={`${id}-posted`}
					value={filters.postedWithinDays === null ? "" : String(filters.postedWithinDays)}
					onChange={(event) => set({ postedWithinDays: event.target.value ? Number(event.target.value) : null })}
					className="pointer-coarse:text-base"
				>
					<option value="">{t`Any time`}</option>
					{[1, 3, 7, 14, 30].map((days) => (
						<option key={days} value={days}>
							{days === 1 ? t`The last day` : t`The last ${days} days`}
						</option>
					))}
				</NativeSelect>
			</div>
			<div className="grid gap-1.5">
				<label htmlFor={`${id}-salary`} className="text-xs font-medium text-ink-2">
					<Trans>Minimum salary</Trans>
				</label>
				<div className="grid grid-cols-[1fr_88px_110px] gap-2">
					<Input
						id={`${id}-salary`}
						type="number"
						min={0}
						inputMode="numeric"
						placeholder={t`Any`}
						value={filters.minSalary?.amount ?? ""}
						onChange={(event) => {
							const amount = event.target.value === "" ? null : Math.max(0, Number(event.target.value));
							set({
								minSalary:
									amount === null || Number.isNaN(amount)
										? null
										: { currency: "USD", period: "year", ...filters.minSalary, amount },
							});
						}}
						className="pointer-coarse:text-base"
					/>
					<Input
						aria-label={t`Currency`}
						maxLength={3}
						value={filters.minSalary?.currency ?? "USD"}
						disabled={!filters.minSalary}
						onChange={(event) => {
							const currency = event.target.value.toUpperCase().replace(/[^A-Z]/g, "");
							if (filters.minSalary && currency.length === 3) set({ minSalary: { ...filters.minSalary, currency } });
						}}
						className="pointer-coarse:text-base"
					/>
					<NativeSelect
						aria-label={t`Per`}
						value={filters.minSalary?.period ?? "year"}
						disabled={!filters.minSalary}
						onChange={(event) =>
							filters.minSalary &&
							set({
								minSalary: { ...filters.minSalary, period: event.target.value as "hour" | "month" | "year" },
							})
						}
						className="pointer-coarse:text-base"
					>
						<option value="year">{t`a year`}</option>
						<option value="month">{t`a month`}</option>
						<option value="hour">{t`an hour`}</option>
					</NativeSelect>
				</div>
				<SwitchRow
					checked={filters.hideUnknownSalary}
					disabled={!filters.minSalary}
					onCheckedChange={(hideUnknownSalary) => set({ hideUnknownSalary })}
					label={t`Leave out postings that don't say`}
				/>
			</div>
			<ChipField
				label={t`Leave out companies`}
				placeholder={t`Add a company, then Enter`}
				value={filters.excludeCompanies}
				max={100}
				onChange={(excludeCompanies) => set({ excludeCompanies })}
			/>
		</section>
	);
}

function Toggles<T extends string>({
	label,
	options,
	value,
	onToggle,
}: {
	label: string;
	options: { value: T; label: string }[];
	value: T[];
	onToggle: (value: T) => void;
}) {
	const id = useId();
	return (
		<div className="grid gap-1.5">
			<span id={id} className="text-xs font-medium text-ink-2">
				{label}
			</span>
			<div role="group" aria-labelledby={id} className="flex flex-wrap gap-1.5">
				{options.map((option) => {
					const on = value.includes(option.value);
					return (
						<button
							key={option.value}
							type="button"
							aria-pressed={on}
							onClick={() => onToggle(option.value)}
							className={cn(
								"h-8 rounded-full border px-3 text-[13px] transition-colors duration-quick",
								on
									? "border-accent bg-accent-soft font-medium text-accent-text"
									: "border-line-2 text-ink-2 hover:bg-hover",
							)}
						>
							{option.label}
						</button>
					);
				})}
			</div>
			{value.length === 0 && (
				<p className="text-xs text-ink-3">
					<Trans>None chosen keeps them all.</Trans>
				</p>
			)}
		</div>
	);
}

// ---- Try it ----

type SearchResult = RouterOutput["jobSources"]["search"];

export function SearchPreview({
	query,
	sources,
	filters,
}: {
	query: string;
	sources: DiscoverySources;
	filters: DiscoveryFilters;
}) {
	const search = useMutation(orpc.jobSources.search.mutationOptions());
	const [showFiltered, setShowFiltered] = useState(false);
	const result: SearchResult | undefined = search.data;
	const kept = result?.results.filter((item) => !item.filteredBy) ?? [];
	const filtered = result?.results.filter((item) => item.filteredBy) ?? [];

	return (
		<section className="grid gap-2.5 rounded-lg border border-line p-3">
			<div className="flex items-center gap-3">
				<p className="flex-1 text-xs text-ink-3">
					<Trans>Runs this search once with these filters. Nothing is saved.</Trans>
				</p>
				<Button
					variant="secondary"
					size="sm"
					loading={search.isPending}
					onClick={() => search.mutate({ query: query.trim(), sources, filters })}
				>
					<Trans>Preview results</Trans>
				</Button>
			</div>
			{search.error && (
				<p className="text-xs text-danger-text">
					{getOrpcErrorMessage(search.error, { fallback: t`The search could not run.`, allowServerMessage: true })}
				</p>
			)}
			{result && (
				<>
					<p role="status" className="text-[13px] font-medium">
						{t`${kept.length} kept · ${filtered.length} filtered out`}
					</p>
					<ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
						{result.bySource.map((source) => (
							<li key={source.source} className={cn(source.status === "failed" && "text-warn-text")}>
								{source.source.includes(":") ? source.source.split(":").slice(1).join(":") : sourceName(source.source)}
								{": "}
								{source.status === "ok" ? t`${source.kept} of ${source.found}` : failureLabel(source.reason)}
							</li>
						))}
					</ul>
					<ResultList items={kept.slice(0, 40)} />
					{filtered.length > 0 && (
						<>
							<button
								type="button"
								aria-expanded={showFiltered}
								onClick={() => setShowFiltered((open) => !open)}
								className="w-fit text-xs text-accent-text underline underline-offset-2"
							>
								{showFiltered ? t`Hide filtered out` : t`Show filtered out (${filtered.length})`}
							</button>
							{showFiltered && <ResultList items={filtered.slice(0, 40)} />}
						</>
					)}
				</>
			)}
		</section>
	);
}

function ResultList({ items }: { items: SearchResult["results"] }) {
	if (!items.length) return null;
	return (
		<ul className="grid divide-y divide-line">
			{items.map((item) => (
				<li key={item.url} className="grid gap-0.5 py-2">
					<a
						href={item.url}
						target="_blank"
						rel="noopener"
						className="text-[13px] font-medium underline-offset-2 hover:underline"
					>
						{item.title}
					</a>
					<span className="text-xs text-ink-3">
						{[item.company, item.location].filter(Boolean).join(" · ")}
						{" · "}
						<SourceCredit source={item.source} />
						{item.known && ` · ${t`already saved`}`}
						{item.filteredBy && <span className="text-warn-text">{` · ${filterReasonLabel(item.filteredBy)}`}</span>}
					</span>
				</li>
			))}
		</ul>
	);
}
