
export type MistakeType = 
  | 'Conceptual' 
  | 'Logical' 
  | 'Structural' 
  | 'Implementation' 
  | 'Performance' 
  | 'Boundary';

export interface Snapshot {
  timestamp: number; // Relative to session start in ms
  code: string;
}

export interface Mistake {
  id: string;
  type: MistakeType;
  description: string;
  rootCause: string;
  detectedAt: number; // Relative timestamp
  fixSuggestion: string;
  lineNumber?: number; // 1-based line number in the final code
  status?: 'active' | 'fixed'; // Track if mistake is resolved
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  frequency: number; // How many sessions it appeared in
  examples: string[]; // Snippets or descriptions of past occurrences
  severity: 'low' | 'medium' | 'high';
}

export interface AnalysisReport {
  summary: string;
  timeline: { time: number; description: string; type: 'plan' | 'correction' | 'success' | 'failure' }[];
  mistakes: Mistake[];
  detectedPatterns: Pattern[]; // Patterns found in THIS session
}

export interface ToolUsage {
  logicValidationCount: number;
  hintCount: number;
  pseudoCodeRevealCount: number;
  fullSolutionRevealCount: number;
}

export interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  title: string; // User-defined or Auto-generated unique name
  problemStatement: string; // The raw text/URL provided
  snapshots: Snapshot[];
  isExcluded: boolean;
  analysis: AnalysisReport | null;
  language: string;
  mode: 'practice' | 'exam';
  toolUsage: ToolUsage;
}

export interface UserProfile {
  username: string;
  apiKeys: string[]; // Changed to array for cyclic usage
  password?: string; 
}

export interface ReferenceEntry {
  id: string;
  title: string;
  category: string;
  code: string;
  description: string;
  language: 'c' | 'cpp' | 'both';
  mode: 'lab' | 'casual' | 'both';
  isCustom?: boolean;
}

export interface AppState {
  sessions: Session[];
  activeSessionId: string | null;
  globalPatterns: Pattern[];
  user: UserProfile | null;
  customReferences: ReferenceEntry[];
}
