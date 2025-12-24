"use client";

import { ReactNode } from "react";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../tamagui.config";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <TamaguiProvider config={tamaguiConfig}>{children}</TamaguiProvider>;
}
