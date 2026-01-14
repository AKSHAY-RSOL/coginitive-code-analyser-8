
import React, { useState, useRef } from 'react';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
import { AnalysisReport as IAnalysisReport, Mistake } from '../types';
import { AlertTriangle, Brain, CheckCircle, AlertOctagon, History, Code, PenTool, Play, Copy, Check, MessageSquare, HelpCircle, BookOpen, Send, X } from 'lucide-react';
import { Button } from './ui/Button';
import { chatAboutMistake } from '../services/geminiService';

interface Props {
  report: IAnalysisReport;
  code: string;
  onClose: () => void;
  onReanalyze: (newCode: string) => void;
  apiKeys: string[];
}

interface ChatState {
  isOpen: boolean;
  mistake: Mistake | null;
  messages: { role: 'user' | 'model', text: string }[];
  isLoading: boolean;
  mode: 'argue' | 'explain' | 'help';
}

export const AnalysisReportView: React.FC<Props> = ({ report, code, onClose, onReanalyze, apiKeys }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentCode, setCurrentCode] = useState(code);
  const [copied, setCopied] = useState(false);
  
  // Editor Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Chat State
  const [chat, setChat] = useState<ChatState>({
    isOpen: false,
    mistake: null,
    messages: [],
    isLoading: false,
    mode: 'explain'
  });
  const [inputMessage, setInputMessage] = useState('');

  const INDENT_SIZE = 3;
  const INDENT = ' '.repeat(INDENT_SIZE);

  const handleSaveAndAnalyze = () => {
    onReanalyze(currentCode);
    setIsEditing(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Advanced Editor Logic ---
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { selectionStart, selectionEnd, value } = e.currentTarget;

    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, selectionStart) + INDENT + value.substring(selectionEnd);
      setCurrentCode(newValue);
      
      setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + INDENT_SIZE;
        }
      }, 0);
      return;
    }

    // Auto-closing pairs
    const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
    if (pairs[e.key]) {
      e.preventDefault();
      const newValue = value.substring(0, selectionStart) + e.key + pairs[e.key] + value.substring(selectionEnd);
      setCurrentCode(newValue);
      setTimeout(() => {
          if(textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 1;
          }
      }, 0);
      return;
    }

    // Backspace pair deletion
    if (e.key === 'Backspace') {
       const charBefore = value.substring(selectionStart - 1, selectionStart);
       const charAfter = value.substring(selectionEnd, selectionEnd + 1);
       if (pairs[charBefore] === charAfter) {
          e.preventDefault();
          const newValue = value.substring(0, selectionStart - 1) + value.substring(selectionEnd + 1);
          setCurrentCode(newValue);
          setTimeout(() => {
            if(textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart - 1;
            }
          }, 0);
          return;
       }
    }

    // Enter Auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      const linesBefore = value.substring(0, selectionStart).split('\n');
      const currentLine = linesBefore[linesBefore.length - 1];
      const match = currentLine.match(/^(\s*)/);
      let indent = match ? match[1] : '';

      const trimmedLine = currentLine.trim();
      if (trimmedLine.endsWith('{') || trimmedLine.endsWith('(') || trimmedLine.endsWith('[')) {
        indent += INDENT;
      }

      const charAfter = value.substring(selectionEnd, selectionEnd + 1);
      const isInsideBraces = 
          (trimmedLine.endsWith('{') && charAfter === '}') ||
          (trimmedLine.endsWith('(') && charAfter === ')') ||
          (trimmedLine.endsWith('[') && charAfter === ']');

      let newValue, cursorOffset;
      if (isInsideBraces) {
          const closingIndent = indent.substring(0, Math.max(0, indent.length - INDENT_SIZE));
          newValue = value.substring(0, selectionStart) + '\n' + indent + '\n' + closingIndent + value.substring(selectionEnd);
          cursorOffset = indent.length + 1;
      } else {
          newValue = value.substring(0, selectionStart) + '\n' + indent + value.substring(selectionEnd);
          cursorOffset = indent.length + 1;
      }
      setCurrentCode(newValue);
      setTimeout(() => {
          if(textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + cursorOffset;
          }
      }, 0);
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // --- Interaction Logic ---
  const openChat = async (mistake: Mistake, mode: 'argue' | 'explain' | 'help') => {
    setChat({
      isOpen: true,
      mistake,
      messages: [],
      isLoading: mode !== 'argue', // Loading initially only for help/explain
      mode
    });

    if (mode === 'explain') {
        await sendSystemMessage(mistake, "Please explain this mistake in detail. Why is it an issue?");
    } else if (mode === 'help') {
        await sendSystemMessage(mistake, "How can I fix this? Please provide code examples.");
    }
    // Argue waits for user input
  };

  const sendSystemMessage = async (mistake: Mistake, text: string) => {
      try {
        const response = await chatAboutMistake(mistake, currentCode, [{ role: 'user', text }], apiKeys);
        setChat(prev => ({
            ...prev,
            isLoading: false,
            messages: [...prev.messages, { role: 'user', text: text }, { role: 'model', text: response }]
        }));
      } catch (e) {
          setChat(prev => ({ ...prev, isLoading: false }));
      }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputMessage.trim() || !chat.mistake) return;

      const userText = inputMessage;
      setInputMessage('');
      setChat(prev => ({
          ...prev,
          messages: [...prev.messages, { role: 'user', text: userText }],
          isLoading: true
      }));

      try {
          const history = chat.messages.length === 0 && chat.mode === 'argue' 
            ? [{ role: 'user', text: `I disagree with this mistake: "${chat.mistake.description}". Here is my argument: ${userText}` }] 
            : [...chat.messages, { role: 'user', text: userText }];

          // @ts-ignore
          const response = await chatAboutMistake(chat.mistake, currentCode, history, apiKeys);
          
          setChat(prev => ({
              ...prev,
              isLoading: false,
              messages: [...prev.messages, { role: 'model', text: response }]
          }));
      } catch (e) {
          console.error(e);
          setChat(prev => ({ ...prev, isLoading: false }));
      }
  };


  const mistakesByLine = report.mistakes.reduce((acc, mistake) => {
    if (mistake.lineNumber && mistake.lineNumber > 0 && mistake.status !== 'fixed') {
      if (!acc[mistake.lineNumber]) acc[mistake.lineNumber] = [];
      acc[mistake.lineNumber].push(mistake);
    }
    return acc;
  }, {} as Record<number, Mistake[]>);

  const codeLines = currentCode.split('\n');
  const activeMistakes = report.mistakes.filter(m => m.status !== 'fixed');
  const fixedMistakes = report.mistakes.filter(m => m.status === 'fixed');

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-start shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Session Analysis</h1>
          <p className="text-slate-400 max-w-2xl text-sm">{report.summary}</p>
        </div>
        <div className="flex gap-3">
           {isEditing ? (
             <>
               <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
               <Button onClick={handleSaveAndAnalyze} className="gap-2">
                 <Play size={16} /> Run Analysis
               </Button>
             </>
           ) : (
             <Button variant="secondary" onClick={() => setIsEditing(true)} className="gap-2">
                <PenTool size={16} /> Fix Code
             </Button>
           )}
           <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
         {/* Left Column: Report Details */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 border-r border-slate-800">
             
            {/* Timeline */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <History size={20} /> Timeline of Thought
              </h3>
              <div className="relative border-l-2 border-slate-700 ml-3 space-y-6">
                {report.timeline.map((event, idx) => (
                  <div key={idx} className="ml-6 relative">
                    <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${
                      event.type === 'failure' ? 'bg-red-900 border-red-500' :
                      event.type === 'success' ? 'bg-green-900 border-green-500' :
                      event.type === 'correction' ? 'bg-amber-900 border-amber-500' :
                      'bg-blue-900 border-blue-500'
                    }`}></div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{(event.time / 1000).toFixed(0)}s</span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        event.type === 'failure' ? 'text-red-400' :
                        event.type === 'success' ? 'text-green-400' :
                        event.type === 'correction' ? 'text-amber-400' :
                        'text-blue-400'
                      }`}>{event.type}</span>
                    </div>
                    <p className="text-slate-300 text-sm">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mistakes Grid */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                <AlertOctagon size={20} /> Mistakes Detected
              </h3>

              {/* Fixed Mistakes Summary */}
              {fixedMistakes.length > 0 && (
                  <div className="space-y-2 mb-4">
                      {fixedMistakes.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 bg-green-900/10 border border-green-900/30 rounded opacity-60 hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-3">
                                  <CheckCircle size={16} className="text-green-500" />
                                  <span className="text-sm text-green-300 line-through decoration-green-500/50">{m.description}</span>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-400 font-bold uppercase">Fixed</span>
                          </div>
                      ))}
                  </div>
              )}

              {activeMistakes.length === 0 && fixedMistakes.length === 0 ? (
                <div className="bg-green-900/10 border border-green-900/30 rounded p-4 text-center">
                    <CheckCircle className="mx-auto text-green-500 mb-2" size={24} />
                    <p className="text-green-400 text-sm">Clean run! No obvious logical errors detected.</p>
                </div>
              ) : (
                activeMistakes.map(m => (
                  <div key={m.id} className="bg-slate-800 rounded border border-slate-700 p-4 transition-colors hover:border-red-900/50 group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-red-300 border border-red-900 bg-red-900/20 px-2 py-0.5 rounded">{m.type}</span>
                      <div className="flex gap-2 text-xs font-mono text-slate-500">
                         {m.lineNumber && <span>Line {m.lineNumber}</span>}
                         <span>T+{(m.detectedAt / 1000).toFixed(0)}s</span>
                      </div>
                    </div>
                    <p className="text-slate-200 text-sm mb-3">{m.description}</p>
                    
                    <div className="bg-slate-900/50 rounded p-3 text-xs space-y-2 border-l-2 border-amber-600">
                      <div>
                        <span className="text-amber-500 font-bold block mb-1">Root Cause</span>
                        <p className="text-slate-400">{m.rootCause}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-700/50">
                        <button 
                            onClick={() => openChat(m, 'argue')}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition-colors"
                        >
                            <MessageSquare size={12} /> Argue
                        </button>
                        <button 
                            onClick={() => openChat(m, 'explain')}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-900/50 text-xs rounded transition-colors"
                        >
                            <BookOpen size={12} /> Explain
                        </button>
                        <button 
                            onClick={() => openChat(m, 'help')}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-300 border border-green-900/50 text-xs rounded transition-colors"
                        >
                            <HelpCircle size={12} /> Help
                        </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Patterns */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                <Brain size={20} /> Cognitive Patterns
              </h3>
              {report.detectedPatterns.length === 0 ? (
                <p className="text-slate-500 italic">No strong recurring patterns detected yet.</p>
              ) : (
                report.detectedPatterns.map(p => (
                  <div key={p.id} className="bg-slate-800 rounded border border-purple-900/30 p-4 relative overflow-hidden">
                     {/* Pattern details... */}
                    <h4 className="text-purple-200 font-medium mb-1">{p.name}</h4>
                    <p className="text-slate-400 text-sm mb-4">{p.description}</p>
                    {/* Examples omitted for brevity but logic remains */}
                  </div>
                ))
              )}
            </div>
         </div>

         {/* Right Column: Code Viewer / Editor */}
         <div className="lg:w-1/2 flex flex-col bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 h-full relative">
             <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center shrink-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Code size={14} /> Final Source Code
                </span>
                <div className="flex items-center gap-3">
                    {isEditing && <span className="text-xs text-amber-500">Editing Mode</span>}
                    <button 
                        onClick={copyToClipboard}
                        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy Code"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
             </div>
             
             {isEditing ? (
               <div className="flex-1 relative flex overflow-hidden">
                 {/* Line Numbers Column */}
                 <div 
                    ref={lineNumbersRef}
                    className="bg-slate-900 text-slate-500 text-right pr-3 pt-4 select-none overflow-hidden font-mono text-sm leading-relaxed border-r border-slate-800 w-12"
                 >
                    {codeLines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                 </div>
                 {/* Textarea */}
                 <textarea
                   ref={textareaRef}
                   value={currentCode}
                   onChange={(e) => setCurrentCode(e.target.value)}
                   onKeyDown={handleEditorKeyDown}
                   onScroll={handleScroll}
                   className="flex-1 w-full bg-slate-950 text-slate-300 p-4 pt-4 font-mono text-sm resize-none focus:outline-none leading-relaxed whitespace-pre"
                   spellCheck={false}
                   wrap="off"
                 />
               </div>
             ) : (
               <div className="flex-1 overflow-auto custom-scrollbar p-4 font-mono text-sm leading-6">
                 {codeLines.map((line, idx) => {
                   const lineNum = idx + 1;
                   const lineMistakes = mistakesByLine[lineNum];
                   const hasMistake = lineMistakes && lineMistakes.length > 0;
                   
                   return (
                     <div key={idx} className={`relative flex group ${hasMistake ? 'bg-red-900/20' : ''}`}>
                       <div className="w-8 shrink-0 text-slate-600 text-right pr-3 select-none">
                         {lineNum}
                       </div>
                       <div className={`flex-1 whitespace-pre pr-4 text-slate-300 ${hasMistake ? 'text-red-100' : ''}`}>
                         {line}
                       </div>
                       {hasMistake && (
                         <div className="absolute right-2 top-0 bottom-0 flex items-center">
                             <AlertTriangle size={14} className="text-red-500" />
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             )}
         </div>
      </div>

      {/* Chat Modal for Argue/Explain/Help */}
      {chat.isOpen && chat.mistake && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg h-[600px] flex flex-col">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 rounded-t-lg">
                      <div>
                          <h3 className="font-bold text-white flex items-center gap-2">
                              {chat.mode === 'argue' && <><MessageSquare size={18} className="text-amber-400" /> Disputing Mistake</>}
                              {chat.mode === 'explain' && <><BookOpen size={18} className="text-blue-400" /> Detailed Explanation</>}
                              {chat.mode === 'help' && <><HelpCircle size={18} className="text-green-400" /> Fix Assistance</>}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-sm">
                            Regarding: {chat.mistake.description}
                          </p>
                      </div>
                      <button onClick={() => setChat(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-slate-950">
                      {chat.messages
                        .filter(msg => !(msg.role === 'user' && (msg.text.includes("Please explain this mistake") || msg.text.includes("How can I fix this"))))
                        .map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                                  msg.role === 'user' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-slate-800 text-slate-200 border border-slate-700'
                              }`}>
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
                                          <pre className="bg-slate-950 rounded p-2 overflow-x-auto my-2 border border-slate-800" {...rest}>
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
                                    {msg.text}
                                  </ReactMarkdown>
                              </div>
                          </div>
                      ))}
                      {chat.isLoading && (
                          <div className="flex justify-start">
                              <div className="bg-slate-800 rounded-lg p-3 text-sm border border-slate-700">
                                  <div className="flex gap-1">
                                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800">
                      <div className="relative">
                          <input 
                              type="text" 
                              value={inputMessage}
                              onChange={e => setInputMessage(e.target.value)}
                              placeholder={chat.mode === 'argue' ? "Why is this correct? Type your argument..." : "Ask a follow-up question..."}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                              autoFocus
                          />
                          <button 
                              type="submit"
                              disabled={!inputMessage.trim() || chat.isLoading}
                              className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
                          >
                              <Send size={16} />
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
