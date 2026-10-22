import type { RouterOutput } from "@/api/client";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useCareerTime } from "./hooks";
import { checkFix, checkText, stageExplain, stageLabel, stageText } from "./pipeline-words";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Button, Card, Text, useTheme } from "@/ui";

type Overview = RouterOutput["career"]["overview"];

const STATE_TONE = {
	ok: "accentText",
	running: "infoText",
	waiting: "infoText",
	warn: "warnText",
	failed: "dangerText",
	off: "ink3",
	idle: "ink3",
	yours: "ink",
} as const;

/** Automation and Discover: the pipeline's steps and a live checklist of what must be working. */
export function PipelineHealth() {
	const session = useSession();
	const query = useQuery({
		...orpc.career.overview.queryOptions({ input: { days: 7 } }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.overview.key(), session.server, "pipeline"],
		refetchInterval: 30_000,
	});
	if (!query.data) return null;
	return (
		<>
			<StageMap data={query.data} />
			<Health data={query.data} />
		</>
	);
}

/** The pipeline as a list of steps, from the schedule to your own review and applications, each saying what it is doing and why. */
function StageMap({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const time = useCareerTime();
	return (
		<Section title={t`How your search is going`}>
			{data.stages.map((stage, index) => (
				<Card key={stage.key} style={{ gap: space.s1, opacity: stage.state === "yours" ? 0.9 : 1 }}>
					<Text variant="title">{`${index + 1}. ${stageLabel(stage.key)}`}</Text>
					<Text color={STATE_TONE[stage.state]} weight={600}>
						{stageText(stage, time.when)}
					</Text>
					<Text variant="callout" color="ink3">
						{stageExplain(stage.key)}
					</Text>
				</Card>
			))}
			<Text
				variant="callout"
				color="ink3"
			>{t`Steps 7 and 8 are yours. The system prepares drafts and stops there: you review and apply, and nothing is sent to an employer for you.`}</Text>
		</Section>
	);
}

/** Everything that has to be working for the pipeline to run, each with its answer and where to fix it. */
function Health({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const problems = data.checks.filter((check) => check.status === "fail" || check.status === "warn").length;
	const go = {
		ai: () => router.push(routes.settings("ai")),
		automation: () => router.push(routes.automation()),
		today: () => router.push(routes.automation()),
		pipeline: () => router.push(routes.discover("activity")),
	};
	return (
		<Section title={problems === 0 ? t`Is everything working? Yes` : t`Is everything working? ${problems} to look at`}>
			<Card style={{ gap: space.s2 }}>
				{data.checks.map((check) => {
					const fix = checkFix(check);
					return (
						<View key={check.key} style={{ gap: space.s0 }}>
							<Text
								color={
									check.status === "ok"
										? "accentText"
										: check.status === "info"
											? "ink3"
											: check.status === "warn"
												? "warnText"
												: "dangerText"
								}
							>
								{`${check.status === "ok" ? "✓" : check.status === "info" ? "•" : "!"} ${checkText(check, time.when)}`}
							</Text>
							{fix ? <Button variant="ghost" label={t`Fix`} onPress={go[fix]} /> : null}
						</View>
					);
				})}
			</Card>
		</Section>
	);
}
