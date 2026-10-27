import type { SavedItem } from "../hooks";
import type { Application } from "@/features/applications/types";
import type { OfferTerms } from "@reactive-resume/schema/career";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@reactive-resume/ui/components/dialog";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { SegmentedControl, SegmentedControlItem } from "@reactive-resume/ui/components/segmented-control";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { parseAmount } from "../knowledge/amount";
import { Combobox } from "@/components/ui/combobox";
import { applicationsListQueryOptions } from "@/features/applications/queries";
import { useClosingValue } from "@/hooks/use-closing-value";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

const FULL_SCREEN_ON_PHONES =
	"max-sm:inset-s-0 max-sm:top-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none";

type Draft = {
	applicationId: string;
	version: "written" | "verbal";
	currency: string;
	period: "hour" | "month" | "year";
	base: string;
	variable: string;
	variableConditions: string;
	equity: string;
	location: string;
	officeDays: string;
	leave: string;
	learning: string;
	other: string;
	respondBy: string;
};

const amountText = (value: number | null) => (value === null ? "" : String(value));

function toDraft(application: Application | null, offer: SavedItem | null, currency: string): Draft {
	const terms = offer?.data.kind === "offer" ? offer.data : null;
	return {
		applicationId: application?.id ?? "",
		version: terms?.version ?? "written",
		currency: terms?.currency ?? currency,
		period: terms?.period ?? "year",
		base: amountText(terms?.base ?? null),
		variable: amountText(terms?.variable ?? null),
		variableConditions: terms?.variableConditions ?? "",
		equity: terms?.equity ?? "",
		location: terms?.location ?? application?.location ?? "",
		officeDays: terms?.officeDays === null || terms?.officeDays === undefined ? "" : String(terms.officeDays),
		leave: terms?.leave ?? "",
		learning: amountText(terms?.learning ?? null),
		other: terms?.other ?? "",
		respondBy: terms?.respondBy ? terms.respondBy.slice(0, 10) : "",
	};
}

type OfferDialogProps = {
	/** The application the offer belongs to; null lets the person choose one. */
	application: Application | null;
	/** An offer to correct; null adds a new one. */
	offer: SavedItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved?: ((offer: SavedItem) => void) | undefined;
};

