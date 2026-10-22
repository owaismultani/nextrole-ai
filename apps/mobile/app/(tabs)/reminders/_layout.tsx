import { useLingui } from "@lingui/react/macro";
import { PlainLayout } from "@/shell/section-layout";

export default function RemindersLayout() {
	const { t } = useLingui();
	return <PlainLayout title={t`Reminders`} />;
}
