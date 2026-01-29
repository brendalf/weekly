import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v4";

const config = createTamagui(defaultConfig);

export type AppConfig = typeof config

declare module 'tamagui' {
  // or '@tamagui/core'
  // overrides TamaguiCustomConfig so your custom types
  // work everywhere you import `tamagui`
  interface TamaguiCustomConfig extends AppConfig {
    tamaguiCustomConfig?: never
  }
}

export default config