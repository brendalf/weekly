import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v4";

// you usually export this from a tamagui.config.ts file
export const config = createTamagui(defaultConfig);

type Conf = typeof config;

// make imports typed
declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}