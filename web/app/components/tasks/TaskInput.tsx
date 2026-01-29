"use client";

import { FormEvent } from "react";
import { XStack, Input, Button } from "tamagui";

interface TaskInputProps {
  title: string;
  onChangeTitle: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function TaskInput({ title, onChangeTitle, onSubmit }: TaskInputProps) {
  return (
    <XStack asChild gap="$2">
      <form
        onSubmit={onSubmit}
        style={{ width: "100%", display: "flex", gap: 8 }}
      >
        <Input
          flex={1}
          size="$3"
          placeholder="Task title"
          value={title}
          onChangeText={onChangeTitle}
        />
        <Button size="$3" disabled={!title.trim()} asChild>
          <button type="submit">Add</button>
        </Button>
      </form>
    </XStack>
  );
}
