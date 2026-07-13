export default function Loading() {
  return (
    <main className="boot-screen" aria-live="polite" aria-busy="true">
      <div className="boot-mark">N/S</div>
      <p className="mono-label">DIAGNOSTIC DATA LOADING</p>
      <div className="boot-progress" aria-hidden="true"><span /></div>
    </main>
  );
}
