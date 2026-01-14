
import { GoogleGenAI, Type } from "@google/genai";
import { Session, Pattern, AnalysisReport, Mistake } from "../types";

// Schema definitions for structured output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "A brief summary of the coding session and overall performance." },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.NUMBER, description: "Relative timestamp in milliseconds" },
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['plan', 'correction', 'success', 'failure'] }
        },
        required: ['time', 'description', 'type']
      }
    },
    mistakes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Conceptual', 'Logical', 'Structural', 'Implementation', 'Performance', 'Boundary'] },
          description: { type: Type.STRING },
          rootCause: { type: Type.STRING, description: "The deep cognitive reason for this mistake." },
          detectedAt: { type: Type.NUMBER },
          fixSuggestion: { type: Type.STRING },
          lineNumber: { type: Type.NUMBER, description: "The 1-based line number in the FINAL code snapshot where this mistake is located. Return 0 if not applicable to a specific line." }
        },
        required: ['id', 'type', 'description', 'rootCause', 'detectedAt', 'fixSuggestion']
      }
    },
    detectedPatterns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING, description: "A concise name for the cognitive pattern." },
          description: { type: Type.STRING },
          examples: { type: Type.ARRAY, items: { type: Type.STRING } },
          severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
        },
        required: ['id', 'name', 'description', 'examples', 'severity']
      }
    }
  },
  required: ['summary', 'timeline', 'mistakes', 'detectedPatterns']
};

export const analyzeSession = async (
  session: Session, 
  historicalPatterns: Pattern[],
  apiKeys: string[]
): Promise<AnalysisReport> => {
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error("No API Keys provided. Please update your settings.");
  }

  let lastError: any = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    
    try {
        const ai = new GoogleGenAI({ apiKey });

        const sampledSnapshots = session.snapshots.filter((_, idx) => idx === 0 || idx % 5 === 0 || idx === session.snapshots.length - 1);
        const finalCode = session.snapshots[session.snapshots.length - 1]?.code || "";
        
        const historyContext = historicalPatterns.length > 0 
          ? `Here are known cognitive patterns for this user from previous sessions: ${JSON.stringify(historicalPatterns.map(p => ({ name: p.name, desc: p.description })))}`
          : "No historical patterns available.";

        const prompt = `
          You are a Cognitive Mirror for a developer. Analyze this coding session.
          
          Problem Statement: ${session.problemStatement}
          Language: ${session.language}
          
          Final Code State:
          ${finalCode}
          
          Code Evolution (Timestamped Snapshots in ms):
          ${JSON.stringify(sampledSnapshots.map(s => ({ t: s.timestamp, len: s.code.length, snippet: s.code })))}

          Context:
          ${historyContext}

          Task:
          1. Reconstruct the timeline of thought (Initial plan, failures, corrections).
          2. Identify specific mistakes (Logical, Conceptual, etc.).
          3. IMPORTANT: For every mistake, identify the Line Number in the "Final Code State" provided above.
          4. Determine the ROOT CAUSE for each mistake (Why did they think this way?).
          5. Detect PATTERNS. If a mistake matches a historical pattern, explicitly link it. If a new recurring behavior is observed, define it.

          Return the analysis in strict JSON format matching the schema.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema
          }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        
        return JSON.parse(text) as AnalysisReport;

    } catch (error: any) {
        lastError = error;
        console.warn(`Attempt failed with Key ${i + 1}/${apiKeys.length}:`, error.message);
        
        const isQuotaError = error.message && (
            error.message.includes("429") || 
            error.message.includes("403") ||
            error.message.includes("Resource has been exhausted") ||
            error.message.includes("Quota exceeded")
        );

        if (isQuotaError) {
            if (i === apiKeys.length - 1) {
                throw new Error("All API Keys exhausted. Please wait a moment or add more keys.");
            }
            continue;
        }

        if (error.message && error.message.includes("API_KEY_INVALID")) {
             continue;
        }
        
        throw error;
    }
  }

  throw lastError || new Error("Analysis failed due to unknown error");
};

export const chatAboutMistake = async (
  mistake: Mistake,
  fullCode: string,
  chatHistory: { role: 'user' | 'model', text: string }[],
  apiKeys: string[]
): Promise<string> => {
  if (!apiKeys || apiKeys.length === 0) throw new Error("No API keys.");

  const apiKey = apiKeys[0];
  const ai = new GoogleGenAI({ apiKey });

  const context = `
    You are a helpful senior engineer mentor. 
    The user is asking about a specific mistake flagged in their code.
    
    The Mistake:
    Type: ${mistake.type}
    Description: ${mistake.description}
    Root Cause: ${mistake.rootCause}
    Location: Line ${mistake.lineNumber}

    The Full Code:
    ${fullCode}

    Your goal is to be helpful, educational, and specific. 
    If the user is "arguing", listen to their point. If they are right (it was a false positive), concede. If they are wrong, politely explain why the mistake is valid.
    If the user wants "Help" or "Explanation", provide it clearly.

    Output Rules:
    1. Use Standard Markdown formatting (Bold, Code blocks, Lists).
    2. Do NOT use LaTeX or Math delimiters (like $ or \\( \\)). Use plain text or code blocks for math formulas.
    3. Keep code snippets inside \`\`\` language blocks.
  `;

  const contents = [
    { role: 'user', parts: [{ text: context + "\n\nStart of conversation." }] },
    ...chatHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents
  });

  return response.text || "I couldn't generate a response.";
};

