import type { ChatAttachment, MessageContext } from "@/features/assistant/chat";
import type { RouterOutput } from "@/libs/orpc/client";
import type { FactCategory } from "@reactive-resume/schema/career";
import type { QueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import { plural, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import z from "zod";
import { agentWebSources } from "@reactive-resume/ai/tools/agent-tool-contracts";
import { careerSourceSchema, factCategorySchema } from "@reactive-resume/schema/career";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { IconButton } from "@reactive-resume/ui/components/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@reactive-resume/ui/components/popover";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { toast } from "@reactive-resume/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { cn } from "@reactive-resume/utils/style";
import { useSessionDraft } from "./hooks";
import { Eyebrow, MemoryProposal, useCareerTime, useNow, withUndo, Working, workingSteps } from "./shared";
import { attachmentPart, fileToBase64, useAssistantChat } from "@/features/assistant/chat";
import { AssistantMarkdown } from "@/features/assistant/markdown";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { isImeComposing } from "@/libs/keyboard";
import { ENTER_CLASS } from "@/libs/motion";
import { client, orpc } from "@/libs/orpc/client";

// ---- What a message shared: recorded on the user message when it's sent, shown as "Used" chips under the answer. ----

const usedSchema = z.object({
	context: z.object({
		facts: z.array(z.string()).catch([]),
		stories: z.array(z.string()).catch([]),
		preferences: z.boolean().catch(false),
		applications: z.boolean().catch(false),
		offers: z.array(z.string()).catch([]),
		web: z.boolean().catch(false),
	}),
});
type Used = z.infer<typeof usedSchema>;

const rememberSchema = z.object({
	status: z.enum(["proposed", "saved", "skipped"]),
	fact: z.object({
		applicationId: z.string().nullable(),
		text: z.string(),
		category: factCategorySchema,
		source: careerSourceSchema,
	}),
	id: z.string().optional(),
});
type Remember = z.infer<typeof rememberSchema> & { toolCallId: string };

const opportunitiesSchema = z.array(z.object({ id: z.string(), company: z.string(), role: z.string() }));
const storySchema = z.object({ id: z.string(), data: z.object({ title: z.string() }) });

type Part = { type: string; text?: string; toolCallId?: string; state?: string; output?: unknown };
const partsOf = (message: UIMessage) => message.parts as unknown as Part[];
const textOf = (message: UIMessage) =>
	partsOf(message)
		.flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
		.join("\n\n")
		.trim();
const outputsOf = (message: UIMessage, tool: string) =>
	partsOf(message).filter((part) => part.type === `tool-${tool}` && part.state === "output-available");

/** "Demo AI connection": the provider label, naming it a connection once. */
export const connectionName = (label: string) => (/connection$/i.test(label) ? label : t`${label} connection`);

/** Shared and switched-on facts and stories the coach sees in this scope (global coach: shared only). */
export function useCoachKnowledge(applicationId: string | null) {
	const facts = useQuery(orpc.career.facts.queryOptions({ input: { applicationId: null, all: true } }));
	const stories = useQuery(orpc.career.stories.queryOptions({ input: { applicationId } }));
	const all = facts.data ?? [];
	// Same order and filters as the server's career context, so the recorded ids are what was sent.
	const active = all.filter(
		(fact) => fact.status === "active" && (fact.applicationId === null || fact.applicationId === applicationId),
	);
	const usable = (stories.data ?? []).filter(
		(story) =>
			story.data.factIds.length > 0 &&
			story.data.factIds.every((id) =>
				active.some(
					(fact) =>
						fact.id === id && (fact.revisions.length === 0 || new Date(fact.updatedAt) <= new Date(story.updatedAt)),
				),
			),
	);
	return {
		loaded: facts.isSuccess && stories.isSuccess,
		isPending: facts.isPending || stories.isPending,
		isError: facts.isError || stories.isError,
		retry: () => {
			void facts.refetch();
			void stories.refetch();
		},
		all,
		active,
		stories: usable,
		allStories: stories.data ?? [],
	};
}
type Knowledge = ReturnType<typeof useCoachKnowledge>;

const usedFor = (knowledge: Knowledge, context: MessageContext): Used => ({
	context: {
		facts: context.memory ? knowledge.active.slice(0, 30).map((fact) => fact.id) : [],
		stories: context.memory ? knowledge.stories.slice(0, 8).map((story) => story.id) : [],
		preferences: context.memory === true,
		applications: context.application === true,
		offers: context.offerIds ?? [],
		web: context.web === true,
	},
});

// ---- Conversations, listed on Career → Coach and in the workspace sheet ----

type ThreadSummary = RouterOutput["agent"]["threads"]["list"][number];

/** New conversations are titled in English on the server until their first message. */
export const titleFor = (thread: ThreadSummary | undefined) =>
	thread && thread.title !== "New conversation" ? thread.title : t`New conversation`;

/** "Now", "17:58", "Yesterday", "Mon 5 Oct", then "28 Sep". */
export function useConversationDate() {
	const { format, time, day } = useCareerTime();
	const now = useNow();
	const dayKey = (value: Date) => format(value, { year: "numeric", month: "numeric", day: "numeric" });
	return (value: Date) => {
		const age = now.getTime() - value.getTime();
		if (age < 60_000) return t`Now`;
		if (dayKey(value) === dayKey(now)) return time(value);
		if (dayKey(value) === dayKey(new Date(now.getTime() - 86_400_000))) return t`Yesterday`;
		if (age < 6 * 86_400_000) return day(value);
		return format(value, {
			day: "numeric",
			month: "short",
			...(value.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
		});
	};
}

/**
 * Deletes a conversation when its Undo toast closes. `hide` runs at once; `restore` brings it back on Undo, or when
 * the delete fails.
 */
export function deleteConversation(queryClient: QueryClient, id: string, hide: () => void, restore: () => void) {
	hide();
	withUndo({
		description: t`Conversation deleted`,
		commit: async () => {
			try {
				await client.agent.threads.delete({ id });
			} catch (error) {
				restore();
				toast.add({
					type: "error",
					description: getOrpcErrorMessage(error, { fallback: t`Couldn't delete this conversation.` }),
				});
			} finally {
				void queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.key() });
			}
		},
		onUndo: restore,
	});
}

// ---- The thread ----

type Prompt = { text: string; attachments: ChatAttachment[]; used: Used };

type CoachThreadProps = {
	/** No thread yet: the empty state; the first message (or attachment) creates one. */
	threadId: string | null;
	createThread: () => Promise<string>;
	/** The first message created this thread; it's sent as soon as the thread opens. */
	onThreadCreated: (id: string, text: string) => void;
	/** The application this conversation is about (the workspace sheet), or null for the whole search. */
	applicationId: string | null;
	/** Workspace sheet: facts are remembered for this company only. */
	company?: string;
	context: MessageContext;
	/** "Demo AI connection". */
	connection: string;
	onChangeConnection: () => void;
	header: (messages: readonly UIMessage[]) => ReactNode;
	empty: (send: (text: string) => void) => ReactNode;
	chips?: ReactNode;
	privacy: ReactNode;
	placeholder: string;
	/** Keeps the unsent draft when the thread closes (the sheet). */
	draftKey?: string;
	disabled?: boolean;
	variant: "page" | "sheet";
};

/** The coach's chat, shared by Career → Coach and the workspace sheet: messages, writing state, composer. */
export function CoachThread(props: CoachThreadProps) {
	const knowledge = useCoachKnowledge(props.applicationId);
	const [prompt, setPrompt] = useState<Prompt | null>(null);
	const [starting, setStarting] = useState(false);
	const draft = useRef<string | null>(null);
	const creating = useRef<Promise<string> | null>(null);

	// A conversation exists from its first message or attachment; one created for an attachment is reused.
	const ensureThread = () => {
		if (props.threadId) return Promise.resolve(props.threadId);
		if (draft.current) return Promise.resolve(draft.current);
		creating.current ??= props
			.createThread()
			.then((id) => {
				draft.current = id;
				return id;
			})
			.finally(() => {
				creating.current = null;
			});
		return creating.current;
	};

	/** Resolves false when the conversation couldn't start, so the composer keeps the message. */
	const start = async (text: string, attachments: ChatAttachment[] = []) => {
		if (starting || props.disabled) return false;
		setStarting(true);
		try {
			const id = await ensureThread();
			setPrompt({ text, attachments, used: usedFor(knowledge, props.context) });
			draft.current = null;
			props.onThreadCreated(id, text);
			return true;
		} catch (error) {
			toast.add({
				type: "error",
				description: getOrpcErrorMessage(error, { fallback: t`Couldn't start the conversation. Try again.` }),
			});
			return false;
		} finally {
			setStarting(false);
		}
	};

	if (!props.threadId)
		return (
			<div className="flex min-h-0 flex-1 flex-col">
				{props.header([])}
				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className={contentClass[props.variant]}>
						<Empty render={props.empty} send={(text) => void start(text)} />
					</div>
				</div>
				<Composer
					{...props}
					streaming={starting}
					disabled={props.disabled ?? false}
					ensureThread={ensureThread}
					onSend={start}
					onStop={() => undefined}
				/>
			</div>
		);

	return (
		<ThreadSession
			key={props.threadId}
			{...props}
			threadId={props.threadId}
			knowledge={knowledge}
			prompt={prompt}
			onPromptSent={() => setPrompt(null)}
		/>
	);
}

type EmptyProps = { render: CoachThreadProps["empty"]; send: (text: string) => void };

function Empty({ render, send }: EmptyProps) {
	return render(send);
}

const contentClass = {
	page: "mx-auto grid w-full max-w-[720px] content-start gap-6 px-6 py-6",
	sheet: "grid content-start gap-4 p-[18px]",
};

type SessionProps = Omit<CoachThreadProps, "threadId"> & {
	threadId: string;
	knowledge: Knowledge;
	prompt: Prompt | null;
	onPromptSent: () => void;
};

/** Reads the conversation once when it opens (the chat takes its messages once); a new one skips the read. */
function ThreadSession(props: SessionProps) {
	const [fresh] = useState(() => props.prompt !== null);
	const thread = useQuery({
		...orpc.agent.threads.get.queryOptions({ input: { id: props.threadId } }),
		enabled: !fresh,
		refetchOnMount: "always",
		refetchOnWindowFocus: false,
	});

	if (fresh) return <ChatView {...props} initialMessages={[]} activeRun={false} readOnly={false} />;
	if (thread.data && thread.isFetchedAfterMount)
		return (
			<ChatView
				{...props}
				initialMessages={thread.data.messages}
				activeRun={Boolean(thread.data.thread.activeRunId)}
				readOnly={thread.data.isReadOnly}
			/>
		);
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{props.header([])}
			<div className="grid flex-1 place-items-center p-6 text-sm text-ink-2">
				{thread.error ? (
					<p role="alert">
						<Trans>This conversation couldn't be opened.</Trans>
					</p>
				) : (
					// Hidden for the first 150ms, so a quick read never flashes a spinner.
					<Spinner className="transition-opacity delay-150 duration-standard ease-enter starting:opacity-0" />
				)}
			</div>
		</div>
	);
}

