import { useLingui } from "@lingui/react/macro";
import { PlainLayout } from "@/shell/section-layout";

export default function CoachLayout() {
	const { t } = useLingui();
	return <PlainLayout title={t`Coach`} />;
}
