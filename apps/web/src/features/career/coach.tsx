import type { MessageContext } from "@/features/assistant/chat";
import type { RouterOutput } from "@/libs/orpc/client";
import type { IconName } from "@reactive-resume/ui/components/icon";
import type { UIMessage } from "ai";
import { plural, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@reactive-resume/ui/components/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@reactive-resume/ui/components/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { Icon } from "@reactive-resume/ui/components/icon";
import { IconButton } from "@reactive-resume/ui/components/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@reactive-resume/ui/components/popover";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { SwitchRow } from "@reactive-resume/ui/components/switch";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import {
	CoachThread,
	connectionName,
	copyToClipboard,
	deleteConversation,
	titleFor,
	useCoachKnowledge,
	useConversationDate,
} from "./coach-thread";
import { CareerLoadError } from "./load-state";
import { useDayOffset } from "./section";
import { Eyebrow, PrivacyLine, useNow } from "./shared";
import { applicationsListQueryOptions } from "@/features/applications/queries";
import { transcriptOf, useConversationConnection } from "@/features/assistant/chat";
import { ProviderSetup } from "@/features/assistant/provider-setup";
import { AiProviderLoadState } from "@/features/settings/integrations/ai-provider-load-state";
import { useHasUsableAiProvider } from "@/features/settings/integrations/hooks/use-has-usable-ai-provider";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { client, orpc } from "@/libs/orpc/client";

type ThreadSummary = RouterOutput["agent"]["threads"]["list"][number];
type UsableProvider = ReturnType<typeof useHasUsableAiProvider>["usableProviders"][number];

// ---- Context chips: per conversation, in this browser; new conversations start from the defaults. ----

type Chips = { application: boolean; memory: boolean; web: boolean; offers: boolean };
const DEFAULT_CHIPS: Chips = { application: true, memory: true, web: false, offers: true };
const chipsKey = (id: string) => `career-context:${id}`;

function readChips(id: string | null): Chips {
	if (!id) return DEFAULT_CHIPS;
	try {
		const raw = localStorage.getItem(chipsKey(id));
		return raw ? { ...DEFAULT_CHIPS, ...(JSON.parse(raw) as Partial<Chips>) } : DEFAULT_CHIPS;
	} catch {
		return DEFAULT_CHIPS;
	}
}

function writeChips(id: string, chips: Chips) {
	try {
		localStorage.setItem(chipsKey(id), JSON.stringify(chips));
	} catch {
		// A convenience: without storage the chips reset when the conversation reopens.
	}
}

function readOfferIds(id: string | null): string[] {
	if (!id) return [];
	try {
		const value: unknown = JSON.parse(localStorage.getItem(`career-offers:${id}`) ?? "[]");
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 2)
			: [];
	} catch {
		return [];
	}
}

function writeOfferIds(id: string, offers: string[]) {
	try {
		localStorage.setItem(`career-offers:${id}`, JSON.stringify(offers));
	} catch {
		/* Storage may be unavailable. The URL still carries this session's selection. */
	}
}

/** The server's title for a conversation, from its first message, so the list doesn't change after a refetch. */
const titleOf = (text: string) => (text.length > 47 ? `${text.slice(0, 44)}...` : text);

type CoachPageProps = { conversationId: string | undefined; offerIds: string[] };