type ChatViewProps = SessionProps & { initialMessages: UIMessage[]; activeRun: boolean; readOnly: boolean };

function ChatView(props: ChatViewProps) {
	const { threadId, knowledge, variant, connection } = props;
	const queryClient = useQueryClient();
	const [stopped, setStopped] = useState(false);
	const scroller = useRef<HTMLDivElement>(null);
	// Messages already in the thread when it opens are history; only new ones rise in.
	const [initialIds] = useState(() => new Set(props.initialMessages.map((message) => message.id)));

	const refresh = () => {
		void queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.key() });
		// The coach may have remembered a fact or saved a story.
		void queryClient.invalidateQueries({ queryKey: orpc.career.facts.key() });
		void queryClient.invalidateQueries({ queryKey: orpc.career.stories.key() });
	};
	const { messages, sendMessage, status, error, clearError, regenerate, stop } = useAssistantChat({
		threadId,
		initialMessages: props.initialMessages,
		resume: props.activeRun,
		context: props.context,
		onFinish: refresh,
	});
	const streaming = status === "submitted" || status === "streaming";
	const last = messages.at(-1);
	const answering = status === "streaming" && last?.role === "assistant" && textOf(last) !== "";
	const readOnly = props.readOnly || props.disabled === true;

	const deliver = ({ text, attachments, used }: Prompt) => {
		const files = attachments.map(attachmentPart);
		void sendMessage(
			{ text, metadata: used, ...(files.length > 0 ? { files } : {}) },
			{ body: { attachmentIds: attachments.map((attachment) => attachment.id) } },
		);
		// The server titles the conversation from its first message.
		window.setTimeout(refresh, 1500);
	};

	const send = (text: string, attachments: ChatAttachment[] = []) => {
		if (streaming || readOnly) return false;
		clearError();
		setStopped(false);
		deliver({ text, attachments, used: usedFor(knowledge, props.context) });
		return true;
	};

	// The first message of a new conversation goes out once the chat exists.
	const { prompt } = props;
	const sentPrompt = useRef(false);
	const sendPrompt = useEffectEvent((value: Prompt) => {
		props.onPromptSent();
		deliver(value);
	});
	useEffect(() => {
		if (!prompt || sentPrompt.current) return;
		sentPrompt.current = true;
		sendPrompt(prompt);
	}, [prompt]);

	// A failed continuation (after an answer) is sent again as it was; regenerating would drop the answer.
	const retry = () => {
		clearError();
		if (lastAssistantMessageIsCompleteWithToolCalls({ messages })) void sendMessage();
		else void regenerate();
	};

	const stopReply = () => {
		setStopped(true);
		void client.agent.messages.stop({ threadId }).catch(() => undefined);
		void stop();
	};

	// Follows the reply while it streams, unless the user scrolled up to read.
	useEffect(() => {
		const element = scroller.current;
		if (!element || !streaming) return;
		if (element.scrollHeight - element.scrollTop - element.clientHeight < 120) element.scrollTop = element.scrollHeight;
	});
	useEffect(() => {
		scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
	}, []);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{props.header(messages)}
			<div
				ref={scroller}
				role="log"
				aria-live="polite"
				// Announced when the answer is complete, not token by token.
				aria-busy={streaming}
				aria-label={t`Conversation`}
				className="min-h-0 flex-1 overflow-y-auto"
			>
				<div className={contentClass[variant]}>
					{messages.length === 0 && !streaming && props.empty(send)}
					{messages.map((message, index) => (
						<MessageView
							key={message.id}
							message={message}
							used={usedBefore(messages, index)}
							streaming={streaming && index === messages.length - 1}
							enter={!initialIds.has(message.id)}
							knowledge={knowledge}
							company={props.company}
							scoped={props.applicationId !== null}
						/>
					))}

					{streaming && (
						<p className={cn("flex items-center gap-2 text-[13px] text-ink-3", ENTER_CLASS)}>
							<Spinner decorative className="size-3.5" />
							{/* Until the first words arrive, say what's happening; then the answer itself shows progress. */}
							{answering ? (
								<Trans>Writing an answer…</Trans>
							) : (
								<Working steps={[...workingSteps("chat"), ...(props.context.web ? [t`Searching the web`] : [])]} />
							)}
						</p>
					)}

					{stopped && !streaming && (
						<p className="flex items-center gap-1.5 text-xs text-ink-3">
							<Icon name="stop-circle" size={16} />
							<Trans>Stopped</Trans>
						</p>
					)}

					{error && !streaming && (
						<div
							role="alert"
							className="grid gap-2.5 rounded-xl bg-danger-soft p-3.5 text-[13px] text-danger-text transition-opacity duration-standard ease-enter starting:opacity-0"
						>
							<span className="flex gap-2">
								<Icon name="warning-circle" size={18} className="shrink-0" />
								{/* Say why when the server knows (a switched-off connection, a limit); otherwise that it didn't answer. */}
								<span>
									{getOrpcErrorMessage(error, { fallback: t`${connection} didn't respond.`, allowServerMessage: true })}
								</span>
							</span>
							<span className="flex flex-wrap gap-1.5">
								<Button size="sm" variant="secondary" onClick={retry}>
									<Trans>Try again</Trans>
								</Button>
								<Button size="sm" variant="ghost" onClick={props.onChangeConnection}>
									<Trans>Change connection</Trans>
								</Button>
							</span>
						</div>
					)}
				</div>
			</div>

			<Composer
				{...props}
				streaming={streaming}
				disabled={readOnly}
				ensureThread={() => Promise.resolve(threadId)}
				onSend={send}
				onStop={stopReply}
			/>
		</div>
	);
}

