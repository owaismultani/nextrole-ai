import { AtsChecker } from "./checker";

type AtsCheckerPageProps = { signedIn: boolean; importPending: boolean };

/**
 * The /ats-checker page, which the build also prerenders (features/homepage/prerender.tsx). The checker's first screen
 * is light, and PDF.js and the analysis engine load only once a file is chosen, so it renders without a loading state.
 */
export function AtsCheckerPage({ signedIn, importPending }: AtsCheckerPageProps) {
	return (
		// The marketing header is fixed and 65px tall, so the page makes room for it.
		<main id="main-content" className="min-h-svh bg-bg pt-20">
			<AtsChecker signedIn={signedIn} importPending={importPending} />
		</main>
	);
}
