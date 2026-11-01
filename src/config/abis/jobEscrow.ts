export const jobEscrowAbi = [
  {
    type: "function",
    name: "createJob",
    stateMutability: "nonpayable",
    inputs: [
      { name: "description", type: "string" },
      { name: "budget", type: "uint256" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    type: "function",
    name: "bid",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "message", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptBid",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "bidIndex", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submitWork",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliverable", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reject",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelJob",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getJob",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "poster", type: "address" },
          { name: "description", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "acceptedBidder", type: "address" },
          { name: "deliverable", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "acceptedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getBids",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "bidder", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "message", type: "string" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "jobCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "INPROGRESS_TIMEOUT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "JobCreated",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "poster", type: "address", indexed: true },
      { name: "description", type: "string", indexed: false },
      { name: "budget", type: "uint256", indexed: false },
      { name: "createdAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BidPlaced",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "bidIndex", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "message", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BidAccepted",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "acceptedBidder", type: "address", indexed: true },
      { name: "bidIndex", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WorkSubmitted",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "deliverable", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "JobApproved",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "JobRejected",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "poster", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "JobCancelled",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "poster", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export type EscrowJobStatus = 0 | 1 | 2 | 3 | 4 | 5;

export const JOB_STATUS_LABEL: Record<EscrowJobStatus, string> = {
  0: "Open",
  1: "In Progress",
  2: "Submitted",
  3: "Completed",
  4: "Rejected",
  5: "Cancelled",
};

export const JOB_STATUS_COLOR: Record<EscrowJobStatus, string> = {
  0: "text-emerald-600 bg-emerald-50",
  1: "text-blue-600 bg-blue-50",
  2: "text-amber-600 bg-amber-50",
  3: "text-slate-600 bg-slate-100",
  4: "text-red-600 bg-red-50",
  5: "text-slate-500 bg-slate-100",
};
