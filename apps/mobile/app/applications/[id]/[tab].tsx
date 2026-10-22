import type { WorkspaceTab } from "@reactive-resume/schema/career";
import type { ComponentType } from "react";
import { useLingui } from "@lingui/react/macro";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { resolveWorkspaceTab, workspaceTabSchema } from "@reactive-resume/schema/career";
import { ApplicationDetail } from "@/features/application-detail/detail-screen";
import { ActivityTab } from "@/features/workspace/tabs/activity";
import { ApplyTab } from "@/features/workspace/tabs/apply";
import { DocumentsTab } from "@/features/workspace/tabs/documents";
import { InterviewsTab } from "@/features/workspace/tabs/interviews";
import { MessagesTab } from "@/features/workspace/tabs/messages";
import { SavedTab } from "@/features/workspace/tabs/saved";
import { SummaryTab } from "@/features/workspace/tabs/summary";
import { routes } from "@/routes";
import { useWorkspaceChrome } from "@/shell/workspace-chrome";
import { Button } from "@/ui";

const WORKSPACE: Record<WorkspaceTab, ComponentType> = {
	summary: SummaryTab,
	documents: DocumentsTab,
	answers: ApplyTab,
	interviews: InterviewsTab,
	messages: MessagesTab,
	saved: SavedTab,
	activity: ActivityTab,
};

/**
 * `/applications/:id/details` is the application detail; the workspace tabs (`summary`, …) render their own screens. The
 * former tab names (`fit`, `apply`, `prepare`, `practise`, `debrief`) redirect to the work they were for.
 */
export default function ApplicationTabScreen() {
	const { id, tab, ...search } = useLocalSearchParams<{
		id: string;
		tab: string;
		section?: string;
		round?: string;
		version?: string;
		speak?: string;
		story?: string;
	}>();
	const current = workspaceTabSchema.safeParse(tab);
	if (!current.success) {
		const former = resolveWorkspaceTab(tab);
		if (former)
			return (
				<Redirect
					href={{
						pathname: routes.application(id, former.tab),
						params: { ...search, ...(former.section && !search.section ? { section: former.section } : {}) },
					}}
				/>
			);
		return <ApplicationDetail id={id} />;
	}
	return <WorkspaceScreen id={id} Workspace={WORKSPACE[current.data]} />;
}

type WorkspaceScreenProps = {
	id: string;
	Workspace: ComponentType;
};

function WorkspaceScreen({ id, Workspace }: WorkspaceScreenProps) {
	const { t } = useLingui();
	const router = useRouter();
	// The workspace top bar (src/shell) replaces the native header, so Details goes into its actions.
	useWorkspaceChrome({
		actions: <Button variant="link" label={t`Details`} onPress={() => router.replace(routes.applicationDetails(id))} />,
	});
	return <Workspace />;
}
