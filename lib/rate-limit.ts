import { createServiceClient } from "@/lib/supabase/server";

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/story": { max: 10, windowMs: 60 * 60 * 1000 }, // 10/hr
  "/api/generate-form": { max: 20, windowMs: 60 * 60 * 1000 }, // 20/hr
  "/api/requests": { max: 60, windowMs: 60 * 60 * 1000 }, // 60/hr
};

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = LIMITS[endpoint] ?? { max: 30, windowMs: 60 * 60 * 1000 };
  const supabase = await createServiceClient();

  const windowStart = new Date(Date.now() - limit.windowMs).toISOString();

  const { count } = await supabase
    .from("api_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart);

  const used = count ?? 0;
  const allowed = used < limit.max;

  // Log this request
  await supabase.from("api_logs").insert({
    user_id: userId,
    endpoint,
    ip_address: ip,
    success: allowed,
  });

  return { allowed, remaining: Math.max(0, limit.max - used - 1) };
}
