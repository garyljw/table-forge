import { Link } from "wouter";
import { getClass, getMonster, getSpell } from "../api/rules.js";
import { ErrorNote, Loading } from "../components/States.js";
import { SourceLine } from "../components/SourceLine.js";
import { SpellCard } from "../components/SpellCard.js";
import { StatBlock } from "../components/StatBlock.js";
import { ClassView } from "../components/ClassView.js";
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

