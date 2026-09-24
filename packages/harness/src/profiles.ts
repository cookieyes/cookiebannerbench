/**
 * Device profiles, applied over the Chrome DevTools Protocol:
 *   - `Emulation.setCPUThrottlingRate`
 *   - `Network.emulateNetworkConditions`
 *
 * `throttled-mobile` mirrors Lighthouse's Mobile preset (4x CPU slowdown,
 * "Slow 4G": 1638/750 Kbps, 150ms RTT) so numbers stay comparable with public
 * Lighthouse runs. `fast-desktop` applies no throttling at all.
 */
export interface DeviceProfile {
  name: string;
  /** 1 means no CPU throttling; 4 means 4x slower than the host. */
  cpuThrottlingRate: number;
  network: {
    /** Download throughput in Kbps, or -1 for unthrottled. */
    downloadKbps: number;
    /** Upload throughput in Kbps, or -1 for unthrottled. */
    uploadKbps: number;
    /** Extra latency per request, in ms. */
    latencyMs: number;
  } | null;
}

export const PROFILES = {
  "fast-desktop": {
    name: "fast-desktop",
    cpuThrottlingRate: 1,
    network: null,
  },
  "throttled-mobile": {
    name: "throttled-mobile",
    cpuThrottlingRate: 4,
    network: { downloadKbps: 1638, uploadKbps: 750, latencyMs: 150 },
  },
} as const satisfies Record<string, DeviceProfile>;

export type ProfileName = keyof typeof PROFILES;

export const PROFILE_NAMES = Object.keys(PROFILES) as ProfileName[];

export function isProfileName(value: string): value is ProfileName {
  return value in PROFILES;
}

export function getProfile(name: ProfileName): DeviceProfile {
  return PROFILES[name];
}
