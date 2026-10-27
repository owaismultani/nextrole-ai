import type { RouterOutput } from "@/api/client";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { sourceName } from "../career/discovery-sources";
import { aiSettingsError } from "./error";
import { client, orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { Banner, Button, Card, Skeleton, Text, TextField, useTheme } from "@/ui";

type Source = RouterOutput["jobSources"]["status"][number];

/** Where each keyed source hands out its free key. */
const SIGN_UP: Record<string, string> = {
	adzuna: "https://developer.adzuna.com/signup",
	reed: "https://www.reed.co.uk/developers/jobseeker",
	jooble: "https://jooble.org/api/about",
	usajobs: "https://developer.usajobs.gov/apirequest/",
	themuse: "https://www.themuse.com/developers/api/v2",
};

const fieldLabel = (field: string) =>
	({ appId: t`Application ID`, appKey: t`Application key`, apiKey: t`API key`, email: t`Registered email` })[field] ??
	field;

/** Keys for the job-search sources that need one; every other source searches without setup. */
export function JobSourcesSettings() {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const options = orpc.jobSources.status.queryOptions();
	const query = useQuery({
		...options,
		queryKey: [...options.queryKey, session.server],
		enabled: session.status === "signed-in",
	});
	if (query.isPending) return <Skeleton height={120} />;
	if (query.isError || !query.data) return <Banner tone="danger" message={t`Job sources couldn't be loaded.`} />;
	return (
		<View style={{ gap: space.s3 }}>
			{query.data.map((source) => (
				<SourceCard key={source.source} source={source} />
			))}
		</View>
	);
}

function SourceCard({ source }: { source: Source }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState(false);
	const [fields, setFields] = useState<Record<string, string>>({});
	const [pending, setPending] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const complete = source.fields.every((field) => fields[field]?.trim());
	const run = async (action: "save" | "delete") => {
		if (pending) return;
		setPending(true);
		setFailure(null);
		try {
			if (action === "save") await client.jobSources.saveKey({ source: source.source, fields });
			else await client.jobSources.deleteKey({ source: source.source });
			setEditing(false);
			setFields({});
			await queryClient.invalidateQueries({ queryKey: orpc.jobSources.status.key() });
		} catch (error) {
			setFailure(aiSettingsError(error));
		} finally {
			setPending(false);
		}
	};
	const status = source.managed
		? t`Managed by server`
		: source.saved
			? t`Key saved`
			: source.optional
				? t`Works without a key; one raises its limits.`
				: t`Needs a free key.`;

	return (
		<Card>
			<View style={{ gap: space.s2, padding: space.s3 }}>
				<Text variant="title">{sourceName(source.source)}</Text>
				<Text color="ink3">{status}</Text>
				{failure ? <Banner tone="danger" message={failure} /> : null}
				{editing ? (
					<>
						{source.fields.map((field) => (
							<TextField
								key={field}
								label={fieldLabel(field)}
								value={fields[field] ?? ""}
								secureTextEntry={field !== "email"}
								keyboardType={field === "email" ? "email-address" : "default"}
								autoCapitalize="none"
								autoCorrect={false}
								onChangeText={(value) => setFields((current) => ({ ...current, [field]: value }))}
							/>
						))}
						<Text color="ink3">{t`Stored encrypted and used only for your searches.`}</Text>
						<Button label={t`Save key`} loading={pending} disabled={!complete} onPress={() => void run("save")} />
						<Button label={t`Cancel`} variant="ghost" onPress={() => setEditing(false)} />
					</>
				) : source.canSave ? (
					<>
						<Button
							label={source.saved ? t`Replace key` : t`Add key`}
							variant="secondary"
							onPress={() => setEditing(true)}
						/>
						{source.saved ? (
							<Button label={t`Remove`} variant="ghost" loading={pending} onPress={() => void run("delete")} />
						) : null}
						{SIGN_UP[source.source] ? (
							<Button
								label={t`Get a key`}
								variant="ghost"
								onPress={() => void openBrowserAsync(SIGN_UP[source.source] ?? "").catch(() => {})}
							/>
						) : null}
					</>
				) : null}
			</View>
		</Card>
	);
}
