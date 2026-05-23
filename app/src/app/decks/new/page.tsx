import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { NewDeckForm } from './NewDeckForm';

export default async function NewDeckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-light text-stone-900">Neues Deck</h1>
        <p className="mt-1 text-sm text-stone-500">
          Lade dein Roh-Deck hoch und schreib uns, was wir damit machen sollen.
        </p>
        <div className="mt-8">
          <NewDeckForm />
        </div>
      </main>
    </>
  );
}
