import { useEffect } from "react";
import { Link, Route, Switch, useLocation, useSearch } from "wouter";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { BackgroundsPage } from "./pages/BackgroundsPage.js";
import { ClassesPage } from "./pages/ClassesPage.js";
import { ConditionsPage } from "./pages/ConditionsPage.js";
import { CreditsPage } from "./pages/CreditsPage.js";
import { EquipmentPage } from "./pages/EquipmentPage.js";
import { FeatsPage } from "./pages/FeatsPage.js";
import {
  ArmorDetailPage,
  BackgroundDetailPage,
  ClassDetailPage,
  FeatDetailPage,
  MagicItemDetailPage,
  MonsterDetailPage,
  RollTableDetailPage,
  SpeciesDetailPage,
  SpellDetailPage,
  WeaponDetailPage,
} from "./pages/DetailPages.js";
import { HomePage } from "./pages/HomePage.js";
import { MagicItemsPage } from "./pages/MagicItemsPage.js";
import { MonstersPage } from "./pages/MonstersPage.js";
import { RacesPage } from "./pages/RacesPage.js";
import { RollTablesPage } from "./pages/RollTablesPage.js";
import { SpellsPage } from "./pages/SpellsPage.js";

const NAV = [
  { href: "/spells", label: "Spells" },
  { href: "/monsters", label: "Monsters" },
  { href: "/classes", label: "Classes" },
  { href: "/races", label: "Races" },
  { href: "/backgrounds", label: "Backgrounds" },
  { href: "/feats", label: "Feats" },
  { href: "/equipment", label: "Equipment" },
  { href: "/magic-items", label: "Magic items" },
  { href: "/roll-tables", label: "Roll tables" },
  { href: "/conditions", label: "Conditions" },
  { href: "/credits", label: "Credits" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={active ? "active" : undefined}>
      {label}
    </Link>
  );
}

function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>
        <Link href="/">Back to the start</Link>
      </p>
    </section>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  const page = new URLSearchParams(useSearch()).get("page");
  // New page or new results page: start at the top. Credits links with a #hash scroll themselves.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [location, page]);
  return null;
}

/** SRD 5.1 attribution (CC-BY-4.0). Shown on every page, so it lives in the shell. */
function Footer() {
  return (
    <footer className="site-footer">
      <p>
        This work includes material from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC,
        available at{" "}
        <a href="https://dnd.wizards.com/resources/systems-reference-document">
          https://dnd.wizards.com/resources/systems-reference-document
        </a>
        . The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/legalcode">
          https://creativecommons.org/licenses/by/4.0/legalcode
        </a>
        . Other sources and their licences are listed on the <Link href="/credits">credits page</Link>.
      </p>
    </footer>
  );
}

export function App() {
  const [location] = useLocation();
  const search = useSearch();
  return (
    <div className="app">
      <header className="site-header">
        <Link href="/" className="brand">
          table-forge
        </Link>
        <nav className="main-nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </header>
      <main>
        <ScrollToTop />
        <ErrorBoundary resetKey={`${location}?${search}`}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/spells" component={SpellsPage} />
            <Route path="/spells/:id">{(p: { id: string }) => <SpellDetailPage id={p.id} />}</Route>
            <Route path="/monsters" component={MonstersPage} />
            <Route path="/monsters/:id">{(p: { id: string }) => <MonsterDetailPage id={p.id} />}</Route>
            <Route path="/classes" component={ClassesPage} />
            <Route path="/classes/:id">{(p: { id: string }) => <ClassDetailPage id={p.id} />}</Route>
            <Route path="/races" component={RacesPage} />
            <Route path="/races/:id">{(p: { id: string }) => <SpeciesDetailPage id={p.id} />}</Route>
            <Route path="/backgrounds" component={BackgroundsPage} />
            <Route path="/backgrounds/:id">{(p: { id: string }) => <BackgroundDetailPage id={p.id} />}</Route>
            <Route path="/feats" component={FeatsPage} />
            <Route path="/feats/:id">{(p: { id: string }) => <FeatDetailPage id={p.id} />}</Route>
            <Route path="/equipment" component={EquipmentPage} />
            <Route path="/equipment/weapons/:id">{(p: { id: string }) => <WeaponDetailPage id={p.id} />}</Route>
            <Route path="/equipment/armor/:id">{(p: { id: string }) => <ArmorDetailPage id={p.id} />}</Route>
            <Route path="/magic-items" component={MagicItemsPage} />
            <Route path="/magic-items/:id">{(p: { id: string }) => <MagicItemDetailPage id={p.id} />}</Route>
            <Route path="/roll-tables" component={RollTablesPage} />
            <Route path="/roll-tables/:id">{(p: { id: string }) => <RollTableDetailPage id={p.id} />}</Route>
            <Route path="/conditions" component={ConditionsPage} />
            <Route path="/credits" component={CreditsPage} />
            <Route component={NotFound} />
          </Switch>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
