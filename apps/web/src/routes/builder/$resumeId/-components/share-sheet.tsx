import type { ShareTab } from "@/features/resume/editor/store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { useBreakpoint } from "@reactive-resume/ui/hooks/use-breakpoint";
import { cn } from "@reactive-resume/utils/style";
import { useEditorStore } from "@/features/resume/editor/store";
import { useEditorMode } from "@/features/resume/editor/use-editor-mode";
import { DownloadTab } from "@/features/resume/share/download-tab";
import { HistoryTab } from "@/features/resume/share/history-tab";
import { LinkTab } from "@/features/resume/share/link-tab";
import { useClosingValue } from "@/hooks/use-closing-value";

/**
 * Share & export: one sheet with Link, Download and History. Share opens Link, the ▾ beside Download PDF
 * opens Download and the clock opens History. 440px from the right; a full-height bottom sheet on phones.
 */
export function ShareSheet() {
	const tab = useEditorStore((state) => state.shareTab);
	// Closing keeps the open tab on screen until the sheet has slid away.
	const [shownTab, onOpenChangeComplete] = useClosingValue(tab);
	const setTab = useEditorStore((state) => state.setShareTab);
	const setHistoryVersion = useEditorStore((state) => state.setHistoryVersion);
	const [, setMode] = useEditorMode();
	const isPhone = useBreakpoint() === "mobile";

	return (
		<Sheet
			open={tab !== null}
			onOpenChange={(open) => !open && setTab(null)}
			onOpenChangeComplete={onOpenChangeComplete}
		>
			<SheetContent
				side={isPhone ? "bottom" : "right"}
				closeLabel={t`Close`}
				className={cn("gap-0", isPhone && "h-[calc(100svh-1.5rem)]")}
			>
				<SheetHeader className="px-5 pt-3.5 pb-2.5">
					<SheetTitle>
						<Trans>Share & export</Trans>
					</SheetTitle>
				</SheetHeader>

				<Tabs
					value={shownTab ?? "link"}
					onValueChange={(value) => {
						// The page shows a version only while History is open.
						if (value !== "history") setHistoryVersion(null);
						setTab(value as ShareTab);
					}}
					className="min-h-0 flex-1 gap-0"
				>
					<TabsList variant="line" aria-label={t`Share sections`} className="w-full justify-start gap-5 px-5">
						<TabsTrigger value="link">
							<Trans>Link</Trans>
						</TabsTrigger>
						<TabsTrigger value="download">
							<Trans>Download</Trans>
						</TabsTrigger>
						<TabsTrigger value="history">
							<Trans>History</Trans>
						</TabsTrigger>
					</TabsList>
					<TabsContent value="link" className="overflow-y-auto p-5">
						<LinkTab />
					</TabsContent>
					<TabsContent value="download" className="overflow-y-auto p-5">
						<DownloadTab
							onReview={() => {
								setTab(null);
								setMode("check");
							}}
						/>
					</TabsContent>
					<TabsContent value="history" className="overflow-y-auto p-5">
						<HistoryTab />
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	);
}
