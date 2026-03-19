"use client";
import { HabitPeriod } from "@weekly/domain";
import { Select, ListBox } from "@heroui/react";

interface HabitPeriodSelectProps {
  value: HabitPeriod;
  onChange: (period: HabitPeriod) => void;
}

export function HabitPeriodSelect({ value, onChange }: HabitPeriodSelectProps) {
  return (
    <Select
      fullWidth
      placeholder="Period"
      variant="secondary"
      value={value}
      onChange={(e) => onChange(e as HabitPeriod)}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={HabitPeriod.Day} textValue={HabitPeriod.Day}>
            per day
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id={HabitPeriod.Week} textValue={HabitPeriod.Week}>
            per week
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id={HabitPeriod.Month} textValue={HabitPeriod.Month}>
            per month
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
