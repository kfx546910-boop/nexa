/**
 * NEXA // REAL SYSTEM TELEMETRY
 *
 * Reads genuine device metrics exposed by the browser platform.
 * Metrics the browser does not expose are reported as `null` and the UI
 * renders them as `N/A` — nothing here is fabricated.
 */

export interface NexaTelemetrySnapshot {
  /** Physical / virtual CPU core count from the OS scheduler (real). */
  cpuCores: number | null;
  /** CPU utilization %. Browsers do not expose this -> always null -> N/A. */
  cpuLoadPct: number | null;
  /** Total device RAM in GB (Chromium `navigator.deviceMemory`). */
  ramGB: number | null;
  /** Live JS heap usage in MB (Chromium `performance.memory`). */
  jsHeapMB: number | null;
  /** GPU renderer reported by WebGL (real hardware/driver string). */
  gpuRenderer: string | null;
  /** Navigator online state when exposed by the platform. */
  online: boolean | null;
  /** Cellular/wifi effective connection type (Chromium connection API). */
  networkType: string | null;
  /** Estimated round-trip time in ms (Chromium connection API). */
  latencyMs: number | null;
  /** Battery level 0-100 when the platform exposes battery info. */
  batteryLevelPct: number | null;
  /** Whether the device is currently charging (when exposed). */
  batteryCharging: boolean | null;
  /** Platform/product string (Chromium `navigator.platform`). */
  platform: string | null;
  /** Seconds since this application session started. */
  uptimeSeconds: number;
}

type ExtendedNavigator = Navigator & {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  onLine?: boolean;
  platform?: string;
  connection?: {
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
    uplink?: number;
  };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
};

type ExtendedPerformance = Performance & {
  memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number };
};

const SESSION_START = typeof performance !== 'undefined' ? performance.now() : 0;

function readGpuRenderer(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl: any =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as any);
    if (!gl) return null;
    const version = String(gl.getParameter(gl.VERSION) || '');
    const renderer = String(gl.getParameter(gl.RENDERER) || '');
    const vendor = String(gl.getParameter(gl.VENDOR) || '');
    const parts = [version, renderer, vendor].map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : null;
  } catch {
    return null;
  }
}

export function readTelemetry(): NexaTelemetrySnapshot {
  let nav: ExtendedNavigator | null = null;
  let perf: ExtendedPerformance | null = null;
  try {
    nav = navigator as ExtendedNavigator;
  } catch {
    nav = null;
  }
  try {
    perf = performance as ExtendedPerformance;
  } catch {
    perf = null;
  }

  let latency: number | null = null;
  let networkType: string | null = null;
  if (nav?.connection) {
    if (typeof nav.connection.rtt === 'number' && Number.isFinite(nav.connection.rtt)) {
      latency = Math.max(0, Math.round(nav.connection.rtt));
    }
    networkType = nav.connection.effectiveType || null;
  }

  let batteryLevel: number | null = null;
  let batteryCharging: boolean | null = null;
  if (typeof nav?.getBattery === 'function') {
    try {
      const batteryPromise = nav.getBattery();
      if (batteryPromise) {
        void batteryPromise.then(battery => {
          try {
            nexaTelemetryCache.batteryLevelPct = Math.round(Math.min(1, Math.max(0, battery.level)) * 100);
            nexaTelemetryCache.batteryCharging = battery.charging;
          } catch {
            /* ignore */
          }
        }).catch(() => { /* battery API rejected */ });
      }
    } catch {
      /* ignore */
    }
  }

  return {
    cpuCores: nav?.hardwareConcurrency ?? null,
    cpuLoadPct: null, // not exposed by any browser platform
    ramGB: typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : null,
    jsHeapMB:
      perf?.memory?.usedJSHeapSize
        ? Math.max(0, Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10)
        : null,
    gpuRenderer: readGpuRenderer(),
    online: typeof nav?.onLine === 'boolean' ? nav.onLine : null,
    networkType,
    latencyMs: latency,
    batteryLevelPct: batteryLevel,
    batteryCharging,
    platform: nav?.platform || null,
    uptimeSeconds: Math.max(0, Math.floor((performance.now() - SESSION_START) / 1000))
  };
}

/** Cache that async battery results can patch without a full re-read. */
export const nexaTelemetryCache: NexaTelemetrySnapshot = readTelemetry();

export function formatUptime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}