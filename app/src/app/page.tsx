import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">powered by Rübibär</p>
        <h1 className="mt-3 text-5xl font-light tracking-tight text-stone-900">
          Caros Slide Studio
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-stone-600">
          Lade dein Deck hoch, schreib was rein soll — und bekomm in Minuten eine
          CI-perfekte Coaching-Präsentation zurück.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-block rounded-full bg-stone-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          Einloggen
        </Link>
      </div>
    </main>
  );
}
