import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";

const DEVICE_ICONS: Record<string, IconName> = {
  mobile: "mobile-screen",
  tablet: "tablet",
  desktop: "desktop",
};

const OS_ICONS: Record<string, IconName> = {
  ios: "apple",
  macos: "apple",
  android: "android",
  windows: "windows",
  linux: "linux",
  chromeos: "chrome",
};

const BROWSER_ICONS: Record<string, IconName> = {
  chrome: "chrome",
  safari: "safari",
  firefox: "firefox",
  edge: "edge",
};

/** Regional-indicator flag from an ISO 3166-1 alpha-2 code. */
export function countryFlag(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) {
    return "";
  }
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((char) => base + char.charCodeAt(0) - 65),
  );
}

export function countryBadge(code: string): ReactNode {
  const flag = countryFlag(code);
  return flag || "??";
}

export function deviceIcon(device: string): ReactNode {
  const name = DEVICE_ICONS[device.toLowerCase()];
  return name ? <Icon name={name} className="text-sm" /> : null;
}

export function osIcon(os: string): ReactNode {
  const name = OS_ICONS[os.toLowerCase()];
  return name ? <Icon name={name} className="text-sm" /> : null;
}

export function browserIcon(browser: string): ReactNode {
  const name = BROWSER_ICONS[browser.toLowerCase()];
  return name ? <Icon name={name} className="text-sm" /> : null;
}