// --- Real-time Assistance Tools ---

const callGeminiSimple = async (prompt: string, apiKeys: string[]): Promise<string> => {
  if (!apiKeys || apiKeys.length === 0) throw new Error("No API keys.");
  const ai = new GoogleGenAI({ apiKey: apiKeys[0] }); // For interactive features, we just use first key for speed/simplicity
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text || "No response generated.";
};

export const validateUserLogic = async (
  problem: string,
  userLogic: string,
  apiKeys: string[]
): Promise<string> => {
  const prompt = `
    Problem: ${problem}
    User's Proposed Logic/Approach: ${userLogic}

    Task: Evaluate the user's logic.
    Constraint 1: Start with "YES", "NO", or "PARTIALLY".
    Constraint 2: If "YES", confirm it's a good approach.
    Constraint 3: If "NO" or "PARTIALLY", explain *what* is wrong in the thinking, but DO NOT provide the correct solution or code. Just point out the flaw in the reasoning.
    Constraint 4: Keep it short (max 3 sentences).
    Constraint 5: Use Markdown. No LaTeX.
  `;
  return callGeminiSimple(prompt, apiKeys);
};

export const getHint = async (
  problem: string,
  currentCode: string,
  apiKeys: string[]
): Promise<string> => {
  const prompt = `
    Problem: ${problem}
    Current Code:
    ${currentCode}

    Task: Provide a small, nudge-like hint.
    Constraint 1: Do NOT give the code.
    Constraint 2: Do NOT give the full logic.
    Constraint 3: Just give a tiny push in the right direction regarding the next logical step or a bug in the current code.
    Constraint 4: Max 2 sentences.
    Constraint 5: Use Markdown. No LaTeX.
  `;
  return callGeminiSimple(prompt, apiKeys);
};

export const getPseudocode = async (
  problem: string,
  apiKeys: string[]
): Promise<string> => {
  const prompt = `
    Problem: ${problem}
    
    Task: Provide the complete logic and pseudo-code.
    Constraint 1: Do NOT write actual compilable code (no C++, Python, JS syntax).
    Constraint 2: Use structured English or standard algorithm pseudocode.
    Constraint 3: Explain the time/space complexity briefly.
    Constraint 4: Use Markdown (lists, code blocks). No LaTeX.
  `;
  return callGeminiSimple(prompt, apiKeys);
};

export const revealSolution = async (
  problem: string,
  language: string,
  apiKeys: string[]
): Promise<string> => {
  const prompt = `
    Problem: ${problem}
    Language: ${language}
    
    Task: Provide the full, correct, optimal solution code.
    Constraint: Use Markdown code blocks.
  `;
  return callGeminiSimple(prompt, apiKeys);
};

export const generateSessionTitle = async (
  problemStatement: string,
  apiKeys: string[]
): Promise<string> => {
  const prompt = `
    Input Text: "${problemStatement}"

    Task: Generate a concise, standard name for this coding problem.
    Rules:
    1. If it looks like a LeetCode/Codeforces problem (e.g., "LeetCode 206 Reverse Linked List" or a URL), extract the standard name like "LC 206: Reverse Linked List".
    2. If it is a generic description, summarize it in 3-5 words (e.g., "Matrix Multiplication").
    3. Return ONLY the string of the name. No quotes.
  `;
  return callGeminiSimple(prompt, apiKeys);
};

export const explainReference = async (
  title: string,
  code: string,
  language: string,
  apiKeys: string[]
): Promise<string> => {
  const prompt = `
    Topic: ${title}
    Language: ${language}
    Code Snippet:
    ${code}

    Task: Explain this concept/algorithm clearly.
    1. How does it work?
    2. When should I use it? (Briefly mention Time/Space Complexity if applicable).
    3. Are there common pitfalls?
    
    Output Rules:
    1. Use Standard Markdown (Bold, Lists, Code Blocks).
    2. NO LaTeX ($ or \\(...\\)). Use plain text like "O(n log n)" or "sum = a + b".
    3. Keep it concise but educational.
  `;
  return callGeminiSimple(prompt, apiKeys);
};
