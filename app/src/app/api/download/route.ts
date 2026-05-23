import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) return new NextResponse('Missing path', { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  if (!path.startsWith(`${user.id}/`)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { data, error } = await supabase.storage.from('pptx-files').download(path);
  if (error || !data) return new NextResponse('Not found', { status: 404 });

  const filename = path.split('/').pop() || 'deck.pptx';
  return new NextResponse(data, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
