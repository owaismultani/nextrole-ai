import type { ApplicationClosedReason } from "@reactive-resume/schema/applications/data";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useId, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { RadioGroup, RadioGroupItem } from "@reactive-resume/ui/components/radio-group";
import { CLOSED_REASONS, getClosedReasonLabel } from "../../stages";

type CloseDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onClose: (reason: ApplicationClosedReason) => void;
};

/** "Close this application": one reason, kept for Insights. It replaces Reject, Archive and Delete buttons. */
export function CloseDialog({ open, onOpenChange, onClose }: CloseDialogProps) {
	const id = useId();
	const [reason, setReason] = useState<ApplicationClosedReason>("not-selected");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						<Trans>Close this application</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>The reason is kept for Insights. Linked documents aren't touched.</Trans>
					</DialogDescription>
				</DialogHeader>
				<RadioGroup
					aria-label={t`Reason`}
					value={reason}
					onValueChange={(value) => setReason(value as ApplicationClosedReason)}
					className="grid gap-1"
				>
					{CLOSED_REASONS.map((value) => (
						<div
							key={value}
							className="flex h-10 items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-hover"
						>
							<RadioGroupItem id={`${id}-${value}`} value={value} />
							<label htmlFor={`${id}-${value}`} className="flex-1 cursor-pointer text-sm">
								{getClosedReasonLabel(value)}
							</label>
						</div>
					))}
				</RadioGroup>
				<DialogFooter>
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						<Trans>Cancel</Trans>
					</Button>
					<Button
						onClick={() => {
							onClose(reason);
							onOpenChange(false);
						}}
					>
						<Trans>Close application</Trans>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
