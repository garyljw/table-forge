import { z } from "zod";
import { DmOnly, DocumentKey, RecordId } from "./common.js";

export const RollTableCategory = z.enum(["treasure", "encounter", "npc", "madness", "trinket", "dungeon", "other"]);
export type RollTableCategory = z.infer<typeof RollTableCategory>;

/** A die written as `d8`, `d100` or `2d6` (a count of 1 may be left out). Which rolls it covers is worked out in packages/core. */
export const DiceNotation = z.string().regex(/^[1-9]\d?d[1-9]\d{0,3}$|^d[1-9]\d{0,3}$/, "must look like d8, d100 or 2d6");

export const RollTableRow = z
  .object({
    /** First roll this row covers. */
    min: z.number().int(),
    /** Last roll this row covers (equal to `min` for a single number). */
    max: z.number().int(),
    /** One cell per column, in column order. */
    cells: z.array(z.string()),
  })
  .refine((r) => r.min <= r.max, { message: "min must not be greater than max", path: ["max"] });
export type RollTableRow = z.infer<typeof RollTableRow>;

export const RollTableSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  category: RollTableCategory,
  dice: DiceNotation,
});
export type RollTableSummary = z.infer<typeof RollTableSummary>;

/**
 * A table the DM rolls on. This schema checks the shape (the die notation, `min <= max`, one cell per
 * column). That the rows lie inside the die's range, do not overlap and cover every roll needs the dice
 * arithmetic, which lives in packages/core (`checkRollTableRows`); shared holds no logic beyond shape.
 * Whatever writes a roll table (the private-data validator, a future homebrew editor) must call it.
 */
export const RollTable = RollTableSummary.extend({
  dmOnly: DmOnly,
  description: z.string().nullable(),
  /** Column headings after the roll column, e.g. `["Item"]` or `["Trinket", "Value"]`. */
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(RollTableRow).min(1),
}).superRefine((t, ctx) => {
  t.rows.forEach((row, i) => {
    if (row.cells.length !== t.columns.length) {
      ctx.addIssue({ code: "custom", message: `needs ${t.columns.length} cells, has ${row.cells.length}`, path: ["rows", i, "cells"] });
    }
  });
});
export type RollTable = z.infer<typeof RollTable>;
