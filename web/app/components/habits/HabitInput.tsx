"use client";

import { FormEvent } from "react";
import { Button, Input } from "@heroui/react";

interface HabitInputProps {
  name: string;
  onChangeName: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function HabitInput({ name, onChangeName, onSubmit }: HabitInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex w-full gap-2">
      <Input
        fullWidth
        placeholder="Add a habit (e.g. Read a book)"
        value={name}
        onChange={(e) => onChangeName(e.target.value)}
      />
      <Button type="submit" size="sm" isDisabled={!name.trim()}>
        Add
      </Button>
    </form>
  );
}
