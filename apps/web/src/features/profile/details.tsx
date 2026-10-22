import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { orpc } from "@/libs/orpc/client";

/**
 * Profile → Candidate details: the personal information the app can use, and where each piece comes from. Nothing here is
 * a separate copy: your account and your baseline resume stay the single source, and each links to where it is edited.
 */
export function DetailsPage() {
	const { session } = useRouteContext({ from: "/dashboard" });
	const setup = useQuery(orpc.career.setup.queryOptions({ input: {} }));
	const baseline = setup.data?.baseline ?? null;
	const resume = useQuery({
		...orpc.resume.getById.queryOptions({ input: { id: baseline?.resumeId ?? "" } }),
		enabled: Boolean(baseline),
	});
	const basics = resume.data?.data.basics;

	return (
		<div className="grid gap-5">
			<section aria-label={t`Account`} className="grid gap-3 rounded-xl border border-line bg-surface p-5">
				<h2 className="text-[17px] font-semibold">
					<Trans>Account</Trans>
				</h2>
				<Facts
					rows={[
						[t`Name`, session.user.name],
						[t`Email`, session.user.email],
					]}
				/>
				<Link to="/dashboard/settings/account" className="w-fit text-[13px] underline">
					<Trans>Edit in Settings → Account</Trans>
				</Link>
			</section>

			<section
				aria-label={t`From your baseline resume`}
				className="grid gap-3 rounded-xl border border-line bg-surface p-5"
			>
				<h2 className="text-[17px] font-semibold">
					<Trans>From your baseline resume</Trans>
				</h2>
				{!baseline ? (
					<p className="text-sm text-ink-2">
						<Trans>Choose a baseline resume and its contact details appear here.</Trans>{" "}
						<Link to="/dashboard/profile/baseline" className="underline">
							<Trans>Choose a baseline</Trans>
						</Link>
					</p>
				) : resume.isPending ? (
					<Skeleton className="h-24" />
				) : resume.isError || !basics ? (
					<p role="alert" className="text-sm text-danger-text">
						<Trans>Couldn't read your baseline resume.</Trans>
					</p>
				) : (
					<>
						<Facts
							rows={[
								[t`Name`, basics.name],
								[t`Headline`, basics.headline],
								[t`Email`, basics.email],
								[t`Phone`, basics.phone],
								[t`Location`, basics.location],
								[t`Website`, basics.website.url],
							]}
						/>
						<Link
							to="/builder/$resumeId"
							params={{ resumeId: baseline.resumeId }}
							className="w-fit text-[13px] underline"
						>
							<Trans>Edit in {baseline.name}</Trans>
						</Link>
					</>
				)}
			</section>
			<p className="text-xs text-ink-3">
				<Trans>
					Tailored documents take their contact details from the baseline resume. This page only shows them; it keeps no
					separate copy.
				</Trans>
			</p>
		</div>
	);
}

function Facts({ rows }: { rows: [string, string][] }) {
	return (
		<dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
			{rows.map(([label, value]) => (
				<div key={label} className="contents">
					<dt className="text-ink-3">{label}</dt>
					<dd className="min-w-0 break-words">{value || <span className="text-ink-3">{t`Not set`}</span>}</dd>
				</div>
			))}
		</dl>
	);
}
