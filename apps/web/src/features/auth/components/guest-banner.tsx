import { Trans } from "@lingui/react/macro";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";

/** Guests lose their work when the session ends, so the app says so and offers a way to keep it. */
export function GuestBanner() {
	const { session } = useRouteContext({ strict: false });
	if (!session?.user.isAnonymous) return null;

	return (
		<div className="px-4 pt-4">
			<Alert variant="warn">
				<Icon name="warning-circle" />
				<AlertTitle>
					<Trans>You're using a guest account</Trans>
				</AlertTitle>
				<AlertDescription>
					<p>
						<Trans>
							Your work is lost when you sign out or the session ends. Create an account or sign in to keep your
							resumes, cover letters and applications.
						</Trans>
					</p>
					<div className="mt-2 flex flex-wrap gap-2">
						<Button variant="secondary" size="sm" nativeButton={false} render={<Link to="/auth/register" />}>
							<Trans>Create account</Trans>
						</Button>
						<Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/auth/login" />}>
							<Trans>Sign in</Trans>
						</Button>
					</div>
				</AlertDescription>
			</Alert>
		</div>
	);
}
