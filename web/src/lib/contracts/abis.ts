export const erc20Abi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const bountyFactoryAbi = [
  {
    name: "createBounty",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "string" },
      { name: "reward", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "escrow", type: "address" }],
  },
  {
    name: "createRally",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "string" },
      { name: "targetReward", type: "uint256" },
      { name: "creatorSeed", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "escrow", type: "address" }],
  },
  {
    name: "contributeToRally",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "string" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "escrowByBountyId",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "bountyId", type: "string" }],
    outputs: [{ type: "address" }],
  },
  {
    anonymous: false,
    name: "BountyCreated",
    type: "event",
    inputs: [
      { indexed: true, name: "bountyId", type: "string" },
      { indexed: true, name: "escrow", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "reward", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint256" },
    ],
  },
  {
    anonymous: false,
    name: "RallyCreated",
    type: "event",
    inputs: [
      { indexed: true, name: "bountyId", type: "string" },
      { indexed: true, name: "escrow", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "targetReward", type: "uint256" },
      { indexed: false, name: "creatorSeed", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint256" },
    ],
  },
] as const;

export const bountyEscrowAbi = [
  {
    name: "approveAndPay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_hunter", type: "address" }],
    outputs: [],
  },
  {
    name: "markDisputed",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "submit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_hunter", type: "address" }],
    outputs: [],
  },
  {
    name: "contribute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "creator",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "fundedAmount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "isRally",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "status",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;
