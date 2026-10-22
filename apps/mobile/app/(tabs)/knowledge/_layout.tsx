import { useLingui } from "@lingui/react/macro";
import { routes } from "@/routes";
import { SectionLayout } from "@/shell/section-layout";

/** Knowledge: the facts and stories the coach and your tailored documents draw on. */
export default function KnowledgeLayout() {
	const { t } = useLingui();
	return (
		<SectionLayout
			title={t`Knowledge`}
			label={t`Knowledge`}
			fallback="facts"
			sections={[
				{ value: "facts", label: t`Facts` },
				{ value: "stories", label: t`Stories` },
			]}
			hrefFor={(section) => routes.knowledge(section)}
		/>
	);
}
