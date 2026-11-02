import type * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";

/** iPhone and iPad, including iPadOS reporting itself as a Mac. Every iOS browser runs WebKit. */
function isAppleTouchDevice() {
	if (typeof navigator === "undefined") return false;
	return (
		/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
	);
}

/**
 * On iOS the dialog traps focus without locking page scroll: WebKit's scroll lock shifts the viewport under a fixed
 * popup, so taps on its fields miss (Base UI notes the same iOS lock issues). The backdrop still covers the page.
 */
function Dialog({ modal, ...props }: DialogPrimitive.Root.Props) {
	return (
		<DialogPrimitive.Root data-slot="dialog" modal={modal ?? (isAppleTouchDevice() ? "trap-focus" : true)} {...props} />
	);
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-overlay"
			className={cn(
				"fixed inset-0 isolate z-50 bg-scrim transition-opacity duration-standard ease-enter data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--d2)*0.7)] data-starting-style:opacity-0",
				className,
			)}
			{...props}
		/>
	);
}

type DialogContentProps = DialogPrimitive.Popup.Props & {
	showCloseButton?: boolean;
	/** Accessible name of the close button; pass a translated string. */
	closeLabel?: string;
	/** Skip the open/close transition, for dialogs toggled many times a day (e.g. the command bar). */
	instant?: boolean;
};

/** Centered with margins rather than a transform (WebKit mis-targets taps in transformed fixed popups), 16px radius, fades and scales in from 98% over 200ms. Use for decisions, not for tasks beside the page. */
function DialogContent({
	className,
	children,
	showCloseButton = true,
	closeLabel = "Close",
	instant = false,
	...props
}: DialogContentProps) {
	return (
		<DialogPortal>
			<DialogOverlay className={cn(instant && "transition-none")} />
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				className={cn(
					"fixed inset-0 z-[60] m-auto grid h-fit max-h-[calc(100svh-2rem)] w-full max-w-[calc(100%-2rem)] gap-4 overflow-y-auto overscroll-contain rounded-2xl bg-raised p-6 text-sm text-ink shadow-e3 transition-[opacity,scale] duration-standard ease-enter outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--d2)*0.7)] data-starting-style:scale-[0.98] data-starting-style:opacity-0 sm:max-w-[480px]",
					instant && "transition-none",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						aria-label={closeLabel}
						render={<Button variant="ghost" className="absolute inset-e-3 top-3 text-ink-2" size="icon" />}
					>
						<Icon name="x" />
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Popup>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 pe-8", className)} {...props} />;
}

function DialogFooter({
	className,
	showCloseButton = false,
	closeLabel = "Close",
	children,
	...props
}: React.ComponentProps<"div"> & {
	showCloseButton?: boolean;
	closeLabel?: string;
}) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close render={<Button variant="secondary" />}>{closeLabel}</DialogPrimitive.Close>
			)}
		</div>
	);
}

/** Dialog and sheet titles use the display serif at 22px. */
function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("font-display text-xl leading-7 font-bold tracking-[-0.035em] text-ink", className)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn(
				"text-sm leading-5 text-ink-2 *:[a]:text-accent-text *:[a]:underline *:[a]:underline-offset-3",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	type DialogContentProps,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
