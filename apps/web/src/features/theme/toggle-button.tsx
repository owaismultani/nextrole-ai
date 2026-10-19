import { t } from "@lingui/core/macro";
import { startTransition } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { useTheme } from "./provider";

export function ThemeToggleButton(props: React.ComponentProps<typeof Button>) {
	const { resolvedTheme, toggleTheme } = useTheme();

	const onToggleTheme = () => {
		startTransition(() => {
			toggleTheme();
		});
	};

	const ariaLabel = resolvedTheme === "dark" ? t`Switch to light theme` : t`Switch to dark theme`;

	return (
		<Button size="icon" variant="ghost" onClick={onToggleTheme} aria-label={ariaLabel} {...props}>
			<Icon name={resolvedTheme === "dark" ? "moon" : "sun"} />
		</Button>
	);
}