/** What the user message before this answer shared. */
function usedBefore(messages: readonly UIMessage[], index: number) {
	const question = messages.slice(0, index).findLast((message) => message.role === "user");
	const parsed = usedSchema.safeParse(question?.metadata);
	return parsed.success ? parsed.data.context : null;
}

// ---- One message ----

type MessageViewProps = {
	message: UIMessage;
	used: Used["context"] | null;
	streaming: boolean;
	enter: boolean;
	knowledge: Knowledge;
	company: string | undefined;
	/** About one application: its facts are private to it, and the application itself is implied. */
	scoped: boolean;
};

function MessageView({ message, used, streaming, enter, knowledge, company, scoped }: MessageViewProps) {
	const text = textOf(message);

	if (message.role === "user") {
		const files = partsOf(message).filter((part) => part.type === "file") as Array<Part & { filename?: string }>;
		return (
			<div className={cn("grid justify-items-end gap-1", enter && ENTER_CLASS)}>
				{text && (
					<p className="max-w-[80%] rounded-[12px_12px_4px_12px] bg-sunken px-3.5 py-2.5 text-sm leading-[21px] whitespace-pre-wrap">
						{text}
					</p>
				)}
				{files.map((file, index) => (
					<span key={index} className="flex items-center gap-1 rounded-sm bg-sunken px-2 py-1 text-xs text-ink-2">
						<Icon name="paperclip" size={14} />
						{file.filename ?? t`Attachment`}
					</span>
				))}
			</div>
		);
	}

	const sources = agentWebSources(message);
	const stories = outputsOf(message, "save_story").flatMap((part) => {
		const parsed = storySchema.safeParse(part.output);
		return parsed.success ? [parsed.data] : [];
	});
	const applications = outputsOf(message, "list_opportunities").flatMap((part) => {
		const parsed = opportunitiesSchema.safeParse(part.output);
		return parsed.success ? parsed.data : [];
	});

	return (
		<div className={cn("grid min-w-0 gap-3", enter && ENTER_CLASS)}>
			{text && (
				// min-w-0 lets a wide table scroll inside its own box instead of stretching the column.
				<div className="min-w-0 text-[15px] leading-6 text-ink [&_:is(h1,h2,h3,h4)]:mt-4 [&_:is(h1,h2,h3,h4)]:mb-2 [&_:is(h1,h2,h3,h4)]:text-base [&_:is(h1,h2,h3,h4)]:font-semibold [&_:is(h1,h2,h3,h4):first-child]:mt-0 [&_p]:leading-6 [&_strong]:font-semibold">
					<AssistantMarkdown text={text} />
				</div>
			)}

			{sources.length > 0 && (
				<div className="grid gap-1 text-xs">
					<span className="font-medium text-ink-3">
						<Trans>Sources</Trans>
					</span>
					{sources.map((source) => (
						<a
							key={source.url}
							href={source.url}
							target="_blank"
							rel="noreferrer"
							className="truncate text-accent-text underline underline-offset-2"
						>
							{source.title?.trim() || source.url}
						</a>
					))}
				</div>
			)}

			{!streaming && used && <UsedChips used={used} applications={scoped ? [] : applications} knowledge={knowledge} />}

			{stories.map((story) => (
				<p key={story.id} className="flex flex-wrap items-center gap-1.5 text-sm text-accent-text">
					<Icon name="check-circle" size={18} />
					<Trans>Saved a story: {story.data.title}</Trans>
					<Link
						to="/dashboard/career/knowledge/stories/{-$storyId}"
						params={{ storyId: story.id }}
						className="underline underline-offset-2"
					>
						<Trans>View</Trans>
					</Link>
				</p>
			))}

			{!streaming && <MemoryNotes message={message} knowledge={knowledge} company={company} />}

			{!streaming && text && (
				<div className="flex gap-1">
					<Button size="sm" variant="ghost" className="text-ink-2" onClick={() => void copy(text, t`Answer copied`)}>
						<Icon name="copy" size={16} />
						<Trans>Copy</Trans>
					</Button>
				</div>
			)}
		</div>
	);
}

