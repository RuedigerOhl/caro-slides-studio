import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: decks } = await supabase
    .from('decks')
    .select('id, title, topic, updated_at')
    .order('updated_at', { ascending: false });

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-light text-stone-900">Deine Decks</h1>
            <p className="mt-1 text-sm text-stone-500">
              Alle Präsentationen, die du bisher generiert hast.
            </p>
          </div>
          <Link
            href="/decks/new"
            className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700"
          >
            + Neues Deck
          </Link>
        </div>

        <div className="mt-10">
          {!decks || decks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <p className="text-stone-500">Noch keine Decks. Leg dein erstes an.</p>
              <Link
                href="/decks/new"
                className="mt-4 inline-block text-sm font-medium text-stone-900 underline"
              >
                Jetzt loslegen →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
              {decks.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/decks/${d.id}`}
                    className="flex items-center justify-between px-6 py-5 hover:bg-stone-50"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{d.title}</p>
                      {d.topic && <p className="text-sm text-stone-500">{d.topic}</p>}
                    </div>
                    <span className="text-xs text-stone-400">
                      {new Date(d.updated_at).toLocaleDateString('de-DE')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
