import type { Application } from "../../types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { toast } from "@reactive-resume/ui/components/toast";
import { useInvalidateApplications } from "../../use-application-actions";
import { isImeComposing } from "@/libs/keyboard";
import { orpc } from "@/libs/orpc/client";

type InlineFactProps = { label: string; value: string | null; onSave: (value: string | null) => void };

/** A fact that edits in place: click to type, Enter or leaving saves, Esc cancels. */
export function InlineFact({ label, value, onSave }: InlineFactProps) {
	const id = useId();
	const [draft, setDraft] = useState<string | null>(null);

	const commit = () => {
		if (draft === null) return;
		const next = draft.trim() || null;
		if (next !== (value ?? null)) onSave(next);
		setDraft(null);
	};

	return (
		<div className="grid gap-0.5">
			<dt className="text-xs font-semibold text-ink-3 uppercase">
				<label htmlFor={id}>{label}</label>
			</dt>
			<dd>
				{draft === null ? (
					<button
						id={id}
						type="button"
						onClick={() => setDraft(value ?? "")}
						className="w-full truncate rounded-md text-start text-sm font-medium hover:bg-hover"
					>
						{value || "—"}
					</button>
				) : (
					<Input
						id={id}
						autoFocus
						value={draft}
						className="h-8"
						onChange={(event) => setDraft(event.target.value)}
						onBlur={commit}
						onKeyDown={(event) => {
							if (isImeComposing(event)) return;
							if (event.key === "Enter") commit();
							if (event.key === "Escape") {
								event.stopPropagation();
								setDraft(null);
							}
						}}
					/>
				)}
			</dd>
		</div>
	);
}

export function Tags({ application }: { application: Application }) {
	const invalidate = useInvalidateApplications();
	const [tag, setTag] = useState("");
	const update = useMutation({
		...orpc.applications.update.mutationOptions(),
		onSuccess: () => invalidate(application.id),
		onError: () => toast.add({ type: "error", description: t`Couldn't save the tags.` }),
	});
	const save = (tags: string[]) => update.mutate({ id: application.id, tags });

	return (
		<section aria-labelledby="application-tags" className="grid gap-2">
			<h3 id="application-tags" className="text-xs font-semibold text-ink-3 uppercase">
				<Trans>Tags</Trans>
			</h3>
			<div className="flex flex-wrap items-center gap-1.5">
				{application.tags.map((value) => (
					<span key={value} className="flex h-7 items-center gap-1 rounded-md bg-sunken ps-2 text-xs">
						{value}
						<button
							type="button"
							aria-label={t`Remove ${value}`}
							onClick={() => save(application.tags.filter((item) => item !== value))}
							className="grid size-6 place-items-center rounded text-ink-3 hover:text-ink"
						>
							<Icon name="x" size={14} />
						</button>
					</span>
				))}
				<form
					onSubmit={(event) => {
						event.preventDefault();
						const value = tag.trim();
						if (!value || application.tags.includes(value)) return setTag("");
						save([...application.tags, value]);
						setTag("");
					}}
				>
					<Input
						aria-label={t`Add a tag`}
						placeholder={t`Add a tag`}
						value={tag}
						className="h-7 w-28 text-xs"
						onChange={(event) => setTag(event.target.value)}
					/>
				</form>
			</div>
		</section>
	);
}

/** Salary and Source, edited in place. */
export function KeyFacts({ application }: { application: Application }) {
	const invalidate = useInvalidateApplications();
	const update = useMutation({
		...orpc.applications.update.mutationOptions(),
		onSuccess: () => invalidate(application.id),
		onError: () => toast.add({ type: "error", description: t`Couldn't save.` }),
	});
	return (
		<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
			<InlineFact
				label={t`Salary`}
				value={application.salary}
				onSave={(salary) => update.mutate({ id: application.id, salary })}
			/>
			<InlineFact
				label={t`Source`}
				value={application.source}
				onSave={(source) => update.mutate({ id: application.id, source })}
			/>
		</dl>
	);
}
