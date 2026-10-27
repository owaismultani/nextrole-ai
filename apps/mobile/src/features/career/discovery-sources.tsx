import type { RouterOutput } from "@/api/client";
import type {
	DiscoveryFilters,
	DiscoverySources,
	Employment,
	FilterReason,
	JobSearchSource,
	Workplace,
} from "@reactive-resume/schema/career";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { JOB_SEARCH_SOURCES } from "@reactive-resume/schema/career";
import { SwitchRow } from "./shared";
import { client, orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { Banner, Button, Chip, ChipInput, SelectSheet, Text, TextField, showToast, useTheme } from "@/ui";

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

/** Where a role came from: "Web search · Tavily, read by the built-in reader", or "Greenhouse · acme". */
export function foundVia(role: {
	source: string;
	board: string | null;
	searchedVia: string | null;
	readVia: string | null;
}) {
	if (role.source !== "web") return sourceLabel(role.board ?? role.source);
	const searched = connectionName(role.searchedVia);
	const reader = role.readVia === "builtin" ? t`the built-in reader` : connectionName(role.readVia);
	const web = searched ? `${NAMES.web} · ${searched}` : (NAMES.web ?? "Web search");
	return reader ? t`${web}, read by ${reader}` : web;
}

const failureLabel = (reason: string | null): string =>
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

/** What a source did in a run: "12 of 40 kept", or why it didn't run. */
export const sourceOutcome = (source: { status: string; found: number; kept: number; reason: string | null }) =>
	source.status === "ok" ? t`${source.kept} of ${source.found} kept` : failureLabel(source.reason);

/** The sources a run searched, in one line; runs before sources existed list their connection and sites. */
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

/** Sources whose terms ask for a credit beside their postings, read "via Remote OK". */
const CREDITED = new Set([
	"adzuna",
	"himalayas",
	"jobicy",
	"themuse",
	"arbeitnow",
	"remoteok",
	"weworkremotely",
	"bundesagentur",
]);
export const sourceCredit = (source: string) => {
	const kind = source.split(":")[0] ?? source;
	return CREDITED.has(kind) ? t`via ${sourceName(kind)}` : sourceName(kind);
};

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

const filterReasonLabel = (reason: FilterReason): string =>
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

// ---- Where to look ----

export function SourcesEditor({
	sources,
	country,
	onChange,
}: {
	sources: DiscoverySources;
	country: string | null;
	onChange: (sources: DiscoverySources) => void;
}) {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const keys = useQuery({
		...orpc.jobSources.status.queryOptions(),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.jobSources.status.key(), session.server],
	});
	const [url, setUrl] = useState("");
	const [following, setFollowing] = useState(false);
	const follow = async () => {
		const value = url.trim();
		if (!value || following) return;
		setFollowing(true);
		try {
			const company = await client.jobSources.resolveCompany({
				url: /^https?:\/\//i.test(value) ? value : `https://${value}`,
			});
			setUrl("");
			if (!sources.companies.some((item) => item.kind === company.kind && item.slug === company.slug))
				onChange({
					...sources,
					companies: [...sources.companies, { kind: company.kind, slug: company.slug, name: company.name }],
				});
			showToast({ message: t`Following ${company.name}: ${company.openRoles} open roles` });
		} catch {
			showToast({ message: t`That address isn't a company job board we can read.` });
		} finally {
			setFollowing(false);
		}
	};

	return (
		<View style={{ gap: space.s3 }}>
			<Text variant="title">{t`Where to look`}</Text>
			<Text color="ink3">{t`Each source is searched on every run. Most need no setup.`}</Text>
			<SwitchRow
				label={NAMES.web ?? "Web search"}
				value={sources.web}
				onValueChange={(web) => onChange({ ...sources, web })}
			/>
			{JOB_SEARCH_SOURCES.map((source) => {
				const key = keys.data?.find((item) => item.source === source);
				const needsKey = key && !key.optional && !key.managed && !key.saved;
				const bound = COUNTRY_BOUND[source];
				const on = sources.apis.includes(source);
				return (
					<View key={source}>
						<SwitchRow
							label={NAMES[source] ?? source}
							value={on}
							onValueChange={(next) =>
								onChange({
									...sources,
									apis: next ? [...sources.apis, source] : sources.apis.filter((item) => item !== source),
								})
							}
						/>
						{on && needsKey ? <Text color="ink3">{t`Add its free key in Settings → AI & developer.`}</Text> : null}
						{on && ((bound && country !== bound) || (source === "adzuna" && !country)) ? (
							<Text color="ink3">
								{source === "adzuna"
									? t`Runs once you choose a country.`
									: t`Runs only when the country is ${countryName(bound ?? "", "en")}.`}
							</Text>
						) : null}
					</View>
				);
			})}
			<Text variant="label">{t`Companies you follow`}</Text>
			{sources.companies.length ? (
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
					{sources.companies.map((company) => (
						<Chip
							key={`${company.kind}:${company.slug}`}
							label={`${company.name || company.slug} · ${NAMES[company.kind] ?? company.kind}`}
							onRemove={() =>
								onChange({
									...sources,
									companies: sources.companies.filter(
										(item) => !(item.kind === company.kind && item.slug === company.slug),
									),
								})
							}
						/>
					))}
				</View>
			) : null}
			<TextField
				label={t`Careers page or job link`}
				value={url}
				onChangeText={setUrl}
				keyboardType="url"
				autoCapitalize="none"
				autoCorrect={false}
				onSubmitEditing={() => void follow()}
				helper={t`Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, Workable and Workday boards list every open role.`}
			/>
			<Button
				variant="secondary"
				label={t`Follow`}
				loading={following}
				disabled={!url.trim()}
				onPress={() => void follow()}
			/>
			<SwitchRow
				label={t`Follow companies web search finds`}
				value={sources.followFromSearch}
				onValueChange={(followFromSearch) => onChange({ ...sources, followFromSearch })}
			/>
		</View>
	);
}

