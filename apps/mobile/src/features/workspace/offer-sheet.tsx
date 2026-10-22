import type { SavedItem } from "./hooks";
import type { Application } from "@/features/applications/types";
import type { OfferTerms } from "@reactive-resume/schema/career";
import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { workspaceError } from "./hooks";
import { client, orpc } from "@/api/client";
import { WallClockField } from "@/features/application-detail/date-field";
import { useApplications } from "@/features/applications/queries";
import { parseAmount } from "@/features/career/amount";
import { Banner, Button, Chip, EditorSheet, SelectSheet, Text, TextArea, TextField, useTheme } from "@/ui";

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
		applicationId: application?.id ?? offer?.applicationId ?? "",
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

type OfferSheetProps = {
	/** The application the offer belongs to; null lets the person choose one. */
	application: Application | null;
	/** An offer to correct; null adds a new one. */
	offer: SavedItem | null;
	onClose: () => void;
	onSaved?: ((offer: SavedItem) => void) | undefined;
};

/** Add an offer to an application, or correct the terms of one already saved. Unknown amounts stay empty, never zero. */
export function OfferSheet({ application, offer, onClose, onSaved }: OfferSheetProps) {
	const { t, i18n } = useLingui();
	const { space } = useTheme();
	const queryClient = useQueryClient();
	const profile = useQuery(orpc.career.profile.queryOptions());
	const applications = useApplications();
	const [draft, setDraft] = useState(() => toDraft(application, offer, profile.data?.minBase.currency ?? "USD"));
	const [attempted, setAttempted] = useState(false);
	const [error, setError] = useState<string>();
	const save = useMutation({
		mutationFn: (input: Parameters<typeof client.career.saveOffer>[0]) => client.career.saveOffer(input),
	});
	const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

	const base = parseAmount(draft.base, i18n.locale);
	const variable = parseAmount(draft.variable, i18n.locale);
	const learning = parseAmount(draft.learning, i18n.locale);
	const invalid = {
		base: base === undefined,
		variable: variable === undefined,
		learning: learning === undefined,
		currency: !/^[A-Z]{3}$/.test(draft.currency),
		application: !draft.applicationId,
	};
	const blocked = Object.values(invalid).some(Boolean);
	const show = (flag: boolean, message: string) => (attempted && flag ? message : undefined);

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
			{ applicationId: draft.applicationId, ...(offer ? { id: offer.id } : {}), terms },
			{
				onSuccess: async (saved) => {
					await queryClient.invalidateQueries({ queryKey: orpc.career.key() });
					onSaved?.(saved);
					onClose();
				},
				onError: (failure) => setError(workspaceError(failure, t`Couldn't save this offer.`)),
			},
		);
	};

	return (
		<EditorSheet
			onClose={onClose}
			dirty={
				JSON.stringify(draft) !== JSON.stringify(toDraft(application, offer, profile.data?.minBase.currency ?? "USD"))
			}
			pending={save.isPending}
			detents={[0.92]}
			title={offer ? t`Edit offer` : t`Add offer`}
			footer={
				<Button
					size="lg"
					fullWidth
					label={offer ? t`Save changes` : t`Add offer`}
					loading={save.isPending}
					onPress={submit}
				/>
			}
		>
			<View style={{ gap: space.s4 }}>
				{error ? <Banner tone="danger" message={error} /> : null}
				{application ? (
					<Text color="ink2">
						{application.role} · {application.company}
					</Text>
				) : offer ? null : (
					<SelectSheet
						label={t`Application`}
						value={draft.applicationId || null}
						placeholder={t`Choose an application…`}
						onChange={(id) => set("applicationId", id ?? "")}
						options={(applications.data ?? []).map((item) => ({
							value: item.id,
							label: `${item.company} — ${item.role}`,
						}))}
					/>
				)}
				{show(invalid.application, t`Choose the application this offer is for.`) ? (
					<Text color="dangerText">{t`Choose the application this offer is for.`}</Text>
				) : null}
				<View style={{ flexDirection: "row", gap: space.s2 }}>
					<Chip
						label={t`Written offer`}
						selected={draft.version === "written"}
						onPress={() => set("version", "written")}
					/>
					<Chip
						label={t`Verbal offer`}
						selected={draft.version === "verbal"}
						onPress={() => set("version", "verbal")}
					/>
				</View>
				<TextField
					label={t`Base pay`}
					value={draft.base}
					keyboardType="decimal-pad"
					error={show(invalid.base, t`Enter a full amount, such as 95000.`)}
					onChangeText={(value) => set("base", value)}
				/>
				<View style={{ flexDirection: "row", gap: space.s3 }}>
					<View style={{ flex: 1 }}>
						<TextField
							label={t`Currency`}
							value={draft.currency}
							maxLength={3}
							autoCapitalize="characters"
							error={show(invalid.currency, t`Use a three-letter code, such as EUR.`)}
							onChangeText={(value) => set("currency", value.toUpperCase())}
						/>
					</View>
					<View style={{ flex: 1 }}>
						<SelectSheet
							label={t`Paid per`}
							value={draft.period}
							onChange={(period) => set("period", period as Draft["period"])}
							options={[
								{ value: "year", label: t`Year` },
								{ value: "month", label: t`Month` },
								{ value: "hour", label: t`Hour` },
							]}
						/>
					</View>
				</View>
				<TextField
					label={t`Bonus or variable pay`}
					value={draft.variable}
					keyboardType="decimal-pad"
					error={show(invalid.variable, t`Enter a full amount, such as 8000.`)}
					onChangeText={(value) => set("variable", value)}
				/>
				<TextField
					label={t`What the bonus depends on`}
					value={draft.variableConditions}
					onChangeText={(value) => set("variableConditions", value)}
				/>
				<TextArea label={t`Equity`} value={draft.equity} minLines={2} onChangeText={(value) => set("equity", value)} />
				<TextField label={t`Location`} value={draft.location} onChangeText={(value) => set("location", value)} />
				<SelectSheet
					label={t`Office days a week`}
					value={draft.officeDays}
					onChange={(value) => set("officeDays", value ?? "")}
					options={[
						{ value: "", label: t`Not stated` },
						{ value: "0", label: t`None (remote)` },
						...[1, 2, 3, 4, 5].map((days) => ({ value: String(days), label: String(days) })),
					]}
				/>
				<TextField label={t`Leave`} value={draft.leave} onChangeText={(value) => set("leave", value)} />
				<TextField
					label={t`Learning budget a year`}
					value={draft.learning}
					keyboardType="decimal-pad"
					error={show(invalid.learning, t`Enter a full amount, such as 1500.`)}
					onChangeText={(value) => set("learning", value)}
				/>
				<TextArea
					label={t`Anything else`}
					value={draft.other}
					minLines={2}
					onChangeText={(value) => set("other", value)}
				/>
				<WallClockField
					label={t`Respond by`}
					mode="date"
					value={draft.respondBy}
					clearable
					onChange={(value) => set("respondBy", value)}
				/>
				<Text variant="callout" color="ink3">
					{t`Leave an amount empty when you don't know it. Saving an offer does not change the application's stage.`}
				</Text>
			</View>
		</EditorSheet>
	);
}
