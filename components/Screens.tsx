"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { diagnostics, getStep } from "@/lib/diagnostics";
import type {
  DiagnosticChoice,
  DiagnosticFlow,
  SavedCase,
  StepAnswer,
} from "@/lib/types";
import { IndexRow, SystemHeader } from "./InstrumentUI";

interface HomeScreenProps {
  recentCase?: SavedCase;
  online: boolean;
  onSearch: (query: string) => void;
  onStartFlow: (flow: DiagnosticFlow) => void;
}

export function HomeScreen({ recentCase, online, onSearch, onStartFlow }: HomeScreenProps) {
  const [query, setQuery] = useState("");
  const networkFlow = getRequiredFlow("no-internet");
  const profileFlow = getRequiredFlow("temporary-profile");

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query);
  };

  return (
    <section className="screen home-screen" aria-labelledby="home-title">
      <div className="home-dark-zone">
        <SystemHeader code="NX–00" online={online} />
        <p className="signal-kicker">FIELD DIAGNOSTIC</p>
        <div className="home-title-lockup">
          <h1 id="home-title">FINDE DEN<br />BRUCH.</h1>
          <div className="signal-spine" aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
        <p className="home-intro">
          Geführte Fehlersuche für reale IT-Störungen.<br />
          Kein Raten. Nur der nächste sinnvolle Test.
        </p>

        <form className="diagnostic-prompt" onSubmit={submitSearch} role="search">
          <label htmlFor="home-query">STÖRUNG BESCHREIBEN</label>
          <div>
            <span aria-hidden="true">&gt;</span>
            <input
              id="home-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Was funktioniert nicht?"
              autoComplete="off"
            />
            <button type="submit" aria-label="Diagnosewege durchsuchen">↗</button>
          </div>
        </form>

        <p className="section-code">EINSTIEGSPUNKTE / 02</p>
        <div className="entry-list">
          <IndexRow
            number="01"
            kicker="NETWORK PATH"
            title={networkFlow.title}
            meta={`${networkFlow.steps.length.toString().padStart(2, "0")} CHECKS · ~${networkFlow.estimatedMinutes.toString().padStart(2, "0")} MIN`}
            onClick={() => onStartFlow(networkFlow)}
          />
          <IndexRow
            number="02"
            kicker="WINDOWS PATH"
            title={profileFlow.title}
            meta={`${profileFlow.steps.length.toString().padStart(2, "0")} CHECKS · ~${profileFlow.estimatedMinutes.toString().padStart(2, "0")} MIN`}
            tone="cyan"
            onClick={() => onStartFlow(profileFlow)}
          />
        </div>
      </div>

      <section className="last-trace" aria-labelledby="last-trace-title">
        <div className="trace-meta">
          <span>LAST TRACE</span>
          <strong>{recentCase ? `#${recentCase.id.slice(-3).toUpperCase()}` : "#000"}</strong>
        </div>
        <h2 id="last-trace-title">{recentCase?.title.toLocaleUpperCase("de-DE") ?? "NO TRACE RECORDED"}</h2>
        <p>
          {recentCase
            ? `Abgeschlossen · ${formatRelativeDate(recentCase.completedAt)}`
            : "Dein erster abgeschlossener Diagnoseweg erscheint hier."}
        </p>
        <div className="trace-result">
          <span>ERGEBNIS</span>
          <strong>{recentCase?.outcome ?? "—"}</strong>
        </div>
      </section>
    </section>
  );
}

interface SearchScreenProps {
  query: string;
  results: DiagnosticFlow[];
  onQueryChange: (value: string) => void;
  onStartFlow: (flow: DiagnosticFlow) => void;
}

