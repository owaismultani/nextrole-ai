import type { Application } from "../types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { Icon } from "@reactive-resume/ui/components/icon";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { CLOSED_REASONS, getClosedReasonLabel, getStageColor, getStageLabel, PIPELINE } from "../stages";
import { useApplicationActions, useInvalidateApplications } from "../use-application-actions";
import { useConfirm, usePrompt } from "@/hooks/use-confirm";
import { orpc } from "@/libs/orpc/client";

// Keep pointer and clicks from reaching the card, which would start a drag or open the detail sheet. React portals
// bubble synthetic events through the React tree, so a menu item's click would otherwise reach the card.
const stop = (event: React.SyntheticEvent) => event.stopPropagation();

type ApplicationActionsMenuProps = {
	application: Application;
	className?: string;
	/** Adds "Edit details…": where the menu sits on the application itself, not on a card. */
	onEditDetails?: () => void;
	/** Adds "Set a follow-up…": the reminder date and note, on the application's own page. */
	onFollowUp?: () => void;
	/** Called once the application is deleted, for example to leave its workspace. */
	onDeleted?: () => void;
	/** The trigger's size; cards use the small one, a page header the larger. */
	size?: "icon-xs" | "icon-sm";
};

/** A card's ⋯ menu, the keyboard alternative to dragging: Move to…, Close…, and Delete after asking. */
export function ApplicationActionsMenu({
	application,
	className,
	onEditDetails,
	onFollowUp,
	onDeleted,
	size = "icon-xs",
}: ApplicationActionsMenuProps) {
	const { moveTo, close, remove } = useApplicationActions();
	const confirm = useConfirm();
	const prompt = usePrompt();
	const invalidate = useInvalidateApplications();
	const update = useMutation({
		...orpc.applications.update.mutationOptions(),
		onSuccess: () => invalidate(application.id),
		onError: () => toast.add({ type: "error", description: t`Couldn't save the tags.` }),
	});

	const onAddTag = async () => {
		const value = (
			await prompt(t`Add a tag`, { confirmText: t`Add`, description: t`${application.role} · ${application.company}` })
		)?.trim();
		if (!value || application.tags.includes(value)) return;
		update.mutate({ id: application.id, tags: [...application.tags, value] });
	};

	const onDelete = async () => {
		const confirmed = await confirm(t`Delete this application?`, {
			description: t`“${application.role} · ${application.company}” and its timeline are deleted permanently. This can't be undone.`,
			confirmText: t`Delete`,
		});
		if (confirmed) remove.mutate({ id: application.id }, onDeleted ? { onSuccess: onDeleted } : {});
	};

	return (
		<div className={cn("shrink-0", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							size={size}
							variant="ghost"
							aria-label={t`Options for ${application.role} at ${application.company}`}
							onClick={stop}
							onPointerDown={stop}
							className="text-ink-3"
						/>
					}
				>
					<Icon name="dots-three" size={18} />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48" onClick={stop}>
					{onEditDetails && (
						<>
							<DropdownMenuItem onClick={onEditDetails}>
								<Icon name="pencil-simple" size={18} />
								<Trans>Edit details…</Trans>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}
					{onFollowUp && (
						<DropdownMenuItem onClick={onFollowUp}>
							<Icon name="bell" size={18} />
							{application.followUpAt ? <Trans>Change the follow-up…</Trans> : <Trans>Set a follow-up…</Trans>}
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={() => void onAddTag()}>
						<Icon name="tag" size={18} />
						<Trans>Add tag…</Trans>
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Icon name="arrow-right" size={18} />
							<Trans>Move to…</Trans>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{PIPELINE.map((status) => (
								<DropdownMenuItem
									key={status}
									disabled={status === application.status}
									onClick={() => moveTo(application, status)}
								>
									<span
										aria-hidden="true"
										className="size-2 rounded-full"
										style={{ background: getStageColor(status) }}
									/>
									{getStageLabel(status)}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					{application.status === "closed" && (
						<DropdownMenuItem onClick={() => moveTo(application, "applied")}>
							<Icon name="arrow-counter-clockwise" size={18} />
							<Trans>Reopen</Trans>
						</DropdownMenuItem>
					)}
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Icon name="check" size={18} />
							<Trans>Close…</Trans>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{CLOSED_REASONS.map((reason) => (
								<DropdownMenuItem key={reason} onClick={() => close(application, reason)}>
									{getClosedReasonLabel(reason)}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuSeparator />

					<DropdownMenuItem variant="destructive" onClick={onDelete}>
						<Icon name="trash" size={18} />
						<Trans>Delete…</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
