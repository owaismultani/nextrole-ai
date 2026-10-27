import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { SectionTabs } from "@/components/layout/section-tabs";
import { orpc } from "@/libs/orpc/client";

export const Route = createFileRoute("/dashboard/knowledge")({
	component: KnowledgeLayout,
});

/** Knowledge: the facts and stories the coach and your tailored documents draw on. Reached from Coach. */
function KnowledgeLayout() {
	const facts = useQuery(orpc.career.facts.queryOptions({ input: { applicationId: null, all: true } }));
	const stories = useQuery(orpc.career.stories.queryOptions({ input: { applicationId: null } }));

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				title={<Trans>Knowledge</Trans>}
				description={<Trans>The facts and stories your coach and tailored documents draw on.</Trans>}
			/>
			<SectionTabs
				label={t`Knowledge`}
				tabs={[
					{
						to: "/dashboard/knowledge/facts",
						label: <Trans>Facts</Trans>,
						count: facts.data?.filter((fact) => fact.status !== "forgotten").length,
					},
					{
						to: "/dashboard/knowledge/stories/{-$storyId}",
						match: "/dashboard/knowledge/stories",
						label: <Trans>Stories</Trans>,
						count: stories.data?.length,
					},
				]}
			/>
			<div className="min-w-0">
				<Outlet />
			</div>
			<p className="rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-xs leading-[1.75] text-ink">
				<Trans>
					Your facts, stories and job preferences are the Knowledge the coach and your tailored documents draw on.
					Enabled ones can be sent to your AI connection when you use coaching tools or scheduled interview preparation.
					In chat, the Knowledge switch controls what is added to each message.
				</Trans>
			</p>
		</div>
	);
}
