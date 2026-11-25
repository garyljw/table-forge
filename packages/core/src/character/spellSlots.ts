import type { ClassTableColumn } from "@table-forge/shared";

export interface SlotTable {
  slots: { level: number; total: number }[];
  /** True when the class table has a usable spell slot column at all. */
  found: boolean;
}

const ORDINAL = /^\s*([1-9])(?:st|nd|rd|th)\b/i;

function cellCount(text: string | undefined): number {
  if (text === undefined) return 0;
  const m = /\d+/.exec(text);
  return m ? Number(m[0]) : 0; // "-", an en dash and "" mean none
}

/** SRD Pact Magic slot level by warlock class level. */
function pactSlotLevel(level: number): number {
  return Math.min(5, Math.ceil(level / 2));
}

/**
 * Open5e's class table has one `spellSlots` column per slot level, named "1st" to "9th", with the
 * count at each class level as a string ("2", or "-" for none). Warlocks use Pact Magic instead:
 * a "Spell Slots" count column (the real SRD data has no "Slot Level" column, so the slot level comes
 * from the SRD progression: levels 1-2 give 1st, 3-4 2nd, 5-6 3rd, 7-8 4th, 9+ 5th). A "Slot Level"
 * column such as "1st" is preferred when present. Anything else gives found = false.
 */
export function spellSlotsForLevel(table: readonly ClassTableColumn[], level: number): SlotTable {
  const key = String(level);
  const slots: { level: number; total: number }[] = [];
  let found = false;
  for (const col of table) {
    const m = ORDINAL.exec(col.name);
    if (col.kind === "spellSlots" && m) {
      found = true;
      const total = cellCount(col.values[key]);
      if (total > 0) slots.push({ level: Number(m[1]), total });
    }
  }
  if (found) return { slots: slots.sort((a, b) => a.level - b.level), found };

  const count = table.find((c) => /^spell slots$/i.test(c.name.trim()));
  if (count) {
    const total = cellCount(count.values[key]);
    const slotLevel = table.find((c) => /^slot level$/i.test(c.name.trim()));
    const lm = slotLevel ? ORDINAL.exec(slotLevel.values[key] ?? "") : null;
    const slotLvl = lm ? Number(lm[1]) : pactSlotLevel(level);
    return { slots: total > 0 ? [{ level: slotLvl, total }] : [], found: true };
  }
  return { slots: [], found: false };
}