export function SearchScreen({ query, results, onQueryChange, onStartFlow }: SearchScreenProps) {
  return (
    <section className="screen search-screen" aria-labelledby="search-title">
      <div className="search-query-zone">
        <SystemHeader code="SEARCH" />
        <label htmlFor="search-query">QUERY / LIVE</label>
        <div className="live-query">
          <input
            id="search-query"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoFocus
            placeholder="ALLE"
            aria-describedby="result-count"
          />
          <i aria-hidden="true" />
        </div>
        <p id="result-count">{results.length.toString().padStart(2, "0")} SIGNAL PATHS FOUND</p>
      </div>

      <div className="search-results-zone">
        <p className="section-code">SORTIERT NACH RELEVANZ</p>
        {results.length ? (
          <ol className="result-list">
            {results.map((flow, index) => (
              <li key={flow.id}>
                <button type="button" onClick={() => onStartFlow(flow)}>
                  <i className={`category-bar category-${flow.category.toLocaleLowerCase("de-DE")}`} />
                  <span className="result-number">{(index + 1).toString().padStart(2, "0")}</span>
                  <span className="result-copy">
                    <small>{flow.category.toLocaleUpperCase("de-DE")} / {flow.id.replaceAll("-", " ").toLocaleUpperCase("de-DE")}</small>
                    <strong>{flow.title}</strong>
                    <em>{flow.steps.length.toString().padStart(2, "0")} CHECKS · ~{flow.estimatedMinutes.toString().padStart(2, "0")} MIN</em>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="search-empty" role="status">
            <strong>00</strong>
            <h2>KEIN SIGNALPFAD</h2>
            <p>Versuche einen Fehlercode, ein Symptom oder einen Oberbegriff wie DNS, Profil oder Drucker.</p>
            <button type="button" onClick={() => onQueryChange("")}>ALLE WEGE ANZEIGEN →</button>
          </div>
        )}

        <div className="write-actions-note">
          <span>!</span>
          <div>
            <strong>WRITE ACTIONS</strong>
            <p>Ändernde Befehle sind markiert und verlangen eine Bestätigung.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface RunnerScreenProps {
  flow: DiagnosticFlow;
  onExit: () => void;
  onSave: (savedCase: SavedCase) => void;
}

export function RunnerScreen({ flow, onExit, onSave }: RunnerScreenProps) {
  const [currentStepId, setCurrentStepId] = useState(flow.startStepId);
  const [answers, setAnswers] = useState<StepAnswer[]>([]);
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmCommand, setConfirmCommand] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const step = getStep(flow, currentStepId);
  const stepIndex = Math.max(0, flow.steps.findIndex((item) => item.id === currentStepId));
  const progress = ((stepIndex + 1) / flow.steps.length) * 100;

  if (!step) {
    return (
      <section className="runner-failure" role="alert">
        <span>ERR–FLOW</span>
        <h1>PRÜFSCHRITT FEHLT.</h1>
        <button type="button" onClick={onExit}>ZURÜCK ZUM START</button>
      </section>
    );
  }

  const choose = (choice: DiagnosticChoice) => {
    setAnswers((current) => [...current, { stepId: step.id, label: choice.label }]);
    setCopied(false);
    if (choice.nextStepId) {
      setCurrentStepId(choice.nextStepId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (choice.outcome) {
      setOutcome(choice.outcome);
      window.setTimeout(() => noteRef.current?.focus(), 50);
    }
  };

  const copyToClipboard = async () => {
    if (!step.command) return;
    try {
      await navigator.clipboard.writeText(step.command);
      setCopied(true);
    } catch {
      const element = document.createElement("textarea");
      element.value = step.command;
      document.body.appendChild(element);
      element.select();
      document.execCommand("copy");
      element.remove();
      setCopied(true);
    }
  };

  const requestCopy = () => {
    if (step.risk === "read") void copyToClipboard();
    else setConfirmCommand(true);
  };

  const save = () => {
    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    onSave({
      id,
      flowId: flow.id,
      title: flow.title,
      category: flow.category,
      outcome,
      note: note.trim(),
      answers,
      completedAt: new Date().toISOString(),
    });
  };

  if (outcome) {
    return (
      <section className="screen result-screen" aria-labelledby="result-title">
        <div className="result-header">
          <button type="button" onClick={onExit}>← EXIT TRACE</button>
          <span>TRACE CLOSED</span>
          <strong>✓</strong>
          <p>{flow.category.toLocaleUpperCase("de-DE")} / RESULT</p>
        </div>
        <div className="result-body">
          <p className="section-code">DIAGNOSIS COMPLETE</p>
          <h1 id="result-title">ERGEBNIS<br />GESICHERT.</h1>
          <div className="outcome-block">
            <span>FINDING</span>
            <p>{outcome}</p>
          </div>
          <label htmlFor="case-note">NOTIZ / OPTIONAL</label>
          <textarea
            ref={noteRef}
            id="case-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Was wurde geändert oder an wen wird eskaliert?"
            rows={4}
          />
          <button className="save-case-button" type="button" onClick={save}>
            <span>S</span>
            FALL LOKAL SPEICHERN
            <span aria-hidden="true">↗</span>
          </button>
          <button className="discard-result" type="button" onClick={onExit}>OHNE SPEICHERN BEENDEN</button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen runner-screen" aria-labelledby="step-title">
      <div className="runner-header">
        <button type="button" onClick={onExit}>← EXIT TRACE</button>
        <span>TRACE #{flow.id.slice(0, 3).toUpperCase()}</span>
        <div className="step-counter">
          <strong>{(stepIndex + 1).toString().padStart(2, "0")}</strong>
          <em>/ {flow.steps.length.toString().padStart(2, "0")}</em>
        </div>
        <div className="runner-progress" aria-label={`${Math.round(progress)} Prozent abgeschlossen`}>
          <i style={{ width: `${progress}%` }} />
        </div>
        <p>{step.code}</p>
      </div>

      <div className="runner-body">
        <div className="trace-line" aria-hidden="true"><i /><i /></div>
        <article className="active-check">
          <p>CHECK / {(stepIndex + 1).toString().padStart(2, "0")}</p>
          <h1 id="step-title">{step.title}</h1>
          <div className="step-instruction">
            <p>{step.instruction}</p>
            {step.expected && <small>EXPECTED: {step.expected}</small>}
          </div>

          {step.command && (
            <div className="command-module">
              <div>
                <span>{step.risk === "read" ? "READ ONLY" : step.risk === "admin" ? "ADMIN / WRITE" : "WRITE ACTION"}</span>
                <code>{step.command}</code>
              </div>
              <button type="button" onClick={requestCopy}>{copied ? "COPIED" : "COPY"}</button>
            </div>
          )}

          <p className="signal-match">SIGNAL MATCH?</p>
          <div className="decision-list">
            {step.choices.map((choice, index) => (
              <button
                key={choice.label}
                type="button"
                className={`tone-${choice.tone}`}
                onClick={() => choose(choice)}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                <strong>{choice.label}</strong>
                {choice.detail && <small>{choice.detail}</small>}
              </button>
            ))}
          </div>
          <p className="local-save">LOCAL SAVE · AUTO AFTER COMPLETION</p>
        </article>
      </div>

      {confirmCommand && (
        <div className="dialog-backdrop">
          <div className="risk-dialog" role="dialog" aria-modal="true" aria-labelledby="risk-title">
            <span>! WRITE ACTION</span>
            <h2 id="risk-title">Vor dem Kopieren prüfen</h2>
            <p>Dieser Befehl kann die aktuelle Konfiguration oder eine Remote-Verbindung verändern.</p>
            <code>{step.command}</code>
            <div>
              <button type="button" onClick={() => setConfirmCommand(false)}>ABBRECHEN</button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCommand(false);
                  void copyToClipboard();
                }}
              >VERSTANDEN / KOPIEREN</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

interface CasesScreenProps {
  cases: SavedCase[];
  onDelete: (id: string) => void;
  onStart: () => void;
}

export function CasesScreen({ cases, onDelete, onStart }: CasesScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedCase = cases.find((item) => item.id === selectedId);

  return (
    <section className="screen cases-screen" aria-labelledby="cases-title">
      <div className="cases-dark-zone">
        <SystemHeader code="CASE LOG" />
        <p className="signal-kicker">LOCAL CASE ARCHIVE</p>
        {cases.length === 0 ? (
          <div className="empty-case-state">
            <div className="zero-lockup">
              <strong>00</strong>
              <i aria-hidden="true" />
            </div>
            <h1 id="cases-title">KEINE SPUREN<br />GESPEICHERT.</h1>
            <p>Abgeschlossene Diagnosen erscheinen hier als lokale Fallakte – inklusive Ergebnis und Notiz.</p>
            <button type="button" onClick={onStart}>
              <span>01</span>
              ERSTE DIAGNOSE STARTEN
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          <div className="case-list-wrap">
            <div className="case-heading">
              <h1 id="cases-title">{cases.length.toString().padStart(2, "0")} SPUREN.</h1>
              <p>Nur auf diesem Gerät gespeichert.</p>
            </div>
            <ol className="case-list">
              {cases.map((item, index) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelectedId(item.id)}>
                    <span>{(index + 1).toString().padStart(2, "0")}</span>
                    <span>
                      <small>{item.category.toLocaleUpperCase("de-DE")} / CLOSED</small>
                      <strong>{item.title}</strong>
                      <em>{formatDate(item.completedAt)}</em>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {selectedCase && (
        <div className="case-detail" role="dialog" aria-modal="true" aria-labelledby="case-detail-title">
          <button type="button" className="close-detail" onClick={() => setSelectedId(null)}>← ARCHIV</button>
          <span>CASE / {selectedCase.id.slice(-6).toUpperCase()}</span>
          <h2 id="case-detail-title">{selectedCase.title}</h2>
          <div>
            <small>ERGEBNIS</small>
            <p>{selectedCase.outcome}</p>
          </div>
          {selectedCase.note && (
            <div>
              <small>NOTIZ</small>
              <p>{selectedCase.note}</p>
            </div>
          )}
          <ol>
            {selectedCase.answers.map((answer, index) => (
              <li key={`${answer.stepId}-${index}`}>
                <span>{(index + 1).toString().padStart(2, "0")}</span>
                {answer.label}
              </li>
            ))}
          </ol>
          <button type="button" className="delete-case" onClick={() => {
            onDelete(selectedCase.id);
            setSelectedId(null);
          }}>FALL LÖSCHEN</button>
        </div>
      )}
    </section>
  );
}

interface KnowledgeScreenProps {
  flows: DiagnosticFlow[];
  online: boolean;
  onStartFlow: (flowId: string) => void;
}

export function KnowledgeScreen({ flows, online, onStartFlow }: KnowledgeScreenProps) {
  const [selectedFlowId, setSelectedFlowId] = useState(flows[0]?.id ?? "");
  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === selectedFlowId) ?? flows[0],
    [flows, selectedFlowId],
  );

  return (
    <section className="screen knowledge-screen" aria-labelledby="knowledge-title">
      {!online && (
        <div className="offline-zone" role="status">
          <div className="offline-head">
            <strong>N/S</strong>
            <span>CONNECTION MONITOR</span>
            <em>ERR–NET–01</em>
          </div>
          <h1>SIGNAL<br />LOST.</h1>
          <div className="glitch-bars" aria-hidden="true"><i /><i /><i /></div>
          <p className="offline-label">LIVE CONTENT UNAVAILABLE</p>
          <p>Gespeicherte Diagnosewege bleiben vollständig nutzbar.</p>
          <button type="button" onClick={() => window.location.reload()}>
            <span>R</span>VERBINDUNG ERNEUT PRÜFEN<span>↗</span>
          </button>
        </div>
      )}

      <div className={online ? "knowledge-online" : "knowledge-cached"}>
        {online && (
          <>
            <SystemHeader code="LIBRARY" online={online} />
            <p className="signal-kicker">DIAGNOSTIC LIBRARY</p>
            <h1 id="knowledge-title">WISSEN.<br />ANWENDBAR.</h1>
            <p>Kurze Prüfpfade mit klarer Reihenfolge, Risikohinweisen und Primärquellen.</p>
          </>
        )}
        {!online && <p className="section-code">OFFLINE CACHE / {flows.length.toString().padStart(2, "0")}</p>}

        <div className="knowledge-index">
          {flows.map((flow, index) => (
            <button
              key={flow.id}
              type="button"
              className={flow.id === selectedFlowId ? "is-selected" : ""}
              onClick={() => setSelectedFlowId(flow.id)}
            >
              <span>{(index + 1).toString().padStart(2, "0")}</span>
              <span>
                <small>{flow.category.toLocaleUpperCase("de-DE")} / {online ? "VERIFIED" : "CACHED"}</small>
                <strong>{flow.title}</strong>
                <em>{flow.steps.length.toString().padStart(2, "0")} CHECKS · ~{flow.estimatedMinutes.toString().padStart(2, "0")} MIN</em>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>

        {selectedFlow && (
          <article className="knowledge-detail">
            <span>PATH / {selectedFlow.id.toLocaleUpperCase("de-DE")}</span>
            <h2>{selectedFlow.title}</h2>
            <p>{selectedFlow.summary}</p>
            <button type="button" onClick={() => onStartFlow(selectedFlow.id)}>DIAGNOSE STARTEN ↗</button>
            <div>
              <small>PRIMÄRQUELLEN</small>
              {selectedFlow.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}<span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function getRequiredFlow(id: string): DiagnosticFlow {
  const flow = getFlowFromList(id);
  if (!flow) throw new Error(`Diagnostic flow ${id} is missing`);
  return flow;
}

function getFlowFromList(id: string) {
  // Kept local to avoid rebuilding an index during render for two fixed entry points.
  return diagnostics.find((flow) => flow.id === id);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return "heute";
  if (days === -1) return "gestern";
  return new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" }).format(days, "day");
}
