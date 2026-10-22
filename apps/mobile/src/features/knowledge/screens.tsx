import { useLingui } from "@lingui/react/macro";
import { Facts } from "../career/facts";
import { useCareerQueries } from "../career/hooks";
import { Preferences } from "../career/preferences";
import { LoadState } from "../career/shared";
import { Stories } from "../career/stories";
import { useSession } from "@/auth/session";
import { Screen, Text } from "@/ui";

const useRefresh = () => {
	const { facts, stories, profile } = useCareerQueries();
	return {
		facts,
		stories,
		profile,
		refresh: () => Promise.allSettled([facts.refetch(), stories.refetch(), profile.refetch()]),
	};
};

/** Knowledge → Facts: what you have done, with its source, status and scope. */
export function FactsScreen() {
	const { t } = useLingui();
	const session = useSession();
	const { refresh } = useRefresh();
	return (
		<Screen onRefresh={refresh}>
			<Text color="ink3">{t`Your facts, stories and job preferences are the Knowledge the coach and your tailored documents draw on. Editing them sends nothing to an AI connection.`}</Text>
			<Facts key={session.server} />
		</Screen>
	);
}

/** Knowledge → Stories: reusable accomplishments and interview examples. */
export function StoriesScreen() {
	const { t } = useLingui();
	const session = useSession();
	const { refresh } = useRefresh();
	return (
		<Screen onRefresh={refresh}>
			<Text color="ink3">{t`Stories are the examples you bring to interviews. Editing them sends nothing to an AI connection.`}</Text>
			<Stories key={session.server} />
		</Screen>
	);
}

/** The job preferences form: the roles, places, pay and ways of working you want. Opened from Discover. */
export function PreferencesPanel() {
	const session = useSession();
	const { profile } = useRefresh();
	return (
		<>
			<LoadState query={profile} />
			{profile.data ? <Preferences key={session.server} initial={profile.data} /> : null}
		</>
	);
}
