'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Version = {
  id: string;
  version_number: number;
  status: string;
  source_pptx_path: string | null;
  output_pptx_path: string | null;
  instructions: string | null;
  additional_content: string | null;
  error_message: string | null;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  pending: 'Wartet auf Verarbeitung',
  processing: 'Wird verarbeitet …',
  done: 'Fertig',
  error: 'Fehler',
};

const statusColor: Record<string, string> = {
  pending: 'text-stone-500',
  processing: 'text-amber-600',
  done: 'text-emerald-600',
  error: 'text-red-600',
};

export function DeckVersionsLive({ deckId, initial }: { deckId: string; initial: Version[] }) {
  const [versions, setVersions] = useState<Version[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase
        .from('deck_versions')
        .select('*')
        .eq('deck_id', deckId)
        .order('version_number', { ascending: false });
      if (data) setVersions(data as Version[]);
    };

    // Poll while any version is in-progress
    const interval = setInterval(() => {
      const anyActive = versions.some((v) => v.status === 'pending' || v.status === 'processing');
      if (anyActive) refresh();
    }, 4000);

    return () => clearInterval(interval);
  }, [deckId, versions]);

  return (
    <ul className="mt-3 space-y-3">
      {versions.map((v) => (
        <li key={v.id} className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Version {v.version_number}</p>
              <p className="text-xs">
                <span className="text-stone-500">
                  {new Date(v.created_at).toLocaleString('de-DE')} ·{' '}
                </span>
                <span className={'font-medium ' + (statusColor[v.status] || '')}>
                  {statusLabel[v.status] || v.status}
                </span>
              </p>
            </div>
            {v.status === 'done' && v.output_pptx_path && (
              <a
                href={`/api/download?path=${encodeURIComponent(v.output_pptx_path)}`}
                className="rounded-full bg-stone-900 px-5 py-2 text-xs font-medium text-white hover:bg-stone-700"
              >
                PPTX herunterladen
              </a>
            )}
          </div>
          {v.instructions && (
            <p className="mt-3 text-sm text-stone-600">
              <strong>Anweisungen:</strong> {v.instructions}
            </p>
          )}
          {v.status === 'processing' && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-1/3 animate-pulse bg-stone-400" />
            </div>
          )}
          {v.error_message && (
            <p className="mt-3 text-sm text-red-600">{v.error_message}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
