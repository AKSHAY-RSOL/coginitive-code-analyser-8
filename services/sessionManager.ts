
import { Session, Pattern, AppState } from '../types';

const STORAGE_KEY = 'cognitive_mirror_data_v1';

const generateId = (): string => {
  // Safe ID generation that works in non-secure contexts
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if crypto fails (e.g. non-secure context)
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const loadState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    
    // Ensure user field exists
    if (!parsed.user) {
        parsed.user = null;
    } else {
        // Migration: Convert single apiKey to apiKeys array
        // Check if apiKey exists (old format) and apiKeys does not (new format)
        if ('apiKey' in parsed.user && !parsed.user.apiKeys) {
            parsed.user.apiKeys = [parsed.user.apiKey];
            delete parsed.user.apiKey;
        }
    }

    // Migration: Ensure stats exist on old sessions
    if (parsed.sessions) {
      parsed.sessions = parsed.sessions.map((s: any) => ({
        ...s,
        title: s.title || s.problemStatement || "Untitled Session", // Backfill title
        mode: s.mode || 'practice',
        toolUsage: s.toolUsage || {
          logicValidationCount: 0,
          hintCount: 0,
          pseudoCodeRevealCount: 0,
          fullSolutionRevealCount: 0
        }
      }));
    }
    
    return {
        ...parsed,
        customReferences: parsed.customReferences || [] // Initialize custom references
    };
  }
  return {
    sessions: [],
    activeSessionId: null,
    globalPatterns: [],
    user: null,
    customReferences: []
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const createSession = (
  title: string,
  problemStatement: string, 
  language: string = 'cpp',
  mode: 'practice' | 'exam' = 'practice'
): Session => {
  return {
    id: generateId(),
    startTime: Date.now(),
    title,
    problemStatement,
    language,
    mode,
    snapshots: [{ timestamp: 0, code: '' }],
    isExcluded: false,
    analysis: null,
    toolUsage: {
      logicValidationCount: 0,
      hintCount: 0,
      pseudoCodeRevealCount: 0,
      fullSolutionRevealCount: 0
    }
  };
};

export const updatePatterns = (currentPatterns: Pattern[], newPatterns: Pattern[]): Pattern[] => {
  const updated = [...currentPatterns];
  
  newPatterns.forEach(newP => {
    const existingIndex = updated.findIndex(p => p.name === newP.name);
    if (existingIndex >= 0) {
      updated[existingIndex].frequency += 1;
      updated[existingIndex].examples.push(...newP.examples);
    } else {
      updated.push({ ...newP, frequency: 1 });
    }
  });

  return updated;
};
