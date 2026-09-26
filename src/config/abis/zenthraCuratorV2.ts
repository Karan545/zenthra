export const zenthraCuratorV2Abi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "identityRegistry_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "usdc_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "feeRecipient_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "protocolFeeBps_",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "featuredPricePerDay_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "optionalStakeAmount_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "disputeTimeout_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minTaskAmount_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxConcurrentTasksPerBuyer_",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "taskAcceptTimeout_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "initialOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_CAPABILITIES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FEE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "acceptTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimPayment",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "completeTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "delistAgent",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disputeTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disputeTimeout",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "endorseAgent",
    "inputs": [
      {
        "name": "endorserAgentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "targetAgentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "featureAgent",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "featured",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "featuredPricePerDay",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeRecipient",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAgent",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "listing",
        "type": "tuple",
        "internalType": "struct ZenthraCuratorV2.AgentListing",
        "components": [
          {
            "name": "agentId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "x402Endpoint",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "capabilities",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "pricePerTask",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "listedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "featuredUntil",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "isActive",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "isFeaturedByOwner",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "bondAmount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAgentStats",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "stats",
        "type": "tuple",
        "internalType": "struct ZenthraCuratorV2.AgentStats",
        "components": [
          {
            "name": "tasksCompleted",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "tasksDisputed",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "tasksCancelled",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "tasksResolved",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "totalEarned",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalVolume",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAgents",
    "inputs": [
      {
        "name": "agentIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": [
      {
        "name": "results",
        "type": "tuple[]",
        "internalType": "struct ZenthraCuratorV2.AgentListing[]",
        "components": [
          {
            "name": "agentId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "x402Endpoint",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "capabilities",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "pricePerTask",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "listedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "featuredUntil",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "isActive",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "isFeaturedByOwner",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "bondAmount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAllListedAgents",
    "inputs": [],
    "outputs": [
      {
        "name": "agentIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEndorsementCount",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "task",
        "type": "tuple",
        "internalType": "struct ZenthraCuratorV2.Task",
        "components": [
          {
            "name": "agentId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "buyer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "agent",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ZenthraCuratorV2.TaskStatus"
          },
          {
            "name": "createdAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasEndorsed",
    "inputs": [
      {
        "name": "endorser",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "identityRegistry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC721"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isFeatured",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isListed",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "listAgent",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "x402Endpoint",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "capabilities",
        "type": "string[]",
        "internalType": "string[]"
      },
      {
        "name": "pricePerTask",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "bond",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "listedCount",
    "inputs": [],
    "outputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxConcurrentTasksPerBuyer",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "minTaskAmount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "optionalStakeAmount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "payForFeatured",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "numDays_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingWithdrawals",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "protocolFeeBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "reclaimExpiredTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "requestTask",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rescueTokens",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveDispute",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "payBuyer",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setDisputeTimeout",
    "inputs": [
      {
        "name": "newTimeout",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setFeaturedPricePerDay",
    "inputs": [
      {
        "name": "price",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setFeeRecipient",
    "inputs": [
      {
        "name": "addr",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMaxConcurrentTasksPerBuyer",
    "inputs": [
      {
        "name": "max",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMinTaskAmount",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOptionalStakeAmount",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setProtocolFeeBps",
    "inputs": [
      {
        "name": "newBps",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTaskAcceptTimeout",
    "inputs": [
      {
        "name": "newTimeout",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settleExpiredDispute",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "syncListingOwner",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "taskAcceptTimeout",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalEscrow",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalOptionalStakes",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalPendingWithdrawals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateListing",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "x402Endpoint",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "capabilities",
        "type": "string[]",
        "internalType": "string[]"
      },
      {
        "name": "pricePerTask",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AgentDelisted",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "bondReturned",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AgentEndorsed",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "endorser",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AgentFeatured",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "featured",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AgentFeaturedPaid",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "numDays",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "featuredUntil",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AgentListed",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "x402Endpoint",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "pricePerTask",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "bondAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "listedAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AgentUpdated",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "x402Endpoint",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "pricePerTask",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CapabilitiesUpdated",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "capabilities",
        "type": "string[]",
        "indexed": false,
        "internalType": "string[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeAutoResolved",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amountRefunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeResolved",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "payBuyer",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "amountPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "slashed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeTimeoutUpdated",
    "inputs": [
      {
        "name": "old",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newTimeout",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeaturedPriceUpdated",
    "inputs": [
      {
        "name": "oldPrice",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newPrice",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeeRecipientUpdated",
    "inputs": [
      {
        "name": "oldRecipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newRecipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ListingOwnerSynced",
    "inputs": [
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "oldOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MaxConcurrentTasksUpdated",
    "inputs": [
      {
        "name": "old",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "newMax",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MinTaskAmountUpdated",
    "inputs": [
      {
        "name": "old",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OptionalStakeUpdated",
    "inputs": [
      {
        "name": "oldAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PaymentClaimed",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProtocolFeeUpdated",
    "inputs": [
      {
        "name": "oldBps",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newBps",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskAcceptTimeoutUpdated",
    "inputs": [
      {
        "name": "old",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newTimeout",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskAccepted",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskCancelled",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amountRefunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskCompleted",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amountPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskDisputed",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "disputedBy",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskRequested",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "agent",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "createdAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TokensRescued",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AcceptWindowExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AcceptWindowNotExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyEndorsed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyListed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CannotCancelAcceptedTask",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CannotSelfEndorse",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DisputeBeforeAccept",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DisputeNotExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyCapabilities",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EndorserHasNoCompletedTasks",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EndorserNotListed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FeaturedPriceNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "HasOpenTasks",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBond",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidFeeBps",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAgentOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotListed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotListingOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotTaskAgent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotTaskBuyer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotTaskParty",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RescueWouldBreakSolvency",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TaskAlreadyAccepted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TaskAmountTooLow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TaskNotAccepted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TaskNotDisputed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TaskNotOpen",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyCapabilities",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyOpenTasks",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroDays",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroStake",
    "inputs": []
  }
] as const;

