import { Trans } from "@lingui/react/macro";
import { Button } from "@reactive-resume/ui/components/button";
import { Spinner } from "@reactive-resume/ui/components/spinner";

type AiProviderLoadStateProps = {
	state: { isLoading: boolean; error: unknown; retry: () => void };
};

/** Loading and lookup failures must not be presented as missing saved connections. */
export function AiProviderLoadState({ state }: AiProviderLoadStateProps) {
	if (state.isLoading)
		return (
			<p role="status" className="flex items-center gap-2 p-3 text-sm text-ink-2">
				<Spinner decorative className="size-4" />
				<Trans>Loading AI connections…</Trans>
			</p>
		);
	if (!state.error) return null;
	return (
		<div role="alert" className="grid justify-items-start gap-2 rounded-lg border border-line p-3 text-sm text-ink-2">
			<p>
				<Trans>Couldn't load AI connections. Your saved connections haven't changed.</Trans>
			</p>
			<Button size="sm" variant="secondary" onClick={state.retry}>
				<Trans>Try again</Trans>
			</Button>
		</div>
	);
}
