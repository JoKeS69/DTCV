"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  accuseSuspectAction,
  clearBoardAction,
  contactAgentAction,
  inspectSceneAction,
  interrogateSuspectAction,
  reviewSuspectAction,
  setBoardConnectionAction,
  startInvestigationAction,
} from "@/app/actions/investigation";
import type {
  BoardConnection,
  CaseLogEntry,
  ChatMessage,
  InvestigationFieldAgent,
  PlayerStatus,
  PublicLocation,
  PublicSuspect,
  SolutionReveal,
} from "@/lib/investigation/types";

type Panel =
  | "dossiers"
  | "interrogate"
  | "scenes"
  | "board"
  | "agents"
  | "log"
  | "accuse";

type Props = {
  slug: string;
  caseData: {
    id: string;
    title: string;
    teaser: string;
    victims: string[];
    location: string;
    discoveryReport: string;
    weaponLabel: string;
    darkerTheme: boolean;
    fieldAgents: InvestigationFieldAgent[];
    suspects: PublicSuspect[];
    locations: PublicLocation[];
    clueNodes: { id: string; label: string; clue: string | null }[];
  };
  player: {
    displayName: string | null;
    status: PlayerStatus;
    wrongAccusations: number;
    boardConnections: BoardConnection[];
    caseLog: CaseLogEntry[];
    chatHistory: {
      suspects?: Record<string, ChatMessage[]>;
      agents?: Record<string, ChatMessage[]>;
    };
    solutionReveal: SolutionReveal | null;
    hasSession: boolean;
  };
  llmOfflineHint: boolean;
};