/** C7–C11: conversations about the whole search, with what each message shares chosen in the composer. */
export function CoachPage({ conversationId, offerIds: routeOfferIds }: CoachPageProps) {
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const providers = useHasUsableAiProvider();
	const threads = useQuery(orpc.agent.threads.list.queryOptions());
	const knowledge = useCoachKnowledge(null);
	const [railOpen, setRailOpen] = useState(false);
	const [modelMenuOpen, setModelMenuOpen] = useState(false);
	const [providerId, setProviderId] = useState<string | null>(null);
	const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
	const created = useRef<ThreadSummary | null>(null);

	// The conversation shown: the URL's, or the one just created here while the URL catches up. Arriving at the thread
	// that was just created keeps the chat mounted, so its first answer keeps streaming.
	const [session, setSession] = useState({ key: 0, created: null as string | null, url: conversationId });
	if (session.url !== conversationId) {
		const same = conversationId !== undefined && conversationId === session.created;
		setSession({
			key: same ? session.key : session.key + 1,
			created: same ? session.created : null,
			url: conversationId,
		});
	}
	const threadId = conversationId ?? session.created;
	const offerIds = routeOfferIds.length > 0 ? routeOfferIds : readOfferIds(threadId);
	useEffect(() => {
		if (threadId && routeOfferIds.length > 0) writeOfferIds(threadId, routeOfferIds);
	}, [threadId, routeOfferIds]);

	const [stored, setStored] = useState(() => ({ id: threadId, chips: readChips(threadId) }));
	if (stored.id !== threadId) {
		// The conversation just created here keeps the chips it was started with; storage may be blocked or full.
		const justCreated = stored.id === null && threadId !== null && threadId === session.created;
		setStored({ id: threadId, chips: justCreated ? stored.chips : readChips(threadId) });
	}
	const chips = stored.chips;
	const setChips = (next: Chips) => {
		setStored({ id: threadId, chips: next });
		if (threadId) writeChips(threadId, next);
	};

	const listKey = orpc.agent.threads.list.queryKey();
	const conversations = (threads.data ?? []).filter((thread) => thread.scope === "career" && !hidden.has(thread.id));
	const summary = threads.data?.find((thread) => thread.id === threadId);
	const usable = providers.usableProviders;
	// A conversation runs on its own connection; one switched off or removed moves to the default.
	const provider = usable.find((item) => item.id === (summary ? summary.aiProviderId : providerId)) ?? usable[0];
	useConversationConnection(summary, provider);
	const label = provider?.label ?? summary?.providerLabel ?? t`Your AI`;
	const connection = connectionName(label);

	const context: MessageContext = {
		// A career conversation has no document or posting to leave out.
		document: true,
		posting: true,
		application: chips.application,
		memory: chips.memory,
		web: chips.web,
		...(offerIds.length > 0 && chips.offers ? { offerIds } : {}),
	};

	const createThread = async () => {
		const thread = await client.agent.threads.start({
			scope: "career",
			...(provider ? { aiProviderId: provider.id } : {}),
		});
		created.current = thread;
		return thread.id;
	};

	const onThreadCreated = (id: string, text: string) => {
		queryClient.setQueryData(listKey, (old) => {
			const thread = old?.find((item) => item.id === id) ?? (created.current?.id === id ? created.current : undefined);
			if (!old || !thread) return old;
			return [{ ...thread, title: titleOf(text), lastMessageAt: new Date() }, ...old.filter((item) => item.id !== id)];
		});
		// No longer a draft: the URL names it from here on.
		created.current = null;
		writeChips(id, chips);
		writeOfferIds(id, offerIds);
		setSession((current) => ({ ...current, created: id }));
		void navigate({
			to: "/dashboard/coach/{-$conversationId}",
			params: { conversationId: id },
			search: offerIds.length > 0 ? { offers: offerIds } : {},
			replace: true,
		});
	};

	const chooseProvider = async (id: string) => {
		setProviderId(id);
		// A draft created for an attachment exists before the URL names it.
		const target = threadId ?? created.current?.id;
		if (!target) return;
		const chosen = usable.find((item) => item.id === id);
		queryClient.setQueryData(listKey, (old) =>
			old?.map((thread) =>
				thread.id === target ? { ...thread, aiProviderId: id, providerLabel: chosen?.label ?? null } : thread,
			),
		);
		try {
			await client.agent.threads.update({ id: target, aiProviderId: id });
		} catch (error) {
			toast.add({
				type: "error",
				description: getOrpcErrorMessage(error, { fallback: t`Couldn't switch connections.` }),
			});
		}
		void queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.key() });
	};

	const rename = async (thread: ThreadSummary, title: string) => {
		const next = title.trim();
		if (!next || next === thread.title || next === titleFor(thread)) return;
		queryClient.setQueryData(listKey, (old) =>
			old?.map((item) => (item.id === thread.id ? { ...item, title: next } : item)),
		);
		try {
			await client.agent.threads.update({ id: thread.id, title: next });
		} catch (error) {
			toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback: t`Couldn't rename it.` }) });
		}
		void queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.key() });
	};

	const remove = (thread: ThreadSummary) =>
		deleteConversation(
			queryClient,
			thread.id,
			() => {
				setHidden((current) => new Set(current).add(thread.id));
				if (thread.id === threadId)
					void navigate({ to: "/dashboard/coach/{-$conversationId}", params: { conversationId: undefined } });
			},
			() =>
				setHidden((current) => {
					const next = new Set(current);
					next.delete(thread.id);
					return next;
				}),
		);

	// The privacy line names exactly what goes. The chips choose what this message adds; earlier messages always go.
	const parts = [
		t`your message`,
		t`earlier messages in this chat`,
		...(chips.application ? [t`application summaries`] : []),
		...(context.offerIds ? [plural(offerIds.length, { one: "# saved offer", other: "# saved offers" })] : []),
		...(chips.memory
			? [
					t`your preferences`,
					...(knowledge.active.length > 0
						? [plural(knowledge.active.length, { one: "# fact", other: "# facts" })]
						: []),
					...(knowledge.stories.length > 0 ? [t`your stories`] : []),
				]
			: []),
	];
	const shared = new Intl.ListFormat(i18n.locale, { type: "conjunction" }).format(parts);
	const privacy = (
		<PrivacyLine>
			{chips.memory && knowledge.isError
				? t`Knowledge couldn't load. Try again or switch Knowledge off before sending.`
				: chips.memory && knowledge.isPending
					? t`Loading Knowledge before you send…`
					: t`When you press send, ${shared} go to ${connection}.`}
			{chips.web && ` ${t`Search terms go to your web search service.`}`}
		</PrivacyLine>
	);

	const activeContext = [chips.application, chips.memory, chips.web, offerIds.length > 0 && chips.offers].filter(
		Boolean,
	).length;
	const contextChips = (
		<>
			{chips.memory && knowledge.isError && <CareerLoadError onRetry={knowledge.retry} />}
			<Popover>
				<PopoverTrigger
					render={
						<button
							type="button"
							aria-label={t`Choose what the coach can use`}
							className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-line-2 bg-sunken px-2.5 text-xs font-medium text-ink-2 transition-colors duration-quick hover:text-ink aria-expanded:text-ink"
						/>
					}
				>
					<Icon name="sliders-horizontal" size={16} />
					<Trans>Context</Trans>
					<span className="font-mono text-ink-3">{activeContext}</span>
				</PopoverTrigger>
				<PopoverContent align="start" side="top" className="w-[340px] gap-1 p-2">
					<p className="px-2 pt-1 pb-1 text-xs text-ink-3">
						<Trans>What this message can use. Earlier messages in this chat always go.</Trans>
					</p>
					<SwitchRow
						checked={chips.application}
						onCheckedChange={(application) => setChips({ ...chips, application })}
						label={<span className="font-medium">{t`Applications`}</span>}
						description={t`Summaries of your open applications`}
						className="rounded-lg px-2 py-2"
					/>
					<SwitchRow
						checked={chips.memory}
						onCheckedChange={(memory) => setChips({ ...chips, memory })}
						label={
							<span className="font-medium">
								{plural(knowledge.active.length, { one: "Knowledge · # fact", other: "Knowledge · # facts" })}
							</span>
						}
						description={t`Facts, stories and preferences that are switched on in Knowledge`}
						className="rounded-lg px-2 py-2"
					/>
					<SwitchRow
						checked={chips.web}
						onCheckedChange={(web) => setChips({ ...chips, web })}
						label={<span className="font-medium">{t`Web research`}</span>}
						description={t`Lets the coach search public pages through your web search service`}
						className="rounded-lg px-2 py-2"
					/>
					{offerIds.length > 0 && (
						<SwitchRow
							checked={chips.offers}
							onCheckedChange={(offers) => setChips({ ...chips, offers })}
							label={
								<span className="font-medium">
									{plural(offerIds.length, { one: "# saved offer", other: "# saved offers" })}
								</span>
							}
							description={t`The offers you chose to compare, with their terms`}
							className="rounded-lg px-2 py-2"
						/>
					)}
				</PopoverContent>
			</Popover>
		</>
	);

	const header = (messages: readonly UIMessage[]) => (
		<header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-6 max-sm:px-3">
			<Popover open={railOpen} onOpenChange={setRailOpen}>
				<PopoverTrigger
					render={
						<button
							type="button"
							aria-label={t`Conversations`}
							className="-ms-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-ink-2 transition-colors duration-quick hover:bg-hover hover:text-ink aria-expanded:bg-hover aria-expanded:text-ink"
						/>
					}
				>
					<Icon name="clock-counter-clockwise" size={18} />
					<span className="text-xs font-medium max-sm:sr-only">
						<Trans>History</Trans>
					</span>
				</PopoverTrigger>
				<PopoverContent align="start" side="bottom" className="flex max-h-[70svh] w-[340px] gap-0 overflow-hidden p-3">
					{rail}
				</PopoverContent>
			</Popover>
			<Button
				variant="ghost"
				size="sm"
				className="text-ink-2"
				nativeButton={false}
				render={<Link to="/dashboard/knowledge/facts" />}
			>
				<Icon name="list-checks" size={18} />
				<span className="max-sm:sr-only">
					<Trans>Knowledge</Trans>
				</span>
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				className="text-ink-2"
				aria-label={t`New conversation`}
				nativeButton={false}
				render={<Link to="/dashboard/coach/{-$conversationId}" params={{ conversationId: undefined }} />}
			>
				<Icon name="note-pencil" size={18} />
			</Button>
			<Icon name="sparkle" size={20} className="shrink-0 text-accent-text" />
			<h2 className="me-auto min-w-0 truncate text-sm font-semibold">{titleFor(summary)}</h2>
			{(usable.length > 0 || summary) && (
				<ModelChip
					open={modelMenuOpen}
					onOpenChange={setModelMenuOpen}
					providers={usable}
					current={provider}
					label={label}
					onChoose={(id) => void chooseProvider(id)}
				/>
			)}
			<IconButton
				icon="copy"
				label={t`Copy conversation`}
				size="icon-sm"
				className="text-ink-2"
				disabled={messages.length === 0}
				onClick={() =>
					void copyToClipboard(
						transcriptOf(messages, { user: t`You`, assistant: t`Coach`, sources: t`Sources` }),
						t`Conversation copied`,
					)
				}
			/>
		</header>
	);

	const notSetUp = threads.error instanceof ORPCError && threads.error.code === "PRECONDITION_FAILED";
	const noProvider = !providers.isUnavailable && !providers.hasUsableProvider;

	const jobConversations = (threads.data ?? [])
		.filter((thread) => thread.scope === "application" && thread.applicationId && !hidden.has(thread.id))
		.slice(0, 8);
	const rail = (
		<ConversationRail
			threads={conversations}
			jobThreads={jobConversations}
			currentId={threadId}
			onNavigate={() => setRailOpen(false)}
			onRename={(thread, title) => void rename(thread, title)}
			onDelete={remove}
		/>
	);

	return (
		// The card fills what's left of the page height and scrolls inside.
		<div className="relative min-h-[480px] flex-1">
			<div className="absolute inset-0 grid">
				<section aria-label={t`Coach`} className="flex min-h-0 min-w-0 flex-col">
					{notSetUp ? (
						<>
							{header([])}
							<p className="m-6 rounded-xl bg-sunken p-4 text-sm text-ink-2">
								<Trans>
									The coach isn't set up on this server. Whoever runs it needs to set ENCRYPTION_SECRET. Knowledge,
									Offers and your applications work without it.
								</Trans>
							</p>
						</>
					) : providers.error ? (
						<AiProviderLoadState
							state={{
								...providers,
								retry: () => {
									providers.retry();
									void threads.refetch();
									knowledge.retry();
								},
							}}
						/>
					) : providers.isLoading || threads.isPending ? (
						<div className="grid flex-1 place-items-center">
							<Spinner />
						</div>
					) : threads.isError && !threads.data ? (
						<CareerLoadError
							onRetry={() => {
								void threads.refetch();
								providers.retry();
							}}
						/>
					) : noProvider && !threadId ? (
						<>
							{header([])}
							<div className="min-h-0 flex-1 overflow-y-auto">
								<div className="mx-auto max-w-[560px] py-6">
									<ProviderSetup />
								</div>
							</div>
						</>
					) : (
						<CoachThread
							key={session.key}
							draftKey={`career-coach:${threadId ?? "new"}`}
							threadId={threadId}
							createThread={createThread}
							onThreadCreated={onThreadCreated}
							applicationId={null}
							context={context}
							connection={connection}
							onChangeConnection={() => setModelMenuOpen(true)}
							header={header}
							empty={(send) => (
								<EmptyState
									disabled={noProvider || (chips.memory && (knowledge.isPending || knowledge.isError))}
									onPick={send}
								/>
							)}
							chips={contextChips}
							privacy={privacy}
							placeholder={t`Ask about your next career step…`}
							disabled={noProvider || (chips.memory && (knowledge.isPending || knowledge.isError))}
							variant="page"
						/>
					)}
				</section>
			</div>
		</div>
	);
}

