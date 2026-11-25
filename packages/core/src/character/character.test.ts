import { ABILITIES, SKILLS, type Ability, type CharacterData, type DerivedSheet, type Breakdown } from "@table-forge/shared";
import { describe, expect, it } from "vitest";
import { deriveSheet } from "./derive.js";
import { chainMail, grant, weaponRecords, makeCharacter, makeClass, plate, rapier, rules, scaleMail, src, studdedLeather } from "./fixtures.js";
import { parseAbility, parseSkill } from "./names.js";
import { proficiencyBonusForLevel } from "./proficiency.js";

const dwarf = src("race", "Dwarf");
const hillDwarf = src("subrace", "Hill Dwarf");
const cleric = src("class", "Cleric");
const elf = src("race", "Elf");
const woodElf = src("subrace", "Wood Elf");
const rogue = src("class", "Rogue");

const clericClass = makeClass("Cleric", ["Wisdom", "Charisma"], "FULL", [
  { name: "1st", kind: "spellSlots", values: { "1": "2", "2": "3", "3": "4" } },
  { name: "2nd", kind: "spellSlots", values: { "1": "-", "2": "-", "3": "2" } },
]);

function hillDwarfCleric(over: Partial<CharacterData> = {}): CharacterData {
  return makeCharacter({
    race: dwarf,
    subrace: hillDwarf,
    class: cleric,
    hitDie: 8,
    abilityScores: { method: "standardArray", scores: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 } },
    grants: [
      grant(dwarf, { type: "abilityBonus", ability: "con", amount: 2 }),
      grant(hillDwarf, { type: "abilityBonus", ability: "wis", amount: 1 }),
      grant(hillDwarf, { type: "hpBonusPerLevel", amount: 1 }),
      grant(dwarf, { type: "speed", feet: 25 }),
      grant(dwarf, { type: "darkvision", feet: 60 }),
      grant(dwarf, { type: "resistance", damageType: "Poison" }),
      grant(dwarf, { type: "trait", name: "Dwarven Resilience", text: "Advantage vs poison." }),
      grant(cleric, { type: "proficiency", category: "armor", key: "heavy" }),
      grant(cleric, { type: "proficiency", category: "armor", key: "shield" }),
    ],
    equipment: { armorId: chainMail.id, shield: true, weapons: [], inventory: "" },
    spellcastingAbility: "wis",
    ...over,
  });
}

function allBreakdowns(d: DerivedSheet): Breakdown[] {
  const out: Breakdown[] = [d.proficiencyBonus, d.passivePerception, d.initiative, d.speed, d.armorClass, d.maxHp];
  if (d.darkvision) out.push(d.darkvision);
  for (const a of ABILITIES) out.push(d.abilities[a].score, d.saves[a].bonus);
  for (const s of SKILLS) out.push(d.skills[s].bonus);
  for (const w of d.attacks) {
    out.push(w.attackBonus);
    if (w.damage) out.push(w.damage.bonus);
  }
  if (d.spellcasting) out.push(d.spellcasting.saveDc, d.spellcasting.attackBonus);
  return out;
}

describe("proficiencyBonusForLevel", () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [13, 5],
    [17, 6],
    [20, 6],
  ])("level %i gives +%i", (level, bonus) => {
    expect(proficiencyBonusForLevel(level)).toBe(bonus);
  });
  it("rejects levels outside 1 to 20", () => {
    expect(() => proficiencyBonusForLevel(0)).toThrow(RangeError);
    expect(() => proficiencyBonusForLevel(21)).toThrow(RangeError);
  });
});

