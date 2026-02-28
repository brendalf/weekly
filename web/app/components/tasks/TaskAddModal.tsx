"use client";

import { ReactElement, useState, useSyncExternalStore } from "react";
import { Button, Dialog, Fieldset, Input, Label, XStack, YStack } from "tamagui";

interface TaskAddModalProps {
  onSubmit: (title: string) => void;
  trigger?: ReactElement;
}

export function TaskAddModal({ onSubmit, trigger }: TaskAddModalProps) {
	const isClient = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);

	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");

	const reset = () => {
		setTitle("");
	};

	const handleSave = () => {
		const trimmed = title.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		setOpen(false);
		reset();
	};

	const isValid = Boolean(title.trim());

	return (
		<Dialog open={open} onOpenChange={setOpen} modal>
			<Dialog.Trigger asChild>
				{trigger ?? <Button size="$3">Add task</Button>}
			</Dialog.Trigger>

			{isClient && open && (
				<Dialog.Portal>
					<Dialog.Overlay key="overlay" opacity={0.5} enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
					<Dialog.Content key="content" bordered elevate size="$4" gap="$3">
						<Dialog.Title>Add task</Dialog.Title>
						<Dialog.Description>
							Add a new task to your list.
						</Dialog.Description>

						<YStack gap="$3">
							<Fieldset gap="$2">
								<Label htmlFor="task-title">Title</Label>
								<Input id="task-title" size="$3" value={title} onChangeText={setTitle} placeholder="e.g. Read a book" />
							</Fieldset>
						</YStack>

						<XStack gap="$2" style={{ justifyContent: "flex-end" }}>
							<Dialog.Close asChild>
								<Button size="$3" onPress={reset}>Cancel</Button>
							</Dialog.Close>
							<Button size="$3" theme="accent" disabled={!isValid} onPress={handleSave}>
								Save
							</Button>
						</XStack>
					</Dialog.Content>
				</Dialog.Portal>
			)}
		</Dialog>
	);
}