/** Add an offer to an application, or correct the terms of one already saved. Unknown amounts stay empty, never zero. */
export function OfferDialog({ application, offer, open, onOpenChange, onSaved }: OfferDialogProps) {
	const [held, onOpenChangeComplete] = useClosingValue(open ? { application, offer } : null);
	const profile = useQuery(orpc.career.profile.queryOptions());
	const currency = profile.data?.minBase.currency ?? "USD";
	return (
		<Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
			<DialogContent
				closeLabel={t`Close`}
				className={cn(
					"flex max-h-[min(820px,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]",
					FULL_SCREEN_ON_PHONES,
				)}
			>
				{held && (
					<OfferForm
						key={`${held.application?.id ?? "any"}-${held.offer?.id ?? "new"}`}
						application={held.application}
						offer={held.offer}
						currency={currency}
						onClose={() => onOpenChange(false)}
						onSaved={onSaved}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

type FormProps = {
	application: Application | null;
	offer: SavedItem | null;
	currency: string;
	onClose: () => void;
	onSaved: OfferDialogProps["onSaved"];
};

function OfferForm({ application, offer, currency, onClose, onSaved }: FormProps) {
	const id = useId();
	const { i18n } = useLingui();
	const queryClient = useQueryClient();
	const applications = useQuery({ ...applicationsListQueryOptions(), enabled: !application });
	const [draft, setDraft] = useState(() => toDraft(application, offer, currency));
	const [attempted, setAttempted] = useState(false);
	const save = useMutation(orpc.career.saveOffer.mutationOptions());
	const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

	const base = parseAmount(draft.base, i18n.locale);
	const variable = parseAmount(draft.variable, i18n.locale);
	const learning = parseAmount(draft.learning, i18n.locale);
	const invalid = {
		base: base === undefined,
		variable: variable === undefined,
		learning: learning === undefined,
		currency: !/^[A-Z]{3}$/.test(draft.currency),
		application: !application && !draft.applicationId,
	};
	const blocked = Object.values(invalid).some(Boolean);

	const submit = () => {
		setAttempted(true);
		if (blocked || base === undefined || variable === undefined || learning === undefined) return;
		const terms: OfferTerms = {
			version: draft.version,
			currency: draft.currency,
			period: draft.period,
			base,
			variable,
			variableConditions: draft.variableConditions.trim(),
			equity: draft.equity.trim(),
			location: draft.location.trim(),
			officeDays: draft.officeDays === "" ? null : Number(draft.officeDays),
			leave: draft.leave.trim(),
			learning,
			other: draft.other.trim(),
			respondBy: draft.respondBy ? new Date(`${draft.respondBy}T12:00:00`).toISOString() : null,
		};
		save.mutate(
			{ applicationId: application?.id ?? draft.applicationId, ...(offer ? { id: offer.id } : {}), terms },
			{
				onSuccess: (saved) => {
					void queryClient.invalidateQueries({ queryKey: orpc.career.savedItems.key() });
					void queryClient.invalidateQueries({ queryKey: orpc.career.overview.key() });
					toast.add({ description: offer ? t`Offer updated` : t`Offer added` });
					onSaved?.(saved);
					onClose();
				},
				onError: (error) =>
					toast.add({
						type: "error",
						description: getOrpcErrorMessage(error, {
							fallback: t`Couldn't save this offer.`,
							allowServerMessage: true,
						}),
					}),
			},
		);
	};

	const error = (show: boolean, message: string) =>
		show && attempted ? <p className="text-xs text-danger-text">{message}</p> : null;

	return (
		<>
			<div className="grid gap-0.5 ps-6 pe-14 pt-5">
				<DialogTitle className="text-2xl leading-8">
					{offer ? <Trans>Edit offer</Trans> : <Trans>Add offer</Trans>}
				</DialogTitle>
				<DialogDescription className="text-[13px] leading-[18px]">
					{application ? (
						<>
							{application.role} · {application.company}
						</>
					) : (
						<Trans>Record the terms you were offered so you can compare them.</Trans>
					)}
				</DialogDescription>
			</div>
			<div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto overscroll-contain px-6 py-[18px]">
				{!application && (
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-application`} className="text-xs font-medium text-ink-2">
							<Trans>Application</Trans>
						</Label>
						<Combobox
							id={`${id}-application`}
							className="w-full"
							value={draft.applicationId || null}
							placeholder={t`Choose an application…`}
							emptyMessage={t`No applications yet.`}
							options={(applications.data ?? []).map((item) => ({
								value: item.id,
								label: `${item.company} — ${item.role}`,
								keywords: [item.company, item.role],
							}))}
							onValueChange={(value) => set("applicationId", value ?? "")}
						/>
						{error(invalid.application, t`Choose the application this offer is for.`)}
					</div>
				)}
				<SegmentedControl
					aria-label={t`Offer type`}
					value={draft.version}
					onValueChange={(value) => set("version", value as Draft["version"])}
					className="w-fit"
				>
					<SegmentedControlItem value="written">
						<Trans>Written offer</Trans>
					</SegmentedControlItem>
					<SegmentedControlItem value="verbal">
						<Trans>Verbal offer</Trans>
					</SegmentedControlItem>
				</SegmentedControl>

				<div className="grid gap-3 sm:grid-cols-3">
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-base`} className="text-xs font-medium text-ink-2">
							<Trans>Base pay</Trans>
						</Label>
						<Input
							id={`${id}-base`}
							inputMode="decimal"
							value={draft.base}
							aria-invalid={invalid.base && attempted ? true : undefined}
							onChange={(event) => set("base", event.target.value)}
						/>
						{error(invalid.base, t`Enter a full amount, such as 95000.`)}
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-currency`} className="text-xs font-medium text-ink-2">
							<Trans>Currency</Trans>
						</Label>
						<Input
							id={`${id}-currency`}
							maxLength={3}
							value={draft.currency}
							aria-invalid={invalid.currency && attempted ? true : undefined}
							onChange={(event) => set("currency", event.target.value.toUpperCase())}
						/>
						{error(invalid.currency, t`Use a three-letter code, such as EUR.`)}
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-period`} className="text-xs font-medium text-ink-2">
							<Trans>Paid per</Trans>
						</Label>
						<NativeSelect
							id={`${id}-period`}
							value={draft.period}
							onChange={(event) => set("period", event.target.value as Draft["period"])}
						>
							<option value="year">{t`Year`}</option>
							<option value="month">{t`Month`}</option>
							<option value="hour">{t`Hour`}</option>
						</NativeSelect>
					</div>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-variable`} className="text-xs font-medium text-ink-2">
							<Trans>Bonus or variable pay</Trans>
						</Label>
						<Input
							id={`${id}-variable`}
							inputMode="decimal"
							value={draft.variable}
							aria-invalid={invalid.variable && attempted ? true : undefined}
							onChange={(event) => set("variable", event.target.value)}
						/>
						{error(invalid.variable, t`Enter a full amount, such as 8000.`)}
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-conditions`} className="text-xs font-medium text-ink-2">
							<Trans>What the bonus depends on</Trans>
						</Label>
						<Input
							id={`${id}-conditions`}
							value={draft.variableConditions}
							onChange={(event) => set("variableConditions", event.target.value)}
						/>
					</div>
				</div>

				<div className="grid gap-1.5">
					<Label htmlFor={`${id}-equity`} className="text-xs font-medium text-ink-2">
						<Trans>Equity</Trans>
					</Label>
					<Textarea
						id={`${id}-equity`}
						rows={2}
						value={draft.equity}
						onChange={(event) => set("equity", event.target.value)}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-location`} className="text-xs font-medium text-ink-2">
							<Trans>Location</Trans>
						</Label>
						<Input
							id={`${id}-location`}
							value={draft.location}
							onChange={(event) => set("location", event.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-office`} className="text-xs font-medium text-ink-2">
							<Trans>Office days a week</Trans>
						</Label>
						<NativeSelect
							id={`${id}-office`}
							value={draft.officeDays}
							onChange={(event) => set("officeDays", event.target.value)}
						>
							<option value="">{t`Not stated`}</option>
							<option value="0">{t`None (remote)`}</option>
							{[1, 2, 3, 4, 5].map((days) => (
								<option key={days} value={days}>
									{days}
								</option>
							))}
						</NativeSelect>
					</div>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-leave`} className="text-xs font-medium text-ink-2">
							<Trans>Leave</Trans>
						</Label>
						<Input id={`${id}-leave`} value={draft.leave} onChange={(event) => set("leave", event.target.value)} />
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-learning`} className="text-xs font-medium text-ink-2">
							<Trans>Learning budget a year</Trans>
						</Label>
						<Input
							id={`${id}-learning`}
							inputMode="decimal"
							value={draft.learning}
							aria-invalid={invalid.learning && attempted ? true : undefined}
							onChange={(event) => set("learning", event.target.value)}
						/>
						{error(invalid.learning, t`Enter a full amount, such as 1500.`)}
					</div>
				</div>

				<div className="grid gap-1.5">
					<Label htmlFor={`${id}-other`} className="text-xs font-medium text-ink-2">
						<Trans>Anything else</Trans>
					</Label>
					<Textarea
						id={`${id}-other`}
						rows={2}
						value={draft.other}
						onChange={(event) => set("other", event.target.value)}
					/>
				</div>

				<div className="grid gap-1.5 sm:max-w-56">
					<Label htmlFor={`${id}-respond`} className="text-xs font-medium text-ink-2">
						<Trans>Respond by</Trans>
					</Label>
					<Input
						id={`${id}-respond`}
						type="date"
						value={draft.respondBy}
						onChange={(event) => set("respondBy", event.target.value)}
					/>
				</div>
				<p className="text-xs text-ink-3">
					<Trans>
						Leave an amount empty when you don't know it. Saving an offer does not change the application's stage.
					</Trans>
				</p>
			</div>
			<div className="flex justify-end gap-2 border-t border-line px-6 py-3.5">
				<Button variant="ghost" onClick={onClose}>
					<Trans>Cancel</Trans>
				</Button>
				<Button loading={save.isPending} onClick={submit}>
					{offer ? <Trans>Save changes</Trans> : <Trans>Add offer</Trans>}
				</Button>
			</div>
		</>
	);
}
