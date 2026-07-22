import { env } from "../config/env.js";
import { syncAllShippedOrders } from "../modules/couriers/couriers.service.js";

let timer = null;
let running = false;

const runOnce = async () => {
  if (running) return; // never overlap two runs
  running = true;
  try {
    const result = await syncAllShippedOrders();
    if (result.scanned > 0) {
      console.log(
        `[courierSync] scanned=${result.scanned} changed=${result.changed} failed=${result.failed}`
      );
    }
  } catch (error) {
    console.error("[courierSync] run failed:", error.message);
  } finally {
    running = false;
  }
};

// Starts an in-process interval that syncs order statuses from Mylerz.
// Works on any long-lived Node host (e.g. Hostinger) — no external cron needed.
export const startCourierStatusSync = () => {
  if (!env.COURIER_SYNC_ENABLED) {
    console.log("[courierSync] disabled (COURIER_SYNC_ENABLED=false)");
    return;
  }

  const minutes = Math.max(5, env.COURIER_SYNC_INTERVAL_MINUTES || 30);
  const intervalMs = minutes * 60 * 1000;

  // First run a minute after boot, then on the interval.
  setTimeout(runOnce, 60 * 1000);
  timer = setInterval(runOnce, intervalMs);
  if (timer.unref) timer.unref();

  console.log(`[courierSync] enabled — every ${minutes} min`);
};

export const stopCourierStatusSync = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
