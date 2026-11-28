import { challengeRatingProficiencyBonus, challengeRatingXp, formatChallengeRating } from "@table-forge/core";

/** Small display helpers. Source keys like `bonus-action` or `1minute` become readable text. */

export function capitalise(s: string): string {
  return s === "" ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

export function titleKey(key: string): string {
  return capitalise(key.replace(/[-_]/g, " "));
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** `3rd-level evocation` or `Evocation cantrip`. */
export function spellSubtitle(level: number, school: string): string {
  return level === 0 ? `${titleKey(school)} cantrip` : `${ordinal(level)}-level ${school}`;
}

/** `action` → `1 action`, `1minute` → `1 minute`, `10minutes` → `10 minutes`. */
export function castingTimeLabel(key: string): string {
  const m = /^(\d+)([a-z-]+)$/.exec(key);
  if (m) return `${m[1]} ${(m[2] ?? "").replace(/-/g, " ")}`;
  return `1 ${key.replace(/-/g, " ")}`;
}

/** The core CR helpers throw outside 0 to 30. Third-party data can hold anything, so the UI shows the raw value instead. */
export function safeCr(cr: number): { label: string; xp: number | null; proficiencyBonus: number | null } {
  try {
    return {
      label: formatChallengeRating(cr),
      xp: challengeRatingXp(cr),
      proficiencyBonus: challengeRatingProficiencyBonus(cr),
    };
  } catch {
    return { label: String(cr), xp: null, proficiencyBonus: null };
  }
}

export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `-${Math.abs(n)}`;
}

/** Only `http:` and `https:` URLs may become links (a `javascript:` URL would run script when clicked). */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** `<select>` options from slug keys. */
export function keyOptions(keys: string[]): { value: string; label: string }[] {
  return keys.map((k) => ({ value: k, label: titleKey(k) }));
}

/** "1d8 slashing", or "—" for a weapon that deals no damage (a net: dice "0") or has no damage type. */
export function weaponDamageLabel(damageDice: string, damageType: string | null): string {
  return damageType === null || damageDice.trim() === "0" ? "—" : `${damageDice} ${damageType}`;
}

/** "very-rare" becomes "very rare"; "varies" becomes "rarity varies". */
export function rarityLabel(rarity: string): string {
  return rarity === "varies" ? "rarity varies" : rarity.replace(/[-_]/g, " ");
}

/** "Weapon (longsword), rare (requires attunement by a wizard)". */
export function magicItemSubtitle(m: {
  type: string;
  rarity: string;
  baseItem: string | null;
  requiresAttunement: boolean;
  attunementDetail: string | null;
}): string {
  const base = m.baseItem ? ` (${m.baseItem})` : "";
  const attune = m.requiresAttunement ? ` (requires attunement${m.attunementDetail ? ` ${m.attunementDetail}` : ""})` : "";
  return `${titleKey(m.type)}${base}, ${rarityLabel(m.rarity)}${attune}`;
}

/** A price given in gold pieces: 0.05 is "5 cp", 0.5 is "5 sp", 25 is "25 gp". A price of nothing is a dash. */
export function costLabel(gp: number): string {
  const cp = Math.round(gp * 100);
  if (cp <= 0) return "\u2014";
  if (cp >= 100) return `${cp / 100} gp`;
  return cp % 10 === 0 ? `${cp / 10} sp` : `${cp} cp`;
}

/** Weight in pounds, or a dash when the source gives none. */
export function weightLabel(lb: number | null): string {
  return lb === null ? "\u2014" : `${lb} lb.`;
}
