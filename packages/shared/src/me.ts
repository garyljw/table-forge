import { z } from "zod";

/** Response of `GET /api/me`. */
export const MeResponse = z.object({ email: z.string().min(1) });

export type MeResponse = z.infer<typeof MeResponse>;
