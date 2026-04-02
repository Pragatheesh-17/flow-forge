"use client";

import { useState } from "react";

type Attempt = {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  input: any;
  output: any;
  error: string | null;
};

type NodeRunCardProps = {
  nodeId: string;
  nodeType: string;
  derivedStatus: "SUCCESS" | "FAILED" | "RETRIED" | "PAUSED" | "RUNNING";
  retryCount: number;
  durationMs: number | null;
  attempts: Attempt[];
  loopIteration?: number | null;
  isErrorPath?: boolean;
};

function statusColor(status: NodeRunCardProps["derivedStatus"]) {
  switch (status) {
    case "SUCCESS":
      return "#16a34a";
    case "FAILED":
      return "#dc2626";
    case "RETRIED":
      return "#d97706";
    case "PAUSED":
      return "#ca8a04";
    case "RUNNING":
    default:
      return "#2563eb";
  }
}

function formatDuration(durationMs: number | null) {
  if (durationMs == null) return "-";
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function JsonBlock({ value }: { value: any }) {
  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: 12,
        color: "#e5e7eb",
      }}
    >
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

export default function NodeRunCard(props: NodeRunCardProps) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #2a2a2a",
        borderRadius: 10,
        padding: 12,
        background: "#111",
        marginLeft: props.loopIteration != null ? 24 : 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600 }}>
            {props.nodeType} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({props.nodeId})</span>
          </div>
          {props.loopIteration != null ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Loop iteration #{props.loopIteration}</div>
          ) : null}
          {props.isErrorPath ? (
            <div style={{ fontSize: 12, color: "#f87171" }}>Error path</div>
          ) : null}
        </div>
        <div style={{ textAlign: "right", minWidth: 170 }}>
          <div style={{ color: statusColor(props.derivedStatus), fontWeight: 700 }}>
            {props.derivedStatus}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Duration: {formatDuration(props.durationMs)}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Retries: {props.retryCount}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => setShowInput((v) => !v)}>{showInput ? "Hide Input" : "Show Input"}</button>
        <button onClick={() => setShowOutput((v) => !v)}>{showOutput ? "Hide Output" : "Show Output"}</button>
        {props.attempts.length > 1 ? (
          <button onClick={() => setShowAttempts((v) => !v)}>
            {showAttempts ? "Hide Attempts" : `Show Attempts (${props.attempts.length})`}
          </button>
        ) : null}
      </div>

      {showInput ? (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#0b0b0b" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>Input</div>
          <JsonBlock value={props.attempts[0]?.input} />
        </div>
      ) : null}

      {showOutput ? (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#0b0b0b" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>Output</div>
          <JsonBlock value={props.attempts[props.attempts.length - 1]?.output} />
          {props.derivedStatus === "FAILED" ? (
            <div style={{ marginTop: 8, color: "#f87171", fontSize: 12 }}>
              Error: {props.attempts[props.attempts.length - 1]?.error ?? "Unknown error"}
            </div>
          ) : null}
        </div>
      ) : null}

      {showAttempts ? (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#0b0b0b" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>Attempts</div>
          <div style={{ display: "grid", gap: 6 }}>
            {props.attempts.map((attempt, idx) => (
              <div
                key={attempt.id}
                style={{
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: 8,
                  fontSize: 12,
                  color: "#d1d5db",
                }}
              >
                <div>Attempt #{idx + 1}</div>
                <div>Status: {attempt.status}</div>
                <div>Started: {attempt.started_at ?? attempt.created_at ?? "-"}</div>
                <div>Completed: {attempt.completed_at ?? "-"}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