// ---- "Used": what was shared for this answer, each group opening the exact items ----

type UsedChipsProps = {
	used: Used["context"];
	applications: z.infer<typeof opportunitiesSchema>;
	knowledge: Knowledge;
};

function UsedChips({ used, applications, knowledge }: UsedChipsProps) {
	const chips: ReactNode[] = [];
	const linkClass = "text-[13px] leading-[19px] text-ink hover:underline underline-offset-2";

	if (used.facts.length > 0)
		chips.push(
			<UsedChip key="facts" label={plural(used.facts.length, { one: "# fact", other: "# facts" })} title={t`Facts`}>
				{used.facts.map((id) => {
					const fact = knowledge.all.find((item) => item.id === id);
					return (
						<li key={id}>
							{fact ? (
								<Link to="/dashboard/career/knowledge/facts" search={{ highlight: id }} className={linkClass}>
									{fact.text}
								</Link>
							) : (
								<span className="text-[13px] text-ink-3">
									<Trans>A fact you've since forgotten</Trans>
								</span>
							)}
						</li>
					);
				})}
			</UsedChip>,
		);
	if (used.stories.length > 0)
		chips.push(
			<UsedChip
				key="stories"
				label={plural(used.stories.length, { one: "# story", other: "# stories" })}
				title={t`Stories`}
			>
				{used.stories.map((id) => {
					const story = knowledge.allStories.find((item) => item.id === id);
					return (
						<li key={id}>
							{story ? (
								<Link
									to="/dashboard/career/knowledge/stories/{-$storyId}"
									params={{ storyId: id }}
									className={linkClass}
								>
									{story.data.title}
								</Link>
							) : (
								<span className="text-[13px] text-ink-3">
									<Trans>A story you've since deleted</Trans>
								</span>
							)}
						</li>
					);
				})}
			</UsedChip>,
		);
	if (used.preferences)
		chips.push(
			<UsedChip
				key="preferences"
				label={t({
					message: "Preferences",
					context: "Career preferences: the roles, places, pay and ways of working you want",
				})}
				title={t({
					message: "Preferences",
					context: "Career preferences: the roles, places, pay and ways of working you want",
				})}
			>
				<PreferencesList />
			</UsedChip>,
		);
	if (applications.length > 0)
		chips.push(
			<UsedChip
				key="applications"
				label={plural(applications.length, { one: "# application", other: "# applications" })}
				title={t`Applications`}
			>
				{applications.map((application) => (
					<li key={application.id}>
						<Link
							to="/dashboard/applications/$applicationId/{-$tab}"
							params={{ applicationId: application.id }}
							className={linkClass}
						>
							{application.company} · {application.role}
						</Link>
					</li>
				))}
			</UsedChip>,
		);
	if (used.offers.length > 0)
		chips.push(
			<UsedChip
				key="offers"
				label={plural(used.offers.length, { one: "# saved offer", other: "# saved offers" })}
				title={t`Saved offers`}
			>
				<OffersList ids={used.offers} className={linkClass} />
			</UsedChip>,
		);

	if (chips.length === 0) return null;
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<span className="me-0.5 text-xs text-ink-3">
				<Trans>Used</Trans>
			</span>
			{chips}
		</div>
	);
}

