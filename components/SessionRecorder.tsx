
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
import { Session, ReferenceEntry } from '../types';
import { Button } from './ui/Button';
import { Square, Ban, Clock, Sparkles, MessageSquare, Lightbulb, FileCode, Lock, AlertTriangle, Book, Search, Plus, X, Copy, Check, GraduationCap, Skull } from 'lucide-react';
import { validateUserLogic, getHint, getPseudocode, revealSolution, explainReference } from '../services/geminiService';
import { STATIC_REFERENCES } from '../data/referenceSheet';

interface SessionRecorderProps {
  session: Session;
  onUpdate: (session: Session) => void;
  onEnd: () => void;
  apiKeys: string[];
  customReferences: ReferenceEntry[];
  onAddCustomReference: (entry: ReferenceEntry) => void;
}

export const SessionRecorder: React.FC<SessionRecorderProps> = ({ session, onUpdate, onEnd, apiKeys, customReferences, onAddCustomReference }) => {
  const [code, setCode] = useState(session.snapshots[session.snapshots.length - 1]?.code || '');
  const [isExcluded, setIsExcluded] = useState(session.isExcluded);
  const startTimeRef = useRef(session.startTime);
  const [elapsed, setElapsed] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  // AI Assistant State
  // Default to closed if in exam mode
  const [isSidebarOpen, setIsSidebarOpen] = useState((session.mode as string) !== 'exam');
  const [activeTab, setActiveTab] = useState<'logic' | 'hint' | 'solution'>('logic');
  const [logicInput, setLogicInput] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // Reveal State (Solution & Pseudocode)
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealTimer, setRevealTimer] = useState(5);
  const [canReveal, setCanReveal] = useState(false);
  const [revealType, setRevealType] = useState<'solution' | 'pseudocode' | null>(null);

  // Reference Sheet State
  const [showRefModal, setShowRefModal] = useState(false);
  const [refMode, setRefMode] = useState<'lab' | 'casual'>('lab');
  const [refSearch, setRefSearch] = useState('');
  const [showAddRefForm, setShowAddRefForm] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefDesc, setNewRefDesc] = useState('');
  const [newRefCode, setNewRefCode] = useState('');
  
  // Reference Explanation State
  const [expandedRefId, setExpandedRefId] = useState<string | null>(null);
  const [explanationData, setExplanationData] = useState<Record<string, string>>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  // Exam Mode Message State
  const [examToast, setExamToast] = useState<string | null>(null);

  const INDENT_SIZE = 3;
  const INDENT = ' '.repeat(INDENT_SIZE);

  // Timer for UI
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ensure sidebar is closed if exam mode is active (extra safety)
  useEffect(() => {
    if ((session.mode as string) === 'exam') {
        setIsSidebarOpen(false);
    }
  }, [session.mode]);

  // Reveal Timer Logic
  useEffect(() => {
    let interval: any;
    if (showRevealModal && revealTimer > 0) {
      interval = setInterval(() => {
        setRevealTimer(prev => prev - 1);
      }, 1000);
    } else if (revealTimer === 0) {
      setCanReveal(true);
    }
    return () => clearInterval(interval);
  }, [showRevealModal, revealTimer]);

  const updateSessionCode = (newCode: string) => {
    const now = Date.now();
    const relativeTime = now - startTimeRef.current;
    
    const updatedSession = {
      ...session,
      snapshots: [
        ...session.snapshots,
        { timestamp: relativeTime, code: newCode }
      ]
    };
    onUpdate(updatedSession);
  };

  const updateToolUsage = (tool: keyof typeof session.toolUsage) => {
      const updatedSession = {
          ...session,
          toolUsage: {
              ...session.toolUsage,
              [tool]: session.toolUsage[tool] + 1
          }
      };
      onUpdate(updatedSession);
  };

  const handleCopyCode = async () => {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    updateSessionCode(newCode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { selectionStart, selectionEnd, value } = e.currentTarget;

    // Tab for indentation (3 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, selectionStart) + INDENT + value.substring(selectionEnd);
      setCode(newValue);
      updateSessionCode(newValue);
      
      setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + INDENT_SIZE;
        }
      }, 0);
      return;
    }

    // Auto-closing pairs
    const pairs: Record<string, string> = {
      '(': ')',
      '{': '}',
      '[': ']',
      '"': '"',
      "'": "'"
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const closing = pairs[e.key];
      const newValue = value.substring(0, selectionStart) + e.key + closing + value.substring(selectionEnd);
      setCode(newValue);
      updateSessionCode(newValue);
      
      setTimeout(() => {
          if(textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 1;
          }
      }, 0);
      return;
    }

    // Handle 'Backspace' for pair deletion
    if (e.key === 'Backspace') {
       const charBefore = value.substring(selectionStart - 1, selectionStart);
       const charAfter = value.substring(selectionEnd, selectionEnd + 1);
       // Check if we are deleting an opening bracket that has a matching closing bracket immediately after
       if (pairs[charBefore] === charAfter) {
          e.preventDefault();
          const newValue = value.substring(0, selectionStart - 1) + value.substring(selectionEnd + 1);
          setCode(newValue);
          updateSessionCode(newValue);
          setTimeout(() => {
            if(textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart - 1;
            }
          }, 0);
          return;
       }
    }

    // Auto-indentation on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const linesBefore = value.substring(0, selectionStart).split('\n');
      const currentLine = linesBefore[linesBefore.length - 1];
      const match = currentLine.match(/^(\s*)/);
      let indent = match ? match[1] : '';

      const trimmedLine = currentLine.trim();
      
      // If last char was { or ( or [, increase indent
      if (trimmedLine.endsWith('{') || trimmedLine.endsWith('(') || trimmedLine.endsWith('[')) {
        indent += INDENT;
      }

      // Check if we are splitting braces {}
      const charAfter = value.substring(selectionEnd, selectionEnd + 1);
      const isInsideBraces = 
          (trimmedLine.endsWith('{') && charAfter === '}') ||
          (trimmedLine.endsWith('(') && charAfter === ')') ||
          (trimmedLine.endsWith('[') && charAfter === ']');

      let newValue;
      let cursorOffset;

      if (isInsideBraces) {
          // Special case for { <Enter> }
          // Indents the new line, and puts the closing brace on the line after with reduced indent
          const closingIndent = indent.substring(0, Math.max(0, indent.length - INDENT_SIZE));
          newValue = value.substring(0, selectionStart) + '\n' + indent + '\n' + closingIndent + value.substring(selectionEnd);
          cursorOffset = indent.length + 1; // +1 for the first newline
      } else {
          newValue = value.substring(0, selectionStart) + '\n' + indent + value.substring(selectionEnd);
          cursorOffset = indent.length + 1;
      }

      setCode(newValue);
      updateSessionCode(newValue);
      
      setTimeout(() => {
          if(textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + cursorOffset;
          }
      }, 0);
    }
  };

  const toggleExclusion = () => {
    const newVal = !isExcluded;
    setIsExcluded(newVal);
    onUpdate({ ...session, isExcluded: newVal });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Exam Mode Messages ---
  const triggerExamToast = (msg: string) => {
      setExamToast(msg);
      setTimeout(() => setExamToast(null), 4000);
  };

  const handleToggleTA = () => {
      if ((session.mode as string) === 'exam') {
          triggerExamToast("Our TAs are very savage and won't give hints in the lab. Think on your own! 🤡");
          return;
      }
      setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSetCasualMode = () => {
      if ((session.mode as string) === 'exam') {
          triggerExamToast("Do not try to cheat or copy code from OJ practice problems, I know what you do ;) 🕵️‍♂️");
          return;
      }
      setRefMode('casual');
  };

  // --- Reference Sheet Logic ---
  const handleAddRef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefTitle || !newRefCode) return;
    
    const newEntry: ReferenceEntry = {
        id: Date.now().toString(),
        title: newRefTitle,
        description: newRefDesc,
        code: newRefCode,
        category: 'Custom',
        language: 'both',
        mode: 'casual', // Custom entries usually for help/casual
        isCustom: true
    };
    
    onAddCustomReference(newEntry);
    setNewRefTitle('');
    setNewRefDesc('');
    setNewRefCode('');
    setShowAddRefForm(false);
  };
  
  const handleExplainRef = async (ref: ReferenceEntry) => {
      if (expandedRefId === ref.id) {
          setExpandedRefId(null); // Toggle off
          return;
      }
      
      setExpandedRefId(ref.id);
      
      if (explanationData[ref.id]) {
          return; // Already fetched
      }

      setIsLoadingExplanation(true);
      try {
          const explanation = await explainReference(ref.title, ref.code, session.language, apiKeys);
          setExplanationData(prev => ({ ...prev, [ref.id]: explanation }));
      } catch (e) {
          setExplanationData(prev => ({ ...prev, [ref.id]: "Error fetching explanation. Check your API Keys." }));
      } finally {
          setIsLoadingExplanation(false);
      }
  };

  // Filter References
  const allReferences = [...STATIC_REFERENCES, ...customReferences];
  const filteredReferences = allReferences.filter(ref => {
      const matchSearch = ref.title.toLowerCase().includes(refSearch.toLowerCase()) || ref.description.toLowerCase().includes(refSearch.toLowerCase());
      const matchMode = ref.mode === 'both' || ref.mode === refMode;
      const matchLang = ref.language === 'both' || ref.language === (session.language === 'cpp' ? 'cpp' : 'c'); // Assuming session lang maps nicely
      return matchSearch && matchMode && matchLang;
  });

  // --- AI Assistant Functions ---

  const handleValidateLogic = async () => {
      if (!logicInput.trim()) return;
      setIsLoadingAi(true);
      setAiResponse(null);
      updateToolUsage('logicValidationCount');
      try {
          const res = await validateUserLogic(session.problemStatement, logicInput, apiKeys);
          setAiResponse(res);
      } catch (e) {
          setAiResponse("Error connecting to AI mentor.");
      } finally {
          setIsLoadingAi(false);
      }
  };

  const handleGetHint = async () => {
      setIsLoadingAi(true);
      setAiResponse(null);
      updateToolUsage('hintCount');
      try {
          const res = await getHint(session.problemStatement, code, apiKeys);
          setAiResponse(res);
      } catch (e) {
          setAiResponse("Error getting hint.");
      } finally {
          setIsLoadingAi(false);
      }
  };

  // Trigger warning modal for Pseudo Code
  const initiatePseudoCodeReveal = () => {
      if ((session.mode as string) === 'exam') return;
      setRevealType('pseudocode');
      setShowRevealModal(true);
      setRevealTimer(5);
      setCanReveal(false);
  };

  // Trigger warning modal for Solution
  const initiateFullReveal = () => {
      if ((session.mode as string) === 'exam') return;
      setRevealType('solution');
      setShowRevealModal(true);
      setRevealTimer(5);
      setCanReveal(false);
  };

  const confirmReveal = async () => {
      setShowRevealModal(false);
      setIsLoadingAi(true);
      setAiResponse(null);

      try {
          if (revealType === 'pseudocode') {
              // Active Tab should ideally switch to hint or logic? Staying on Hint tab is fine.
              // Note: getPseudocode button is in 'hint' tab.
              updateToolUsage('pseudoCodeRevealCount');
              const res = await getPseudocode(session.problemStatement, apiKeys);
              setAiResponse(res);
          } else if (revealType === 'solution') {
              setActiveTab('solution');
              updateToolUsage('fullSolutionRevealCount');
              const res = await revealSolution(session.problemStatement, session.language, apiKeys);
              setAiResponse(res);
          }
      } catch (e) {
          setAiResponse("Error retrieving content.");
      } finally {
          setIsLoadingAi(false);
          setRevealType(null);
      }
  };

  // Language display mapping
  const langDisplay = session.language === 'cpp' ? 'C++' : 
                      session.language === 'c' ? 'C' : 
                      session.language.charAt(0).toUpperCase() + session.language.slice(1);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative">
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-400 font-mono">
            <Clock size={16} />
            <span>{formatTime(elapsed)}</span>
          </div>
          <div className="h-4 w-px bg-slate-600"></div>
          <div className="flex items-center gap-2">
            {(session.mode as string) === 'exam' && <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded border border-red-700 uppercase font-bold tracking-wider">Exam Mode</span>}
            {/* Updated to show session title */}
            <h2 className="text-slate-200 font-medium truncate max-w-xs md:max-w-md" title={session.problemStatement}>
                {session.title}
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded text-slate-400 hover:text-white transition-colors mr-2 border border-slate-700 hover:bg-slate-700"
                title="Copy Code"
            >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
           </button>

           <button 
             onClick={() => setShowRefModal(true)}
             className="flex items-center gap-1.5 text-xs px-2 py-1 rounded text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 transition-colors mr-2 border border-purple-900/30"
             title="Reference Sheet"
           >
             <Book size={14} /> Syntax
           </button>

           <button 
            onClick={toggleExclusion}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
              isExcluded 
                ? 'bg-amber-900/30 text-amber-400 border border-amber-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ban size={14} />
            {isExcluded ? 'Excluded' : 'Exclude'}
          </button>
          
          <Button variant="danger" size="sm" onClick={onEnd} className="gap-2">
            <Square size={14} className="fill-current" />
            End & Analyze
          </Button>

          <button 
            onClick={handleToggleTA}
            className={`ml-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors ${
              (session.mode as string) === 'exam' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' :
              isSidebarOpen ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title={(session.mode as string) === 'exam' ? "Disabled in Exam Mode" : "Toggle Helping TA"}
          >
             <GraduationCap size={16} />
             {isSidebarOpen ? "Close TA" : "Helping TA"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 relative font-mono text-sm">
            <textarea
            ref={textareaRef}
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder={`// Type your ${langDisplay} solution here...`}
            className="w-full h-full bg-slate-950 text-slate-300 p-4 resize-none focus:outline-none leading-relaxed font-mono"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            />
        </div>

        {/* Helping TA Sidebar */}
        {isSidebarOpen && (session.mode as string) !== 'exam' && (
            <div className="w-80 md:w-96 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 transition-all duration-300">
                {/* Updated Sidebar Title */}
                <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
                    <GraduationCap className="text-blue-400" size={18} />
                    <span className="font-semibold text-slate-200">Helping TA</span>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    <button 
                        onClick={() => { setActiveTab('logic'); setAiResponse(null); }}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${activeTab === 'logic' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <MessageSquare size={14} /> Logic
                    </button>
                    <button 
                        onClick={() => { setActiveTab('hint'); setAiResponse(null); }}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${activeTab === 'hint' ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Lightbulb size={14} /> Hints
                    </button>
                    <button 
                        onClick={() => { setActiveTab('solution'); setAiResponse(null); }}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${activeTab === 'solution' ? 'text-red-400 border-b-2 border-red-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <FileCode size={14} /> Solution
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative bg-slate-900">
                    {activeTab === 'logic' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">Describe your approach in plain English. I'll check if you're on the right track.</p>
                            <textarea 
                                value={logicInput}
                                onChange={(e) => setLogicInput(e.target.value)}
                                placeholder="e.g. I will use two pointers starting from both ends..."
                                className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                            />
                            <Button onClick={handleValidateLogic} disabled={!logicInput.trim() || isLoadingAi} className="w-full">
                                Validate Logic
                            </Button>
                        </div>
                    )}

                    {activeTab === 'hint' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-900/10 border border-amber-900/30 rounded-lg">
                                <h4 className="text-amber-500 font-semibold mb-2 flex items-center gap-2">
                                    <Lightbulb size={16} /> Need a nudge?
                                </h4>
                                <p className="text-xs text-slate-400 mb-4">
                                    I can give you a small hint based on your current code, or reveal the high-level pseudocode.
                                </p>
                                <div className="space-y-2">
                                    <Button onClick={handleGetHint} disabled={isLoadingAi} variant="secondary" className="w-full text-xs justify-center">
                                        Get Small Hint
                                    </Button>
                                    <Button onClick={initiatePseudoCodeReveal} disabled={isLoadingAi} variant="secondary" className="w-full text-xs justify-center">
                                        Show Pseudocode (Logic Only)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'solution' && (
                        <div className="space-y-4">
                             {(session.mode as string) === 'exam' ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-red-900/30 bg-red-900/10 rounded-lg">
                                    <Lock size={32} className="text-red-500 mb-3" />
                                    <h4 className="text-red-400 font-bold mb-1">Locked in Exam Mode</h4>
                                    <p className="text-xs text-slate-500">Solutions are disabled during exam simulations.</p>
                                </div>
                             ) : (
                                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                                    <h4 className="text-slate-200 font-semibold mb-2">Reveal Full Solution</h4>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Viewing the full code is discouraged. Try using Logic Validation or Hints first. 
                                        Reliance on full solutions is tracked.
                                    </p>
                                    <Button onClick={initiateFullReveal} variant="danger" className="w-full text-xs" disabled={isLoadingAi}>
                                        <AlertTriangle size={14} className="mr-2" />
                                        Unlock Full Code
                                    </Button>
                                </div>
                             )}
                        </div>
                    )}

                    {/* AI Response Area */}
                    {(aiResponse || isLoadingAi) && (
                        <div className="mt-6 pt-6 border-t border-slate-800">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">AI Response</h4>
                             {isLoadingAi ? (
                                 <div className="flex gap-2 justify-center py-4">
                                     <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                                     <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></span>
                                     <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></span>
                                 </div>
                             ) : (
                                 <div className="p-3 bg-slate-800 rounded border border-slate-700 text-sm leading-relaxed text-slate-300">
                                      <ReactMarkdown 
                                        components={{
                                          code(props: any) {
                                            const {node, className, children, ...rest} = props;
                                            return (
                                              <code className="bg-slate-900/50 rounded px-1 py-0.5 font-mono text-xs border border-slate-700/50" {...rest}>
                                                {children}
                                              </code>
                                            )
                                          },
                                          pre(props: any) {
                                            const {node, children, ...rest} = props;
                                            return (
                                              <pre className="bg-slate-950 rounded p-2 overflow-x-auto my-2 border border-slate-800 font-mono" {...rest}>
                                                {children}
                                              </pre>
                                            )
                                          },
                                          p(props: any) {
                                            const {node, children, ...rest} = props;
                                            return <p className="mb-2 last:mb-0" {...rest}>{children}</p>
                                          },
                                          ul(props: any) {
                                            const {node, children, ...rest} = props;
                                            return <ul className="list-disc pl-4 mb-2 space-y-1" {...rest}>{children}</ul>
                                          },
                                          ol(props: any) {
                                            const {node, children, ...rest} = props;
                                            return <ol className="list-decimal pl-4 mb-2 space-y-1" {...rest}>{children}</ol>
                                          }
                                        }}
                                      >
                                        {aiResponse || ''}
                                      </ReactMarkdown>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="bg-slate-800 px-4 py-1 text-xs text-slate-500 flex justify-between shrink-0 z-10">
        <span className="font-semibold text-slate-400">{langDisplay}</span>
        <span>Snapshots: {session.snapshots.length}</span>
      </div>

      {/* Full Reveal Warning Modal (Reused for Pseudocode) */}
      {showRevealModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-amber-500/50 rounded-lg max-w-sm w-full p-6 shadow-2xl text-center">
                  <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                      {revealType === 'solution' ? 'Reveal Full Solution?' : 'Reveal Pseudocode?'}
                  </h3>
                  <p className="text-slate-300 text-sm mb-6">
                      {revealType === 'solution' 
                        ? "Viewing the full code significantly reduces learning retention. Use only as a last resort."
                        : "Reading the full logic flow can reduce your problem-solving effort. Try getting a small hint first."}
                      <br/>
                      This action will be logged in your dashboard.
                  </p>
                  
                  {revealTimer > 0 ? (
                      <div className="text-2xl font-mono font-bold text-blue-400 mb-6">
                          Wait {revealTimer}s
                      </div>
                  ) : null}

                  <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setShowRevealModal(false)} className="flex-1">
                          Cancel
                      </Button>
                      <Button 
                        variant={revealType === 'solution' ? 'danger' : 'primary'}
                        onClick={confirmReveal} 
                        disabled={!canReveal}
                        className="flex-1"
                      >
                          Yes, Show Me
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Reference Sheet Modal */}
      {showRefModal && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8">
              <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-lg">
                      <div className="flex items-center gap-3">
                          <Book size={20} className="text-purple-400" />
                          <h2 className="text-lg font-bold text-white">Syntax & Algorithms Reference</h2>
                      </div>
                      <button onClick={() => setShowRefModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row h-full overflow-hidden">
                      {/* Sidebar Filters */}
                      <div className="w-full md:w-64 bg-slate-950 p-4 border-r border-slate-800 space-y-6">
                          <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Mode</label>
                              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                                  <button 
                                      onClick={() => setRefMode('lab')} 
                                      className={`flex-1 py-1.5 text-xs font-medium rounded ${refMode === 'lab' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                  >
                                      Lab (Strict)
                                  </button>
                                  <button 
                                      onClick={handleSetCasualMode} 
                                      className={`flex-1 py-1.5 text-xs font-medium rounded ${refMode === 'casual' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                  >
                                      Casual
                                  </button>
                              </div>
                          </div>

                          <div>
                             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Search</label>
                             <div className="relative">
                                 <Search size={14} className="absolute left-3 top-2.5 text-slate-600" />
                                 <input 
                                    type="text" 
                                    value={refSearch}
                                    onChange={e => setRefSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded py-2 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                 />
                             </div>
                          </div>

                          <div className="pt-4 border-t border-slate-800">
                              <Button 
                                variant="secondary" 
                                className="w-full text-xs justify-center gap-2"
                                onClick={() => setShowAddRefForm(true)}
                              >
                                  <Plus size={14} /> Add Custom
                              </Button>
                          </div>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900">
                          {showAddRefForm ? (
                              <div className="max-w-2xl mx-auto">
                                  <div className="flex items-center justify-between mb-6">
                                      <h3 className="text-xl font-bold text-white">Add Custom Reference</h3>
                                      <Button variant="ghost" size="sm" onClick={() => setShowAddRefForm(false)}>Cancel</Button>
                                  </div>
                                  <form onSubmit={handleAddRef} className="space-y-4">
                                      <div>
                                          <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                          <input 
                                            value={newRefTitle}
                                            onChange={e => setNewRefTitle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                            placeholder="e.g. My Fast I/O Template"
                                            required
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                          <input 
                                            value={newRefDesc}
                                            onChange={e => setNewRefDesc(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                            placeholder="Short description..."
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-slate-400 mb-1">Code Snippet</label>
                                          <textarea 
                                            value={newRefCode}
                                            onChange={e => setNewRefCode(e.target.value)}
                                            className="w-full h-48 bg-slate-950 border border-slate-800 rounded p-3 text-slate-300 font-mono text-sm focus:outline-none focus:border-blue-500"
                                            placeholder="// Your code here..."
                                            required
                                          />
                                      </div>
                                      <div className="flex justify-end pt-4">
                                          <Button type="submit">Save Reference</Button>
                                      </div>
                                  </form>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 gap-6">
                                  {filteredReferences.length === 0 ? (
                                      <div className="text-center text-slate-500 py-12">No references found.</div>
                                  ) : (
                                      filteredReferences.map(ref => (
                                          <div key={ref.id} className="bg-slate-950 border border-slate-800 rounded-lg p-5 hover:border-slate-700 transition-colors">
                                              <div className="flex justify-between items-start mb-3">
                                                  <div>
                                                      <h4 className="text-base font-bold text-slate-200">{ref.title}</h4>
                                                      <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 mt-1 inline-block">{ref.category}</span>
                                                      {ref.isCustom && <span className="ml-2 text-xs text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded border border-purple-900/30">Custom</span>}
                                                  </div>
                                                  <button
                                                      onClick={() => handleExplainRef(ref)}
                                                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${expandedRefId === ref.id ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                                                  >
                                                      <Sparkles size={12} /> Explain
                                                  </button>
                                              </div>
                                              <p className="text-sm text-slate-400 mb-3">{ref.description}</p>
                                              
                                              <div className="bg-slate-900 rounded p-3 border border-slate-800 font-mono text-sm text-blue-300 overflow-x-auto whitespace-pre relative group">
                                                  {ref.code}
                                                  <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(ref.code);
                                                        // Ideally show toast
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-slate-800 text-slate-400 rounded opacity-0 group-hover:opacity-100 hover:text-white transition-all"
                                                    title="Copy"
                                                  >
                                                      <FileCode size={14} />
                                                  </button>
                                              </div>

                                              {/* Explanation Section */}
                                              {expandedRefId === ref.id && (
                                                  <div className="mt-4 p-4 bg-slate-900 rounded border border-slate-700 shadow-inner">
                                                      <div className="flex justify-between items-center mb-3">
                                                          <h5 className="font-bold text-blue-400 text-sm flex items-center gap-2">
                                                              <Sparkles size={14} /> AI Explanation
                                                          </h5>
                                                          <button onClick={() => setExpandedRefId(null)} className="text-slate-500 hover:text-white">
                                                              <X size={14} />
                                                          </button>
                                                      </div>
                                                      
                                                      {isLoadingExplanation ? (
                                                          <div className="flex gap-1 py-2">
                                                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                                                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                                                          </div>
                                                      ) : (
                                                          <div className="text-sm text-slate-300 leading-relaxed">
                                                              <ReactMarkdown 
                                                                  components={{
                                                                    code(props: any) {
                                                                      const {node, className, children, ...rest} = props;
                                                                      return (
                                                                        <code className="bg-slate-950 rounded px-1 py-0.5 font-mono text-xs border border-slate-800" {...rest}>
                                                                          {children}
                                                                        </code>
                                                                      )
                                                                    },
                                                                    pre(props: any) {
                                                                      const {node, children, ...rest} = props;
                                                                      return (
                                                                        <pre className="bg-slate-950 rounded p-2 overflow-x-auto my-2 border border-slate-800 font-mono" {...rest}>
                                                                          {children}
                                                                        </pre>
                                                                      )
                                                                    },
                                                                    p(props: any) {
                                                                      const {node, children, ...rest} = props;
                                                                      return <p className="mb-2 last:mb-0" {...rest}>{children}</p>
                                                                    },
                                                                    ul(props: any) {
                                                                      const {node, children, ...rest} = props;
                                                                      return <ul className="list-disc pl-4 mb-2 space-y-1" {...rest}>{children}</ul>
                                                                    },
                                                                    ol(props: any) {
                                                                      const {node, children, ...rest} = props;
                                                                      return <ol className="list-decimal pl-4 mb-2 space-y-1" {...rest}>{children}</ol>
                                                                    }
                                                                  }}
                                                              >
                                                                  {explanationData[ref.id] || "No explanation available."}
                                                              </ReactMarkdown>
                                                          </div>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      ))
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Exam Mode Toast - Moved to end and increased z-index for visibility */}
      {examToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-red-950 border border-red-500 text-red-100 px-6 py-4 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-4 animate-bounce backdrop-blur-md">
            <div className="bg-red-900/50 p-2 rounded-full">
                <Skull size={24} className="text-red-500" />
            </div>
            <span className="font-bold text-base tracking-wide shadow-black drop-shadow-sm text-center">{examToast}</span>
          </div>
      )}

    </div>
  );
};
