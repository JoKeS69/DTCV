"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  addBoardNode,
  addCustomBoardNode,
  addNoteBoardNode,
  createBoardConnection,
  moveBoardNode,
  removeBoardConnection,
  removeBoardNode,
} from "@/app/actions/board";
import type {
  BoardCatalogItem,
  BoardConnectionDTO,
  BoardNodeDTO,
} from "@/lib/board/types";
import { BOARD_H, BOARD_W, NODE_H, NODE_W, nodeKey } from "@/lib/board/types";
import type { BoardNodeType } from "@/lib/generated/prisma/client";

type Props = {
  investigationId: string;
  locked: boolean;
  catalog: BoardCatalogItem[];
  initialNodes: BoardNodeDTO[];
  initialConnections: BoardConnectionDTO[];
};

type LinkPick = { type: BoardNodeType; refId: string } | null;

export function InvestigationBoard({
  investigationId,
  locked,
  catalog,
  initialNodes,
  initialConnections,
}: Props) {
  const router = useRouter();
  const [nodes, setNodes] = useState(initialNodes);
  const [connections, setConnections] = useState(initialConnections);
  const [message, setMessage] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<LinkPick>(null);
  const [mode, setMode] = useState<"move" | "link">("move");
  const [pending, startTransition] = useTransition();
  const [customLabel, setCustomLabel] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const dragRef = useRef<{
    nodeId: string;
    ox: number;
    oy: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const onBoard = useMemo(() => {
    const set = new Set(nodes.map((n) => nodeKey(n.type, n.refId)));
    return set;
  }, [nodes]);

  const nodeByRef = useMemo(() => {
    const map = new Map<string, BoardNodeDTO>();
    for (const n of nodes) map.set(nodeKey(n.type, n.refId), n);
    return map;
  }, [nodes]);

  const refresh = useCallback(() => router.refresh(), [router]);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2200);
  }

  function addCatalogItem(item: BoardCatalogItem) {
    if (locked) return;
    if (onBoard.has(nodeKey(item.type, item.refId))) {
      flash("Already on board");
      return;
    }
    startTransition(async () => {
      const result = await addBoardNode({
        investigationId,
        type: item.type,
        refId: item.refId,
        label: item.label,
      });
      if (!result.ok) {
        flash(result.error);
        return;
      }
      refresh();
    });
  }

  function onPointerDown(
    e: React.PointerEvent,
    node: BoardNodeDTO,
  ) {
    if (locked) return;
    if (mode === "link") {
      e.preventDefault();
      if (!linkFrom) {
        setLinkFrom({ type: node.type, refId: node.refId });
        flash(`Link from: ${node.label}`);
        return;
      }
      if (linkFrom.type === node.type && linkFrom.refId === node.refId) {
        setLinkFrom(null);
        return;
      }
      startTransition(async () => {
        const result = await createBoardConnection({
          investigationId,
          fromType: linkFrom.type,
          fromId: linkFrom.refId,
          toType: node.type,
          toId: node.refId,
          label: "linked",
        });
        setLinkFrom(null);
        if (!result.ok) {
          flash(result.error);
          return;
        }
        flash(
          result.count != null && result.count >= 5
            ? "Linked · Board Builder unlocked"
            : "Linked",
        );
        refresh();
      });
      return;
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      nodeId: node.id,
      ox: node.x,
      oy: node.y,
      startX: e.clientX,
      startY: e.clientY,
      x: node.x,
      y: node.y,
    };
  }

  function onPointerMove(e: React.PointerEvent, nodeId: string) {
    if (!dragRef.current || dragRef.current.nodeId !== nodeId) return;
    const scale = boardScale();
    const dx = (e.clientX - dragRef.current.startX) / scale;
    const dy = (e.clientY - dragRef.current.startY) / scale;
    const x = clamp(dragRef.current.ox + dx, 0, BOARD_W - NODE_W);
    const y = clamp(dragRef.current.oy + dy, 0, BOARD_H - NODE_H);
    dragRef.current.x = x;
    dragRef.current.y = y;
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    );
  }

  function boardScale() {
    const el = boardRef.current;
    if (!el) return 1;
    return el.clientWidth / BOARD_W;
  }

  function onPointerUp(e: React.PointerEvent, node: BoardNodeDTO) {
    if (!dragRef.current || dragRef.current.nodeId !== node.id) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    const { x, y } = dragRef.current;
    dragRef.current = null;
    if (locked) return;
    startTransition(async () => {
      const result = await moveBoardNode({
        investigationId,
        nodeId: node.id,
        x,
        y,
      });
      if (!result.ok) flash(result.error);
    });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Catalog / controls */}
      <aside className="space-y-3 border border-border bg-surface/50 p-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          <ModeButton
            active={mode === "move"}
            onClick={() => {
              setMode("move");
              setLinkFrom(null);
            }}
            label="Move"
          />
          <ModeButton
            active={mode === "link"}
            onClick={() => setMode("link")}
            label="Link"
            disabled={locked}
          />
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          {locked
            ? "Board locked after theory submit"
            : mode === "link"
              ? "Tap two nodes to connect"
              : "Drag nodes · positions auto-save"}
        </p>
        {message ? (
          <p className="font-mono text-[10px] text-online">{message}</p>
        ) : null}

        {!locked ? (
          <>
            <CatalogGroup
              title="Suspects"
              items={catalog.filter((c) => c.type === "SUSPECT")}
              onBoard={onBoard}
              onAdd={addCatalogItem}
              pending={pending}
            />
            <CatalogGroup
              title="Evidence"
              items={catalog.filter((c) => c.type === "EVIDENCE")}
              onBoard={onBoard}
              onAdd={addCatalogItem}
              pending={pending}
            />
            <CatalogGroup
              title="Events"
              items={catalog.filter((c) => c.type === "EVENT")}
              onBoard={onBoard}
              onAdd={addCatalogItem}
              pending={pending}
            />
            <CatalogGroup
              title="Witnesses"
              items={catalog.filter((c) => c.type === "WITNESS_STATEMENT")}
              onBoard={onBoard}
              onAdd={addCatalogItem}
              pending={pending}
            />
            <CatalogGroup
              title="Notes"
              items={catalog.filter((c) => c.type === "NOTE")}
              onBoard={onBoard}
              onAdd={addCatalogItem}
              pending={pending}
            />

            <form
              className="space-y-2 border-t border-border pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await addNoteBoardNode({
                    investigationId,
                    body: noteBody,
                  });
                  if (!result.ok) {
                    flash(result.error);
                    return;
                  }
                  setNoteBody("");
                  refresh();
                });
              }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                New note node
              </p>
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={2}
                className="w-full border border-border bg-bg px-2 py-1 font-mono text-[11px] text-text"
                placeholder="Pin a note…"
              />
              <button
                type="submit"
                disabled={pending || !noteBody.trim()}
                className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
              >
                Add note
              </button>
            </form>

            <form
              className="space-y-2 border-t border-border pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await addCustomBoardNode({
                    investigationId,
                    label: customLabel,
                  });
                  if (!result.ok) {
                    flash(result.error);
                    return;
                  }
                  setCustomLabel("");
                  refresh();
                });
              }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                Custom pin
              </p>
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="w-full border border-border bg-bg px-2 py-1 font-mono text-[11px] text-text"
                placeholder="Label…"
                maxLength={80}
              />
              <button
                type="submit"
                disabled={pending || !customLabel.trim()}
                className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
              >
                Add custom
              </button>
            </form>
          </>
        ) : null}

        <ConnectionsList
          connections={connections}
          nodeByRef={nodeByRef}
          locked={locked}
          pending={pending}
          onRemove={(id) => {
            startTransition(async () => {
              const result = await removeBoardConnection({
                investigationId,
                connectionId: id,
              });
              if (!result.ok) {
                flash(result.error);
                return;
              }
              setConnections((prev) => prev.filter((c) => c.id !== id));
              refresh();
            });
          }}
        />
      </aside>

      {/* Board canvas */}
      <div className="border border-border bg-bg">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
            &gt; Investigation board · {nodes.length} nodes · {connections.length}{" "}
            links
          </p>
          <p className="hidden font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim sm:block">
            Desktop drag · Mobile: scroll + touch drag
          </p>
        </div>
        <div className="overflow-auto">
          <div
            ref={boardRef}
            className="relative origin-top-left"
            style={{
              width: "100%",
              aspectRatio: `${BOARD_W} / ${BOARD_H}`,
              minWidth: 320,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
              preserveAspectRatio="none"
            >
              {connections.map((c) => {
                const from = nodeByRef.get(nodeKey(c.fromType, c.fromId));
                const to = nodeByRef.get(nodeKey(c.toType, c.toId));
                if (!from || !to) return null;
                const x1 = from.x + NODE_W / 2;
                const y1 = from.y + NODE_H / 2;
                const x2 = to.x + NODE_W / 2;
                const y2 = to.y + NODE_H / 2;
                return (
                  <g key={c.id}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="var(--cta)"
                      strokeWidth={2}
                      strokeOpacity={0.7}
                    />
                    <circle cx={x1} cy={y1} r={3} fill="var(--cta)" />
                    <circle cx={x2} cy={y2} r={3} fill="var(--cta)" />
                  </g>
                );
              })}
            </svg>

            {nodes.map((node) => {
              const selected =
                linkFrom?.type === node.type && linkFrom.refId === node.refId;
              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => onPointerDown(e, node)}
                  onPointerMove={(e) => onPointerMove(e, node.id)}
                  onPointerUp={(e) => onPointerUp(e, node)}
                  className={[
                    "absolute touch-none select-none border px-2 py-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]",
                    typeStyle(node.type),
                    selected ? "ring-1 ring-cta" : "",
                    mode === "link" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
                  ].join(" ")}
                  style={{
                    left: `${(node.x / BOARD_W) * 100}%`,
                    top: `${(node.y / BOARD_H) * 100}%`,
                    width: `${(NODE_W / BOARD_W) * 100}%`,
                    minHeight: `${(NODE_H / BOARD_H) * 100}%`,
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-text-dim">
                      {node.type.replaceAll("_", " ")}
                    </p>
                    {!locked ? (
                      <button
                        type="button"
                        className="font-mono text-[9px] text-danger"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          startTransition(async () => {
                            const result = await removeBoardNode({
                              investigationId,
                              nodeId: node.id,
                            });
                            if (!result.ok) {
                              flash(result.error);
                              return;
                            }
                            setNodes((prev) =>
                              prev.filter((n) => n.id !== node.id),
                            );
                            setConnections((prev) =>
                              prev.filter(
                                (c) =>
                                  !(
                                    (c.fromType === node.type &&
                                      c.fromId === node.refId) ||
                                    (c.toType === node.type &&
                                      c.toId === node.refId)
                                  ),
                              ),
                            );
                            refresh();
                          });
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase leading-tight tracking-[0.06em] text-text">
                    {node.label}
                  </p>
                </div>
              );
            })}

            {nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-sm text-center font-mono text-[11px] text-text-dim">
                  Add suspects, evidence, events, or notes from the catalog to
                  pin them on the board.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile connect helper */}
        <div className="border-t border-border p-3 lg:hidden">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            Mobile tip: use Link mode, then tap two cards. Scroll the board to
            reach pins.
          </p>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
        active
          ? "border-cta/60 bg-cta/15 text-text"
          : "border-border text-text-muted",
        disabled ? "opacity-40" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CatalogGroup({
  title,
  items,
  onBoard,
  onAdd,
  pending,
}: {
  title: string;
  items: BoardCatalogItem[];
  onBoard: Set<string>;
  onAdd: (item: BoardCatalogItem) => void;
  pending: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const placed = onBoard.has(nodeKey(item.type, item.refId));
          return (
            <li key={nodeKey(item.type, item.refId)}>
              <button
                type="button"
                disabled={pending || placed}
                onClick={() => onAdd(item)}
                className="w-full border border-border/80 px-2 py-1 text-left font-mono text-[10px] text-text hover:border-border-strong disabled:opacity-40"
              >
                {placed ? "✓ " : "+ "}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConnectionsList({
  connections,
  nodeByRef,
  locked,
  pending,
  onRemove,
}: {
  connections: BoardConnectionDTO[];
  nodeByRef: Map<string, BoardNodeDTO>;
  locked: boolean;
  pending: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="border-t border-border pt-3">
      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
        Connections ({connections.length})
      </p>
      {connections.length === 0 ? (
        <p className="font-mono text-[10px] text-text-dim">None yet.</p>
      ) : (
        <ul className="space-y-1">
          {connections.map((c) => {
            const from = nodeByRef.get(nodeKey(c.fromType, c.fromId));
            const to = nodeByRef.get(nodeKey(c.toType, c.toId));
            return (
              <li
                key={c.id}
                className="flex items-start justify-between gap-2 border border-border/70 px-2 py-1 font-mono text-[9px] text-text-muted"
              >
                <span>
                  {(from?.label ?? c.fromId).slice(0, 24)} →{" "}
                  {(to?.label ?? c.toId).slice(0, 24)}
                </span>
                {!locked ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="text-danger"
                    onClick={() => onRemove(c.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function typeStyle(type: BoardNodeType): string {
  switch (type) {
    case "SUSPECT":
      return "border-amber/50 bg-amber/10";
    case "EVIDENCE":
      return "border-online/40 bg-online/5";
    case "EVENT":
      return "border-cta/40 bg-cta/10";
    case "WITNESS_STATEMENT":
      return "border-border-strong bg-surface-elevated";
    case "NOTE":
      return "border-border bg-surface";
    default:
      return "border-border bg-surface/80";
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