type UsedChipProps = { label: string; title: string; children: ReactNode };

function UsedChip({ label, title, children }: UsedChipProps) {
	return (
		<Popover>
			<PopoverTrigger
				render={
					<button
						type="button"
						className="inline-flex h-6 items-center rounded-sm border border-line-2 px-2 text-xs font-medium text-ink-2 transition-colors duration-quick hover:bg-hover hover:text-ink aria-expanded:bg-hover"
					/>
				}
			>
				{label}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
				<Eyebrow>{title}</Eyebrow>
				<ul className="grid max-h-72 gap-2 overflow-y-auto">{children}</ul>
			</PopoverContent>
		</Popover>
	);
}

function PreferencesList() {
	const { data: profile } = useQuery(orpc.career.profile.queryOptions());
	if (!profile)
		return (
			<li>
				<Spinner />
			</li>
		);
	const rows = [
		{ label: t`Roles`, value: profile.targetRoles.join(", ") },
		{ label: t`Locations`, value: profile.locations.join(", ") },
		{ label: t`What matters`, value: profile.priorities },
	].filter((row) => row.value);
	return (
		<>
			{rows.map((row) => (
				<li key={row.label} className="grid gap-0.5 text-[13px] leading-[19px]">
					<span className="text-xs text-ink-3">{row.label}</span>
					<span className="line-clamp-3">{row.value}</span>
				</li>
			))}
			<li>
				<Link
					to="/dashboard/career/knowledge/preferences"
					className="text-[13px] text-accent-text underline underline-offset-2"
				>
					<Trans>Open Preferences</Trans>
				</Link>
			</li>
		</>
	);
}

