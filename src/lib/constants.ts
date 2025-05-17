// Known GitHub usernames for PLDG contributors
export const GITHUB_CONTRIBUTORS = [
  'tesol2y090',
  'MattWong-ca',
  'vipulnayyar',
  'HarshS1611',
  'Paschal533',
  'pyropy',
  'akhileshthite',
  'virajbhartiya',
  'zhouyuxuan97',
  'seetadev',
  'nijoe1',
  'acul71',
  'avirajkhare00',
  'RegisGraptin',
  'kamuik16',
  'vking45',
  'temi0x',
  'adielliot37',
  'lordshashank',
  'silent_cipher',
  'caruso33',
  'Abhay-2811',
  'akaladarshi',
  'parth-gr',
  'Prabhat1308',
  'mystical-prog',
  'kazzmir',
  'tabcat',
  '07Vaishnavi-Singh',
  'gitsrc',
  'StephCurry07',
  'debuggingfuture',
] as const;

// Comprehensive mapping of all known variations of contributor names
export const CONTRIBUTOR_ALIASES: Record<string, string> = {
  // GitHub username variations
  'silent-cipher': 'silent_cipher',
  silent_cipher: 'silent_cipher',
  'matt-wong': 'MattWong-ca',
  mattwong: 'MattWong-ca',
  'viraj-bhartiya': 'virajbhartiya',
  virajb: 'virajbhartiya',

  // Airtable name variations to GitHub usernames
  'matt wong': 'MattWong-ca',
  'matthew wong': 'MattWong-ca',
  'viraj bhartiya': 'virajbhartiya',
  'viraj b': 'virajbhartiya',
  'abhay upadhyay': 'Abhay-2811',
  'abhay u': 'Abhay-2811',
  'nick lionis': 'nijoe1',
  'nicholas lionis': 'nijoe1',
  'nikolaos lionis': 'nijoe1',

  // Add more mappings as needed
};

// Project board configuration
export const PROJECT_BOARD = {
  owner: 'kt-wawro',
  number: 7,
  name: 'PLDG Project Board',
  url: 'https://github.com/users/kt-wawro/projects/7/views/1',
  validStatuses: ['Todo', 'In Progress', 'Done', 'Blocked'] as const,
} as const;

// Validation thresholds
export const VALIDATION_CONFIG = {
  // Maximum allowed difference between self-reported and actual GitHub issues
  maxIssueDifference: 2,

  // Time window for considering contributions (in days)
  contributionWindow: 30,

  // Minimum required project board items for active status
  minProjectBoardItems: 1,

  // Status weights for contribution scoring
  statusWeights: {
    Done: 1.0,
    'In Progress': 0.5,
    Todo: 0.25,
    Blocked: 0.1,
  },
} as const;

// Helper functions for name normalization
export function normalizeContributorName(name: string): string {
  const normalized = name.toLowerCase().trim();
  return CONTRIBUTOR_ALIASES[normalized] || name;
}

// Validation helper
export function validateContribution(
  githubUsername: string,
  airtableReported: number,
  projectBoardCount: number
): {
  isValid: boolean;
  discrepancy?: string;
} {
  const diff = Math.abs(airtableReported - projectBoardCount);

  if (diff > VALIDATION_CONFIG.maxIssueDifference) {
    return {
      isValid: false,
      discrepancy: `Reported ${airtableReported} issues but found ${projectBoardCount} on project board`,
    };
  }

  return { isValid: true };
}

// Type guard for valid GitHub usernames
export function isValidGitHubUsername(
  username: string
): username is (typeof GITHUB_CONTRIBUTORS)[number] {
  return GITHUB_CONTRIBUTORS.includes(
    username as (typeof GITHUB_CONTRIBUTORS)[number]
  );
}

// Add this constant
export const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

// Add this to constants.ts
export const COLUMN_STATUS = {
  'In Progress': 'In Progress',
  'In Review': 'In Progress',
  Done: 'Done',
  Backlog: 'Todo',
  Triage: 'Todo',
} as const;
