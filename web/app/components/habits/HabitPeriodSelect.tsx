"use client";
import { Period } from "@weekly/domain";
import { Select, ListBox } from "@heroui/react";

interface HabitPeriodSelectProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function HabitPeriodSelect({ value, onChange }: HabitPeriodSelectProps) {
  return (
    <Select
      fullWidth
      placeholder="Period"
      variant="secondary"
      value={value}
      onChange={(e) => onChange(e as Period)}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="day" textValue="day">
            per day
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="week" textValue="week">
            per week
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="month" textValue="month">
            per month
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
