"use client";

import { FormEvent } from "react";
import { XStack, Input, Button } from "tamagui";

interface HabitInputProps {
  name: string;
  onChangeName: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function HabitInput({ name, onChangeName, onSubmit }: HabitInputProps) {
  return (
    <XStack asChild gap="$2">
      <form
        onSubmit={onSubmit}
        style={{ width: "100%", display: "flex", gap: 8 }}
      >
        <Input
          flex={1}
          size="$3"
          placeholder="Add a habit (e.g. Read a book)"
          value={name}
          onChangeText={onChangeName}
        />
        <Button size="$3" disabled={!name.trim()} asChild>
          <button type="submit">Add</button>
        </Button>
      </form>
    </XStack>
  );
}