describe("hill dwarf cleric 1", () => {
  const d = deriveSheet(hillDwarfCleric(), rules({ classDetail: clericClass, armor: chainMail }));
  it("adds racial bonuses to base scores", () => {
    expect(d.abilities.con.score.total).toBe(15);
    expect(d.abilities.con.modifier).toBe(2);
    expect(d.abilities.wis.score.total).toBe(16);
    expect(d.abilities.wis.modifier).toBe(3);
    expect(d.abilities.con.score.parts.map((p) => p.label)).toEqual(["Base score (standard array)", "Dwarf"]);
  });
  it("has WIS and CHA saves from the class", () => {
    expect(d.saves.wis).toMatchObject({ proficient: true });
    expect(d.saves.wis.bonus.total).toBe(5);
    expect(d.saves.cha.bonus.total).toBe(3);
    expect(d.saves.str.proficient).toBe(false);
    expect(d.saves.str.bonus.total).toBe(2);
  });
  it("has 8 + CON + 1 HP", () => {
    expect(d.maxHp.total).toBe(11);
  });
  it("has AC 18 in chain mail and a shield", () => {
    expect(d.armorClass.total).toBe(18);
    expect(d.warnings.filter((w) => /proficient|Strength/.test(w))).toEqual([]);
  });
  it("has spell DC 13, attack +5 and first-level slots", () => {
    expect(d.spellcasting?.saveDc.total).toBe(13);
    expect(d.spellcasting?.attackBonus.total).toBe(5);
    expect(d.spellcasting?.slots).toEqual([{ level: 1, total: 2, spent: 0 }]);
  });
  it("uses the dwarf speed and darkvision, and lists traits by source", () => {
    expect(d.speed.total).toBe(25);
    expect(d.darkvision?.total).toBe(60);
    expect(d.resistances).toEqual(["poison"]);
    expect(d.features).toEqual([{ source: dwarf, traits: [{ name: "Dwarven Resilience", text: "Advantage vs poison." }] }]);
  });
  it("tracks spent slots and gives level 3 slots", () => {
    const d3 = deriveSheet(hillDwarfCleric({ level: 3, spentSpellSlots: { "1": 1, "2": 9 } }), rules({ classDetail: clericClass, armor: chainMail }));
    expect(d3.spellcasting?.slots).toEqual([
      { level: 1, total: 4, spent: 1 },
      { level: 2, total: 2, spent: 2 },
    ]);
    // 8 + (5 + 2) * 2 levels... level 1 max, then average 5 + CON 2 per level, plus 1 per level
    expect(d3.maxHp.total).toBe(8 + 2 + 2 * (5 + 2) + 3);
  });
  it("warns when slot data is missing for a caster", () => {
    const d2 = deriveSheet(hillDwarfCleric(), rules({ classDetail: makeClass("Cleric", ["Wisdom"], "FULL"), armor: chainMail }));
    expect(d2.spellcasting?.slots).toEqual([]);
    expect(d2.warnings.some((w) => w.includes("No spell slot data"))).toBe(true);
  });
});

describe("wood elf rogue 1", () => {
  const c = makeCharacter({
    race: elf,
    subrace: woodElf,
    class: rogue,
    abilityScores: { method: "standardArray", scores: { str: 10, dex: 15, con: 13, int: 14, wis: 12, cha: 8 } },
    grants: [
      grant(elf, { type: "abilityBonus", ability: "dex", amount: 2 }),
      grant(woodElf, { type: "abilityBonus", ability: "wis", amount: 1 }),
      grant(elf, { type: "proficiency", category: "skill", key: "perception" }),
      grant(rogue, { type: "proficiency", category: "skill", key: "stealth" }),
      grant(rogue, { type: "expertise", skill: "stealth" }),
      grant(rogue, { type: "proficiency", category: "weapon", key: "simple" }),
      grant(rogue, { type: "proficiency", category: "weapon", key: "Rapier" }),
      grant(rogue, { type: "proficiency", category: "armor", key: "light" }),
      grant(rogue, { type: "proficiency", category: "save", key: "dex" }),
      grant(woodElf, { type: "speed", feet: 35 }),
      grant(elf, { type: "speed", feet: 30 }),
    ],
    equipment: {
      armorId: studdedLeather.id,
      shield: false,
      weapons: [{ id: "w1", weaponId: rapier.id, name: "Rapier", magicBonus: 0, custom: null }],
      inventory: "",
    },
  });
  const d = deriveSheet(c, rules({ classDetail: makeClass("Rogue", ["Dexterity", "Intelligence"], null), armor: studdedLeather }));
  it("computes ability scores", () => {
    expect(d.abilities.dex.score.total).toBe(17);
    expect(d.abilities.wis.score.total).toBe(13);
  });
  it("gives expertise and passive Perception", () => {
    expect(d.skills.stealth).toMatchObject({ proficient: true, expertise: true });
    expect(d.skills.stealth.bonus.total).toBe(3 + 2 + 2);
    expect(d.skills.perception.bonus.total).toBe(1 + 2);
    expect(d.passivePerception.total).toBe(13);
    expect(d.skills.athletics.bonus.total).toBe(0);
  });
  it("uses the highest base speed", () => {
    expect(d.speed.total).toBe(35);
  });
  it("has studded leather AC", () => {
    expect(d.armorClass.total).toBe(15);
    expect(d.initiative.total).toBe(3);
  });
  it("attacks with a finesse rapier using DEX", () => {
    const a = d.attacks[0];
    expect(a?.attackBonus.total).toBe(3 + 2);
    expect(a?.proficient).toBe(true);
    expect(a?.damage?.text).toBe("1d8 + 3 piercing");
    expect(a?.properties).toEqual(["Finesse"]);
  });
  it("saves: class and grant both give DEX, INT from class", () => {
    expect(d.saves.dex.bonus.total).toBe(5);
    expect(d.saves.int.bonus.total).toBe(2 + 2);
  });
  it("ignores expertise without proficiency", () => {
    const c2 = makeCharacter({ grants: [grant(rogue, { type: "expertise", skill: "stealth" })] });
    const d2 = deriveSheet(c2, rules());
    expect(d2.skills.stealth.expertise).toBe(false);
    expect(d2.warnings.some((w) => w.includes("Expertise"))).toBe(true);
  });
});

