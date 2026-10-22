import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { LoadState } from "../career/shared";
import { useProfile } from "../settings/queries";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Button, Card, Screen, Text, useTheme } from "@/ui";

function Facts({ rows }: { rows: [string, string][] }) {
	const { t } = useLingui();
	const { space } = useTheme();
	return (
		<View style={{ gap: space.s2 }}>
			{rows.map(([label, value]) => (
				<View key={label} style={{ gap: space.s0 }}>
					<Text variant="callout" color="ink3">
						{label}
					</Text>
					<Text color={value ? "ink" : "ink3"}>{value || t`Not set`}</Text>
				</View>
			))}
		</View>
	);
}

function Block({ title, children }: { title: string; children: ReactNode }) {
	const { space } = useTheme();
	return (
		<Card style={{ gap: space.s3 }}>
			<Text variant="title" accessibilityRole="header">
				{title}
			</Text>
			{children}
		</Card>
	);
}

/**
 * Profile → Candidate details: the personal information the app can use, and where each piece comes from. Nothing here
 * is a separate copy: your account and your baseline resume stay the single source, and each links to where it is edited.
 */
export function DetailsScreen() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const account = useProfile();
	const setup = useQuery({
		...orpc.career.setup.queryOptions({ input: {} }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.setup.key(), session.server],
	});
	const baseline = setup.data?.baseline ?? null;
	const resume = useQuery({
		...orpc.resume.getById.queryOptions({ input: { id: baseline?.resumeId ?? "" } }),
		enabled: session.status === "signed-in" && Boolean(baseline),
		queryKey: [...orpc.resume.getById.key(), session.server, baseline?.resumeId],
	});
	const basics = resume.data?.data.basics;

	return (
		<Screen onRefresh={() => Promise.allSettled([account.refetch(), setup.refetch(), resume.refetch()])}>
			<View style={{ gap: space.s4 }}>
				<Block title={t`Account`}>
					<LoadState query={account} />
					{account.data ? (
						<Facts
							rows={[
								[t`Name`, account.data.name],
								[t`Email`, account.data.email],
							]}
						/>
					) : null}
					<Button
						variant="ghost"
						label={t`Edit in Settings → Account`}
						onPress={() => router.push(routes.settings("account"))}
					/>
				</Block>
				<Block title={t`From your baseline resume`}>
					{setup.isPending || setup.isError ? <LoadState query={setup} /> : null}
					{setup.data && !baseline ? (
						<>
							<Text color="ink2">{t`Choose a baseline resume and its contact details appear here.`}</Text>
							<Button
								variant="secondary"
								label={t`Choose a baseline`}
								onPress={() => router.push(routes.profile("baseline"))}
							/>
						</>
					) : null}
					{baseline ? <LoadState query={resume} /> : null}
					{baseline && basics ? (
						<>
							<Facts
								rows={[
									[t`Name`, basics.name],
									[t`Headline`, basics.headline],
									[t`Email`, basics.email],
									[t`Phone`, basics.phone],
									[t`Location`, basics.location],
									[t`Website`, basics.website.url],
								]}
							/>
							<Button
								variant="ghost"
								label={t`Edit in ${baseline.name}`}
								onPress={() => router.push(routes.builder(baseline.resumeId))}
							/>
						</>
					) : null}
				</Block>
				<Text
					variant="callout"
					color="ink3"
				>{t`Tailored documents take their contact details from the baseline resume. This page only shows them; it keeps no separate copy.`}</Text>
			</View>
		</Screen>
	);
}
