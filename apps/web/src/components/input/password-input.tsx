import { t } from "@lingui/core/macro";
import { useToggle } from "usehooks-ts";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

export function PasswordInput(props: PasswordInputProps) {
	const [visible, toggleVisible] = useToggle(false);

	return (
		<div className="flex items-center gap-x-1.5">
			<Input {...props} type={visible ? "text" : "password"} />

			<Button
				size="icon"
				variant="ghost"
				type="button"
				onClick={toggleVisible}
				aria-pressed={visible}
				aria-label={
					visible
						? t({
								comment: "Accessible label for button that hides a visible password",
								message: "Hide password",
							})
						: t({
								comment: "Accessible label for button that reveals a masked password",
								message: "Show password",
							})
				}
			>
				<Icon name={visible ? "eye" : "eye-slash"} size={16} />
			</Button>
		</div>
	);
}
