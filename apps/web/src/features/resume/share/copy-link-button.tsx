import type { IconName } from "@reactive-resume/ui/components/icon";
import { Trans } from "@lingui/react/macro";
import { useRef, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Swap } from "@reactive-resume/ui/components/swap";

const COPIED_MS = 2000;

type CopyLinkButtonProps = {
	url: string;
	/** The idle text, already translated: "Copy" or "Copy link". */
	label: string;
	icon?: IconName;
	disabled?: boolean;
	className?: string;
	onCopied?: () => void;
};

/** Copies `url` and shows "Copied" for two seconds. */
export function CopyLinkButton({ url, label, icon = "copy", disabled, className, onCopied }: CopyLinkButtonProps) {
	const [copied, setCopied] = useState(false);
	const [, copyToClipboard] = useCopyToClipboard();
	const timer = useRef<number>(undefined);

	const copy = async () => {
		await copyToClipboard(url);
		setCopied(true);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
		onCopied?.();
	};

	return (
		<Button
			variant="secondary"
			className={className}
			disabled={disabled}
			aria-live="polite"
			onClick={() => void copy()}
		>
			<Swap
				swapped={copied}
				from={
					<>
						<Icon name={icon} size={18} />
						{label}
					</>
				}
				to={
					<>
						<Icon name="check" size={18} />
						<Trans>Copied</Trans>
					</>
				}
			/>
		</Button>
	);
}
