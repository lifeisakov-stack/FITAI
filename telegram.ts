import crypto from "node:crypto";

export function validateTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 60 * 60 * 24) {
  if (!initData || !botToken) return false;
  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");
    const authDate = Number(params.get("auth_date"));
    if (!receivedHash || !Number.isFinite(authDate)) return false;
    if (Math.abs(Date.now() / 1000 - authDate) > maxAgeSeconds) return false;
    params.delete("hash");
    params.delete("signature");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculated = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
    const a = Buffer.from(calculated, "hex");
    const b = Buffer.from(receivedHash, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
