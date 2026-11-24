/**
 * AI Automotive Assistant — Type Definitions
 * Strict schemas for modification proposals, provider config, and validation.
 */

export type AICategory =
  | "paint"
  | "material"
  | "wheel"
  | "spoiler"
  | "bumper"
  | "exhaust"
  | "lighting"
  | "interior"
  | "trim"
  | "window"
  | "general";

export type ProposalStatus =
  | "pending"
  | "previewed"
  | "applied"
  | "rejected"
  | "cancelled";

export type ModificationProposal = {
  id: string;
  name: string;
  category: AICategory;
  targetComponent: string | null;
  proposedChange: string;
  requiredAsset: string | null;
  materialSettings: MaterialProposal | null;
  compatibility: "compatible" | "incompatible" | "unknown";
  compatibilityReason: string;
  confidence: number;
  explanation: string;
  autoExecutable: boolean;
  status: ProposalStatus;
  source: "ai" | "preset";
  timestamp: number;
};

export type MaterialProposal = {
  color?: string;
  finish?: "gloss" | "matte" | "metallic";
  metallic?: number;
  roughness?: number;
  clearCoat?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transmission?: number;
  opacity?: number;
};

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatRequest = {
  prompt: string;
  context: {
    currentCustomization: Record<string, unknown>;
    availableComponents: string[];
    availableParts: string[];
    vehicleType: string;
    isImported: boolean;
  };
  history: AIMessage[];
  options?: {
    imageGeneration?: boolean;
    knowledgeOnly?: boolean;
  };
};

export type AIChatResponse = {
  message: string;
  proposals: ModificationProposal[];
  knowledge: string | null;
  imageConcept: string | null;
  confidence: number;
  requiresConfirmation: boolean;
};

export type AIDesignConcept = {
  id: string;
  prompt: string;
  imageUrl: string | null;
  referenceOnly: boolean;
  generatedAt: number;
};

export type AIConversation = {
  id: string;
  messages: Array<{ role: "user" | "assistant"; content: string; proposals?: ModificationProposal[] }>;
  createdAt: number;
  updatedAt: number;
};

export type AIPresetPackage = {
  id: string;
  name: string;
  description: string;
  category: "racing" | "luxury" | "street" | "stealth" | "cyberpunk" | "executive" | "offroad";
  proposals: Omit<ModificationProposal, "id" | "status" | "timestamp" | "source">[];
  previewImage: string | null;
};

export type AIFeatureFlags = {
  enabled: boolean;
  imageGeneration: boolean;
  knowledgeBase: boolean;
  autoProposals: boolean;
};

export type AIOperationState = "idle" | "loading" | "success" | "error" | "offline";

export type AIServiceStatus = {
  state: AIOperationState;
  provider: string;
  hasApiKey: boolean;
  lastError: string | null;
  lastRequestAt: number | null;
  requestCount: number;
};