// One-shot courier status sync — for a system crontab (e.g. Hostinger).
//   node src/scripts/syncCourierStatuses.js
// Connects, syncs all in-flight orders from Mylerz, prints a summary, exits.
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { syncAllShippedOrders } from "../modules/couriers/couriers.service.js";

const run = async () => {
  await connectDatabase();
  const result = await syncAllShippedOrders();
  console.log(
    `[syncCourierStatuses] scanned=${result.scanned} changed=${result.changed} failed=${result.failed}`
  );
  if (result.errors.length) console.error(result.errors);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[syncCourierStatuses] failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
