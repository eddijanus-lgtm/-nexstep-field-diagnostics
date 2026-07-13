import type { DiagnosticFlow, DiagnosticStep } from "./types";

const MICROSOFT_IPCONFIG =
  "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig";
const MICROSOFT_PING =
  "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping";
const MICROSOFT_NSLOOKUP =
  "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup";
const MICROSOFT_DHCP =
  "https://learn.microsoft.com/en-us/windows-server/troubleshoot/dynamic-host-configuration-protocol-basics";
const MICROSOFT_PROFILES =
  "https://learn.microsoft.com/en-us/troubleshoot/windows-server/user-profiles-and-logon/troubleshoot-user-profiles-events";
const MICROSOFT_SERVICES =
  "https://learn.microsoft.com/en-us/troubleshoot/windows-client/setup-upgrade-and-drivers/system-log-event-id-7000-7026";

export const diagnostics: DiagnosticFlow[] = [
  {
    id: "no-internet",
    category: "Netzwerk",
    title: "Kein Internetzugriff",
    summary: "Grenzt Verbindung, DHCP, Gateway, Internet und DNS in einer festen Reihenfolge ein.",
    estimatedMinutes: 7,
    tags: ["internet", "offline", "gateway", "wlan", "ethernet"],
    startStepId: "link",
    sources: [
      { label: "Microsoft Learn: ipconfig", url: MICROSOFT_IPCONFIG },
      { label: "Microsoft Learn: ping", url: MICROSOFT_PING },
      { label: "Microsoft Learn: nslookup", url: MICROSOFT_NSLOOKUP },
    ],
    steps: [
      {
        id: "link",
        code: "LINK STATE",
        title: "Ist der Netzwerkadapter verbunden?",
        instruction: "Prüfe WLAN-Symbol, Flugmodus und bei Ethernet die Link-LED am Anschluss.",
        expected: "Der aktive Adapter zeigt eine bestehende Verbindung.",
        risk: "read",
        choices: [
          { label: "Adapter ist verbunden", tone: "pass", nextStepId: "ip" },
          {
            label: "Keine Verbindung",
            detail: "WLAN verbinden oder Kabel/Port prüfen",
            tone: "alert",
            outcome: "Verbindung auf Layer 1/2 fehlt. WLAN, Kabel oder Switch-Port prüfen.",
          },
        ],
      },
      {
        id: "ip",
        code: "IP CONFIGURATION",
        title: "Ist eine gültige IP-Adresse vorhanden?",
        instruction: "Prüfe IPv4-Adresse, Subnetzmaske, Standardgateway und DNS-Server des aktiven Adapters.",
        expected: "Private IPv4-Adresse und ein Standardgateway; keine 169.254.x.x-Adresse.",
        command: "ipconfig /all",
        risk: "read",
        choices: [
          { label: "Gültige Adresse vorhanden", tone: "pass", nextStepId: "gateway" },
          {
            label: "169.254.x.x oder keine Adresse",
            tone: "alert",
            outcome: "Keine gültige DHCP-Konfiguration. Mit dem DHCP-Diagnoseweg fortfahren.",
          },
        ],
      },
      {
        id: "gateway",
        code: "LOCAL GATEWAY",
        title: "Antwortet das Standardgateway?",
        instruction: "Ersetze <Gateway> durch die zuvor angezeigte Gateway-Adresse.",
        expected: "Mindestens eine Antwort mit Laufzeit; Paketverlust sollte 0 % sein.",
        command: "ping <Gateway>",
        risk: "read",
        choices: [
          { label: "Gateway antwortet", tone: "pass", nextStepId: "internet" },
          {
            label: "Keine Antwort",
            tone: "alert",
            outcome: "Störung im lokalen Netz. VLAN, WLAN, Switch-Port oder Router prüfen.",
          },
        ],
      },
      {
        id: "internet",
        code: "PUBLIC REACHABILITY",
        title: "Ist ein öffentliches Ziel per IP erreichbar?",
        instruction: "Der Test umgeht DNS und prüft die reine IP-Konnektivität.",
        expected: "Antworten von 1.1.1.1 oder ein nachvollziehbarer ICMP-Block bei sonst funktionierendem Routing.",
        command: "ping 1.1.1.1",
        risk: "read",
        choices: [
          { label: "Öffentliche IP antwortet", tone: "pass", nextStepId: "dns" },
          {
            label: "Keine öffentliche IP erreichbar",
            tone: "alert",
            outcome: "Routing- oder WAN-Störung. Routerstatus, Upstream und Firewall-Regeln prüfen.",
          },
        ],
      },
      {
        id: "dns",
        code: "NAME RESOLUTION",
        title: "Funktioniert die DNS-Auflösung?",
        instruction: "Vergleiche den antwortenden DNS-Server und die zurückgegebenen Adressen.",
        expected: "Eine oder mehrere IP-Adressen für microsoft.com ohne Timeout.",
        command: "nslookup microsoft.com",
        risk: "read",
        choices: [
          {
            label: "Name wird aufgelöst",
            tone: "pass",
            nextStepId: "proxy",
          },
          {
            label: "Timeout oder Serverfehler",
            tone: "alternate",
            outcome: "DNS-Störung bestätigt. Mit dem DNS-Diagnoseweg fortfahren.",
          },
        ],
      },
      {
        id: "proxy",
        code: "PROXY PATH",
        title: "Ist ein unerwarteter Systemproxy aktiv?",
        instruction: "Vergleiche die WinHTTP-Konfiguration mit der vorgesehenen Umgebung. Browser können zusätzlich eigene Proxyeinstellungen verwenden.",
        expected: "Direkter Zugriff oder der freigegebene Unternehmensproxy.",
        command: "netsh winhttp show proxy",
        risk: "read",
        choices: [
          {
            label: "Proxykonfiguration ist korrekt",
            tone: "pass",
            outcome: "Netzwerkpfad, DNS und Systemproxy funktionieren. Browser oder Zielanwendung prüfen.",
          },
          {
            label: "Unerwarteter Proxy eingetragen",
            tone: "alert",
            outcome: "Fehlerhafte Proxykonfiguration gefunden. Vorgesehene Richtlinie oder Einstellung wiederherstellen.",
          },
        ],
      },
    ],
  },
  {
    id: "dns-failure",
    category: "Netzwerk",
    title: "DNS-Auflösung schlägt fehl",
    summary: "Unterscheidet Clientcache, eingetragenen DNS-Server und eine serverseitige DNS-Störung.",
    estimatedMinutes: 6,
    tags: ["dns", "nslookup", "name", "auflösung", "cache"],
    startStepId: "compare",
    sources: [
      { label: "Microsoft Learn: nslookup", url: MICROSOFT_NSLOOKUP },
      { label: "Microsoft Learn: ipconfig", url: MICROSOFT_IPCONFIG },
    ],
    steps: [
      {
        id: "compare",
        code: "CONTROL QUERY",
        title: "Antwortet ein externer DNS-Server?",
        instruction: "Vergleiche die Abfrage über den konfigurierten Server mit einer direkten Abfrage an 1.1.1.1.",
        command: "nslookup microsoft.com 1.1.1.1",
        expected: "Der externe Server liefert Adressen zurück.",
        risk: "read",
        choices: [
          { label: "Externe Abfrage funktioniert", tone: "pass", nextStepId: "configured" },
          {
            label: "Auch externe Abfrage scheitert",
            tone: "alert",
            outcome: "DNS-Verkehr oder allgemeine Konnektivität ist blockiert. Firewall und Routing prüfen.",
          },
        ],
      },
      {
        id: "configured",
        code: "CONFIGURED SERVER",
        title: "Welcher DNS-Server ist eingetragen?",
        instruction: "Prüfe am aktiven Adapter die DNS-Server und ob sie zum vorgesehenen Netz gehören.",
        command: "ipconfig /all",
        expected: "Erwartete interne oder freigegebene externe DNS-Server.",
        risk: "read",
        choices: [
          { label: "Server ist korrekt", tone: "pass", nextStepId: "cache" },
          {
            label: "Server ist falsch oder fehlt",
            tone: "alert",
            outcome: "Fehlerhafte Clientkonfiguration. DHCP-Optionen oder Adaptereinstellung korrigieren.",
          },
        ],
      },
      {
        id: "cache",
        code: "CLIENT CACHE",
        title: "DNS-Clientcache leeren?",
        instruction: "Die Aktion entfernt lokal zwischengespeicherte Namensauflösungen. Danach erneut testen.",
        command: "ipconfig /flushdns",
        expected: "Bestätigung, dass der DNS-Auflösungscache geleert wurde.",
        risk: "write",
        choices: [
          {
            label: "Danach funktioniert es",
            tone: "pass",
            outcome: "Veralteter oder fehlerhafter DNS-Cache war die Ursache.",
          },
          { label: "Fehler bleibt bestehen", tone: "alternate", nextStepId: "server" },
        ],
      },
      {
        id: "server",
        code: "SERVER RESPONSE",
        title: "Antwortet der konfigurierte DNS-Server direkt?",
        instruction: "Ersetze <DNS-Server> durch die in ipconfig angezeigte Adresse.",
        command: "nslookup microsoft.com <DNS-Server>",
        expected: "Antwort ohne Timeout und ohne SERVFAIL.",
        risk: "read",
        choices: [
          {
            label: "Server antwortet korrekt",
            tone: "pass",
            outcome: "DNS-Server ist erreichbar. Suchsuffix, Anwendung und spezifischen Record prüfen.",
          },
          {
            label: "Timeout oder SERVFAIL",
            tone: "alert",
            outcome: "DNS-Server oder dessen Weiterleitung ist gestört. Serverdienst und Zonen prüfen.",
          },
        ],
      },
    ],
  },
  {
    id: "dhcp-failure",
    category: "Netzwerk",
    title: "DHCP-Adresse wird nicht vergeben",
    summary: "Prüft Linkstatus, APIPA, Lease-Erneuerung und den Weg zum DHCP-Server.",
    estimatedMinutes: 8,
    tags: ["dhcp", "apipa", "169.254", "lease", "ip"],
    startStepId: "adapter",
    sources: [
      { label: "Microsoft Learn: DHCP-Grundlagen", url: MICROSOFT_DHCP },
      { label: "Microsoft Learn: ipconfig", url: MICROSOFT_IPCONFIG },
    ],
    steps: [
      {
        id: "adapter",
        code: "ADAPTER STATE",
        title: "Ist DHCP am aktiven Adapter aktiviert?",
        instruction: "Suche in der Ausgabe nach „DHCP aktiviert: Ja“ und dem richtigen physischen Adapter.",
        command: "ipconfig /all",
        expected: "DHCP ist aktiviert und Medienstatus ist nicht getrennt.",
        risk: "read",
        choices: [
          { label: "DHCP ist aktiviert", tone: "pass", nextStepId: "lease" },
          {
            label: "DHCP aus oder Medium getrennt",
            tone: "alert",
            outcome: "Adapterkonfiguration oder physische Verbindung korrigieren.",
          },
        ],
      },
      {
        id: "lease",
        code: "LEASE RENEWAL",
        title: "Lässt sich der Lease erneuern?",
        instruction: "Die Befehle trennen und erneuern die DHCP-Konfiguration. Remote-Verbindungen können abbrechen.",
        command: "ipconfig /release && ipconfig /renew",
        expected: "Neue gültige Adresse, Gateway, Lease-Beginn und Lease-Ende.",
        risk: "admin",
        choices: [
          {
            label: "Neue Adresse erhalten",
            tone: "pass",
            outcome: "DHCP-Lease wurde erfolgreich erneuert.",
          },
          { label: "Timeout oder APIPA bleibt", tone: "alternate", nextStepId: "path" },
        ],
      },
      {
        id: "path",
        code: "BROADCAST PATH",
        title: "Erreicht der Client den DHCP-Broadcastpfad?",
        instruction: "Prüfe am Switch den richtigen VLAN-Zugang und bei gerouteten Netzen den DHCP-Relay/IP-Helper.",
        expected: "Client-VLAN ist korrekt; Relay zeigt auf einen erreichbaren DHCP-Server.",
        risk: "read",
        choices: [
          {
            label: "VLAN und Relay stimmen",
            tone: "pass",
            outcome: "DHCP-Serverdienst, Scope-Auslastung und Reservierungen prüfen.",
          },
          {
            label: "VLAN oder Relay ist falsch",
            tone: "alert",
            outcome: "Netzpfad korrigieren und anschließend Lease erneut anfordern.",
          },
        ],
      },
    ],
  },
  {
    id: "temporary-profile",
    category: "Windows",
    title: "Temporäres Benutzerprofil",
    summary: "Sichert zuerst Nutzerdaten und grenzt Profilpfad, Ereignisse und beschädigte Profildaten ein.",
    estimatedMinutes: 10,
    tags: ["profil", "temporär", "anmeldung", "user profile service", "bak"],
    startStepId: "protect",
    sources: [{ label: "Microsoft Learn: Profilereignisse untersuchen", url: MICROSOFT_PROFILES }],
    steps: [
      {
        id: "protect",
        code: "DATA SAFETY",
        title: "Sind neue Daten aus der temporären Sitzung gesichert?",
        instruction: "Vor Abmeldung alle neu erstellten Dateien außerhalb des temporären Profils sichern.",
        expected: "Alle relevanten Dateien liegen in einem dauerhaften Speicherort.",
        risk: "read",
        choices: [
          { label: "Daten sind gesichert", tone: "pass", nextStepId: "event" },
          {
            label: "Noch nicht gesichert",
            tone: "alert",
            outcome: "Zuerst Nutzerdaten sichern. Eine Abmeldung kann Inhalte des temporären Profils entfernen.",
          },
        ],
      },
      {
        id: "event",
        code: "PROFILE EVENTS",
        title: "Welchen Fehler protokolliert der Profildienst?",
        instruction: "Öffne die Ereignisanzeige und prüfe User Profile Service unter Anwendungs- und Dienstprotokolle.",
        command: "eventvwr.msc",
        expected: "Konkrete Ereignis-ID mit Pfad-, Berechtigungs- oder Registrierungsfehler.",
        risk: "read",
        choices: [
          { label: "Pfad oder Zugriff verweigert", tone: "alternate", nextStepId: "path" },
          { label: "Profil beschädigt oder .bak-Hinweis", tone: "alternate", nextStepId: "registry" },
        ],
      },
      {
        id: "path",
        code: "PROFILE PATH",
        title: "Existiert der erwartete Profilordner?",
        instruction: "Prüfe, ob der Ordner vorhanden ist und SYSTEM sowie der Benutzer Zugriff besitzen.",
        expected: "Profilpfad existiert, ist erreichbar und nicht durch eine defekte Umleitung blockiert.",
        risk: "read",
        choices: [
          {
            label: "Pfad oder Berechtigung war falsch",
            tone: "alert",
            outcome: "Profilpfad/Berechtigungen korrigieren und Anmeldung erneut testen.",
          },
          { label: "Pfad ist korrekt", tone: "pass", nextStepId: "registry" },
        ],
      },
      {
        id: "registry",
        code: "PROFILE MAPPING",
        title: "Passt ProfileImagePath zur Benutzer-SID?",
        instruction: "Registry nur lesen: ProfileList-Eintrag der SID mit dem tatsächlichen Benutzerordner vergleichen.",
        command: "reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList\" /s /v ProfileImagePath",
        expected: "Genau ein konsistenter SID-Eintrag verweist auf den richtigen Profilordner.",
        risk: "admin",
        choices: [
          {
            label: "Zuordnung ist inkonsistent",
            tone: "alert",
            outcome: "Profildaten sichern und ProfileList-Zuordnung nach Unternehmensprozess reparieren.",
          },
          {
            label: "Zuordnung ist korrekt",
            tone: "pass",
            nextStepId: "retest",
          },
        ],
      },
      {
        id: "retest",
        code: "CONTROL LOGON",
        title: "Lädt das Profil nach einer kontrollierten Neuanmeldung?",
        instruction: "Alle Daten sichern, vollständig abmelden und die Anmeldung erneut testen. Nicht nur sperren oder Benutzer wechseln.",
        expected: "Der ursprüngliche Profilpfad wird geladen und die TEMP-Warnung bleibt aus.",
        risk: "write",
        choices: [
          {
            label: "Profil lädt wieder korrekt",
            tone: "pass",
            outcome: "Profilzuordnung ist wieder funktionsfähig. Ereignisprotokoll auf Folgefehler prüfen.",
          },
          {
            label: "Temporäres Profil bleibt",
            tone: "alert",
            outcome: "Dateisystem, Profildienst und Sicherheitssoftware weiter untersuchen oder Profil kontrolliert neu erstellen.",
          },
        ],
      },
    ],
  },
  {
    id: "service-7000",
    category: "Server",
    title: "Dienstfehler Ereignis 7000",
    summary: "Liest Dienstname und Fehlertext aus, prüft Startpfad, Konto und Abhängigkeiten.",
    estimatedMinutes: 9,
    tags: ["dienst", "7000", "service control manager", "treiber", "start"],
    startStepId: "event",
    sources: [{ label: "Microsoft Learn: Ereignis 7000/7026", url: MICROSOFT_SERVICES }],
    steps: [
      {
        id: "event",
        code: "EVENT PAYLOAD",
        title: "Welcher Dienst und Fehlertext werden genannt?",
        instruction: "Öffne das Systemprotokoll und notiere Dienstname, Zeitstempel und vollständigen Fehlertext.",
        command: "eventvwr.msc",
        expected: "Eindeutiger Dienstname und Win32-Fehler wie „Datei nicht gefunden“ oder „Zugriff verweigert“.",
        risk: "read",
        choices: [
          { label: "Datei oder Pfad nicht gefunden", tone: "alternate", nextStepId: "path" },
          { label: "Zugriff, Konto oder Timeout", tone: "alternate", nextStepId: "account" },
        ],
      },
      {
        id: "path",
        code: "IMAGE PATH",
        title: "Existiert die konfigurierte Binärdatei?",
        instruction: "Ersetze <Dienstname> und vergleiche BINARY_PATH_NAME mit dem Dateisystem.",
        command: "sc.exe qc <Dienstname>",
        expected: "Pfad ist korrekt quotiert und die Datei existiert.",
        risk: "read",
        choices: [
          {
            label: "Datei oder Pfad fehlt",
            tone: "alert",
            outcome: "Software reparieren/deinstallieren oder verwaisten Dienst nach Freigabe entfernen.",
          },
          { label: "Pfad ist vorhanden", tone: "pass", nextStepId: "account" },
        ],
      },
      {
        id: "account",
        code: "SERVICE CONTEXT",
        title: "Sind Startkonto und Abhängigkeiten gültig?",
        instruction: "Prüfe SERVICE_START_NAME, DEPENDENCIES und ob abhängige Dienste laufen.",
        command: "sc.exe qc <Dienstname> && sc.exe query <Dienstname>",
        expected: "Startkonto ist gültig; alle Abhängigkeiten sind gestartet.",
        risk: "read",
        choices: [
          {
            label: "Konto oder Abhängigkeit fehlerhaft",
            tone: "alert",
            outcome: "Dienstkonto, Anmelderecht oder abhängigen Dienst korrigieren.",
          },
          {
            label: "Konfiguration wirkt korrekt",
            tone: "pass",
            outcome: "Herstellerlog, Berechtigungen der Binärdatei und Diensttimeout untersuchen.",
          },
        ],
      },
    ],
  },
  {
    id: "printer-unreachable",
    category: "Druck",
    title: "Netzwerkdrucker nicht erreichbar",
    summary: "Trennt Namensauflösung, IP-Konnektivität, Druckerstatus und Windows-Warteschlange.",
    estimatedMinutes: 7,
    tags: ["drucker", "print", "warteschlange", "spooler", "tcp 9100"],
    startStepId: "address",
    sources: [
      { label: "Microsoft Learn: ping", url: MICROSOFT_PING },
      { label: "Microsoft Learn: nslookup", url: MICROSOFT_NSLOOKUP },
    ],
    steps: [
      {
        id: "address",
        code: "TARGET ADDRESS",
        title: "Ist die aktuelle Druckeradresse bekannt?",
        instruction: "Vergleiche Anschlussadresse in Windows mit der am Drucker oder DHCP reservierten Adresse.",
        expected: "Hostname/IP stimmen mit dem vorgesehenen Gerät überein.",
        risk: "read",
        choices: [
          { label: "Adresse stimmt", tone: "pass", nextStepId: "reach" },
          {
            label: "Adresse ist veraltet",
            tone: "alert",
            outcome: "Druckeranschluss oder DHCP-Reservierung korrigieren.",
          },
        ],
      },
      {
        id: "reach",
        code: "IP REACHABILITY",
        title: "Ist der Drucker per IP erreichbar?",
        instruction: "Ersetze <Drucker-IP> durch die tatsächliche Adresse.",
        command: "ping <Drucker-IP>",
        expected: "Antworten ohne Paketverlust oder bestätigte ICMP-Sperre bei erreichbarer Weboberfläche.",
        risk: "read",
        choices: [
          { label: "IP ist erreichbar", tone: "pass", nextStepId: "queue" },
          {
            label: "Nicht erreichbar",
            tone: "alert",
            outcome: "Strom, Kabel/WLAN, VLAN, IP-Konflikt und Switch-Port prüfen.",
          },
        ],
      },
      {
        id: "queue",
        code: "PRINT QUEUE",
        title: "Ist die Warteschlange blockiert?",
        instruction: "Prüfe pausierte Aufträge, Offline-Modus und ob der Druckwarteschlangendienst läuft.",
        command: "Get-Service Spooler",
        expected: "Spooler ist Running; Warteschlange ist nicht pausiert oder offline.",
        risk: "read",
        choices: [
          {
            label: "Warteschlange war blockiert",
            tone: "pass",
            outcome: "Blockierenden Auftrag entfernen und Testseite drucken.",
          },
          {
            label: "Warteschlange ist frei",
            tone: "alternate",
            outcome: "Treiber, Anschlussprotokoll und Gerätestatus am Drucker prüfen.",
          },
        ],
      },
    ],
  },
];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function searchDiagnostics(query: string): DiagnosticFlow[] {
  const needle = normalize(query);
  if (!needle) return diagnostics;

  return diagnostics.filter((flow) => {
    const haystack = normalize(
      [flow.title, flow.summary, flow.category, ...flow.tags].join(" "),
    );
    return haystack.includes(needle);
  });
}

export function getFlow(flowId: string): DiagnosticFlow | undefined {
  return diagnostics.find((flow) => flow.id === flowId);
}

export function getStep(flow: DiagnosticFlow, stepId: string): DiagnosticStep | undefined {
  return flow.steps.find((step) => step.id === stepId);
}

export function getReachableStepCount(flow: DiagnosticFlow): number {
  return flow.steps.length;
}
