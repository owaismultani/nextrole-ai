import { useLingui } from "@lingui/react/macro";
import { NotificationsBell } from "@/features/career/notifications";
import { PlainLayout } from "@/shell/section-layout";

export default function OverviewLayout() {
	const { t } = useLingui();
	return <PlainLayout title={t`Overview`} actions={<NotificationsBell />} />;
}
