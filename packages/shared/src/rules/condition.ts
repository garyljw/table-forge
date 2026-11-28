import { z } from "zod";
import { DocumentKey, RecordId, DmOnly } from "./common.js";

export const ConditionSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
});
export type ConditionSummary = z.infer<typeof ConditionSummary>;

export const Condition = ConditionSummary.extend({
  dmOnly: DmOnly,
  description: z.string().min(1),
});
export type Condition = z.infer<typeof Condition>;
