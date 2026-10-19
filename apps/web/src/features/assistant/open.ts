import { useEditorStore } from "@/features/resume/editor/store";

/**
 * `?assistant=` (a conversation, "new", or "prepare" for an application's next step) and `?ask=` (a question to
 * send) open the assistant.
 */
export function openAssistantFrom(search: { assistant?: string | undefined; ask?: string | undefined }) {
	if (!search.assistant && !search.ask) return false;
	const editor = useEditorStore.getState();
	const prepare = search.assistant === "prepare";
	editor.setAssistantOpen(true);
	editor.setAssistantThread(search.ask || prepare ? "new" : (search.assistant ?? null));
	editor.setAssistantSuggestions(prepare ? "prepare" : null);
	if (search.ask) editor.setAssistantPrompt(search.ask);
	return true;
}