// ---- What to keep ----

export function FiltersEditor({
	filters,
	locale,
	onChange,
}: {
	filters: DiscoveryFilters;
	locale: string;
	onChange: (filters: DiscoveryFilters) => void;
}) {
	const { t } = useLingui();
	const { space } = useTheme();
	const set = (patch: Partial<DiscoveryFilters>) => onChange({ ...filters, ...patch });
	const toggle = <T extends string>(list: T[], value: T) =>
		list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
	const workplaces: { value: Workplace; label: string }[] = [
		{ value: "remote", label: t`Remote` },
		{ value: "hybrid", label: t`Hybrid` },
		{ value: "onsite", label: t`On-site` },
	];
	const employment: { value: Employment; label: string }[] = [
		{ value: "full-time", label: t`Full-time` },
		{ value: "part-time", label: t`Part-time` },
		{ value: "contract", label: t`Contract` },
		{ value: "temporary", label: t`Temporary` },
		{ value: "internship", label: t`Internship` },
	];

	return (
		<View style={{ gap: space.s3 }}>
			<Text variant="title">{t`What to keep`}</Text>
			<Text color="ink3">{t`Every source's postings pass these. A posting that doesn't say (no salary, no place) is kept.`}</Text>
			<ChipInput
				label={t`Job titles`}
				values={filters.titles}
				onChange={(titles) => set({ titles: titles.slice(0, 30) })}
				helper={t`A title must match one. Empty uses what you look for.`}
			/>
			<ChipInput
				label={t`Leave out titles with`}
				values={filters.exclude}
				onChange={(exclude) => set({ exclude: exclude.slice(0, 50) })}
			/>
			<ChipInput
				label={t`Places`}
				values={filters.locations}
				onChange={(locations) => set({ locations: locations.slice(0, 20) })}
				helper={t`Empty is anywhere. Remote roles open worldwide are kept.`}
			/>
			<SelectSheet
				label={t`Country`}
				value={filters.country ?? ""}
				onChange={(country) => set({ country: country || null })}
				options={[
					{ value: "", label: t`Any country` },
					...COUNTRIES.map((code) => ({ value: code, label: countryName(code, locale) })).sort((a, b) =>
						a.label.localeCompare(b.label, locale),
					),
				]}
			/>
			<SelectSheet
				label={t`Within`}
				value={filters.radiusKm === null ? "" : String(filters.radiusKm)}
				onChange={(radius) => set({ radiusKm: radius ? Number(radius) : null })}
				options={[
					{ value: "", label: t`Any distance` },
					...[10, 25, 50, 100].map((km) => ({ value: String(km), label: t`${km} km` })),
				]}
			/>
			<Text variant="label">{t`Workplace`}</Text>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
				{workplaces.map((option) => (
					<Chip
						key={option.value}
						label={option.label}
						selected={filters.workplace.includes(option.value)}
						onPress={() => set({ workplace: toggle(filters.workplace, option.value) })}
					/>
				))}
			</View>
			<Text variant="label">{t`Employment`}</Text>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
				{employment.map((option) => (
					<Chip
						key={option.value}
						label={option.label}
						selected={filters.employment.includes(option.value)}
						onPress={() => set({ employment: toggle(filters.employment, option.value) })}
					/>
				))}
			</View>
			<SelectSheet
				label={t`Posted within`}
				value={filters.postedWithinDays === null ? "" : String(filters.postedWithinDays)}
				onChange={(days) => set({ postedWithinDays: days ? Number(days) : null })}
				options={[
					{ value: "", label: t`Any time` },
					...[1, 3, 7, 14, 30].map((days) => ({
						value: String(days),
						label: days === 1 ? t`The last day` : t`The last ${days} days`,
					})),
				]}
			/>
			<TextField
				label={t`Minimum salary`}
				value={filters.minSalary ? String(filters.minSalary.amount) : ""}
				keyboardType="number-pad"
				placeholder={t`Any`}
				onChangeText={(text) => {
					const amount = Number(text.replace(/[^\d]/g, ""));
					set({
						minSalary:
							text.trim() && Number.isFinite(amount)
								? { currency: "USD", period: "year", ...filters.minSalary, amount }
								: null,
					});
				}}
			/>
			{filters.minSalary ? (
				<>
					<TextField
						label={t`Currency`}
						value={filters.minSalary.currency}
						maxLength={3}
						autoCapitalize="characters"
						onChangeText={(text) => {
							const currency = text.toUpperCase().replace(/[^A-Z]/g, "");
							if (filters.minSalary && currency.length === 3) set({ minSalary: { ...filters.minSalary, currency } });
						}}
					/>
					<SelectSheet
						label={t`Per`}
						value={filters.minSalary.period}
						onChange={(period) => filters.minSalary && set({ minSalary: { ...filters.minSalary, period } })}
						options={[
							{ value: "year", label: t`a year` },
							{ value: "month", label: t`a month` },
							{ value: "hour", label: t`an hour` },
						]}
					/>
					<SwitchRow
						label={t`Leave out postings that don't say`}
						value={filters.hideUnknownSalary}
						onValueChange={(hideUnknownSalary) => set({ hideUnknownSalary })}
					/>
				</>
			) : null}
			<ChipInput
				label={t`Leave out companies`}
				values={filters.excludeCompanies}
				onChange={(excludeCompanies) => set({ excludeCompanies: excludeCompanies.slice(0, 100) })}
			/>
		</View>
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
	const { t } = useLingui();
	const { space } = useTheme();
	const [result, setResult] = useState<SearchResult>();
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);
	const run = async () => {
		setPending(true);
		setFailed(false);
		try {
			setResult(await client.jobSources.search({ query: query.trim(), sources, filters }));
		} catch {
			setFailed(true);
		} finally {
			setPending(false);
		}
	};
	const kept = result?.results.filter((item) => !item.filteredBy) ?? [];
	const filtered = result?.results.filter((item) => item.filteredBy) ?? [];

	return (
		<View style={{ gap: space.s2 }}>
			<Button variant="secondary" label={t`Preview results`} loading={pending} onPress={() => void run()} />
			<Text color="ink3">{t`Runs this search once with these filters. Nothing is saved.`}</Text>
			{failed ? <Banner tone="warn" message={t`The search could not run.`} /> : null}
			{result ? (
				<>
					<Text>{t`${kept.length} kept · ${filtered.length} filtered out`}</Text>
					{[...kept.slice(0, 20), ...filtered.slice(0, 10)].map((item) => (
						<Pressable
							key={item.url}
							accessibilityRole="link"
							onPress={() => void openBrowserAsync(item.url).catch(() => {})}
							style={{ paddingVertical: space.s1 }}
						>
							<Text>{item.title}</Text>
							<Text color="ink3">
								{[
									item.company,
									item.location,
									sourceCredit(item.source),
									item.filteredBy ? filterReasonLabel(item.filteredBy) : null,
								]
									.filter(Boolean)
									.join(" · ")}
							</Text>
						</Pressable>
					))}
				</>
			) : null}
		</View>
	);
}
