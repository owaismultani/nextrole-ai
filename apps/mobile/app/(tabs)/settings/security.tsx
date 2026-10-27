import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/api/client";
import { openAccountSettings } from "@/features/settings/browser";
import { SettingsGroup, SettingsPage } from "@/features/settings/layout";
import { useProfile } from "@/features/settings/queries";
import { Banner, Icon, ListRow, Skeleton, showToast, useTheme } from "@/ui";

/** Security: how you sign in. These open the server's account settings in a browser tab inside the app. */
export default function SecurityScreen() {
	const { t } = useLingui();
	const profile = useProfile();
	const queryClient = useQueryClient();
	const { size } = useTheme();
	const browse = () => {
		void openAccountSettings()
			.then(async () => {
				await profile.refetch();
				await queryClient.invalidateQueries({ queryKey: orpc.auth.apiKeys.list.key() });
			})
			.catch(() => showToast({ message: t`Couldn't open the browser. Try again.` }));
	};
	return (
		<SettingsPage title={t`Security`} onRefresh={profile.refetch}>
			{profile.isPending ? <Skeleton height={size.input} /> : null}
			{profile.isError ? (
				<Banner
					tone="danger"
					message={t`Couldn't load your profile.`}
					action={{ label: t`Try again`, onPress: () => void profile.refetch() }}
				/>
			) : null}
			{profile.data ? (
				<SettingsGroup
					title={t`Sign-in & security`}
					note={t`These open your server's account settings in a browser tab inside the app. You may need to sign in there.`}
				>
					<ListRow
						title={t`Email`}
						subtitle={profile.data.email}
						leading="envelope-simple"
						trailing={<Icon name="arrow-square-out" />}
						onPress={browse}
					/>
					<ListRow
						title={t`Password`}
						leading="password"
						trailing={<Icon name="arrow-square-out" />}
						onPress={browse}
					/>
					<ListRow
						title={t`Two-factor authentication`}
						leading="shield-check"
						trailing={<Icon name="arrow-square-out" />}
						onPress={browse}
					/>
					<ListRow
						title={t`Passkeys`}
						leading="fingerprint"
						trailing={<Icon name="arrow-square-out" />}
						onPress={browse}
					/>
					<ListRow
						title={t`Linked accounts`}
						leading="plugs-connected"
						trailing={<Icon name="arrow-square-out" />}
						onPress={browse}
					/>
				</SettingsGroup>
			) : null}
		</SettingsPage>
	);
}
