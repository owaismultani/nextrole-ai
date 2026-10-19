import type { AnyDialogRendererEntry } from "../schemas";
import { ChangePasswordDialog } from "./change-password";
import { DisableTwoFactorDialog } from "./disable-two-factor";
import { EnableTwoFactorDialog } from "./enable-two-factor";

export const authDialogRenderers: readonly AnyDialogRendererEntry[] = [
	{ type: "auth.change-password", render: () => <ChangePasswordDialog /> },
	{ type: "auth.two-factor.enable", render: () => <EnableTwoFactorDialog /> },
	{ type: "auth.two-factor.disable", render: () => <DisableTwoFactorDialog /> },
];
