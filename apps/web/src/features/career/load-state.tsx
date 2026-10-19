import { Trans } from "@lingui/react/macro";
import { Button } from "@reactive-resume/ui/components/button";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";

type CareerLoadErrorProps = { onRetry: () => void };

export function CareerLoadError({ onRetry }: CareerLoadErrorProps) {
	return (
		<div role="alert" className="grid justify-items-start gap-2 rounded-xl border border-line p-4 text-sm text-ink-2">
			<p>
				<Trans>Couldn't load this. Your saved data hasn't changed.</Trans>
			</p>
			<Button variant="secondary" size="sm" onClick={onRetry}>
				<Trans>Try again</Trans>
			</Button>
		</div>
	);
}

export function CareerLoading() {
	return <Skeleton className="h-40 rounded-xl" />;
}
