"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { diagnostics, getFlow, searchDiagnostics } from "@/lib/diagnostics";
import { readCases, removeCase, upsertCase, writeCases } from "@/lib/storage";
import type { AppView, DiagnosticFlow, SavedCase } from "@/lib/types";
import { CommandRail, ScreenReaderStatus } from "./InstrumentUI";
import {
  CasesScreen,
  HomeScreen,
  KnowledgeScreen,
  RunnerScreen,
  SearchScreen,
} from "./Screens";

export function AppShell() {
  const [view, setView] = useState<AppView>("home");
  const [query, setQuery] = useState("");
  const [activeFlow, setActiveFlow] = useState<DiagnosticFlow | null>(null);
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [storageError, setStorageError] = useState("");
  const [online, setOnline] = useState(true);
  const [statusMessage, setStatusMessage] = useState("NEXSTEP bereit");

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    queueMicrotask(() => {
      try {
        setCases(readCases(window.localStorage));
      } catch {
        setStorageError("Lokale Fälle konnten nicht gelesen werden.");
      }
      updateOnline();
    });
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const persistCases = useCallback((nextCases: SavedCase[]) => {
    setCases(nextCases);
    try {
      writeCases(window.localStorage, nextCases);
      setStorageError("");
    } catch {
      setStorageError("Der Fall konnte auf diesem Gerät nicht gespeichert werden.");
    }
  }, []);

  const navigate = useCallback((nextView: AppView) => {
    setView(nextView);
    setStatusMessage(`${nextView === "home" ? "Start" : nextView === "cases" ? "Gespeicherte Fälle" : "Wissen"} geöffnet`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const beginFlow = useCallback((flow: DiagnosticFlow) => {
    setActiveFlow(flow);
    setView("runner");
    setStatusMessage(`Diagnose ${flow.title} gestartet`);
    window.scrollTo({ top: 0 });
  }, []);

  const openSearch = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
    setView("search");
    setStatusMessage(`Suche nach ${nextQuery || "allen Diagnosewegen"}`);
  }, []);

  const saveCase = useCallback((savedCase: SavedCase) => {
    persistCases(upsertCase(cases, savedCase));
    setView("cases");
    setStatusMessage("Fall lokal gespeichert");
  }, [cases, persistCases]);

  const deleteCase = useCallback((id: string) => {
    persistCases(removeCase(cases, id));
    setStatusMessage("Fall gelöscht");
  }, [cases, persistCases]);

  const recentCase = cases[0];
  const results = useMemo(() => searchDiagnostics(query), [query]);

  return (
    <main className="app-stage">
      <div className={`instrument-shell view-${view}`}>
        <ScreenReaderStatus message={statusMessage} />
        {storageError && (
          <div className="storage-alert" role="alert">
            <span>ERR–STORE</span>
            {storageError}
            <button type="button" onClick={() => setStorageError("")}>Schließen</button>
          </div>
        )}

        {view === "home" && (
          <HomeScreen
            recentCase={recentCase}
            onSearch={openSearch}
            onStartFlow={beginFlow}
            online={online}
          />
        )}
        {view === "search" && (
          <SearchScreen
            query={query}
            results={results}
            onQueryChange={setQuery}
            onStartFlow={beginFlow}
          />
        )}
        {view === "runner" && activeFlow && (
          <RunnerScreen
            key={activeFlow.id}
            flow={activeFlow}
            onExit={() => navigate("home")}
            onSave={saveCase}
          />
        )}
        {view === "cases" && (
          <CasesScreen cases={cases} onDelete={deleteCase} onStart={() => navigate("home")} />
        )}
        {view === "knowledge" && (
          <KnowledgeScreen
            flows={diagnostics}
            online={online}
            onStartFlow={(flowId) => {
              const flow = getFlow(flowId);
              if (flow) beginFlow(flow);
            }}
          />
        )}

        {view !== "runner" && <CommandRail active={view} onNavigate={navigate} />}
      </div>
      <aside className="desktop-calibration" aria-hidden="true">
        <span>NEXSTEP / FIELD UNIT 01</span>
        <i />
        <span>VIEWPORT CALIBRATED</span>
      </aside>
    </main>
  );
}
