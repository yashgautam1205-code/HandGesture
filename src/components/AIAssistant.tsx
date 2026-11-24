import { useEffect, useState } from "react";
import { sendAIChat, getAvailablePresets, applyPresetProposals } from "../ai/service";
import type { ModificationProposal, AIChatResponse } from "../ai/types";
import type { ProposalComponent } from "../ai/designChange";

type Props = {
  onApplyProposal: (p: ModificationProposal) => string | null;
  onPreviewProposal: (p: ModificationProposal) => string | null;
  onCancelPreview: () => void;
  currentCustomization: Record<string, unknown>;
  availableComponents: ProposalComponent[];
  availableParts: string[];
  vehicleType: string;
  isImported: boolean;
};

type ProviderStatus = {
  provider: "openai" | "anthropic" | "none";
  enabled: boolean;
  model: string | null;
};

// Icons
const Icons = {
  sparkle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  xCircle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  palette: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="18" cy="11" r="2.5" />
      <circle cx="6.5" cy="11" r="2.5" />
      <circle cx="11" cy="17.5" r="2.5" />
      <path d="M21 21l-4.34-4.34a2.17 2.17 0 0 0-3 0L3 21" />
    </svg>
  ),
  target: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  cog: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  message: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  brain: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-3 3c0 1.5 1 2.5 1.5 3.5A4 4 0 1 1 9 12.5c0 1.5 1 2.5 1.5 3.5a3 3 0 1 0 3-3c0-1.5-1-2.5-1.5-3.5A4 4 0 1 1 15 11.5c0-1.5-1-2.5-1.5-3.5z" />
      <path d="M9 12.5c0 1.5 1 2.5 1.5 3.5" />
      <path d="M15 11.5c0-1.5-1-2.5-1.5-3.5" />
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

