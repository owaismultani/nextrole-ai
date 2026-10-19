import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { templateSchema } from "@reactive-resume/schema/templates";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { createNoindexFollowMeta } from "@/libs/seo";

export const Route = createFileRoute("/templates/$")({
	component: TemplatePdfRoute,
	errorComponent: () => <div>Template not found</div>,
	head: () => ({
		meta: [createNoindexFollowMeta()],
	}),
});

function TemplatePdfRoute() {
	const params = Route.useParams();
	const template = templateSchema.parse(params._splat?.split(".")[0] ?? "azurill");
	const [url, setUrl] = useState<string>();

	useEffect(() => {
		let objectUrl: string | undefined;
		let cancelled = false;
		void createResumePdfBlob(sampleResumeData, template).then((blob) => {
			if (cancelled) return;
			objectUrl = URL.createObjectURL(blob);
			setUrl(objectUrl);
		});
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [template]);

	if (!url) return null;

	return (
		<iframe
			title={`${template} template`}
			src={`${url}#toolbar=0`}
			style={{ height: "100svh", width: "100svw", border: "none" }}
		/>
	);
}