describe("unarmored defense", () => {
  const barb = src("class", "Barbarian");
  const monk = src("class", "Monk");
  const scores = { method: "manual" as const, scores: { str: 10, dex: 14, con: 16, int: 8, wis: 15, cha: 8 } };
  it("barbarian: 10 + DEX + CON", () => {
    const d = deriveSheet(makeCharacter({ abilityScores: scores, grants: [grant(barb, { type: "unarmoredDefense", abilities: ["con"], shieldAllowed: true })] }), rules());
    expect(d.armorClass.total).toBe(10 + 2 + 3);
  });
  it("barbarian keeps the bonus with a shield", () => {
    const d = deriveSheet(makeCharacter({ abilityScores: scores, equipment: { armorId: null, shield: true, weapons: [], inventory: "" }, grants: [grant(barb, { type: "unarmoredDefense", abilities: ["con"], shieldAllowed: true })] }), rules());
    expect(d.armorClass.total).toBe(17);
  });
  it("monk: 10 + DEX + WIS, off with a shield", () => {
    const g = [grant(monk, { type: "unarmoredDefense", abilities: ["wis"], shieldAllowed: false })];
    expect(deriveSheet(makeCharacter({ abilityScores: scores, grants: g }), rules()).armorClass.total).toBe(10 + 2 + 2);
    const withShield = deriveSheet(makeCharacter({ abilityScores: scores, grants: g, equipment: { armorId: null, shield: true, weapons: [], inventory: "" } }), rules());
    expect(withShield.armorClass.total).toBe(10 + 2 + 2);
    expect(withShield.warnings.some((w) => w.includes("Unarmored Defense"))).toBe(true);
  });
  it("armour overrides unarmored defense", () => {
    const d = deriveSheet(
      makeCharacter({
        abilityScores: scores,
        equipment: { armorId: studdedLeather.id, shield: false, weapons: [], inventory: "" },
        grants: [grant(barb, { type: "unarmoredDefense", abilities: ["con"], shieldAllowed: true })],
      }),
      rules({ armor: studdedLeather }),
    );
    expect(d.armorClass.total).toBe(12 + 2);
  });
  it("takes the better of two unarmored defenses", () => {
    const d = deriveSheet(
      makeCharacter({ abilityScores: scores, grants: [grant(barb, { type: "unarmoredDefense", abilities: ["con"], shieldAllowed: true }), grant(monk, { type: "unarmoredDefense", abilities: ["wis"], shieldAllowed: true })] }),
      rules(),
    );
    expect(d.armorClass.total).toBe(15);
  });
});

