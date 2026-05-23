'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NewDeckForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [additional, setAdditional] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Bitte eine PPTX-Datei hochladen.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setError('Nur .pptx Dateien werden unterstützt.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Nicht eingeloggt.');
      setLoading(false);
      return;
    }

    const { data: deck, error: deckErr } = await supabase
      .from('decks')
      .insert({ owner_id: user.id, title, topic })
      .select()
      .single();
    if (deckErr || !deck) {
      setError(deckErr?.message || 'Fehler beim Anlegen.');
      setLoading(false);
      return;
    }

    const path = `${user.id}/${deck.id}/v1-source-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('pptx-files')
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      setError(upErr.message);
      setLoading(false);
      return;
    }

    const { data: version, error: verErr } = await supabase
      .from('deck_versions')
      .insert({
        deck_id: deck.id,
        version_number: 1,
        source_pptx_path: path,
        additional_content: additional || null,
        instructions: instructions || null,
        status: 'pending',
      })
      .select()
      .single();
    if (verErr || !version) {
      setError(verErr?.message || 'Konnte Version nicht anlegen');
      setLoading(false);
      return;
    }

    // Fire-and-forget: trigger processing in the background.
    // Detail page polls for status.
    fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId: version.id }),
    }).catch(() => {
      // user lands on detail page either way; errors surface via status row
    });

    router.push(`/decks/${deck.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-stone-200 bg-white p-8">
      <div>
        <label className="block text-sm font-medium text-stone-700">Titel des Decks</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Workshop Selbstführung – April"
          className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Thema (optional)</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="z.B. Resilienz im Team"
          className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">
          Roh-PPTX hochladen
        </label>
        <input
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-2 w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-1.5 file:text-xs file:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">
          Zusatz-Inhalte (z.B. aus ChatGPT/Claude/eigene Notizen)
        </label>
        <p className="mt-1 text-xs text-stone-500">
          Was soll als neue Slides ergänzt werden? Wir generieren sie im Master-Stil.
        </p>
        <textarea
          value={additional}
          onChange={(e) => setAdditional(e.target.value)}
          rows={6}
          placeholder="Hier reinpasten…"
          className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">
          Anweisungen (optional)
        </label>
        <p className="mt-1 text-xs text-stone-500">
          z.B. „Kürze Slide 3", „Texte darfst du straffen", „Füge neuen Abschluss-Slide ein"
        </p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {loading ? 'Wird hochgeladen …' : 'Deck anlegen & verarbeiten lassen'}
      </button>
    </form>
  );
}
