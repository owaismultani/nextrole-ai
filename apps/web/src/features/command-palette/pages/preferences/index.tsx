import { Trans } from "@lingui/react/macro";
import { CommandItem } from "@reactive-resume/ui/components/command";
import { Icon } from "@reactive-resume/ui/components/icon";
import { useCommandPaletteStore } from "../../store";
import { BaseCommandGroup } from "../base";
import { LanguageCommandPage } from "./language";
import { ThemeCommandPage } from "./theme";

export function PreferencesCommandGroup() {
	const pushPage = useCommandPaletteStore((state) => state.pushPage);

	return (
		<>
			<BaseCommandGroup heading={<Trans>Preferences</Trans>}>
				<CommandItem onSelect={() => pushPage("theme")}>
					<Icon name="palette" size={16} />
					<Trans>Change theme to…</Trans>
				</CommandItem>

				<CommandItem onSelect={() => pushPage("language")}>
					<Icon name="translate" size={16} />
					<Trans>Change language to…</Trans>
				</CommandItem>
			</BaseCommandGroup>

			<ThemeCommandPage />
			<LanguageCommandPage />
		</>
	);
}
