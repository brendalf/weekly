"use client";

import { useContext, useState } from "react";
import { Button } from "@heroui/react";
import { ThemeContext } from "../../providers";
import { touchTarget } from "../ui";
import { Moon, Sun } from "@gravity-ui/icons";

export function ThemeToggleButton({ userId }: { userId: string }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [spinning, setSpinning] = useState(false);

  function handleClick() {
    setSpinning(true);
    toggleTheme(userId);
  }

  return (
    <Button
      size="sm"
      isIconOnly
      variant="outline"
      // `size="sm"` is 32px; the 44px floor is not optional (DIRECTION §6.8).
      className={touchTarget}
      onPress={handleClick}
      aria-label="Toggle theme"
    >
      <span
        className={spinning ? "animate-spin-once" : ""}
        onAnimationEnd={() => setSpinning(false)}
        style={{ display: "inline-block" }}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </span>
    </Button>
  );
}
