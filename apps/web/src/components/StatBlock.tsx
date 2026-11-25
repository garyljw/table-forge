import type { Monster, MonsterFeature, MonsterLairSection } from "@table-forge/shared";
import { abilityModifier } from "@table-forge/core";
import { capitalise, safeCr, signed, titleKey } from "../format.js";
import { Markdown } from "./Markdown.js";

const ABILITIES = [
  ["strength", "STR"],
  ["dexterity", "DEX"],
  ["constitution", "CON"],
  ["intelligence", "INT"],
  ["wisdom", "WIS"],
  ["charisma", "CHA"],
] as const;

/** Third-party data can hold odd scores; show a dash rather than crash the page. */
function modifierText(score: number): string {
  try {
    return signed(abilityModifier(score));
  } catch {
    return "—";
  }
}

function abilityAbbrev(key: string): string {
  const hit = ABILITIES.find(([k]) => k === key);
  return hit ? capitalise(hit[1].toLowerCase()) : titleKey(key);
}

function speedText(s: Monster["speed"]): string {
  const parts: string[] = [];
  if (s.walk !== null) parts.push(`${s.walk} ft.`);
  for (const mode of ["burrow", "climb", "fly", "swim"] as const) {
    const v = s[mode];
    if (v !== null) parts.push(`${mode} ${v} ft.${mode === "fly" && s.hover ? " (hover)" : ""}`);
  }
  return parts.join(", ") || "—";
}

function sensesText(s: Monster["senses"]): string {
  const parts: string[] = [];
  for (const k of ["blindsight", "darkvision", "tremorsense", "truesight"] as const) {
    if (s[k] !== null) parts.push(`${k} ${s[k]} ft.`);
  }
  if (s.passivePerception !== null) parts.push(`passive Perception ${s.passivePerception}`);
  return parts.join(", ");
}

function usageText(f: MonsterFeature): string {
  if (!f.usage) return "";
  if (f.usage.kind === "perDay") return ` (${f.usage.value}/Day)`;
  return f.usage.value >= 6 ? " (Recharge 6)" : ` (Recharge ${f.usage.value}–6)`;
}

function Features({ title, items }: { title?: string; items: MonsterFeature[] }) {
  if (items.length === 0) return null;
  return (
    <section className="features">
      {title && <h2>{title}</h2>}
      {items.map((f, i) => (
        <div className="feature" key={`${f.name}-${i}`}>
          <p className="feature-name">
            <strong>
              <em>
                {f.name}
                {usageText(f)}
                {f.legendaryCost !== null && f.legendaryCost > 1 ? ` (Costs ${f.legendaryCost} Actions)` : ""}.
              </em>
            </strong>
          </p>
          <Markdown className="inline-md">{f.description}</Markdown>
        </div>
      ))}
    </section>
  );
}

/** Lair actions or regional effects: a heading, the intro text, then the entries. */
function LairSection({ title, section }: { title: string; section: MonsterLairSection | null }) {
  if (section === null || (section.description === "" && section.items.length === 0)) return null;
  return (
    <section className="features lair-section">
      <h2>{title}</h2>
      {section.description !== "" && <Markdown>{section.description}</Markdown>}
      <Features items={section.items} />
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  if (value === "") return null;
  return (
    <p className="line">
      <strong>{label}</strong> {value}
    </p>
  );
}

export function StatBlock({ monster: m }: { monster: Monster }) {
  const crInfo = safeCr(m.challengeRating);
  const cr = crInfo.label;
  const xp = m.experiencePoints ?? crInfo.xp;
  const pb = m.proficiencyBonus ?? crInfo.proficiencyBonus;
  const saves = Object.entries(m.savingThrows)
    .map(([k, v]) => `${abilityAbbrev(k)} ${signed(v)}`)
    .join(", ");
  const skills = Object.entries(m.skills)
    .map(([k, v]) => `${titleKey(k)} ${signed(v)}`)
    .join(", ");
  const typeLine = `${capitalise(m.size)} ${m.type}${m.subtype ? ` (${m.subtype})` : ""}, ${m.alignment}`;

  return (
    <article className="card stat-block">
      <h1>{m.name}</h1>
      <p className="subtitle">
        <em>{typeLine}</em>
      </p>
      <hr />
      <Line label="Armor Class" value={`${m.armorClass}${m.armorDetail ? ` (${m.armorDetail})` : ""}`} />
      <Line label="Hit Points" value={`${m.hitPoints}${m.hitDice ? ` (${m.hitDice})` : ""}`} />
      <Line label="Speed" value={speedText(m.speed)} />
      <hr />
      <div className="abilities" role="table" aria-label="Ability scores">
        {ABILITIES.map(([key, abbr]) => (
          <div className="ability" role="row" key={key}>
            <span className="ability-name" role="columnheader">
              {abbr}
            </span>
            <span className="ability-score" role="cell">
              {m.abilityScores[key]} <span className="mod">({modifierText(m.abilityScores[key])})</span>
            </span>
          </div>
        ))}
      </div>
      <hr />
      <Line label="Saving Throws" value={saves} />
      <Line label="Skills" value={skills} />
      <Line label="Damage Vulnerabilities" value={m.damageVulnerabilities} />
      <Line label="Damage Resistances" value={m.damageResistances} />
      <Line label="Damage Immunities" value={m.damageImmunities} />
      <Line label="Condition Immunities" value={m.conditionImmunities} />
      <Line label="Senses" value={sensesText(m.senses)} />
      <Line label="Languages" value={m.languages === "" ? "—" : m.languages} />
      <p className="line cr-line">
        <span>
          <strong>Challenge</strong> {cr} ({xp === null ? "XP unknown" : `${xp.toLocaleString("en-US")} XP`})
        </span>
        <span>
          <strong>Proficiency Bonus</strong> {pb === null ? "—" : signed(pb)}
        </span>
      </p>
      <hr />
      <Features items={m.traits} />
      <Features title="Actions" items={m.actions} />
      <Features title="Bonus Actions" items={m.bonusActions} />
      <Features title="Reactions" items={m.reactions} />
      <Features title="Legendary Actions" items={m.legendaryActions} />
      <LairSection title="Lair Actions" section={m.lairActions} />
      <LairSection title="Regional Effects" section={m.regionalEffects} />
      {m.environments.length > 0 && <Line label="Environments" value={m.environments.join(", ")} />}
    </article>
  );
}
