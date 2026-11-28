import { Email, type BookOwnersResponse } from "@table-forge/shared";
import { useEffect, useState } from "react";
import { getBookOwners, setBookOwner } from "../api/admin.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";

type Cell = "saving" | string | undefined; // "saving", an error message, or nothing

const pairKey = (email: string, documentKey: string) => `${email}\u0000${documentKey}`;

function Grid({ data }: { data: BookOwnersResponse }) {
  const [owned, setOwned] = useState(() => new Set(data.owners.map((o) => pairKey(o.email, o.documentKey))));
  const [extra, setExtra] = useState<string[]>([]);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // Rows: everyone the server knows, plus anyone added on this page.
  const emails = [...new Set([...data.users.map((u) => u.email), ...extra])].sort();

  async function toggle(email: string, documentKey: string, owns: boolean) {
    const k = pairKey(email, documentKey);
    setCells((c) => ({ ...c, [k]: "saving" }));
    try {
      await setBookOwner(email, documentKey, owns);
      setOwned((prev) => {
        const next = new Set(prev);
        if (owns) next.add(k);
        else next.delete(k);
        return next;
      });
      setCells((c) => ({ ...c, [k]: undefined }));
    } catch (err) {
      setCells((c) => ({ ...c, [k]: err instanceof Error ? err.message : "Could not save." }));
    }
  }

  function addPerson(e: React.FormEvent) {
    e.preventDefault();
    // The same schema the server uses (it trims and lowercases). The server still checks again.
    const parsed = Email.safeParse(newEmail);
    if (!parsed.success) {
      setAddError("That does not look like an email address.");
      return;
    }
    const email = parsed.data;
    setAddError(null);
    setExtra((x) => (x.includes(email) ? x : [...x, email]));
    setNewEmail("");
  }

  return (
    <>
      <form className="filters" onSubmit={addPerson} noValidate>
        <label className="field">
          Add a person by email
          <input className="search" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@example.com" />
        </label>
        <button type="submit" className="button-link">
          Add
        </button>
      </form>
      {addError && (
        <p className="state state-error" role="alert">
          {addError}
        </p>
      )}
      {data.books.length === 0 ? (
        <p className="state">There are no private books loaded yet.</p>
      ) : (
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Person</th>
                {data.books.map((b) => (
                  <th key={b.key} scope="col">
                    {b.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email}>
                  <th scope="row">{email}</th>
                  {data.books.map((b) => {
                    const k = pairKey(email, b.key);
                    const state = cells[k];
                    return (
                      <td key={b.key}>
                        <label className="check">
                          <input
                            type="checkbox"
                            aria-label={`${email} owns ${b.displayName}`}
                            checked={owned.has(k)}
                            disabled={state === "saving"}
                            onChange={(e) => void toggle(email, b.key, e.target.checked)}
                          />
                          {state === "saving" && <span role="status">Saving…</span>}
                          {state !== undefined && state !== "saving" && <span role="alert">{state}</span>}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** `/admin/books`: the app owner ticks who owns which private book. Only the server decides who may do this. */
export function AdminBooksPage() {
  useEffect(() => {
    document.title = "Book owners";
  }, []);
  const state = useApi((s) => getBookOwners(s), "admin-books");
  return (
    <section>
      <h1>Book owners</h1>
      <p>Tick a box only once you have verified in person that the person owns that book. Only ticked people can read it here.</p>
      <Async state={state}>{(data) => <Grid data={data} />}</Async>
    </section>
  );
}