function OffersList({ ids, className }: { ids: string[]; className: string }) {
	const { data } = useQuery(orpc.career.savedItems.queryOptions({ input: { kind: "offer" } }));
	if (!data)
		return (
			<li>
				<Spinner />
			</li>
		);
	return (
		<>
			{ids.map((id) => {
				const offer = data.find((item) => item.id === id);
				return (
					<li key={id}>
						<Link to="/dashboard/career/offers" className={className}>
							{offer?.application ? `${offer.application.company} · ${offer.application.role}` : t`A saved offer`}
						</Link>
					</li>
				);
			})}
		</>
	);
}

// ---- Memory: one proposal per answer; automatic saves can be undone ----

const dismissedKey = (toolCallId: string) => `career-memory-dismissed:${toolCallId}`;
const isDismissed = (toolCallId: string) => {
	try {
		return localStorage.getItem(dismissedKey(toolCallId)) === "1";
	} catch {
		return false;
	}
};

type MemoryNotesProps = { message: UIMessage; knowledge: Knowledge; company: string | undefined };

function MemoryNotes({ message, knowledge, company }: MemoryNotesProps) {
	const remembers = outputsOf(message, "remember_fact").flatMap((part): Remember[] => {
		const parsed = rememberSchema.safeParse(part.output);
		return parsed.success && part.toolCallId ? [{ ...parsed.data, toolCallId: part.toolCallId }] : [];
	});
	const proposed = remembers.filter((item) => item.status === "proposed");
	const saved = remembers.filter((item) => item.status === "saved" && item.id);
	// Nothing until the facts are known, so a remembered fact never flashes as a question.
	if (!knowledge.loaded || remembers.length === 0) return null;
	return (
		<>
			{proposed.length > 0 && <Proposal items={proposed} knowledge={knowledge} company={company} />}
			{saved.map((item) => (
				<AutoRemembered key={item.toolCallId} id={item.id ?? ""} text={item.fact.text} knowledge={knowledge} />
			))}
		</>
	);
}

const addedAs = (category: FactCategory) =>
	({
		accomplishment: t`Added to Knowledge as an accomplishment.`,
		experience: t`Added to Knowledge as an experience.`,
		skill: t`Added to Knowledge as a skill.`,
		preference: t`Added to Knowledge as a preference.`,
	})[category];

type ProposalProps = { items: Remember[]; knowledge: Knowledge; company: string | undefined };

