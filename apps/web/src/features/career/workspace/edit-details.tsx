import type { Application } from "@/features/applications/types";
import type { ReactNode } from "react";
import { createContext, use, useState } from "react";
import { ApplicationFormSheet } from "@/features/applications/components/application-form-sheet";

const EditDetailsContext = createContext<(() => void) | null>(null);

/** Opens the application's details form from anywhere in its workspace; a tab shown on its own has nothing to open. */
export function useEditDetails() {
	return use(EditDetailsContext) ?? (() => undefined);
}

type EditDetailsProviderProps = { application: Application; children: ReactNode };

/** Hosts the details form (company, role, salary, source, stage, documents, tags, follow-up and notes) for the workspace. */
export function EditDetailsProvider({ application, children }: EditDetailsProviderProps) {
	const [open, setOpen] = useState(false);
	return (
		<EditDetailsContext value={() => setOpen(true)}>
			{children}
			<ApplicationFormSheet open={open} application={application} onOpenChange={setOpen} />
		</EditDetailsContext>
	);
}
