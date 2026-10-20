import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCareerTime } from "./hooks";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Button, Card, Text, useTheme } from "@/ui";

/** Career → Today: one card with what the pipeline needs from you, linking to the Pipeline tab. Hidden when idle. */
export function PipelineSummary() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const time = useCareerTime();
	const options = { enabled: session.status === "signed-in" };
	const jobs = useQuery({
		...orpc.career.preparations.queryOptions({ input: {} }),
		...options,
		queryKey: [...orpc.career.preparations.key(), session.server],
	});
	const runs = useQuery({
		...orpc.career.runs.queryOptions({ input: { limit: 1 } }),
		...options,
		queryKey: [...orpc.career.runs.key(), session.server, "latest"],
	});
	const last = runs.data?.items[0];
	if (!last && !jobs.data?.length) return null;
	const ready = jobs.data?.filter((job) => job.summary === "ready").length ?? 0;
	const attention = jobs.data?.filter((job) => job.summary === "attention").length ?? 0;
	const working = jobs.data?.filter((job) => ["queued", "generating", "deferred"].includes(job.summary)).length ?? 0;
	return (
		<Section title={t`Pipeline`}>
			<Card style={{ gap: space.s2 }}>
				{jobs.data?.length ? (
					<>
						<Text color={ready > 0 ? "accentText" : "ink3"}>{t`${ready} ready for review`}</Text>
						{attention > 0 ? <Text color="dangerText">{t`${attention} need attention`}</Text> : null}
						{working > 0 ? <Text color="infoText">{t`${working} in progress`}</Text> : null}
					</>
				) : null}
				{last ? (
					<Text color="ink3">
						{last.report.outcome === "failed"
							? t`Last discovery run failed · ${time.when(last.createdAt)}`
							: last.report.outcome === "partial"
								? t`Last run partly succeeded · ${last.report.matches} new · ${time.when(last.createdAt)}`
								: t`Last run ${last.report.matches} new · ${time.when(last.createdAt)}`}
					</Text>
				) : null}
				<Button variant="secondary" label={t`Open Pipeline`} onPress={() => router.push(routes.career("pipeline"))} />
			</Card>
		</Section>
	);
}
