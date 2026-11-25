import { Link } from "wouter";
import { getArmor, getBackground, getClass, getFeat, getMagicItem, getMonster, getRollTable, getRuleSection, getSpecies, getSpell, getWeapon } from "../api/rules.js";
import { ErrorNote, Loading } from "../components/States.js";
import { SourceLine } from "../components/SourceLine.js";
import { SpellCard } from "../components/SpellCard.js";
import { StatBlock } from "../components/StatBlock.js";
import { ClassView } from "../components/ClassView.js";
import { ArmorView, BackgroundView, FeatView, MagicItemView, SpeciesView, WeaponView } from "../components/OptionViews.js";
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
