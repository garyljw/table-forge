import { z } from "zod";

/** Response of `GET /api/health`. */
export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("table-forge"),
  version: z.string().min(1),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