function Proposal({ items, knowledge, company }: ProposalProps) {
	const queryClient = useQueryClient();
	const [saved, setSaved] = useState<{ ids: string[]; category: FactCategory } | null>(null);
	const [dismissed, setDismissed] = useState(() => items.every((item) => isDismissed(item.toolCallId)));
	const [busy, setBusy] = useState(false);
	const [forgotten, setForgotten] = useState(false);

	// Remembered earlier (a reload): Knowledge has a fact quoted from the same message.
	const matched = knowledge.all.filter((fact) =>
		items.some(
			(item) =>
				fact.source.kind === "user-message" && fact.source.id === item.fact.source.id && fact.text === item.fact.text,
		),
	);
	const remembered =
		saved ??
		(matched[0] ? { ids: matched.map((fact) => fact.id), category: items[0]?.fact.category ?? "preference" } : null);

	const remember = async (selected: number[]) => {
		setBusy(true);
		try {
			const chosen = selected.flatMap((index) => (items[index] ? [items[index]] : []));
			const rows = await Promise.all(chosen.map((item) => client.career.saveFact(item.fact)));
			const ids = rows.flatMap((row) => (row ? [row.id] : []));
			// Nothing saved: each fact's source was forgotten, and forgotten stays forgotten.
			if (ids.length === 0) setForgotten(true);
			else setSaved({ ids, category: chosen[0]?.fact.category ?? "preference" });
			void queryClient.invalidateQueries({ queryKey: orpc.career.facts.key() });
		} catch (error) {
			toast.add({
				type: "error",
				description: getOrpcErrorMessage(error, { fallback: t`Couldn't remember that. Try again.` }),
			});
		} finally {
			setBusy(false);
		}
	};

	const dismiss = () => {
		try {
			for (const item of items) localStorage.setItem(dismissedKey(item.toolCallId), "1");
		} catch {
			// Not now still applies until the page reloads.
		}
		setDismissed(true);
	};

	const first = remembered?.ids[0];
	if (forgotten)
		return (
			<p className="flex items-center gap-1.5 text-sm text-ink-3">
				<Icon name="info" size={18} />
				<Trans>Not saved — this fact was forgotten before.</Trans>
			</p>
		);
	return (
		<MemoryProposal
			question={
				company
					? t`Remember for ${company} only?`
					: items.length > 1
						? plural(items.length, { one: "Remember # fact?", other: "Remember # facts?" })
						: t`Remember this for future coaching?`
			}
			facts={items.map((item) => item.fact.text)}
			state={remembered ? "remembered" : dismissed ? "dismissed" : "pending"}
			busy={busy}
			remembered={
				<>
					{company
						? t`Saved to Knowledge, private to this application.`
						: remembered && remembered.ids.length > 1
							? plural(remembered.ids.length, {
									one: "Added # fact to Knowledge.",
									other: "Added # facts to Knowledge.",
								})
							: addedAs(remembered?.category ?? "preference")}
					{first && (
						<Link
							to="/dashboard/career/knowledge/facts"
							search={{ highlight: first }}
							className="underline underline-offset-2"
						>
							<Trans>View</Trans>
						</Link>
					)}
				</>
			}
			onRemember={(selected) => void remember(selected)}
			onDismiss={dismiss}
		/>
	);
}

type AutoRememberedProps = { id: string; text: string; knowledge: Knowledge };

/** Memory mode Automatically: the fact is already saved, with Undo. Hidden once it's forgotten. */
function AutoRemembered({ id, text, knowledge }: AutoRememberedProps) {
	const queryClient = useQueryClient();
	const [undone, setUndone] = useState(false);
	if (undone || !knowledge.all.some((fact) => fact.id === id)) return null;

	const undo = async () => {
		setUndone(true);
		try {
			await client.career.forgetFact({ id });
			void queryClient.invalidateQueries({ queryKey: orpc.career.facts.key() });
		} catch (error) {
			setUndone(false);
			toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback: t`Couldn't undo that.` }) });
		}
	};

	return (
		<p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
			<Icon name="check-circle" size={18} className="text-accent-text" />
			<Trans>Remembered: “{text}”</Trans>
			<span aria-hidden="true">·</span>
			<button type="button" className="font-medium text-ink underline underline-offset-2" onClick={() => void undo()}>
				<Trans>Undo</Trans>
			</button>
		</p>
	);
}

// ---- Composer ----

type Upload = ChatAttachment & { size: number };

type ComposerProps = Pick<CoachThreadProps, "placeholder" | "chips" | "privacy" | "draftKey" | "variant"> & {
	streaming: boolean;
	disabled: boolean;
	ensureThread: () => Promise<string>;
	/** True once the message is on its way; false keeps it in the box. */
	onSend: (text: string, attachments: ChatAttachment[]) => boolean | Promise<boolean>;
	onStop: () => void;
};

