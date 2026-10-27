import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useOverlayHistory } from "./hooks";
import { failed } from "./section";
import { withUndo } from "./shared";
import { orpc } from "@/libs/orpc/client";

/**
 * The state around the schedule editor, shared by every page that opens it (Discover, Automation): opening and
 * closing it through the URL's `schedule` parameter, and deleting a schedule with an Undo. A deleted schedule stays
 * hidden until the Undo toast closes; any mutation refetches every query.
 */
export function useScheduleSheet(
	schedule: string | undefined,
	setParam: (schedule: string | undefined, replace: boolean) => void,
) {
	const overlay = useOverlayHistory();
	const [deleted, setDeleted] = useState<string[]>([]);
	const remove = useMutation({
		...orpc.career.deleteSchedule.mutationOptions(),
		onError: (error, { id }) => {
			setDeleted((current) => current.filter((item) => item !== id));
			failed(error, t`Couldn't delete this schedule.`);
		},
	});
	const deleteSchedule = (id: string) => {
		setDeleted((current) => [...current, id]);
		withUndo({
			description: t`Schedule deleted`,
			commit: () => remove.mutate({ id }),
			onUndo: () => setDeleted((current) => current.filter((item) => item !== id)),
		});
	};
	const onScheduleChange = (next: string | undefined) => {
		if (!next) return overlay.close(() => setParam(undefined, true));
		if (!schedule) overlay.open();
		setParam(next, Boolean(schedule));
	};
	return { deleted, deleteSchedule, onScheduleChange };
}
