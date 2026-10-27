import { t } from "@lingui/core/macro";

/** What each baseline completeness check asks for, in the user's words. */
export const baselineCheckLabels = () =>
	({
		name: t`Your name`,
		email: t`A valid email address`,
		headline: t`A headline (your target role)`,
		summary: t`A summary`,
		experience: t`At least one experience entry`,
		"experience-dates": t`Dates on every experience entry`,
		"experience-detail": t`A description on every experience entry`,
		education: t`Education`,
		skills: t`Skills`,
	}) as const;