export function InvestigationGame({
  slug,
  caseData,
  player,
  llmOfflineHint,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<Panel>("dossiers");
  const [displayName, setDisplayName] = useState(player.displayName ?? "");
  const [started, setStarted] = useState(player.hasSession);
  const [consoleLines, setConsoleLines] = useState<string[]>(() =>
    player.caseLog.slice(-12).map((e) => e.text),
  );
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(llmOfflineHint);
  const [suspects, setSuspects] = useState(caseData.suspects);
  const [locations, setLocations] = useState(caseData.locations);
  const [clueNodes, setClueNodes] = useState(caseData.clueNodes);
  const [connections, setConnections] = useState(player.boardConnections);
  const [caseLog, setCaseLog] = useState(player.caseLog);
  const [wrongAccusations, setWrongAccusations] = useState(
    player.wrongAccusations,
  );
  const [status, setStatus] = useState(player.status);
  const [reveal, setReveal] = useState(player.solutionReveal);
  const [activeSuspectId, setActiveSuspectId] = useState(
    caseData.suspects[0]?.id ?? "",
  );
  const [activeAgentId, setActiveAgentId] = useState(
    caseData.fieldAgents[0]?.id ?? "",
  );
  const [chatInput, setChatInput] = useState("");
  const [agentInput, setAgentInput] = useState("");
  const [suspectChats, setSuspectChats] = useState(
    player.chatHistory.suspects ?? {},
  );
  const [agentChats, setAgentChats] = useState(player.chatHistory.agents ?? {});
  const [dossierDetail, setDossierDetail] = useState<{
    name: string;
    role: string;
    motive: string;
    alibi: string;
    statement: string;
    personality: string;
  } | null>(null);
  const [boardSuspect, setBoardSuspect] = useState<string | null>(null);
  const [accuseId, setAccuseId] = useState(caseData.suspects[0]?.id ?? "");
  const [accuseMsg, setAccuseMsg] = useState<string | null>(null);

  const theme = caseData.darkerTheme
    ? "border-[#0a1620] bg-[#050a10] text-[#c8e7e0]"
    : "border-[#123047] bg-[#0a1622] text-[#d7f3ee]";

  const pushConsole = (line: string) => {
    setConsoleLines((prev) => [...prev.slice(-40), line]);
  };

  const statusLabel = useMemo(() => {
    if (status === "solved_first_try") return "SOLVED · FIRST TRY";
    if (status === "solved_after_n")
      return `SOLVED · AFTER ${wrongAccusations} WRONG`;
    return wrongAccusations
      ? `UNSOLVED · ${wrongAccusations} FALSE ARREST(S)`
      : "UNSOLVED";
  }, [status, wrongAccusations]);

  function begin() {
    setError(null);
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("displayName", displayName);
    startTransition(async () => {
      const res = await startInvestigationAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStarted(true);
      pushConsole(`${displayName.trim()} entered Investigation Mode.`);
    });
  }

  function openDossier(id: string) {
    startTransition(async () => {
      const res = await reviewSuspectAction(slug, id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDossierDetail(res.dossier);
      setSuspects((prev) =>
        prev.map((s) => (s.id === id ? { ...s, reviewed: true } : s)),
      );
      pushConsole(`Dossier opened: ${res.dossier.name}`);
      setCaseLog((prev) => [
        ...prev,
        {
          at: new Date().toISOString(),
          kind: "dossier",
          text: `Reviewed dossier: ${res.dossier.name}`,
        },
      ]);
    });
  }

  function inspect(id: string) {
    startTransition(async () => {
      const res = await inspectSceneAction(slug, id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLocations((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, inspected: true, clue: res.clue } : l,
        ),
      );
      setClueNodes((prev) =>
        prev.map((c) =>
          c.id === id ? { id, label: res.name, clue: res.clue } : c,
        ),
      );
      pushConsole(`Scene inspected — ${res.name}: ${res.clue}`);
    });
  }

  function sendInterrogate() {
    if (!chatInput.trim()) return;
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("suspectId", activeSuspectId);
    fd.set("message", chatInput);
    const outgoing = chatInput;
    setChatInput("");
    startTransition(async () => {
      const res = await interrogateSuspectAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.offline) setOfflineNotice(true);
      setSuspectChats((prev) => ({
        ...prev,
        [activeSuspectId]: res.messages,
      }));
      pushConsole(`> ${outgoing}`);
      pushConsole(`${res.reply}`);
    });
  }

  function sendAgent() {
    if (!agentInput.trim()) return;
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("agentId", activeAgentId);
    fd.set("message", agentInput);
    setAgentInput("");
    startTransition(async () => {
      const res = await contactAgentAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.offline) setOfflineNotice(true);
      setAgentChats((prev) => ({
        ...prev,
        [activeAgentId]: res.messages,
      }));
      pushConsole(res.reply);
    });
  }

  function quickAgent(cmd: string, suspectName: string) {
    setAgentInput(`${cmd} ${suspectName}`);
  }

  function pinClue(clueId: string) {
    if (!boardSuspect) {
      setError("Select a suspect node first, then a clue.");
      return;
    }
    startTransition(async () => {
      const res = await setBoardConnectionAction({
        caseSlug: slug,
        suspectId: boardSuspect,
        clueId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConnections(res.connections);
      pushConsole("Evidence board updated.");
    });
  }

  function clearBoard() {
    startTransition(async () => {
      const res = await clearBoardAction(slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConnections([]);
      setBoardSuspect(null);
      pushConsole("Evidence board cleared.");
    });
  }

  function accuse() {
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("suspectId", accuseId);
    startTransition(async () => {
      const res = await accuseSuspectAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!res.correct) {
        setWrongAccusations(res.wrongAccusations);
        setAccuseMsg(res.message);
        pushConsole(res.message);
        return;
      }
      setStatus(res.status);
      setReveal(res.reveal);
      setAccuseMsg("Case closed.");
      pushConsole(`CASE CLOSED — ${res.reveal.culpritName}`);
    });
  }

  if (!started) {
    return (
      <section className={`border ${theme} p-4 md:p-6`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5ec4b6]">
          Investigation Mode · fictional game
        </p>
        <h1 className="mt-2 font-mono text-xl uppercase tracking-[0.08em]">
          {caseData.title}
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-[13px] text-[#9bb8b2] normal-case tracking-normal">
          {caseData.teaser}
        </p>
        <p className="mt-3 font-mono text-[11px] text-[#7f9e98]">
          Victim: {caseData.victims.join(", ")} · {caseData.location}
        </p>
        <p className="mt-4 max-w-xl border border-[#1e4a55]/40 bg-[#07141c] px-3 py-2 font-mono text-[11px] text-[#8fd0c4]">
          Fictional game disclaimer: invented scenario only. No real persons as
          suspects or guilty parties. Not a real crime.
        </p>
        <label className="mt-5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6fb8ac]">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full max-w-sm border border-[#1e4a55] bg-[#050d14] px-3 py-2 font-mono text-[13px] text-[#d7f3ee] outline-none focus:border-[#3d9e90]"
            maxLength={40}
            placeholder="Enter callsign"
          />
        </label>
        {error ? (
          <p className="mt-2 font-mono text-[11px] text-danger">{error}</p>
        ) : null}
        <button
          type="button"
          disabled={pending || displayName.trim().length < 2}
          onClick={begin}
          className="mt-4 border border-[#3d9e90] bg-[#12363a] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d7f3ee] transition-colors hover:bg-[#18464b] disabled:opacity-40"
        >
          Enter case
        </button>
        <p className="mt-4">
          <Link
            href="/fictional"
            className="font-mono text-[11px] text-[#6fb8ac] hover:underline"
          >
            ← Fictional cases
          </Link>
        </p>
      </section>
    );
  }

  if (reveal) {
    return (
      <section className={`border ${theme} p-4 md:p-6`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5ec4b6]">
          Case closed
        </p>
        <h1 className="mt-2 font-mono text-xl uppercase tracking-[0.08em]">
          {caseData.title}
        </h1>
        <p className="mt-2 font-mono text-[12px] text-[#8fd0c4]">{statusLabel}</p>
        <div className="mt-4 space-y-2 border border-[#1e4a55]/50 bg-[#07141c] p-4 font-mono text-[13px] leading-relaxed text-[#cfe8e2] normal-case tracking-normal">
          <p>
            <span className="text-[#5ec4b6]">Culprit:</span> {reveal.culpritName}
          </p>
          <p>
            <span className="text-[#5ec4b6]">Motive:</span> {reveal.motive}
          </p>
          <p>
            <span className="text-[#5ec4b6]">How:</span> {reveal.how}
          </p>
          <p>
            <span className="text-[#5ec4b6]">Weapon:</span> {reveal.weaponName} (
            {reveal.weaponTrait})
          </p>
          <p>
            <span className="text-[#5ec4b6]">Disproven alibi:</span>{" "}
            {reveal.disprovenAlibi}
          </p>
          <div>
            <p className="text-[#5ec4b6]">Supporting evidence</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {reveal.supportingEvidence.map((e) => (
                <li key={e.title}>
                  <strong>{e.title}:</strong> {e.detail}
                </li>
              ))}
            </ul>
          </div>
          <p>
            Wrong accusations before close: {reveal.wrongAccusationCount}
          </p>
          {reveal.twistNote ? (
            <p>
              <span className="text-[#5ec4b6]">Twist:</span> {reveal.twistNote}
            </p>
          ) : null}
        </div>
        <Link
          href="/fictional"
          className="mt-5 inline-block border border-[#3d9e90] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d7f3ee] hover:bg-[#12363a]"
        >
          Return to case list
        </Link>
      </section>
    );
  }

  const panels: { id: Panel; label: string }[] = [
    { id: "dossiers", label: "Suspect dossiers" },
    { id: "interrogate", label: "Interrogate" },
    { id: "scenes", label: "Inspect scenes" },
    { id: "board", label: "Evidence board" },
    { id: "agents", label: "Contact agents" },
    { id: "log", label: "Case log" },
    { id: "accuse", label: "Make accusation" },
  ];

  return (
    <section className={`border ${theme}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1e4a55]/60 px-4 py-3 md:px-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5ec4b6]">
            Investigation Mode · {displayName || player.displayName}
          </p>
          <h1 className="mt-1 font-mono text-lg uppercase tracking-[0.08em] md:text-xl">
            {caseData.title}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-[#7f9e98]">
            Victim: {caseData.victims.join(", ")} · {statusLabel}
          </p>
        </div>
        <Link
          href="/fictional"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6fb8ac] hover:underline"
        >
          Case list
        </Link>
      </header>

      {offlineNotice ? (
        <p className="border-b border-[#1e4a55]/40 bg-[#102018] px-4 py-2 font-mono text-[11px] text-[#9dcea6]">
          Offline LLM notice — dossiers, scenes, board, background checks, and
          accusations remain available. Chat uses local fallback replies.
        </p>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <nav className="flex flex-wrap gap-1 border-b border-[#1e4a55]/50 px-3 py-2">
            {panels.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPanel(p.id);
                  setError(null);
                }}
                className={[
                  "border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                  panel === p.id
                    ? "border-[#3d9e90] bg-[#12363a] text-[#e7fff9]"
                    : "border-transparent text-[#7f9e98] hover:border-[#1e4a55] hover:text-[#d7f3ee]",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <div className="px-4 py-4 md:px-5">
            {error ? (
              <p className="mb-3 font-mono text-[11px] text-danger">{error}</p>
            ) : null}

            {panel === "dossiers" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <ul className="space-y-2">
                  {suspects.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => openDossier(s.id)}
                        className="w-full border border-[#1e4a55]/70 bg-[#07141c] px-3 py-2 text-left font-mono text-[12px] hover:border-[#3d9e90]"
                      >
                        <span className="text-[#d7f3ee]">{s.name}</span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[#6fb8ac]">
                          {s.role}
                          {s.reviewed ? " · reviewed" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border border-[#1e4a55]/50 bg-[#07141c] p-3 font-mono text-[12px] leading-relaxed text-[#cfe8e2] normal-case tracking-normal">
                  {dossierDetail ? (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#5ec4b6]">
                        {dossierDetail.name} · {dossierDetail.role}
                      </p>
                      <p className="mt-2">
                        <span className="text-[#5ec4b6]">Personality:</span>{" "}
                        {dossierDetail.personality}
                      </p>
                      <p className="mt-2">
                        <span className="text-[#5ec4b6]">Motive (file):</span>{" "}
                        {dossierDetail.motive}
                      </p>
                      <p className="mt-2">
                        <span className="text-[#5ec4b6]">Claimed alibi:</span>{" "}
                        {dossierDetail.alibi}
                      </p>
                      <p className="mt-2">
                        <span className="text-[#5ec4b6]">Official statement:</span>{" "}
                        {dossierDetail.statement}
                      </p>
                    </>
                  ) : (
                    <p className="text-[#7f9e98]">
                      Select a suspect to open their dossier.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {panel === "scenes" ? (
              <ul className="space-y-2">
                <p className="mb-2 font-mono text-[11px] text-[#7f9e98] normal-case tracking-normal">
                  {caseData.discoveryReport}
                </p>
                {locations.map((l) => (
                  <li
                    key={l.id}
                    className="border border-[#1e4a55]/70 bg-[#07141c] px-3 py-2 font-mono text-[12px]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{l.name}</span>
                      {!l.inspected ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => inspect(l.id)}
                          className="border border-[#3d9e90]/70 px-2 py-1 text-[10px] uppercase tracking-[0.12em] hover:bg-[#12363a]"
                        >
                          Inspect
                        </button>
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#5ec4b6]">
                          Discovered
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[#9bb8b2] normal-case tracking-normal">
                      {l.inspected && l.clue
                        ? l.clue
                        : "Clue hidden until inspected."}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            {panel === "interrogate" ? (
              <div className="space-y-3">
                <select
                  value={activeSuspectId}
                  onChange={(e) => setActiveSuspectId(e.target.value)}
                  className="w-full max-w-md border border-[#1e4a55] bg-[#050d14] px-3 py-2 font-mono text-[12px]"
                >
                  {suspects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </option>
                  ))}
                </select>
                <div className="h-56 overflow-y-auto border border-[#1e4a55]/60 bg-[#050d14] p-3 font-mono text-[12px] leading-relaxed">
                  {(suspectChats[activeSuspectId] ?? []).map((m, i) => (
                    <p
                      key={`${m.at}-${i}`}
                      className={
                        m.role === "user" ? "mt-2 text-[#5ec4b6]" : "mt-2 text-[#cfe8e2]"
                      }
                    >
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#6fb8ac]">
                        {m.role === "user" ? "You" : "Suspect"} ·{" "}
                      </span>
                      {m.content}
                    </p>
                  ))}
                  {(suspectChats[activeSuspectId] ?? []).length === 0 ? (
                    <p className="text-[#7f9e98]">No interrogation yet.</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendInterrogate();
                    }}
                    className="min-w-[220px] flex-1 border border-[#1e4a55] bg-[#050d14] px-3 py-2 font-mono text-[12px]"
                    placeholder="Ask about alibi, timeline, motive…"
                    maxLength={500}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={sendInterrogate}
                    className="border border-[#3d9e90] bg-[#12363a] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : null}

            {panel === "board" ? (
              <div className="space-y-4">
                <p className="font-mono text-[11px] text-[#7f9e98] normal-case tracking-normal">
                  Click a suspect, then a clue to pin or remove a string. Clear
                  Board wipes all pins (saved to case log).
                </p>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5ec4b6]">
                    Suspects
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suspects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setBoardSuspect(s.id)}
                        className={[
                          "border px-2.5 py-1.5 font-mono text-[11px]",
                          boardSuspect === s.id
                            ? "border-[#3d9e90] bg-[#12363a]"
                            : "border-[#1e4a55]",
                        ].join(" ")}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5ec4b6]">
                    Clues
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {clueNodes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pinClue(c.id)}
                        className="border border-[#1e4a55] px-2.5 py-1.5 font-mono text-[11px] hover:border-[#3d9e90]"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5ec4b6]">
                    Strings
                  </p>
                  <ul className="mt-2 space-y-1 font-mono text-[12px] text-[#cfe8e2]">
                    {connections.length === 0 ? (
                      <li className="text-[#7f9e98]">No connections pinned.</li>
                    ) : (
                      connections.map((c) => {
                        const s = suspects.find((x) => x.id === c.suspectId);
                        const clue = clueNodes.find((x) => x.id === c.clueId);
                        return (
                          <li key={`${c.suspectId}-${c.clueId}`}>
                            {s?.name ?? c.suspectId} ↔ {clue?.label ?? c.clueId}
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={clearBoard}
                  className="border border-[#8a5050] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e7b4b4]"
                >
                  Clear Board
                </button>
              </div>
            ) : null}

            {panel === "agents" ? (
              <div className="space-y-3">
                <select
                  value={activeAgentId}
                  onChange={(e) => setActiveAgentId(e.target.value)}
                  className="w-full max-w-md border border-[#1e4a55] bg-[#050d14] px-3 py-2 font-mono text-[12px]"
                >
                  {caseData.fieldAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.role}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <select
                    id="quick-suspect"
                    className="border border-[#1e4a55] bg-[#050d14] px-2 py-1.5 font-mono text-[11px]"
                    defaultValue={suspects[0]?.name}
                    onChange={(e) => {
                      const el = e.currentTarget;
                      el.dataset.selected = el.value;
                    }}
                  >
                    {suspects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="border border-[#1e4a55] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
                    onClick={() => {
                      const sel = document.querySelector(
                        "#quick-suspect",
                      ) as HTMLSelectElement | null;
                      quickAgent("background check on", sel?.value ?? "");
                    }}
                  >
                    Background check
                  </button>
                  <button
                    type="button"
                    className="border border-[#1e4a55] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
                    onClick={() => {
                      const sel = document.querySelector(
                        "#quick-suspect",
                      ) as HTMLSelectElement | null;
                      quickAgent("verify alibi of", sel?.value ?? "");
                    }}
                  >
                    Verify alibi
                  </button>
                </div>
                <div className="h-48 overflow-y-auto border border-[#1e4a55]/60 bg-[#050d14] p-3 font-mono text-[12px]">
                  {(agentChats[activeAgentId] ?? []).map((m, i) => (
                    <p key={`${m.at}-${i}`} className="mt-2 text-[#cfe8e2]">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#6fb8ac]">
                        {m.role === "user" ? "You" : "Agent"} ·{" "}
                      </span>
                      {m.content}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendAgent();
                    }}
                    className="min-w-[220px] flex-1 border border-[#1e4a55] bg-[#050d14] px-3 py-2 font-mono text-[12px]"
                    placeholder='e.g. background check on Tamsin Holt'
                    maxLength={400}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={sendAgent}
                    className="border border-[#3d9e90] bg-[#12363a] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : null}

            {panel === "log" ? (
              <div className="border border-[#1e4a55]/50 bg-[#07141c] p-3 font-mono text-[12px] leading-relaxed">
                {caseLog.length === 0 ? (
                  <p className="text-[#7f9e98]">
                    Case log empty — review dossiers, inspect scenes, run checks,
                    or pin board strings.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {caseLog.map((e, i) => (
                      <li key={`${e.at}-${i}`} className="text-[#cfe8e2]">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#5ec4b6]">
                          {e.kind}
                        </span>{" "}
                        {e.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {panel === "accuse" ? (
              <div className="space-y-3">
                <p className="font-mono text-[12px] text-[#9bb8b2] normal-case tracking-normal">
                  Accuse only when the board and clues support it. Wrong
                  accusations increment your counter; the case stays open.
                </p>
                <select
                  value={accuseId}
                  onChange={(e) => setAccuseId(e.target.value)}
                  className="w-full max-w-md border border-[#1e4a55] bg-[#050d14] px-3 py-2 font-mono text-[12px]"
                >
                  {suspects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {accuseMsg ? (
                  <p className="font-mono text-[12px] text-amber">{accuseMsg}</p>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={accuse}
                  className="border border-[#b33a3a] bg-[#3a1515] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#f0d0d0]"
                >
                  Make accusation
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="border-t border-[#1e4a55]/50 bg-[#050d14] lg:border-l lg:border-t-0">
          <p className="border-b border-[#1e4a55]/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5ec4b6]">
            Live console
          </p>
          <div className="h-64 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-[#9dcea6] md:h-[28rem]">
            {consoleLines.length === 0 ? (
              <p className="text-[#5c7a74]">awaiting activity_</p>
            ) : (
              consoleLines.map((line, i) => (
                <p key={`${i}-${line.slice(0, 12)}`} className="mt-1">
                  <span className="text-[#3d9e90]">›</span> {line}
                </p>
              ))
            )}
          </div>
          <p className="border-t border-[#1e4a55]/40 px-3 py-2 font-mono text-[10px] text-[#5c7a74]">
            Weapon: {caseData.weaponLabel}
          </p>
        </aside>
      </div>
    </section>
  );
}