export default function AIAssistant(props: Props) {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    provider: "none",
    enabled: false,
    model: null,
  });
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [response, setResponse] = useState<AIChatResponse | null>(null);
  const [pending, setPending] = useState<ModificationProposal[]>([]);
  const [previewedProposalId, setPreviewedProposalId] = useState<string | null>(null);
  const [proposalErrors, setProposalErrors] = useState<Record<string, string>>({});
  const presets = getAvailablePresets();

  useEffect(() => {
    const bridge = window.gestureDrive;
    if (!bridge) return;
    let active = true;
    void bridge.getAIStatus().then((status) => {
      if (active) setProviderStatus(status);
    }).catch((error: unknown) => {
      if (active) {
        setProviderStatusError(error instanceof Error ? error.message : "Unable to read AI provider status.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    if (!input.trim()) return;
    props.onCancelPreview();
    setPending([]);
    setPreviewedProposalId(null);
    setResponse(null);
    setProposalErrors({});
    setLoading(true);
    setError(null);
    setOffline(false);
    const res = await sendAIChat({
      prompt: input.trim(),
      context: {
        currentCustomization: props.currentCustomization,
        availableComponents: props.availableComponents.map((component) => component.id),
        availableParts: props.availableParts,
        vehicleType: props.vehicleType,
        isImported: props.isImported,
      },
      history: [],
    });
    setLoading(false);
    if (res.offline) setOffline(true);
    if (res.error) setError(res.error);
    if (res.response) {
      setResponse(res.response);
      setPending(res.response.proposals.map((p) => ({ ...p, status: "pending" })));
    }
  }

  function applyPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    props.onCancelPreview();
    setPreviewedProposalId(null);
    setProposalErrors({});
    const proposals = applyPresetProposals(preset);
    setPending(proposals);
    setResponse({
      message: `Preset "${preset.name}" ready for preview.`,
      proposals,
      knowledge: null,
      imageConcept: null,
      confidence: 0.9,
      requiresConfirmation: true,
    });
  }

  function previewProposal(p: ModificationProposal) {
    const reason = props.onPreviewProposal(p);
    if (reason) {
      setProposalErrors((current) => ({ ...current, [p.id]: reason }));
      return;
    }
    setProposalErrors({});
    setPending((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.id === p.id ? "previewed" : item.status === "previewed" ? "pending" : item.status,
      })),
    );
    setPreviewedProposalId(p.id);
  }

  function confirmProposal(p: ModificationProposal) {
    const reason = props.onApplyProposal(p);
    if (reason) {
      setProposalErrors((current) => ({ ...current, [p.id]: reason }));
      return;
    }
    setPreviewedProposalId(null);
    setProposalErrors({});
    setPending((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "applied" } : x)));
  }

  function cancelProposal(p: ModificationProposal) {
    if (previewedProposalId === p.id) {
      props.onCancelPreview();
      setPreviewedProposalId(null);
    }
    setProposalErrors((current) => {
      const { [p.id]: _removed, ...remaining } = current;
      return remaining;
    });
    setPending((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "cancelled" } : x)));
  }

  function cancelAll() {
    props.onCancelPreview();
    setPreviewedProposalId(null);
    setProposalErrors({});
    setPending((prev) =>
      prev.map((x) =>
        x.status === "pending" || x.status === "previewed" ? { ...x, status: "cancelled" } : x,
      ),
    );
    setResponse(null);
  }

  return (
    <section className="ai-assistant" aria-labelledby="ai-heading">
      <div className="section-header-row">
        <span className="section-number">AI</span>
        <h3 id="ai-heading" className="section-title">ASSISTANT</h3>
        <span className="section-help tooltip" data-tooltip="AI-powered design copilot" aria-label="Help">{Icons.brain}</span>
      </div>

      {/* AI Status Bar */}
      <div className="ai-status-bar">
        <div className={`ai-status-indicator ${providerStatus.enabled ? "online" : "offline"}`}>
          {providerStatus.enabled ? Icons.check : Icons.alert}
          <span>
            {providerStatus.enabled
              ? `${providerStatus.provider.toUpperCase()} VIA ELECTRON`
              : "OFFLINE — PROVIDER NOT CONFIGURED"}
          </span>
        </div>
      </div>

      {providerStatusError && (
        <div className="ai-error" role="alert">
          {Icons.alert} {providerStatusError}
        </div>
      )}

      {!providerStatus.enabled && (
        <div className="ai-offline-notice">
          {Icons.info} Set OPENAI_API_KEY or ANTHROPIC_API_KEY in the Electron process environment to enable AI. Styling presets remain available offline.
        </div>
      )}

      {/* Input Area */}
      <div className="ai-input-group">
        <div className="ai-input-wrapper">
          <input
            type="text"
            className="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Make it look like a racing car with carbon fiber accents"
            onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
            disabled={loading}
            aria-label="Natural language design request"
          />
          <button
            className="ai-submit-btn"
            onClick={() => void submit()}
            disabled={loading || !input.trim()}
            aria-label="Send request to AI"
          >
            {loading ? <span className="spinner" style={{width: 18, height: 18}} /> : Icons.send}
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ai-preset">Styling Presets</label>
          <select
            id="ai-preset"
            className="ai-preset-select"
            defaultValue=""
            onChange={(e) => { if (e.target.value) applyPreset(e.target.value); }}
            aria-label="Select AI styling preset"
          >
            <option value="">Select a preset...</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.description}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="ai-error" role="alert">
          {Icons.alert} {error}
        </div>
      )}

      {offline && (
        <div className="ai-offline-notice">
          {Icons.info} Offline mode: no AI provider configured.
        </div>
      )}

      {response && (
        <div className="ai-response" role="status" aria-live="polite">
          {Icons.message} {response.message}
        </div>
      )}

      {pending.length > 0 && (
        <div className="ai-proposals" role="list" aria-label="Pending proposals">
          {pending.map((p) => (
            <div
              key={p.id}
              className={`ai-proposal ${p.status}`}
              role="listitem"
              aria-label={`Proposal: ${p.name}, status: ${p.status}`}
            >
              <div className="ai-proposal-header">
                <span className="ai-proposal-category">{p.category.toUpperCase()}</span>
                <strong className="ai-proposal-title">{p.name}</strong>
                <span className={`ai-proposal-status ${p.status}`}>
                  {p.status === "previewed" ? "PREVIEWING" : p.status.toUpperCase()}
                </span>
              </div>
              <div className="ai-proposal-detail">
                {p.proposedChange}
                <div className={`ai-compatibility ${p.compatibility}`}>
                  AI assessment: {p.compatibility} — {p.compatibilityReason}
                </div>
                {p.materialSettings?.color && (
                  <>
                    <span style={{ display: "inline-block", marginTop: "var(--space-2)" }}>
                      <span
                        className="color-indicator"
                        style={{ background: p.materialSettings.color }}
                        aria-hidden="true"
                      />
                      Color: {p.materialSettings.color}
                    </span>
                  </>
                )}
                {p.materialSettings?.finish && (
                  <span style={{ display: "inline-block", marginTop: "var(--space-1)", marginLeft: "var(--space-2)" }}>
                    Finish: {p.materialSettings.finish}
                  </span>
                )}
                {p.materialSettings?.metallic !== undefined && (
                  <span style={{ display: "inline-block", marginTop: "var(--space-1)", marginLeft: "var(--space-2)" }}>
                    Metallic: {Math.round(p.materialSettings.metallic * 100)}%
                  </span>
                )}
                {p.targetComponent && (
                  <span style={{ display: "inline-block", marginTop: "var(--space-1)", marginLeft: "var(--space-2)" }}>
                    {Icons.target} Target: {p.targetComponent}
                  </span>
                )}
              </div>
              {proposalErrors[p.id] && (
                <div className="ai-error" role="alert">{Icons.alert} {proposalErrors[p.id]}</div>
              )}
              <div className="ai-proposal-actions">
                <button
                  className="ai-proposal-btn preview"
                  disabled={p.status !== "pending" || loading}
                  onClick={() => previewProposal(p)}
                  aria-label={`Preview ${p.name}`}
                >
                  {Icons.target} PREVIEW
                </button>
                <button
                  className="ai-proposal-btn apply"
                  disabled={p.status !== "previewed" || previewedProposalId !== p.id || loading}
                  onClick={() => confirmProposal(p)}
                  aria-label={`Apply ${p.name}`}
                >
                  {Icons.check} {p.status === "applied" ? "APPLIED" : "APPLY"}
                </button>
                <button
                  className="ai-proposal-btn cancel"
                  disabled={p.status !== "pending" && p.status !== "previewed"}
                  onClick={() => cancelProposal(p)}
                  aria-label={`Cancel ${p.name}`}
                >
                  {Icons.x} CANCEL
                </button>
              </div>
            </div>
          ))}
          <div className="ai-preview-note">
            Preview changes affect only the 3D view. Target availability is checked; fitment is not certified. APPLY commits one undoable change.
          </div>
          <button className="ai-cancel-all" onClick={cancelAll} aria-label="Cancel all proposals">
            {Icons.xCircle} CANCEL ALL PROPOSALS
          </button>
        </div>
      )}
    </section>
  );
}