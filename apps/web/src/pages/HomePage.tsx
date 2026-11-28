import { Link } from "wouter";

const SECTIONS = [
  { href: "/spells", title: "Spells", blurb: "Search by name, level, school or class." },
  { href: "/monsters", title: "Monsters", blurb: "Stat blocks, filtered by type, size and challenge rating." },
  { href: "/classes", title: "Classes", blurb: "Level tables, features and subclasses." },
  { href: "/races", title: "Races", blurb: "Species and subraces, with their traits." },
  { href: "/backgrounds", title: "Backgrounds", blurb: "Proficiencies, equipment and features." },
  { href: "/feats", title: "Feats", blurb: "Prerequisites and what each feat gives." },
  { href: "/equipment", title: "Equipment", blurb: "Weapons, armor, adventuring gear and packs, with prices." },
  { href: "/magic-items", title: "Magic items", blurb: "Filter by rarity, type and attunement." },
  { href: "/roll-tables", title: "Roll tables", blurb: "Treasure, encounters, trinkets and other tables." },
  { href: "/rulebook", title: "Rules", blurb: "The SRD rules text, chapter by chapter." },
  { href: "/reference", title: "Reference", blurb: "Abilities, skills, sizes, languages, damage types and other terms." },
  { href: "/rules", title: "Rules sections", blurb: "Variant rules, hazards, traps, diseases and sidebars." },
  { href: "/conditions", title: "Conditions", blurb: "What blinded, grappled and the rest actually do." },
  { href: "/credits", title: "Credits and licences", blurb: "Where the rules text comes from." },
];

export function HomePage() {
  return (
    <section>
      <h1>Rules browser</h1>
      <p>Look things up for the 2014 rules (5e), from your laptop or phone.</p>
      <ul className="cards">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link className="tile" href={s.href}>
              <strong>{s.title}</strong>
              <span>{s.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
