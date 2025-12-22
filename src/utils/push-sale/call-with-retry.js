import { delay } from "../common/date-helper.js";

export async function callWithRetry(fn, retryDelay = 60_000) {
  while (true) {
    const res = await fn();

    if (res?.successful) return res;

    if (res?.errorCode === "time_limit") {
      console.log("⏳ Dính time_limit, chờ 1 phút rồi gọi lại...");
      await delay(retryDelay);
      continue;
    }

    throw new Error(`PushSale error: ${res?.errorCode || "unknown"}`);
  }
}