/** A two-row box that grows to eight, with the context chips, attach and send (stop while writing). */
function Composer(props: ComposerProps) {
	const { i18n } = useLingui();
	const id = useId();
	const draft = useSessionDraft(props.draftKey ? `coach:${props.draftKey}` : null, "", (value) =>
		typeof value === "string" ? value : undefined,
	);
	const text = draft.value;
	const setText = draft.setValue;
	const [attachments, setAttachments] = useState<Upload[]>([]);
	const [uploading, setUploading] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);

	const submit = async () => {
		const value = text.trim();
		if (!value || props.streaming || props.disabled || uploading) return;
		const sent = await props.onSend(
			value,
			attachments.map(({ size: _size, ...attachment }) => attachment),
		);
		if (!sent) return;
		setText("");
		draft.clear();
		setAttachments([]);
	};

	const upload = async (files: FileList | null) => {
		if (!files?.length) return;
		setUploading(true);
		try {
			const threadId = await props.ensureThread();
			const uploaded = await Promise.all(
				Array.from(files).map(async (file) => {
					const attachment = await client.agent.attachments.create({
						threadId,
						filename: file.name,
						mediaType: file.type || "application/octet-stream",
						data: await fileToBase64(file),
					});
					return { id: attachment.id, filename: attachment.filename, mediaType: attachment.mediaType, size: file.size };
				}),
			);
			setAttachments((current) => [...current, ...uploaded]);
		} catch (error) {
			toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback: t`Couldn't attach the file.` }) });
		} finally {
			setUploading(false);
			if (fileInput.current) fileInput.current.value = "";
		}
	};

	const size = (bytes: number) =>
		new Intl.NumberFormat(i18n.locale, {
			style: "unit",
			unit: bytes < 1_000_000 ? "kilobyte" : "megabyte",
			maximumFractionDigits: 1,
		}).format(bytes < 1_000_000 ? Math.max(1, Math.round(bytes / 1000)) : bytes / 1_000_000);

	const page = props.variant === "page";
	const sendLabel = props.streaming ? t`Stop` : t`Send`;

	return (
		<div className={page ? "border-t border-line px-6 py-3" : "px-3.5 pt-2 pb-3.5"}>
			<div className={cn("grid gap-2", page && "mx-auto w-full max-w-[720px]")}>
				<div className="grid rounded-xl border border-line-2 bg-raised transition-colors duration-quick focus-within:border-accent">
					<label htmlFor={id} className="sr-only">
						<Trans>Message the coach</Trans>
					</label>
					<textarea
						id={id}
						value={text}
						disabled={props.disabled}
						placeholder={props.placeholder}
						onChange={(event) => setText(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey && !isImeComposing(event)) {
								event.preventDefault();
								void submit();
							}
							if (event.key === "Escape" && props.streaming) {
								event.preventDefault();
								props.onStop();
							}
						}}
						className="field-sizing-content max-h-[200px] min-h-[68px] w-full resize-none bg-transparent px-4 pt-3 pb-1.5 text-base leading-[22px] outline-none placeholder:text-ink-3 disabled:opacity-60 md:text-[15px]"
					/>
					<div className="flex items-end gap-1.5 px-3 pb-2.5">
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
							{props.chips}
							{attachments.map((attachment) => (
								<span
									key={attachment.id}
									className="inline-flex h-7 max-w-full items-center gap-1 rounded-sm border border-line-2 bg-sunken ps-2 text-xs font-medium"
								>
									<Icon name="paperclip" size={16} />
									<span className="truncate">
										{attachment.filename} · {size(attachment.size)}
									</span>
									<button
										type="button"
										aria-label={t`Remove ${attachment.filename}`}
										onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
										className="grid size-6 place-items-center rounded-sm text-ink-3 transition-colors duration-quick hover:bg-hover hover:text-ink"
									>
										<Icon name="x" size={14} />
									</button>
								</span>
							))}
						</div>
						<IconButton
							icon="paperclip"
							label={t`Attach a file`}
							size="icon-sm"
							disabled={props.disabled || uploading}
							loading={uploading}
							className="text-ink-2"
							onClick={() => fileInput.current?.click()}
						/>
						<input
							ref={fileInput}
							type="file"
							multiple
							className="hidden"
							onChange={(event) => void upload(event.target.files)}
						/>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										size="icon-sm"
										aria-label={sendLabel}
										disabled={!props.streaming && (props.disabled || uploading)}
										onClick={props.streaming ? props.onStop : () => void submit()}
										className="rounded-lg"
									/>
								}
							>
								{/* Stop is the one filled glyph: a solid square. */}
								<Icon name={props.streaming ? "stop" : "arrow-up"} filled={props.streaming} size={18} />
							</TooltipTrigger>
							<TooltipContent>{sendLabel}</TooltipContent>
						</Tooltip>
					</div>
				</div>
				{props.privacy}
			</div>
		</div>
	);
}

async function copy(text: string, done: string) {
	try {
		await navigator.clipboard.writeText(text);
		toast.add({ description: done });
	} catch {
		toast.add({ type: "error", description: t`Couldn't copy to the clipboard.` });
	}
}

export { copy as copyToClipboard };
