import { useEffect, useState, useMemo } from "react";
import { sendAIChat, getAvailablePresets, applyPresetProposals } from "../ai/service";
import type { ModificationProposal, AIChatResponse } from "../ai/types";
import type { VehicleComponent } from "../engine/components";
import type { ComponentMaterialOverride, Customization } from "../store/studio";
import type { ReplacementPart } from "../engine/parts";
import { generateVehicleContext } from "../ai/vehicleContext";

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type Props = {
  onApplyProposal: (p: ModificationProposal) => string | null;
  onPreviewProposal: (p: ModificationProposal) => string | null;
  onCancelPreview: () => void;
  vehicleComponents: VehicleComponent[];
  customization: Customization;
  componentMaterials: Record<string, ComponentMaterialOverride>;
  vehicleName: string;
  isImported: boolean;
  assetSource: string;
  assetVerification: "verified" | "unverified" | "not-available";
  catalogueVehicleId: string | null;
  replacementParts: ReplacementPart[];
};

type ProviderStatus = {
  provider: "openai" | "anthropic" | "none";
  enabled: boolean;
  model: string | null;
};

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
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
  mic: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  micOff: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.88M15 9a3 3 0 0 0-5.12-2.88M12 1a3 3 0 0 0-3 3v8" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
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
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const presets = getAvailablePresets();

  const vehicleContext = useMemo(() => {
    return generateVehicleContext(
      props.isImported ? ({} as any) : null,
      props.vehicleComponents,
      props.customization,
      props.componentMaterials,
      props.vehicleName,
      props.isImported,
      props.assetSource,
      props.assetVerification,
      props.catalogueVehicleId,
      props.replacementParts,
    );
  }, [
    props.vehicleComponents,
    props.customization,
    props.componentMaterials,
    props.vehicleName,
    props.isImported,
    props.assetSource,
    props.assetVerification,
    props.catalogueVehicleId,
    props.replacementParts,
  ]);

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

  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      setVoiceSupported(true);
    }
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
      context: vehicleContext,
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

  function startVoiceInput() {
    if (!voiceSupported || voiceActive) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceActive(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => {
      setVoiceActive(false);
    };
    recognition.onend = () => {
      setVoiceActive(false);
    };
    recognition.start();
  }

  return (
    <section className="ai-assistant" aria-labelledby="ai-heading">
      <div className="section-header-row">
        <span className="section-number">AI</span>
        <h3 id="ai-heading" className="section-title">ASSISTANT</h3>
        <span className="section-help tooltip" data-tooltip="AI-powered design copilot" aria-label="Help">{Icons.brain}</span>
      </div>

      {/* Vehicle Context Indicator */}
      <div className="ai-vehicle-context">
        <span className="context-label">VEHICLE:</span>
        <strong>{vehicleContext.vehicleName}</strong>
        <span className={`context-badge ${vehicleContext.isImported ? "imported" : "procedural"}`}>
          {vehicleContext.isImported ? "IMPORTED" : "PROCEDURAL"}
        </span>
        {vehicleContext.catalogueVehicleId && (
          <span className="context-badge catalogue" data-tooltip={vehicleContext.assetSource}>
            CATALOGUE: {vehicleContext.catalogueVehicleId}
          </span>
        )}
        {vehicleContext.assetVerification === "verified" && (
          <span className="context-badge verified" data-tooltip={vehicleContext.assetSource}>VERIFIED</span>
        )}
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
            placeholder="e.g. Make the body matte black with carbon fiber hood"
            onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
            disabled={loading || voiceActive}
            aria-label="Natural language design request"
          />
          {voiceSupported && (
            <button
              className={`ai-voice-btn ${voiceActive ? "active" : ""}`}
              onClick={startVoiceInput}
              disabled={loading}
              aria-label={voiceActive ? "Listening..." : "Voice input"}
              title={voiceActive ? "Listening..." : "Voice input (experimental)"}
            >
              {voiceActive ? Icons.micOff : Icons.mic}
            </button>
          )}
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

      {/* Component Recommendations */}
      {props.vehicleComponents.length > 0 && (
        <div className="ai-recommendations">
          <h4 className="recommendations-title">{Icons.target} SMART RECOMMENDATIONS</h4>
          <ComponentRecommendations
            components={props.vehicleComponents}
            customization={props.customization}
            componentMaterials={props.componentMaterials}
            selectedPart={""}
          />
        </div>
      )}
    </section>
  );
}

function ComponentRecommendations(props: {
  components: VehicleComponent[];
  customization: Customization;
  componentMaterials: Record<string, ComponentMaterialOverride>;
  selectedPart: string;
}) {
  const recommendations = useMemo(() => {
    const recs: Array<{ componentId: string; componentName: string; suggestion: string; reason: string }> = [];
    for (const component of props.components) {
      if (!component.editable || !component.customizable) continue;
      const currentMat = props.componentMaterials[component.id];
      const isBody = component.category === "body";
      const isWheel = component.category === "wheel" || component.id.startsWith("wheel-");
      const isLight = component.category === "headlight" || component.category === "tail-light";
      const isTrim = component.category === "rim" || component.category === "interior-trim";

      if (isBody && !currentMat) {
        recs.push({
          componentId: component.id,
          componentName: component.name,
          suggestion: "Try a premium metallic paint",
          reason: "Body shell has no custom material; metallic finishes enhance contours",
        });
      }
      if (isWheel && !currentMat) {
        recs.push({
          componentId: component.id,
          componentName: component.name,
          suggestion: "Dark wheels for contrast",
          reason: "Wheels use global wheel color; individual customization adds depth",
        });
      }
      if (isLight) {
        recs.push({
          componentId: component.id,
          componentName: component.name,
          suggestion: "Adjust emissive for custom lighting",
          reason: "Headlights/taillights support emissive color and intensity",
        });
      }
      if (isTrim) {
        recs.push({
          componentId: component.id,
          componentName: component.name,
          suggestion: "Chrome or carbon fiber accent",
          reason: "Trim pieces support metallic and custom finishes",
        });
      }
    }
    return recs.slice(0, 3);
  }, [props.components, props.customization, props.componentMaterials]);

  if (recommendations.length === 0) return null;

  return (
    <div className="recommendations-list">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="recommendation-item">
          <span className="rec-component">{rec.componentName}</span>
          <span className="rec-suggestion">{rec.suggestion}</span>
          <span className="rec-reason">{rec.reason}</span>
        </div>
      ))}
    </div>
  );
}