describe("armour rules", () => {
  const withArmor = (armor: typeof plate, str: number, dex: number, grants: CharacterData["grants"] = []): DerivedSheet =>
    deriveSheet(
      makeCharacter({
        abilityScores: { method: "manual", scores: { str, dex, con: 10, int: 10, wis: 10, cha: 10 } },
        equipment: { armorId: armor.id, shield: false, weapons: [], inventory: "" },
        grants,
      }),
      rules({ armor }),
    );
  it("warns about the heavy armour STR requirement and cuts speed by 10", () => {
    const d = withArmor(plate, 12, 10);
    expect(d.warnings.some((w) => w.includes("Strength 15"))).toBe(true);
    expect(d.speed.total).toBe(20);
    expect(d.armorClass.total).toBe(18);
  });
  it("no penalty when STR is enough", () => {
    expect(withArmor(plate, 15, 10).speed.total).toBe(30);
  });
  it("warns about non-proficient armour and stealth", () => {
    const d = withArmor(chainMail, 15, 10);
    expect(d.warnings.some((w) => w.includes("Not proficient with heavy"))).toBe(true);
    expect(d.warnings.some((w) => w.includes("Stealth"))).toBe(true);
    expect(withArmor(chainMail, 15, 10, [grant(cleric, { type: "proficiency", category: "armor", key: "heavy" })]).warnings.some((w) => w.includes("Not proficient"))).toBe(false);
  });
  it("caps DEX for medium armour", () => {
    expect(withArmor(scaleMail, 10, 18).armorClass.total).toBe(14 + 2);
    expect(withArmor(scaleMail, 10, 12).armorClass.total).toBe(14 + 1);
    expect(withArmor(scaleMail, 10, 6).armorClass.total).toBe(14 - 2);
  });
  it("heavy armour ignores DEX", () => {
    expect(withArmor(chainMail, 15, 18).armorClass.total).toBe(16);
  });
  it("adds acBonus", () => {
    const d = withArmor(chainMail, 15, 10, [grant(src("item", "Ring"), { type: "acBonus", amount: 1 })]);
    expect(d.armorClass.total).toBe(17);
  });
});

describe("weapon attacks", () => {
  const w = (weaponId: string, extra: Partial<CharacterData["equipment"]["weapons"][number]> = {}): CharacterData["equipment"]["weapons"][number] => ({
    id: weaponId,
    weaponId,
    name: weaponId,
    magicBonus: 0,
    custom: null,
    ...extra,
  });
  const attacks = (weapons: CharacterData["equipment"]["weapons"], grants: CharacterData["grants"], scores = { str: 16, dex: 12, con: 10, int: 10, wis: 10, cha: 10 }): DerivedSheet["attacks"] =>
    deriveSheet(makeCharacter({ abilityScores: { method: "manual", scores }, equipment: { armorId: null, shield: false, weapons, inventory: "" }, grants }), rules()).attacks;
  const martial = [grant(src("class", "Fighter"), { type: "proficiency", category: "weapon", key: "martial" })];

  it("melee uses STR, proficient by category", () => {
    const [a] = attacks([w("srd_longsword")], martial);
    expect(a?.attackBonus.total).toBe(3 + 2);
    expect(a?.damage?.text).toBe("1d8 + 3 slashing");
  });
  it("not proficient without a grant", () => {
    const [a] = attacks([w("srd_longsword")], []);
    expect(a?.proficient).toBe(false);
    expect(a?.attackBonus.total).toBe(3);
  });
  it("ranged uses DEX", () => {
    const [a] = attacks([w("srd_longbow")], martial, { str: 16, dex: 14, con: 10, int: 10, wis: 10, cha: 10 });
    expect(a?.attackBonus.total).toBe(2 + 2);
    expect(a?.rangeText).toBe("150/600 ft");
  });
  it("thrown melee uses STR, finesse picks the better", () => {
    const [axe, dag] = attacks([w("srd_handaxe"), w("srd_dagger")], [], { str: 12, dex: 18, con: 10, int: 10, wis: 10, cha: 10 });
    expect(axe?.attackBonus.total).toBe(1);
    expect(dag?.attackBonus.total).toBe(4);
  });
  it("applies a magic bonus to attack and damage", () => {
    const [a] = attacks([w("srd_longsword", { magicBonus: 1 })], martial);
    expect(a?.attackBonus.total).toBe(6);
    expect(a?.damage?.text).toBe("1d8 + 4 slashing");
  });
  it("shows no damage for a net", () => {
    const [a] = attacks([w("srd_net")], martial);
    expect(a?.damage).toBeNull();
  });
  it("proficiency by specific weapon name or id", () => {
    expect(attacks([w("srd_longsword")], [grant(src("race", "Elf"), { type: "proficiency", category: "weapon", key: "Longsword" })])[0]?.proficient).toBe(true);
    expect(attacks([w("srd_longsword")], [grant(src("race", "Elf"), { type: "proficiency", category: "weapon", key: "srd_longsword" })])[0]?.proficient).toBe(true);
  });
  it("custom weapons work and a missing record warns", () => {
    const custom = { kind: "ranged" as const, damageDice: "1d6", damageType: "fire", finesse: false, proficient: true };
    const [a] = attacks([w("x", { weaponId: null, custom })], []);
    expect(a?.attackBonus.total).toBe(1 + 2);
    const d = deriveSheet(makeCharacter({ equipment: { armorId: null, shield: false, weapons: [w("gone")], inventory: "" } }), rules());
    expect(d.warnings.some((x) => x.includes("not found"))).toBe(true);
  });
});

