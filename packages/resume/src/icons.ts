import type { IconName } from "@reactive-resume/schema/icons";

// Whole words only: a substring match gave "Xing", "Dropbox" and "Stack Exchange" the X logo.
const NETWORK_ICON_MAP: Array<{ match: RegExp; icon: IconName }> = [
	{ match: /\bgithub\b/, icon: "github-logo" },
	{ match: /\blinkedin\b/, icon: "linkedin-logo" },
	{ match: /\b(?:twitter|x)\b/, icon: "twitter-logo" },
	{ match: /\bfacebook\b/, icon: "facebook-logo" },
	{ match: /\binstagram\b/, icon: "instagram-logo" },
	{ match: /\byoutube\b/, icon: "youtube-logo" },
	{ match: /\bstack-?overflow\b/, icon: "stack-overflow-logo" },
	{ match: /\bmedium\b/, icon: "medium-logo" },
	{ match: /\bdev\.?to\b/, icon: "code" },
	{ match: /\bdribbble\b/, icon: "dribbble-logo" },
	{ match: /\bbehance\b/, icon: "behance-logo" },
	{ match: /\bgitlab\b/, icon: "git-branch" },
	{ match: /\b(?:bitbucket|codepen)\b/, icon: "code" },
];

/**
 * Maps a social network name to a Phosphor icon name.
 * Returns "star" as default if no match is found.
 */
export function getNetworkIcon(network?: string): IconName {
	if (!network) return "star";

	const networkLower = network.toLowerCase();

	for (const entry of NETWORK_ICON_MAP) {
		if (entry.match.test(networkLower)) {
			return entry.icon;
		}
	}

	return "star";
}
