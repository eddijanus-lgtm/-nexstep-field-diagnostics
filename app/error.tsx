"use client";

export default function ErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="fatal-error">
      <p className="mono-label">ERR–APP–01</p>
      <h1>SIGNAL<br />LOST.</h1>
      <p>Die App konnte nicht geladen werden. Deine lokal gespeicherten Fälle bleiben erhalten.</p>
      <button type="button" className="command-button" onClick={reset}>
        <span>R</span>
        ERNEUT VERSUCHEN
        <span aria-hidden="true">↗</span>
      </button>
    </main>
  );
}
