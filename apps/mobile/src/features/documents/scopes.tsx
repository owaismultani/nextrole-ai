import type { DocumentSummary } from "./filter";
// Documents by ownership (web features/documents/scopes.tsx): the baseline pinned, and each application's documents
// grouped under its full company and role with where they came from.
import type { RouterOutput } from "@/api/client";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { summaryLabel } from "@/features/career/preparation";
import { routes } from "@/routes";
import { Button, Text, useTheme } from "@/ui";

export type DocumentOrigin = RouterOutput["career"]["documentOrigins"][number];
export type DocumentsScope = "all" | "applications" | "baseline";

/** Where each prepared document came from, by document id. Documents made by hand have no entry. */
export function useDocumentOrigins() {
	const session = useSession();
	const options = orpc.career.documentOrigins.queryOptions({ input: {} });
	const query = useQuery({
		...options,
		queryKey: [...options.queryKey, session.server],
		enabled: session.status === "signed-in",
		retry: false,
	});
	return { ...query, byDocument: new Map((query.data ?? []).map((origin) => [origin.documentId, origin])) };
}

/** The baseline resume's id, so it can be pinned apart from the reusable documents. */
export function useBaselineId() {
	const session = useSession();
	const options = orpc.career.setup.queryOptions({ input: {} });
	const query = useQuery({
		...options,
		queryKey: [...options.queryKey, session.server],
		enabled: session.status === "signed-in",
		retry: false,
	});
	return { ...query, id: query.data?.baseline?.resumeId };
}

/** How a document came to be, in a few words: the baseline it was made from, or that you made it. */
export function originLine(origin: DocumentOrigin | undefined) {
	if (!origin) return t`Made by you`;
	if (!origin.baseline) return t`Prepared for this job · baseline not recorded`;
	if (origin.baseline.name) return t`Prepared from “${origin.baseline.name}”`;
	return t`Prepared from a baseline that has since been removed`;
}

type GroupHeaderProps = {
	application: NonNullable<DocumentSummary["application"]>;
	origins: ReadonlyMap<string, DocumentOrigin>;
	documents: readonly DocumentSummary[];
};

/** The head of one application's documents: its full name, how its preparation stands, and a way to open it. */
export function ApplicationGroupHeader({ application, origins, documents }: GroupHeaderProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const mine = documents
		.filter((document) => document.application?.id === application.id)
		.map((document) => origins.get(document.id))
		.filter((origin) => origin !== undefined);
	const summary = mine[0]?.summary;
	const stale = mine.some((origin) => origin.stale);
	return (
		<View style={{ gap: space.s1, paddingTop: space.s3 }}>
			<Text variant="title" accessibilityRole="header">
				{[application.role, application.company].filter(Boolean).join(" · ")}
			</Text>
			<Text variant="callout" color={summary === "attention" ? "dangerText" : summary === "ready" ? "okText" : "ink3"}>
				{[
					summary ? (summary === "ready" ? t`Documents ready` : summaryLabel(summary)) : "",
					stale ? t`Out of date` : "",
				]
					.filter(Boolean)
					.join(" · ") || t`No documents prepared by automation`}
			</Text>
			<View style={{ flexDirection: "row" }}>
				<Button
					variant="secondary"
					label={t`Open application`}
					onPress={() => router.push(routes.application(application.id, "documents"))}
				/>
			</View>
		</View>
	);
}
