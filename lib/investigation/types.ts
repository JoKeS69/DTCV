/** Shared Investigation Mode types (cases DB / client-safe subsets). */

export type InvestigationLocation = {
  id: string;
  name: string;
  clue: string;
};

export type InvestigationSuspect = {
  id: string;
  name: string;
  role: string;
  personality: string;
  motive: string;
  background: string;
  alibi: string;
  statement: string;
  /** SERVER-ONLY until case closed — never include in public payloads. */
  isGuilty: boolean;
  evidenceTitle: string;
  evidenceDetail: string;
};

export type InvestigationFieldAgent = {
  id: string;
  name: string;
  role: string;
  specialty: string;
};

export type InvestigationCaseDraft = {
  slug: string;
  title: string;
  teaser: string;
  victims: string[];
  location: string;
  discoveryReport: string;
  weapon: { name: string; trait: string };
  locations: InvestigationLocation[];
  suspects: InvestigationSuspect[];
  hasTwist?: boolean;
  twistNote?: string | null;
  darkerTheme?: boolean;
  fieldAgents?: InvestigationFieldAgent[];
};

export type BoardConnection = {
  suspectId: string;
  clueId: string;
};

export type CaseLogEntry = {
  at: string;
  kind: string;
  text: string;
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
};

export type ChatHistory = {
  suspects?: Record<string, ChatMessage[]>;
  agents?: Record<string, ChatMessage[]>;
};

export type PlayerStatus =
  | "unsolved"
  | "solved_first_try"
  | "solved_after_n";

export type SolutionReveal = {
  culpritId: string;
  culpritName: string;
  motive: string;
  how: string;
  weaponName: string;
  weaponTrait: string;
  disprovenAlibi: string;
  supportingEvidence: { title: string; detail: string }[];
  wrongAccusationCount: number;
  twistNote?: string | null;
};

/** Client-safe suspect (no isGuilty / private evidence). */
export type PublicSuspect = {
  id: string;
  name: string;
  role: string;
  personality: string;
  alibi: string;
  statement: string;
  reviewed: boolean;
};

/** Client-safe location — clue only when inspected. */
export type PublicLocation = {
  id: string;
  name: string;
  inspected: boolean;
  clue: string | null;
};

export type PublicCaseCard = {
  id: string;
  slug: string;
  title: string;
  teaser: string;
  victims: string[];
  location: string;
  darkerTheme: boolean;
  playerStatus: PlayerStatus | null;
  wrongAccusations: number;
};

export const DEFAULT_FIELD_AGENTS: InvestigationFieldAgent[] = [
  {
    id: "agent-mira",
    name: "Mira Okonkwo",
    role: "Database specialist",
    specialty: "records, employment, travel manifests",
  },
  {
    id: "agent-cole",
    name: "Cole Brennan",
    role: "Forensics lead",
    specialty: "trace evidence, weapon traits, scene timing",
  },
  {
    id: "agent-rui",
    name: "Rui Tan",
    role: "Field liaison",
    specialty: "witness canvass, neighborhood timelines",
  },
  {
    id: "agent-nova",
    name: "Nova Ellison",
    role: "Open-source analyst",
    specialty: "public posts, camera request logs, weather",
  },
];
