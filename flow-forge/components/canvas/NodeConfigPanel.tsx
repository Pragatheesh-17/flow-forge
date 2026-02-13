"use client";

import { useState, useEffect, useRef } from "react";
import { NODE_TYPES } from "@/lib/constants/nodeTypes";
import { CONDITIONAL_OPERATORS, validateConditionalConfig } from "@/lib/worflow/conditional";

type NodeConfigPanelProps = {
  node: any | null;
  latestRunAt: string | null;
  upstreamOutputs: { nodeId: string; output: any }[];
  onClose: () => void;
  onSave: (updatedNode: any) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
};

export default function NodeConfigPanel({
  node,
  latestRunAt,
  upstreamOutputs,
  onClose,
  onSave,
  onDelete,
}: NodeConfigPanelProps) {
  const [type, setType] = useState<string>("");
  const [config, setConfig] = useState<string>("{}");
  const [saving, setSaving] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailAction, setGmailAction] = useState<"READ" | "SEND">("READ");
  const [gmailReadQuery, setGmailReadQuery] = useState("in:inbox is:unread");
  const [gmailReadMaxResults, setGmailReadMaxResults] = useState<number>(5);
  const [gmailSendTo, setGmailSendTo] = useState("");
  const [gmailSendSubject, setGmailSendSubject] = useState("");
  const [gmailSendBody, setGmailSendBody] = useState("");
  const lastConfigFromForm = useRef<string | null>(null);
  const lastSlackConfigFromForm = useRef<string | null>(null);
  const lastSlackTriggerConfigFromForm = useRef<string | null>(null);
  const lastConditionalConfigFromForm = useRef<string | null>(null);
  const [slackConnections, setSlackConnections] = useState<
    { team_id: string; team_name: string | null }[]
  >([]);
  const [slackTeamId, setSlackTeamId] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [slackText, setSlackText] = useState("Hello from FlowForge");
  const [slackTriggerTeamId, setSlackTriggerTeamId] = useState("");
  const [slackTriggerChannel, setSlackTriggerChannel] = useState("");
  const [slackTriggerEvents, setSlackTriggerEvents] = useState("message,app_mention");
  const [conditionalLeftValue, setConditionalLeftValue] = useState("$.status");
  const [conditionalOperator, setConditionalOperator] = useState(
    CONDITIONAL_OPERATORS[0]
  );
  const [conditionalRightValue, setConditionalRightValue] = useState("ok");

  useEffect(() => {
    if (node) {
      setType(node.type);
      setConfig(JSON.stringify(node.config ?? {}, null, 2));
    }
  }, [node]);

  useEffect(() => {
    if (type !== "GMAIL") return;
    if (lastConfigFromForm.current === config) return;
    try {
      const parsed = JSON.parse(config || "{}");
      const action = parsed.action === "SEND" ? "SEND" : "READ";
      setGmailAction(action);
      setGmailReadQuery(parsed.query ?? "in:inbox is:unread");
      setGmailReadMaxResults(
        typeof parsed.max_results === "number" ? parsed.max_results : 5
      );
      setGmailSendTo(parsed.to ?? "");
      setGmailSendSubject(parsed.subject ?? "");
      setGmailSendBody(parsed.body ?? "");
    } catch {
      // ignore invalid JSON; keep current gmail form state
    }
  }, [type, config]);

  useEffect(() => {
    if (type !== "SLACK") return;
    if (lastSlackConfigFromForm.current === config) return;
    try {
      const parsed = JSON.parse(config || "{}");
      setSlackTeamId(parsed.team_id ?? "");
      setSlackChannel(parsed.channel ?? "");
      setSlackText(parsed.text ?? "Hello from FlowForge");
    } catch {
      // ignore invalid JSON
    }
  }, [type, config]);

  useEffect(() => {
    if (type !== "SLACK_TRIGGER") return;
    if (lastSlackTriggerConfigFromForm.current === config) return;
    try {
      const parsed = JSON.parse(config || "{}");
      setSlackTriggerTeamId(parsed.team_id ?? "");
      setSlackTriggerChannel(parsed.channel ?? "");
      if (Array.isArray(parsed.event_types)) {
        setSlackTriggerEvents(parsed.event_types.join(","));
      } else {
        setSlackTriggerEvents("message,app_mention");
      }
    } catch {
      // ignore invalid JSON
    }
  }, [type, config]);

  useEffect(() => {
    if (type !== "CONDITIONAL") return;
    if (lastConditionalConfigFromForm.current === config) return;
    try {
      const parsed = JSON.parse(config || "{}");
      setConditionalLeftValue(String(parsed.left_value ?? "$.status"));
      setConditionalOperator(
        CONDITIONAL_OPERATORS.includes(parsed.operator)
          ? parsed.operator
          : CONDITIONAL_OPERATORS[0]
      );
      setConditionalRightValue(String(parsed.right_value ?? "ok"));
    } catch {
      // ignore invalid JSON
    }
  }, [type, config]);

  useEffect(() => {
    if (type !== "GMAIL") return;
    let cancelled = false;
    setGmailConnected(null);
    fetch("/api/gmail/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setGmailConnected(!!data?.connected);
      })
      .catch(() => {
        if (cancelled) return;
        setGmailConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    if (type !== "SLACK" && type !== "SLACK_TRIGGER") return;
    let cancelled = false;
    fetch("/api/slack/connections")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.connections) ? data.connections : [];
        setSlackConnections(list);
        if (type === "SLACK" && !slackTeamId && list.length > 0) {
          setSlackTeamId(list[0].team_id);
        }
        if (type === "SLACK_TRIGGER" && !slackTriggerTeamId && list.length > 0) {
          setSlackTriggerTeamId(list[0].team_id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSlackConnections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [type, slackTeamId, slackTriggerTeamId]);

  useEffect(() => {
    if (type !== "GMAIL") return;
    const nextConfig =
      gmailAction === "READ"
        ? {
            action: "READ",
            query: gmailReadQuery,
            max_results: gmailReadMaxResults,
          }
        : {
            action: "SEND",
            to: gmailSendTo,
            subject: gmailSendSubject,
            body: gmailSendBody,
          };
    const next = JSON.stringify(nextConfig, null, 2);
    lastConfigFromForm.current = next;
    setConfig(next);
  }, [
    type,
    gmailAction,
    gmailReadQuery,
    gmailReadMaxResults,
    gmailSendTo,
    gmailSendSubject,
    gmailSendBody,
  ]);

  useEffect(() => {
    if (type !== "SLACK") return;
    const nextConfig = {
      action: "SEND",
      team_id: slackTeamId,
      channel: slackChannel,
      text: slackText,
    };
    const next = JSON.stringify(nextConfig, null, 2);
    lastSlackConfigFromForm.current = next;
    setConfig(next);
  }, [type, slackTeamId, slackChannel, slackText]);

  useEffect(() => {
    if (type !== "SLACK_TRIGGER") return;
    const eventTypes = slackTriggerEvents
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const nextConfig = {
      team_id: slackTriggerTeamId,
      event_types: eventTypes,
      channel: slackTriggerChannel,
    };
    const next = JSON.stringify(nextConfig, null, 2);
    lastSlackTriggerConfigFromForm.current = next;
    setConfig(next);
  }, [type, slackTriggerTeamId, slackTriggerChannel, slackTriggerEvents]);

  useEffect(() => {
    if (type !== "CONDITIONAL") return;
    const nextConfig = {
      left_value: conditionalLeftValue,
      operator: conditionalOperator,
      right_value: conditionalRightValue,
    };
    const next = JSON.stringify(nextConfig, null, 2);
    lastConditionalConfigFromForm.current = next;
    setConfig(next);
  }, [type, conditionalLeftValue, conditionalOperator, conditionalRightValue]);

  if (!node) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedConfig = JSON.parse(config || "{}");
      if (type === "CONDITIONAL") {
        validateConditionalConfig(parsedConfig);
      }
      await onSave({
        ...node,
        type,
        config: parsedConfig,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Invalid JSON or save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!node) return;
    const ok = confirm("Delete this node and its edges?");
    if (!ok) return;
    await onDelete(node.id);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        width: 360,
        height: "100vh",
        background: "#111",
        color: "#fff",
        padding: 16,
        borderLeft: "1px solid #333",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <h3>Node Settings</h3>

      <label>Node Type</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      >
        {NODE_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {type === "GMAIL" && (
        <div style={{ marginBottom: 12 }}>
          <label>Gmail Connection</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={() =>
                (window.location.href = `/api/gmail/authorize?returnTo=${encodeURIComponent(
                  window.location.pathname
                )}`)
              }
            >
              Connect Gmail
            </button>
            <span style={{ fontSize: 12, color: "#bbb", alignSelf: "center" }}>
              {gmailConnected === null
                ? "Checking..."
                : gmailConnected
                ? "Connected"
                : "Not connected"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 6 }}>
            This opens Google OAuth. Complete the consent flow, then return here.
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Action</label>
            <select
              value={gmailAction}
              onChange={(e) => setGmailAction(e.target.value as "READ" | "SEND")}
              style={{ width: "100%", marginTop: 6 }}
            >
              <option value="READ">READ</option>
              <option value="SEND">SEND</option>
            </select>
          </div>

          {gmailAction === "READ" ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <label>Query</label>
              <input
                value={gmailReadQuery}
                onChange={(e) => setGmailReadQuery(e.target.value)}
                placeholder="in:inbox is:unread"
                style={{ width: "100%" }}
              />
              <label>Max Results</label>
              <input
                type="number"
                min={1}
                max={50}
                value={gmailReadMaxResults}
                onChange={(e) => setGmailReadMaxResults(Number(e.target.value || 5))}
                style={{ width: "100%" }}
              />
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <label>To</label>
              <input
                value={gmailSendTo}
                onChange={(e) => setGmailSendTo(e.target.value)}
                placeholder="someone@example.com"
                style={{ width: "100%" }}
              />
              <label>Subject</label>
              <input
                value={gmailSendSubject}
                onChange={(e) => setGmailSendSubject(e.target.value)}
                placeholder="Subject"
                style={{ width: "100%" }}
              />
              <label>Body</label>
              <textarea
                value={gmailSendBody}
                onChange={(e) => setGmailSendBody(e.target.value)}
                rows={4}
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>
      )}

      {type === "SLACK" && (
        <div style={{ marginBottom: 12 }}>
          <label>Slack Workspace</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <select
              value={slackTeamId}
              onChange={(e) => setSlackTeamId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select workspace</option>
              {slackConnections.map((c) => (
                <option key={c.team_id} value={c.team_id}>
                  {c.team_name || c.team_id}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                (window.location.href = `/api/slack/authorize?returnTo=${encodeURIComponent(
                  window.location.pathname
                )}`)
              }
            >
              Connect
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <label>Channel ID</label>
            <input
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              placeholder="C0123456789"
              style={{ width: "100%" }}
            />
            <label>Message</label>
            <textarea
              value={slackText}
              onChange={(e) => setSlackText(e.target.value)}
              rows={4}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}

      {type === "SLACK_TRIGGER" && (
        <div style={{ marginBottom: 12 }}>
          <label>Slack Workspace</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <select
              value={slackTriggerTeamId}
              onChange={(e) => setSlackTriggerTeamId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select workspace</option>
              {slackConnections.map((c) => (
                <option key={c.team_id} value={c.team_id}>
                  {c.team_name || c.team_id}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                (window.location.href = `/api/slack/authorize?returnTo=${encodeURIComponent(
                  window.location.pathname
                )}`)
              }
            >
              Connect
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <label>Event Types (comma separated)</label>
            <input
              value={slackTriggerEvents}
              onChange={(e) => setSlackTriggerEvents(e.target.value)}
              placeholder="message,app_mention"
              style={{ width: "100%" }}
            />
            <label>Channel ID (optional)</label>
            <input
              value={slackTriggerChannel}
              onChange={(e) => setSlackTriggerChannel(e.target.value)}
              placeholder="C0123456789"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}

      {type === "CONDITIONAL" && (
        <div style={{ marginBottom: 12 }}>
          <label>Left Value</label>
          <input
            value={conditionalLeftValue}
            onChange={(e) => setConditionalLeftValue(e.target.value)}
            placeholder="$.status"
            style={{ width: "100%", marginTop: 6 }}
          />
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>
            Use JSON path with `$.` to read from previous node output.
          </div>

          <label style={{ marginTop: 12, display: "block" }}>Operator</label>
          <select
            value={conditionalOperator}
            onChange={(e) => setConditionalOperator(e.target.value as any)}
            style={{ width: "100%", marginTop: 6 }}
          >
            {CONDITIONAL_OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>

          <label style={{ marginTop: 12, display: "block" }}>Right Value</label>
          <input
            value={conditionalRightValue}
            onChange={(e) => setConditionalRightValue(e.target.value)}
            placeholder="ok"
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>
      )}

      <label>Config (JSON)</label>
      <textarea
        value={config}
        onChange={(e) => setConfig(e.target.value)}
        rows={10}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <h4 style={{ marginTop: 16 }}>Upstream Outputs</h4>
      {upstreamOutputs.length === 0 ? (
        <div style={{ fontSize: 12, color: "#bbb", marginBottom: 12 }}>
          No upstream outputs for this node.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upstreamOutputs.map((entry) => (
            <div
              key={entry.nodeId}
              style={{
                background: "#0b0b0b",
                border: "1px solid #333",
                borderRadius: 6,
                padding: 8,
              }}
            >
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                From node: {entry.nodeId}
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 12,
                  margin: 0,
                  color: "#e6e6e6",
                }}
              >
                {JSON.stringify(entry.output ?? null, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleDelete} style={{ marginLeft: "auto" }}>
          Delete
        </button>
      </div>
    </div>
  );
}
