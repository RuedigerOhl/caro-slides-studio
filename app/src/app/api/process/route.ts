import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300; // seconds (Vercel pro+); local dev: unlimited

export async function POST(request: Request) {
  const { versionId } = await request.json();
  if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: version, error: vErr } = await supabase
    .from('deck_versions')
    .select('*, decks!inner(owner_id, title)')
    .eq('id', versionId)
    .single();
  if (vErr || !version) return NextResponse.json({ error: 'version not found' }, { status: 404 });
  const decks = version.decks as unknown as { owner_id: string; title: string };
  if (decks.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Mark processing
  await supabase.from('deck_versions').update({ status: 'processing' }).eq('id', versionId);

  try {
    // Download source PPTX
    const { data: srcBlob, error: dlErr } = await supabase.storage
      .from('pptx-files')
      .download(version.source_pptx_path);
    if (dlErr || !srcBlob) throw new Error(`download failed: ${dlErr?.message}`);

    // Send to Python service
    const fd = new FormData();
    fd.append('file', srcBlob, 'source.pptx');
    fd.append('additional_content', version.additional_content || '');
    fd.append('instructions', version.instructions || '');
    fd.append(
      'date',
      new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    );

    const serviceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8001';
    const res = await fetch(`${serviceUrl}/transform`, {
      method: 'POST',
      body: fd,
      // Long-running transformation
      signal: AbortSignal.timeout(15 * 60 * 1000),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`engine failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    const outputBytes = await res.arrayBuffer();

    // Upload output to Supabase Storage
    const outputPath = `${user.id}/${version.deck_id}/v${version.version_number}-output.pptx`;
    const { error: upErr } = await supabase.storage
      .from('pptx-files')
      .upload(outputPath, outputBytes, {
        contentType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);

    await supabase
      .from('deck_versions')
      .update({ status: 'done', output_pptx_path: outputPath, error_message: null })
      .eq('id', versionId);

    return NextResponse.json({ ok: true, outputPath });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from('deck_versions')
      .update({ status: 'error', error_message: msg })
      .eq('id', versionId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
