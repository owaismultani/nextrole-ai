import type { CompareSource } from "./compare-dialog";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { t } from "@lingui/core/macro";
import { useQuery } from "@tanstack/react-query";
import { BASELINE, CompareDialog, NOW } from "./compare-dialog";
import { client, orpc } from "@/libs/orpc/client";

type Props = {
	kind: "resume" | "letter";
	documentId: string;
	/** For a tailored resume, the baseline it was made from, offered as a side to compare with. */
	baselineId?: string | null | undefined;
	/** The resume as it is in an open editor, unsaved edits included; otherwise "now" is the last save. */
	current?: ResumeData | undefined;
	from: string;
	to: string;
	onClose: () => void;
};

/** Compare for a resume or letter from outside its History panel: its versions come from the server. */
export function DocumentCompareDialog({ kind, documentId, baselineId, current, from, to, onClose }: Props) {
	const resumeVersions = useQuery({
		...orpc.resume.listVersions.queryOptions({ input: { resumeId: documentId } }),
		enabled: kind === "resume",
	});
	const letterVersions = useQuery({
		...orpc.coverLetters.listVersions.queryOptions({ input: { id: documentId } }),
		enabled: kind === "letter",
	});

	const source: CompareSource =
		kind === "resume"
			? {
					kind,
					documentId,
					extras: baselineId ? [{ id: BASELINE, label: t`Baseline resume` }] : [],
					load: async (side) => {
						if (side === NOW) return current ?? (await orpc.resume.getById.call({ id: documentId })).data;
						if (side === BASELINE && baselineId) return (await orpc.resume.getById.call({ id: baselineId })).data;
						return (await orpc.resume.getVersion.call({ resumeId: documentId, versionId: side })).data;
					},
				}
			: {
					kind,
					documentId,
					extras: [],
					load: async (side) =>
						side === NOW
							? await client.coverLetters.getById({ id: documentId })
							: (await client.coverLetters.getVersion({ id: documentId, versionId: side })).data,
				};

	return (
		<CompareDialog
			open
			onOpenChange={(open) => !open && onClose()}
			source={source}
			versions={(kind === "resume" ? resumeVersions.data : letterVersions.data) ?? []}
			from={from}
			to={to}
		/>
	);
}
