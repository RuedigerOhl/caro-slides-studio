import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DeckVersionsLive } from './DeckVersionsLive';

export default async function DeckDetail(props: PageProps<'/decks/[id]'>) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, topic, created_at')
    .eq('id', id)
    .single();
  if (!deck) notFound();

  const { data: versions } = await supabase
    .from('deck_versions')
    .select('*')
    .eq('deck_id', id)
    .order('version_number', { ascending: false });

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/dashboard" className="text-sm text-stone-500 hover:underline">
          ← Zurück zum Dashboard
        </Link>
        <h1 className="mt-3 text-3xl font-light text-stone-900">{deck.title}</h1>
        {deck.topic && <p className="mt-1 text-stone-500">{deck.topic}</p>}

        <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-stone-500">
          Versionen
        </h2>
        <DeckVersionsLive deckId={id} initial={versions || []} />
      </main>
    </>
  );
}
