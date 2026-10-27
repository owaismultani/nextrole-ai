import type { RouterOutput } from "@/libs/orpc/client";
import type { JobSearchSource } from "@reactive-resume/schema/career";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { sourceName } from "@/features/career/discovery-sources";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type Source = RouterOutput["jobSources"]["status"][number];

/** Where each keyed source hands out its free key. */
const SIGN_UP: Partial<Record<JobSearchSource, string>> = {
	adzuna: "https://developer.adzuna.com/signup",
	reed: "https://www.reed.co.uk/developers/jobseeker",
	jooble: "https://jooble.org/api/about",
	usajobs: "https://developer.usajobs.gov/apirequest/",
	themuse: "https://www.themuse.com/developers/api/v2",
};

const fieldLabel = (field: string) =>
	({ appId: t`Application ID`, appKey: t`Application key`, apiKey: t`API key`, email: t`Registered email` })[field] ??
	field;

/**
 * Keys for the job-search sources that need one. Every other source, and every followed company board, searches
 * without any setup.
 */
export function JobSourcesSection() {
	const id = useId();
	const { data: sources, error, isLoading, refetch } = useQuery(orpc.jobSources.status.queryOptions());
	return (
		<section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border border-line bg-surface">
			<header className="grid gap-1 border-b border-line px-5 py-4 max-sm:px-4">
				<h2 id={`${id}-title`} className="text-[17px] font-semibold">
					<Trans>Job sources</Trans>
				</h2>
				<p className="max-w-[60ch] text-[13px] leading-5 text-ink-3">
					<Trans>
						Discovery already searches the free sources and the company boards you follow. These job-search services
						need a free key of their own to add their listings.
					</Trans>
				</p>
			</header>
			<div className="grid divide-y divide-line px-5 max-sm:px-4">
				{isLoading ? (
					<p role="status" className="flex min-h-14 items-center gap-2 text-sm text-ink-3">
						<Spinner decorative className="size-3.5" />
						<Trans>Loading sources…</Trans>
					</p>
				) : error || !sources ? (
					<div className="grid gap-2 py-4">
						<p role="alert" className="text-[13px] text-danger-text">
							{getOrpcErrorMessage(error, { fallback: t`Job sources couldn't be loaded.` })}
						</p>
						<Button variant="secondary" className="w-fit" onClick={() => void refetch()}>
							<Trans>Try again</Trans>
						</Button>
					</div>
				) : (
					sources.map((source) => <SourceRow key={source.source} source={source} />)
				)}
			</div>
		</section>
	);
}

function SourceRow({ source }: { source: Source }) {
	const id = useId();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState(false);
	const [fields, setFields] = useState<Record<string, string>>({});
	const refresh = () => {
		setEditing(false);
		setFields({});
		void queryClient.invalidateQueries({ queryKey: orpc.jobSources.status.key() });
	};
	const save = useMutation(orpc.jobSources.saveKey.mutationOptions({ onSuccess: refresh }));
	const remove = useMutation(orpc.jobSources.deleteKey.mutationOptions({ onSuccess: refresh }));
	const pending = save.isPending || remove.isPending;
	const failure = save.error || remove.error;
	const complete = source.fields.every((field) => fields[field]?.trim());

	return (
		<div className="grid gap-3 py-4">
			<div className="flex flex-wrap items-center gap-3">
				<div className="grid flex-1 gap-0.5">
					<h3 className="text-sm font-medium">{sourceName(source.source)}</h3>
					<p className="text-xs text-ink-3">
						{source.optional ? t`Works without a key; one raises its limits.` : t`Needs a free key.`}{" "}
						{SIGN_UP[source.source] && (
							<a
								href={SIGN_UP[source.source]}
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent-text underline underline-offset-2"
							>
								<Trans>Get a key</Trans>
							</a>
						)}
					</p>
				</div>
				<span
					className={cn(
						"rounded-full px-2 py-0.5 text-xs font-medium",
						source.managed || source.saved ? "bg-accent-soft text-accent-text" : "bg-sunken text-ink-2",
					)}
				>
					{source.managed ? (
						<Trans>Managed by server</Trans>
					) : source.saved ? (
						<Trans>Key saved</Trans>
					) : source.optional ? (
						<Trans>Optional</Trans>
					) : (
						<Trans>Not set up</Trans>
					)}
				</span>
				{source.canSave && !editing && (
					<div className="flex gap-1">
						<Button variant="secondary" size="sm" disabled={pending} onClick={() => setEditing(true)}>
							{source.saved ? <Trans>Replace key</Trans> : <Trans>Add key</Trans>}
						</Button>
						{source.saved && (
							<Button
								variant="ghost"
								size="sm"
								className="text-danger-text hover:bg-danger-soft"
								loading={remove.isPending}
								disabled={pending}
								onClick={() => remove.mutate({ source: source.source })}
							>
								<Trans>Remove</Trans>
							</Button>
						)}
					</div>
				)}
			</div>
			{failure && (
				<p role="alert" className="flex items-start gap-2 text-[13px] text-danger-text">
					<Icon name="warning-circle" size={16} className="mt-0.5 shrink-0" />
					{getOrpcErrorMessage(failure, { fallback: t`The key couldn't be saved.`, allowServerMessage: true })}
				</p>
			)}
			{editing && (
				<form
					className="grid gap-3 rounded-lg border border-line bg-bg p-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!pending && complete) save.mutate({ source: source.source, fields });
					}}
				>
					{source.fields.map((field, index) => (
						<div key={field} className="grid gap-1.5">
							<Label htmlFor={`${id}-${field}`}>{fieldLabel(field)}</Label>
							<Input
								id={`${id}-${field}`}
								type={field === "email" ? "email" : "password"}
								value={fields[field] ?? ""}
								maxLength={2_000}
								autoComplete="off"
								spellCheck={false}
								required
								autoFocus={index === 0}
								disabled={pending}
								onChange={(event) => setFields((current) => ({ ...current, [field]: event.target.value }))}
							/>
						</div>
					))}
					<p className="text-xs text-ink-3">
						<Trans>Stored encrypted and used only for your searches.</Trans>
					</p>
					<div className="flex justify-end gap-1">
						<Button
							type="button"
							variant="ghost"
							disabled={pending}
							onClick={() => {
								setEditing(false);
								setFields({});
								save.reset();
							}}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={pending || !complete} loading={save.isPending}>
							<Trans>Save key</Trans>
						</Button>
					</div>
				</form>
			)}
		</div>
	);
}
