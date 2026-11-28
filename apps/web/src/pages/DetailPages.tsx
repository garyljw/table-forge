import { useEffect } from "react";
import { Link } from "wouter";
import {
  getArmor,
  getBackground,
  getClass,
  getFeat,
  getItem,
  getItemSet,
  getMagicItem,
  getMonster,
  getRollTable,
  getRuleChapter,
  getRuleSection,
  getSpecies,
  getSpell,
  getWeapon,
} from "../api/rules.js";
import { ErrorNote, Loading } from "../components/States.js";
import { SourceLine } from "../components/SourceLine.js";
import { SpellCard } from "../components/SpellCard.js";
import { StatBlock } from "../components/StatBlock.js";
import { ClassView } from "../components/ClassView.js";
import { ArmorView, BackgroundView, FeatView, MagicItemView, SpeciesView, WeaponView } from "../components/OptionViews.js";
import { ItemSetView, ItemView } from "../components/ItemViews.js";
import { RuleChapterView } from "../components/RulebookViews.js";
import { RuleSectionView } from "../components/RuleSectionView.js";
import { RollTableView } from "../components/RollTableView.js";
import { useApi, type ApiState } from "../hooks/useApi.js";

function DetailFrame<T>({
  state,
  back,
  render,
}: {
  state: ApiState<T>;
  back: { href: string; label: string };
  render: (data: T) => React.ReactNode;
}) {
  return (
    <section>
      <p className="back">
        <Link href={back.href}>‹ {back.label}</Link>
      </p>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && <ErrorNote message={state.notFound ? "That entry does not exist." : state.message} />}
      {state.status === "ok" && render(state.data)}
    </section>
  );
}

export function SpellDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getSpell(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/spells", label: "All spells" }}
      render={(r) => (
        <>
          <SpellCard spell={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function MonsterDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getMonster(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/monsters", label: "All monsters" }}
      render={(r) => (
        <>
          <StatBlock monster={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function ClassDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getClass(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/classes", label: "All classes" }}
      render={(r) => (
        <>
          <ClassView detail={r} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}


export function SpeciesDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getSpecies(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/races", label: "All races" }}
      render={(r) => (
        <>
          <SpeciesView detail={r} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function BackgroundDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getBackground(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/backgrounds", label: "All backgrounds" }}
      render={(r) => (
        <>
          <BackgroundView background={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function FeatDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getFeat(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/feats", label: "All feats" }}
      render={(r) => (
        <>
          <FeatView feat={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function WeaponDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getWeapon(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/equipment", label: "All equipment" }}
      render={(r) => (
        <>
          <WeaponView weapon={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function ArmorDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getArmor(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/equipment?tab=armor", label: "All equipment" }}
      render={(r) => (
        <>
          <ArmorView armor={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function MagicItemDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getMagicItem(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/magic-items", label: "All magic items" }}
      render={(r) => (
        <>
          <MagicItemView item={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function RollTableDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getRollTable(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/roll-tables", label: "All roll tables" }}
      render={(r) => (
        <>
          <RollTableView table={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function RuleSectionDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getRuleSection(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/rules", label: "All rules sections" }}
      render={(r) => (
        <>
          <RuleSectionView section={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function ItemDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getItem(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/equipment?tab=gear", label: "All gear" }}
      render={(r) => (
        <>
          <ItemView item={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function ItemSetDetailPage({ id }: { id: string }) {
  const state = useApi((s) => getItemSet(id, s), id);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/equipment?tab=packs", label: "All packs and sets" }}
      render={(r) => (
        <>
          <ItemSetView set={r.data} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}

export function RuleChapterPage({ id }: { id: string }) {
  const state = useApi((s) => getRuleChapter(id, s), id);
  // A link from the rules search lands on `#<rule id>`; scroll there once the chapter has rendered.
  const loaded = state.status === "ok";
  useEffect(() => {
    if (loaded && window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
  }, [loaded, id]);
  return (
    <DetailFrame
      state={state}
      back={{ href: "/rulebook", label: "All chapters" }}
      render={(r) => (
        <>
          <RuleChapterView detail={r} />
          <SourceLine document={r.document} />
        </>
      )}
    />
  );
}
