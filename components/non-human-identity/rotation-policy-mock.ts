export type RotationPolicyStatus = "Active" | "Draft" | "Paused";

export type RotationPolicyListRow = {
  id: string;
  name: string;
  description: string;
  nhiTypes: string[];
  frequencyLabel: string;
  identityCount: number;
  lastRotated: string | null;
  status: RotationPolicyStatus;
};

export const MOCK_ROTATION_POLICIES: RotationPolicyListRow[] = [
  {
    id: "rp-001",
    name: "Production service accounts — quarterly",
    description: "Rotate vault-backed service principals in production subscriptions.",
    nhiTypes: ["Service Account", "API Key"],
    frequencyLabel: "Every 90 days",
    identityCount: 142,
    lastRotated: "2026-03-12T14:30:00Z",
    status: "Active",
  },
  {
    id: "rp-002",
    name: "AI agent credentials — JIT preferred",
    description: "Short-lived tokens for autonomous agents with anomaly-based triggers.",
    nhiTypes: ["AI Agent"],
    frequencyLabel: "Event-triggered + 30 days",
    identityCount: 56,
    lastRotated: "2026-04-01T09:00:00Z",
    status: "Active",
  },
  {
    id: "rp-003",
    name: "Certificate lifecycle (internal PKI)",
    description: "Certs issued by internal CA; max age and pre-expiry rotation.",
    nhiTypes: ["Certificate"],
    frequencyLabel: "365 days",
    identityCount: 21,
    lastRotated: "2025-11-20T11:00:00Z",
    status: "Paused",
  },
  {
    id: "rp-004",
    name: "Workload identities — dev/test",
    description: "Lower environments: semi-automatic with owner approval.",
    nhiTypes: ["Workload/Container", "Service Account"],
    frequencyLabel: "Every 180 days",
    identityCount: 89,
    lastRotated: null,
    status: "Draft",
  },
  {
    id: "rp-005",
    name: "High-risk API keys",
    description: "Keys tagged high risk or internet-exposed; faster rotation.",
    nhiTypes: ["API Key", "Custom"],
    frequencyLabel: "Every 45 days",
    identityCount: 34,
    lastRotated: "2026-04-10T16:45:00Z",
    status: "Active",
  },
];
