import { z } from "zod";

/** Response of `GET /api/me`. `isAdmin` only decides whether the web app shows the admin link; the server checks it again on every admin request. */
export const MeResponse = z.object({ email: z.string().min(1), isAdmin: z.boolean() });

export type MeResponse = z.infer<typeof MeResponse>;
