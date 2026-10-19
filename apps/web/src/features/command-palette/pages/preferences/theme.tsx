import type { Theme } from "@/libs/theme";
import { Trans } from "@lingui/react/macro";
import { CommandItem } from "@reactive-resume/ui/components/command";
import { Icon } from "@reactive-resume/ui/components/icon";
import { useCommandPaletteStore } from "../../store";
import { BaseCommandGroup } from "../base";
import { useTheme } from "@/features/theme/provider";

export function ThemeCommandPage() {
	const { theme: currentTheme, setTheme } = useTheme();
	const setOpen = useCommandPaletteStore((state) => state.setOpen);

	const handleThemeChange = (theme: Theme) => {
		setTheme(theme, { playSound: false });
		setOpen(false);
	};

	return (
		<BaseCommandGroup page="theme" heading={<Trans>Theme</Trans>}>
			<CommandItem value="light" data-checked={currentTheme === "light"} onSelect={() => handleThemeChange("light")}>
				<Icon name="sun" />
				<Trans>Light theme</Trans>
			</CommandItem>

			<CommandItem value="dark" data-checked={currentTheme === "dark"} onSelect={() => handleThemeChange("dark")}>
				<Icon name="moon" />
				<Trans>Dark theme</Trans>
			</CommandItem>

			<CommandItem value="system" data-checked={currentTheme === "system"} onSelect={() => handleThemeChange("system")}>
				<Icon name="circle-half" />
				<Trans>Match system theme</Trans>
			</CommandItem>
		</BaseCommandGroup>
	);
}
