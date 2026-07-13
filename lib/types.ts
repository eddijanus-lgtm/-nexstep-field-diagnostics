export type DiagnosticCategory = "Netzwerk" | "Windows" | "Server" | "Druck";
export type RiskLevel = "read" | "write" | "admin";
export type ChoiceTone = "pass" | "alternate" | "alert";

export interface DiagnosticChoice {
  label: string;
  detail?: string;
  tone: ChoiceTone;
  nextStepId?: string;
  outcome?: string;
}

export interface DiagnosticStep {
  id: string;
  code: string;
  title: string;
  instruction: string;
  expected?: string;
  command?: string;
  risk: RiskLevel;
  choices: DiagnosticChoice[];
}

export interface DiagnosticSource {
  label: string;
  url: string;
}

export interface DiagnosticFlow {
  id: string;
  category: DiagnosticCategory;
  title: string;
  summary: string;
  estimatedMinutes: number;
  tags: string[];
  startStepId: string;
  steps: DiagnosticStep[];
  sources: DiagnosticSource[];
}

export interface StepAnswer {
  stepId: string;
  label: string;
}

export interface SavedCase {
  id: string;
  flowId: string;
  title: string;
  category: DiagnosticCategory;
  outcome: string;
  note: string;
  answers: StepAnswer[];
  completedAt: string;
}

export type AppView = "home" | "search" | "runner" | "cases" | "knowledge";