type EmptyStateProps = { disabled: boolean; onPick: (text: string) => void };

function EmptyState({ disabled, onPick }: EmptyStateProps) {
	const starters: Array<{ icon: IconName; text: string }> = [
		{ icon: "list-magnifying-glass", text: t`Which opportunities best match my priorities?` },
		{
			icon: "list-numbers",
			text: t`Help me turn an accomplishment into a Situation, Task, Action, Result and Reflection story.`,
		},
		{ icon: "user-sound", text: t`What interview answers should I practise?` },
	];
	return (
		<div className="grid gap-6 pt-[clamp(0px,6vh,48px)]">
			<div className="grid gap-3">
				<h3 className="font-display text-[30px] leading-9 font-[750] tracking-[-0.035em]">
					<Trans>What are you working on?</Trans>
				</h3>
				<p className="text-[15px] leading-[23px] text-ink-2">
					<Trans>
						Ask about your search, or bring an accomplishment you want to explain better. Answers use what's switched on
						below and say what they relied on.
					</Trans>
				</p>
			</div>
			<div className="grid gap-2.5 sm:grid-cols-3">
				{starters.map((starter) => (
					<button
						key={starter.icon}
						type="button"
						disabled={disabled}
						onClick={() => onPick(starter.text)}
						className="flex min-h-[128px] flex-col items-start gap-3 rounded-xl border border-line bg-raised p-3.5 text-start text-sm leading-5 shadow-e1 transition-[box-shadow,scale] duration-quick ease-enter hover:shadow-e2 enabled:active:scale-[0.98] disabled:opacity-60"
					>
						<Icon name={starter.icon} size={22} className="text-accent-text" />
						{starter.text}
					</button>
				))}
			</div>
		</div>
	);
}

type ModelChipProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	providers: readonly UsableProvider[];
	current: UsableProvider | undefined;
	label: string;
	onChoose: (id: string) => void;
};

/** "Demo AI · gpt-4.1-mini": the connection this conversation uses; the menu switches it. */
function ModelChip({ open, onOpenChange, providers, current, label, onChoose }: ModelChipProps) {
	const navigate = useNavigate();
	const text = current ? `${current.label} · ${current.model}` : label;
	return (
		<DropdownMenu open={open} onOpenChange={onOpenChange}>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						aria-label={t`Connection: ${text}`}
						className="flex h-7 max-w-[50%] min-w-0 items-center rounded-sm bg-sunken px-2 font-mono text-xs text-ink-2 transition-colors duration-quick hover:text-ink aria-expanded:text-ink"
					/>
				}
			>
				<span className="truncate">{text}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				{providers.map((item) => (
					<DropdownMenuItem key={item.id} onClick={() => onChoose(item.id)}>
						<span className="grid min-w-0 flex-1">
							<span className="truncate">{item.label}</span>
							<span className="truncate font-mono text-xs text-ink-3">{item.model}</span>
						</span>
						{item.id === current?.id && <Icon name="check" size={16} />}
					</DropdownMenuItem>
				))}
				{providers.length > 0 && <DropdownMenuSeparator />}
				<DropdownMenuItem onClick={() => void navigate({ to: "/dashboard/settings/ai" })}>
					<Trans>Connect another…</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// ---- Rail ----

type ConversationRailProps = {
	threads: ThreadSummary[];
	/** Conversations about one job, which live in that job's workspace. */
	jobThreads: ThreadSummary[];
	currentId: string | null;
	onNavigate: () => void;
	onRename: (thread: ThreadSummary, title: string) => void;
	onDelete: (thread: ThreadSummary) => void;
};

function ConversationRail({ threads, jobThreads, currentId, onNavigate, onRename, onDelete }: ConversationRailProps) {
	const when = useConversationDate();
	const now = useNow();
	const dayOffset = useDayOffset();
	const dayGroup = (thread: ThreadSummary) => {
		const offset = dayOffset(thread.lastMessageAt, now);
		return offset === 0 || offset === 1 ? "today" : offset === -1 ? "yesterday" : "earlier";
	};
	const applications = useQuery(applicationsListQueryOptions());
	const [renaming, setRenaming] = useState<string | null>(null);

	return (
		<nav aria-label={t`Conversations`} className="flex min-h-0 flex-1 flex-col gap-4">
			<Link
				to="/dashboard/coach/{-$conversationId}"
				params={{ conversationId: undefined }}
				onClick={onNavigate}
				className={cn(buttonVariants({ variant: "secondary" }), "justify-start gap-2")}
			>
				<Icon name="note-pencil" size={18} />
				<Trans>New conversation</Trans>
			</Link>

			<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
				{currentId === null && (
					<ul className="grid gap-0.5">
						<li aria-current="page" className="grid gap-0.5 rounded-lg bg-accent-soft px-2.5 py-2">
							<span className="text-[13px] leading-[18px] font-bold text-accent-text">
								<Trans>New conversation</Trans>
							</span>
							<span className="text-xs text-ink-3">
								<Trans>Now</Trans>
							</span>
						</li>
					</ul>
				)}
				{(
					[
						["today", t`Today`],
						["yesterday", t`Yesterday`],
						["earlier", t`Earlier`],
					] as const
				).map(([key, label]) => {
					const rows = threads.filter((thread) => dayGroup(thread) === key);
					if (rows.length === 0) return null;
					return (
						<div key={key} className="flex flex-col gap-1.5">
							<Eyebrow className="px-2.5">{label}</Eyebrow>
							<ul className="-mx-1 grid content-start gap-0.5 px-1">
								{rows.map((thread) => (
									<RailItem
										key={thread.id}
										thread={thread}
										current={thread.id === currentId}
										date={when(new Date(thread.lastMessageAt))}
										renaming={renaming === thread.id}
										onRenameStart={() => setRenaming(thread.id)}
										onRenameEnd={(title) => {
											setRenaming(null);
											if (title !== null) onRename(thread, title);
										}}
										onDelete={() => onDelete(thread)}
										onNavigate={onNavigate}
									/>
								))}
							</ul>
						</div>
					);
				})}
			</div>

			{jobThreads.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<Eyebrow className="px-2.5">
						<Trans>About a job</Trans>
					</Eyebrow>
					<ul className="grid gap-0.5">
						{jobThreads.map((thread) => {
							const application = applications.data?.find((item) => item.id === thread.applicationId);
							return (
								<li key={thread.id}>
									<Link
										to="/dashboard/applications/$applicationId/{-$tab}"
										params={{ applicationId: thread.applicationId ?? "", tab: undefined }}
										search={{ coach: thread.id }}
										onClick={onNavigate}
										className="grid gap-0.5 rounded-lg px-2.5 py-2 transition-colors duration-quick hover:bg-hover"
									>
										<span className="truncate text-[13px] leading-[18px] font-medium">{titleFor(thread)}</span>
										<span className="truncate text-xs text-ink-3">
											{application ? `${application.company} · ${application.role}` : t`Open the application`}
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			)}
			<p className="rounded-xl border border-accent/20 bg-accent-soft px-3 py-2.5 text-xs leading-[1.6] text-ink">
				<Trans>Conversations about one job live in its workspace; open them from here or from the job.</Trans>
			</p>
		</nav>
	);
}

type RailItemProps = {
	thread: ThreadSummary;
	current: boolean;
	date: string;
	renaming: boolean;
	onRenameStart: () => void;
	/** The new title, or null when renaming was cancelled. */
	onRenameEnd: (title: string | null) => void;
	onDelete: () => void;
	onNavigate: () => void;
};

/** A conversation: open it; the hover ⋯ or a right-click renames (in place) or deletes it (with Undo). */
function RailItem({
	thread,
	current,
	date,
	renaming,
	onRenameStart,
	onRenameEnd,
	onDelete,
	onNavigate,
}: RailItemProps) {
	const cancelled = useRef(false);
	const title = titleFor(thread);

	return (
		<ContextMenu>
			<ContextMenuTrigger render={<li className="group/row relative" />}>
				{renaming ? (
					<input
						// oxlint-disable-next-line jsx-a11y/no-autofocus -- Rename was just chosen; typing goes straight into the name
						autoFocus
						defaultValue={title}
						aria-label={t`Conversation name`}
						maxLength={200}
						onFocus={(event) => event.currentTarget.select()}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								event.currentTarget.blur();
							}
							if (event.key === "Escape") {
								event.preventDefault();
								cancelled.current = true;
								event.currentTarget.blur();
							}
						}}
						onBlur={(event) => {
							onRenameEnd(cancelled.current ? null : event.currentTarget.value);
							cancelled.current = false;
						}}
						className="h-[54px] w-full rounded-lg border border-accent bg-raised px-2.5 text-base font-medium outline-none md:text-[13px]"
					/>
				) : (
					<Link
						to="/dashboard/coach/{-$conversationId}"
						params={{ conversationId: thread.id }}
						aria-current={current ? "page" : undefined}
						onClick={onNavigate}
						className={cn(
							"grid gap-0.5 rounded-lg py-2 ps-2.5 pe-9 transition-colors duration-quick",
							current ? "bg-sunken" : "hover:bg-hover",
						)}
					>
						<span className="line-clamp-2 text-[13px] leading-[18px] font-medium">{title}</span>
						<span className="text-xs text-ink-3">{date}</span>
					</Link>
				)}
				{!renaming && (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<button
									type="button"
									aria-label={t`More for ${title}`}
									className="absolute inset-e-1 top-1.5 grid size-7 place-items-center rounded-sm text-ink-3 opacity-0 transition-[opacity,background-color,color] duration-quick group-hover/row:opacity-100 hover:bg-hover hover:text-ink focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100"
								/>
							}
						>
							<Icon name="dots-three" size={18} />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" finalFocus={false}>
							<DropdownMenuItem onClick={onRenameStart}>
								<Icon name="pencil-simple" size={18} />
								<Trans>Rename</Trans>
							</DropdownMenuItem>
							<DropdownMenuItem variant="destructive" onClick={onDelete}>
								<Icon name="trash" size={18} />
								<Trans>Delete</Trans>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</ContextMenuTrigger>
			<ContextMenuContent finalFocus={false}>
				<ContextMenuItem onClick={onRenameStart}>
					<Icon name="pencil-simple" size={18} />
					<Trans>Rename</Trans>
				</ContextMenuItem>
				<ContextMenuItem variant="destructive" onClick={onDelete}>
					<Icon name="trash" size={18} />
					<Trans>Delete</Trans>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
