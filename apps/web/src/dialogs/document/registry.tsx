import type { AnyDialogRendererEntry } from "../schemas";
import { NewDocumentDialog } from "@/features/documents/new-document-dialog";

export const documentDialogRenderers: readonly AnyDialogRendererEntry[] = [
	{ type: "document.new", render: ({ data }) => <NewDocumentDialog data={data} /> },
];
