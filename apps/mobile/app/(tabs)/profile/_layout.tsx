import { useLingui } from "@lingui/react/macro";
import { routes } from "@/routes";
import { SectionLayout } from "@/shell/section-layout";

/** Profile: who you are to the app: details, preferences, facts, stories and the baseline resume. */
export default function ProfileLayout() {
	const { t } = useLingui();
	return (
		<SectionLayout
			title={t`Profile`}
			label={t`Profile`}
			fallback="details"
			sections={[
				{ value: "details", label: t`Details` },
				{ value: "preferences", label: t`Preferences` },
				{ value: "facts", label: t`Facts` },
				{ value: "stories", label: t`Stories` },
				{ value: "baseline", label: t`Baseline` },
			]}
			hrefFor={(section) => routes.profile(section)}
		/>
	);
}