describe("ability score caps and edge cases", () => {
  it("caps at 20 with a part and a warning", () => {
    const d = deriveSheet(makeCharacter({ abilityScores: { method: "manual", scores: { str: 19, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }, grants: [grant(src("race", "X"), { type: "abilityBonus", ability: "str", amount: 3 })] }), rules());
    expect(d.abilities.str.score.total).toBe(20);
    expect(d.warnings.some((w) => w.includes("capped"))).toBe(true);
  });
  it("saves from unrecognised class strings warn", () => {
    const d = deriveSheet(makeCharacter(), rules({ classDetail: makeClass("Odd", ["Luck"], null) }));
    expect(d.warnings.some((w) => w.includes("Luck"))).toBe(true);
  });
  it("accepts abbreviated save names", () => {
    const d = deriveSheet(makeCharacter({ class: src("class", "X") }), rules({ classDetail: makeClass("X", ["STR", "con"], null) }));
    expect(d.saves.str.proficient && d.saves.con.proficient).toBe(true);
  });
  it("warns on an invalid standard array", () => {
    const d = deriveSheet(makeCharacter({ abilityScores: { method: "standardArray", scores: { str: 15, dex: 15, con: 13, int: 12, wis: 10, cha: 8 } } }), rules());
    expect(d.warnings.length).toBeGreaterThan(0);
  });
});

describe("review fixes", () => {
  const eqW = (w: CharacterData["equipment"]["weapons"]): CharacterData["equipment"] => ({ armorId: null, shield: false, weapons: w, inventory: "" });
  it("custom weapon with dice but no damage type still shows damage", () => {
    const custom = { kind: "melee" as const, damageDice: "1d6", damageType: null, finesse: false, proficient: false };
    const d = deriveSheet(makeCharacter({ equipment: eqW([{ id: "c", weaponId: null, name: "Club", magicBonus: 0, custom }]) }), rules());
    expect(d.attacks[0]?.damage?.text).toBe("1d6 + 2");
    const zero = deriveSheet(makeCharacter({ equipment: eqW([{ id: "c", weaponId: null, name: "Club", magicBonus: 0, custom: { ...custom, damageDice: "0" } }]) }), rules());
    expect(zero.attacks[0]?.damage).toBeNull();
  });
  it("matches skill names in any spelling", () => {
    for (const key of ["Sleight of Hand", "sleight_of_hand", "sleightOfHand", "SLEIGHT OF HAND"]) {
      const d = deriveSheet(makeCharacter({ grants: [grant(rogue, { type: "proficiency", category: "skill", key }), grant(rogue, { type: "expertise", skill: key })] }), rules());
      expect(d.skills.sleightOfHand).toMatchObject({ proficient: true, expertise: true });
    }
    expect(parseSkill("Animal-Handling")).toBe("animalHandling");
    expect(parseSkill("flying")).toBeNull();
    expect(parseAbility("Strength")).toBe("str");
    expect(parseAbility("CON")).toBe("con");
    expect(parseAbility("luck")).toBeNull();
  });
  it("caps racial bonuses at 20 but lets items exceed it", () => {
    const scores = (str: number) => ({ method: "manual" as const, scores: { str, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
    const racial = deriveSheet(makeCharacter({ abilityScores: scores(20), grants: [grant(src("race", "Orc"), { type: "abilityBonus", ability: "str", amount: 2 })] }), rules());
    expect(racial.abilities.str.score.total).toBe(20);
    expect(racial.warnings.some((w) => w.includes("capped"))).toBe(true);
    const item = deriveSheet(makeCharacter({ abilityScores: scores(15), grants: [grant(src("item", "Belt of Giant Strength"), { type: "abilityBonus", ability: "str", amount: 8 })] }), rules());
    expect(item.abilities.str.score.total).toBe(23);
    expect(item.abilities.str.modifier).toBe(6);
    expect(item.warnings.some((w) => w.includes("capped"))).toBe(false);
    expect(item.abilities.str.score.parts.reduce((x, p) => x + p.value, 0)).toBe(23);
    const both = deriveSheet(makeCharacter({ abilityScores: scores(19), grants: [grant(src("race", "Orc"), { type: "abilityBonus", ability: "str", amount: 2 }), grant(src("item", "Tome"), { type: "abilityBonus", ability: "str", amount: 2 })] }), rules());
    expect(both.abilities.str.score.total).toBe(22);
  });
  it("shows thrown and reach range text", () => {
    const w = (weaponId: string): CharacterData["equipment"]["weapons"][number] => ({ id: weaponId, weaponId, name: weaponId, magicBonus: 0, custom: null });
    const d = deriveSheet(makeCharacter({ equipment: eqW([w("srd_handaxe"), w("srd_longsword"), w("srd_longbow"), w("srd_whip")]) }), rules({ weapons: { ...weaponRecords, srd_whip: { ...rapier, id: "srd_whip", properties: [{ name: "Reach", detail: null, description: "" }] } } }));
    expect(d.attacks.map((a) => a.rangeText)).toEqual(["Melee 5 ft (thrown 20/60 ft)", "Melee 5 ft", "150/600 ft", "Melee 10 ft"]);
  });
});

describe("breakdowns", () => {
  it("every breakdown's parts sum to its total", () => {
    const sheets = [
      deriveSheet(hillDwarfCleric(), rules({ classDetail: clericClass, armor: chainMail })),
      deriveSheet(hillDwarfCleric({ level: 12 }), rules({ classDetail: clericClass, armor: chainMail })),
      deriveSheet(makeCharacter({ equipment: { armorId: plate.id, shield: true, weapons: [{ id: "a", weaponId: rapier.id, name: "R", magicBonus: 2, custom: null }], inventory: "" }, abilityScores: { method: "manual", scores: { str: 3, dex: 1, con: 1, int: 20, wis: 20, cha: 20 } }, spellcastingAbility: "int", level: 20 }), rules({ armor: plate })),
    ];
    for (const s of sheets) {
      for (const b of allBreakdowns(s)) {
        expect(b.parts.reduce((x, p) => x + p.value, 0)).toBe(b.total);
      }
    }
  });
  it("HP never drops below 1 per level", () => {
    const d = deriveSheet(makeCharacter({ hitDie: 6, abilityScores: { method: "manual", scores: { str: 10, dex: 10, con: 1, int: 10, wis: 10, cha: 10 } } }), rules());
    expect(d.maxHp.total).toBe(1);
  });
  it("ability modifiers match scores for every ability", () => {
    const d = deriveSheet(hillDwarfCleric(), rules({ classDetail: clericClass, armor: chainMail }));
    for (const a of ABILITIES as readonly Ability[]) expect(d.abilities[a].modifier).toBe(Math.floor((d.abilities[a].score.total - 10) / 2));
  });
});
