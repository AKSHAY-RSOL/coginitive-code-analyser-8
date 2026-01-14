
import React, { useState, useEffect } from 'react';
import { AppState, Session, AnalysisReport, UserProfile, Mistake, ReferenceEntry } from './types';
import { loadState, saveState, createSession, updatePatterns } from './services/sessionManager';
import { analyzeSession, generateSessionTitle } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { SessionRecorder } from './components/SessionRecorder';
import { AnalysisReportView } from './components/AnalysisReport';
import { AuthScreen } from './components/AuthScreen';
import { Button } from './components/ui/Button';
import { LayoutDashboard, Plus, AlertTriangle, Brain, X, Trash2, LogOut, Settings, Key, Save, Lock, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({ sessions: [], activeSessionId: null, globalPatterns: [], user: null, customReferences: [] });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [view, setView] = useState<'dashboard' | 'session' | 'report'>('dashboard');
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  const [activeSessionCode, setActiveSessionCode] = useState<string>(''); // For the report view
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Session Modal State
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [problemContext, setProblemContext] = useState(''); // Raw input
  const [sessionTitle, setSessionTitle] = useState(''); // Edited title
  const [isExamMode, setIsExamMode] = useState(false);
  const [isNamingLoading, setIsNamingLoading] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  
  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsKeysInput, setSettingsKeysInput] = useState('');
  
  // Delete Confirmation State
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
  }, []);

  // Save on Change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const handleLogin = (user: UserProfile) => {
    setState(prev => ({ ...prev, user }));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // We keep the data, just lock the screen
  };
  
  const handleClearData = () => {
    if(confirm("This will wipe all your sessions and account data from this device. Are you sure?")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const handleOpenSettings = () => {
    if (state.user) {
        setSettingsKeysInput(state.user.apiKeys.join('\n'));
    }
    setShowSettingsModal(true);
    setError(null);
  };

  const handleSaveSettings = () => {
      const keys = settingsKeysInput
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      if (keys.length === 0) {
        alert("Please enter at least one API Key.");
        return;
      }
      
      const invalidKeys = keys.filter(k => !k.startsWith('AI'));
      if (invalidKeys.length > 0) {
        alert("One or more keys do not look valid (should start with 'AI').");
        return;
      }

      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, apiKeys: keys } : null
      }));
      setShowSettingsModal(false);
  };

  // --- Session Naming Logic ---

  const checkTitleUnique = (title: string) => {
    const exists = state.sessions.some(s => s.title.toLowerCase() === title.trim().toLowerCase());
    if (exists) {
      setTitleError("This title is already used in a previous session.");
    } else {
      setTitleError(null);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionTitle(e.target.value);
    checkTitleUnique(e.target.value);
  };

  const handleAutoName = async () => {
    if (!problemContext.trim() || !state.user?.apiKeys) return;
    setIsNamingLoading(true);
    try {
       const generatedName = await generateSessionTitle(problemContext, state.user.apiKeys);
       setSessionTitle(generatedName);
       checkTitleUnique(generatedName);
    } catch (e) {
       console.error(e);
       // Fallback to truncating context if AI fails
       setSessionTitle(problemContext.slice(0, 30) + (problemContext.length > 30 ? '...' : ''));
    } finally {
       setIsNamingLoading(false);
    }
  };

  const handleStartSession = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!sessionTitle.trim() || titleError) return;

    // Use Context as Problem Statement, Title as Display Name
    const newSession = createSession(sessionTitle, problemContext, 'cpp', isExamMode ? 'exam' : 'practice');
    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      activeSessionId: newSession.id
    }));
    setView('session');
    setShowNewSessionModal(false);
    setProblemContext('');
    setSessionTitle('');
    setIsExamMode(false);
    setTitleError(null);
  };

  const updateActiveSession = (updatedSession: Session) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === updatedSession.id ? updatedSession : s)
    }));
  };

  const handleDeleteSessionRequest = (sessionId: string) => {
    setSessionToDelete(sessionId);
  };

  const confirmDeleteSession = () => {
    if (!sessionToDelete) return;
    
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== sessionToDelete),
      activeSessionId: prev.activeSessionId === sessionToDelete ? null : prev.activeSessionId
    }));
    
    if (activeReport && state.activeSessionId === sessionToDelete) {
      setView('dashboard');
      setActiveReport(null);
    }
    setSessionToDelete(null);
  };

  const handleAddCustomReference = (entry: ReferenceEntry) => {
     setState(prev => ({
        ...prev,
        customReferences: [...prev.customReferences, entry]
     }));
  };

  const endSession = async () => {
    const session = state.sessions.find(s => s.id === state.activeSessionId);
    if (!session) return;
    if (!state.user?.apiKeys || state.user.apiKeys.length === 0) {
        setError("API Keys not found. Please add keys in Settings.");
        return;
    }

    if (session.snapshots.length < 2) {
      alert("Not enough data to analyze. Write some code!");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const report = await analyzeSession(session, session.isExcluded ? [] : state.globalPatterns, state.user.apiKeys);
      
      // Initialize status for new mistakes
      report.mistakes = report.mistakes.map(m => ({ ...m, status: 'active' }));

      const updatedSession = { ...session, endTime: Date.now(), analysis: report };
      
      let newPatterns = state.globalPatterns;
      if (!session.isExcluded) {
        newPatterns = updatePatterns(state.globalPatterns, report.detectedPatterns);
      }

      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === session.id ? updatedSession : s),
        activeSessionId: null, 
        globalPatterns: newPatterns
      }));

      setActiveReport(report);
      setActiveSessionCode(updatedSession.snapshots[updatedSession.snapshots.length - 1].code);
      setView('report');
      setState(prev => ({ ...prev, activeSessionId: session.id }));

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async (newCode: string) => {
    const session = state.sessions.find(s => s.id === state.activeSessionId);
    if (!session || !state.user?.apiKeys) return;

    setIsLoading(true);
    setError(null);

    try {
      // Capture OLD active mistakes before analysis
      const oldMistakes = activeReport?.mistakes || [];

      const relativeTime = Date.now() - session.startTime;
      const updatedSnapshots = [...session.snapshots, { timestamp: relativeTime, code: newCode }];
      const updatedSession = { ...session, snapshots: updatedSnapshots };

      const report = await analyzeSession(updatedSession, session.isExcluded ? [] : state.globalPatterns, state.user.apiKeys);
      
      // MERGE LOGIC: Determine what is fixed and what is still active
      const newActiveMistakes = report.mistakes.map(m => ({ ...m, status: 'active' as const }));
      
      // Map old mistakes. If an old mistake is NOT present in newActiveMistakes (by approx line number and type), mark it fixed.
      // Since ID's are unstable from AI, we match by Type + Approx Line Number (± 2 lines)
      const mergedMistakes: Mistake[] = [];

      // 1. Process Old Mistakes -> If not found in new, mark fixed.
      oldMistakes.forEach(oldM => {
         const stillExists = newActiveMistakes.some(newM => 
             newM.type === oldM.type && 
             Math.abs((newM.lineNumber || 0) - (oldM.lineNumber || 0)) <= 3
         );

         if (!stillExists) {
             mergedMistakes.push({ ...oldM, status: 'fixed' });
         }
         // If it still exists, we don't push the OLD one, we will push the NEW one below.
      });

      // 2. Add all New Active Mistakes
      mergedMistakes.push(...newActiveMistakes);

      report.mistakes = mergedMistakes;

      const finalizedSession = { ...updatedSession, analysis: report };

      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === session.id ? finalizedSession : s),
        globalPatterns: session.isExcluded ? prev.globalPatterns : updatePatterns(prev.globalPatterns, report.detectedPatterns)
      }));

      setActiveReport(report);
      setActiveSessionCode(newCode);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Re-analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle View Analysis from Dashboard
  const handleViewAnalysis = (session: Session) => {
     if (session.analysis) {
        setActiveReport(session.analysis);
        setActiveSessionCode(session.snapshots[session.snapshots.length - 1].code);
        setState(prev => ({ ...prev, activeSessionId: session.id }));
        setView('report');
     }
  };

  // Auth Guard
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} existingUser={state.user} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 bg-slate-900 border-r border-slate-800 space-y-4 z-10">
        <div className="p-2 bg-blue-600 rounded-lg text-white mb-4">
          <Brain size={24} />
        </div>
        
        <button 
          onClick={() => { setView('dashboard'); setState(prev => ({...prev, activeSessionId: null})); }}
          className={`p-2 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          title="Dashboard"
        >
          <LayoutDashboard size={24} />
        </button>

        <div className="flex-1" />
        
        <button 
            onClick={handleOpenSettings}
            className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
            title="Settings"
        >
            <Settings size={20} />
        </button>

        <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-white transition-colors mb-2"
            title="Logout"
        >
            <LogOut size={20} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {view === 'dashboard' && (
          <div className="h-full flex flex-col">
            <div className="absolute top-6 right-8 z-20 flex items-center gap-4">
               <span className="text-sm text-slate-500 hidden md:inline-block">Welcome, <span className="text-slate-300 font-medium">{state.user?.username}</span></span>
               <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors" onClick={handleOpenSettings}>
                  <Key size={12} className="text-purple-400" />
                  <span className="text-xs text-slate-400">{state.user?.apiKeys?.length} Keys Active</span>
               </div>
            </div>
            <div className="absolute bottom-8 right-8 z-20">
               <Button onClick={() => setShowNewSessionModal(true)} size="lg" className="shadow-lg shadow-blue-900/20 gap-2 rounded-full h-14 px-8">
                 <Plus size={20} /> New Problem Session
               </Button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Dashboard 
                state={state} 
                onDeleteSession={handleDeleteSessionRequest} 
                onViewAnalysis={handleViewAnalysis}
              />
            </div>
          </div>
        )}

        {view === 'session' && state.activeSessionId && (
          <SessionRecorder 
            session={state.sessions.find(s => s.id === state.activeSessionId)!}
            onUpdate={updateActiveSession}
            onEnd={endSession}
            apiKeys={state.user?.apiKeys || []}
            customReferences={state.customReferences}
            onAddCustomReference={handleAddCustomReference}
          />
        )}

        {view === 'report' && activeReport && (
          <AnalysisReportView 
            report={activeReport} 
            code={activeSessionCode}
            onClose={() => { setView('dashboard'); setState(prev => ({...prev, activeSessionId: null})); }}
            onReanalyze={handleReanalyze}
            apiKeys={state.user?.apiKeys || []}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-xl font-medium text-white">Analyzing Thought Process...</p>
            <p className="text-sm text-slate-400 mt-2">Connecting mistakes to historical patterns</p>
            <p className="text-xs text-slate-500 mt-4 max-w-xs text-center">Using Gemini 1.5 Flash (Free Tier Optimized)</p>
          </div>
        )}

        {/* New Session Modal */}
        {showNewSessionModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
             <form onSubmit={handleStartSession} className="bg-slate-900 border border-slate-700 p-6 rounded-lg max-w-lg w-full shadow-2xl relative">
                <button 
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-6">New Problem Session</h3>
                
                <div className="space-y-6">
                  {/* Problem Context Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Problem Context (URL or Text)</label>
                    <textarea 
                      autoFocus
                      value={problemContext} 
                      onChange={(e) => setProblemContext(e.target.value)}
                      placeholder="Paste LeetCode URL or full problem description here..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none text-sm"
                    />
                  </div>

                  {/* Auto-Naming Section */}
                  <div className="flex gap-2 items-start">
                     <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-300 mb-1">Session Title</label>
                        <input 
                          type="text" 
                          value={sessionTitle} 
                          onChange={handleTitleChange}
                          placeholder="e.g. LC 206: Reverse Linked List"
                          className={`w-full bg-slate-950 border rounded px-4 py-2 text-slate-200 focus:outline-none transition-colors ${titleError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'}`}
                        />
                        {titleError && (
                          <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                             <AlertCircle size={12} /> {titleError}
                          </div>
                        )}
                     </div>
                     <div className="mt-6">
                         <Button 
                           type="button" 
                           onClick={handleAutoName} 
                           disabled={!problemContext.trim() || isNamingLoading}
                           variant="secondary"
                           className="h-[42px]"
                           title="Auto-generate Name"
                         >
                            {isNamingLoading ? (
                               <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                               <Sparkles size={16} />
                            )}
                         </Button>
                     </div>
                  </div>
                  
                  <div className="pt-2">
                      <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700 transition-colors" onClick={() => setIsExamMode(!isExamMode)}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isExamMode ? 'bg-blue-600 border-blue-500' : 'border-slate-600'}`}>
                              {isExamMode && <Check size={14} className="text-white" />}
                          </div>
                          <div>
                              <div className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                  Exam Simulation Mode {isExamMode && <Lock size={12} className="text-amber-400" />}
                              </div>
                              <p className="text-xs text-slate-500">Disables AI Hints and Full Solution reveal.</p>
                          </div>
                      </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <Button type="button" variant="ghost" onClick={() => setShowNewSessionModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={!sessionTitle.trim() || !!titleError}>Start Recording</Button>
                </div>
             </form>
          </div>
        )}
        
        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg max-w-md w-full shadow-2xl relative">
                <button 
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings size={20} /> Settings
                </h3>

                <div className="space-y-4 mb-8">
                   <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Gemini API Keys</label>
                      <div className="relative">
                         <Key className="absolute left-3 top-3 text-slate-600" size={16} />
                         <textarea 
                           value={settingsKeysInput}
                           onChange={e => setSettingsKeysInput(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px]"
                           placeholder="AIza... (One per line)"
                         />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Add multiple keys (one per line) to cycle through them automatically.
                      </p>
                   </div>
                   
                   <Button onClick={handleSaveSettings} className="w-full gap-2">
                      <Save size={16} /> Save Changes
                   </Button>
                </div>

                <div className="pt-6 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">Danger Zone</h4>
                    <Button variant="ghost" onClick={handleClearData} className="w-full text-red-400 hover:bg-red-900/20 hover:text-red-300 justify-start gap-2">
                        <Trash2 size={16} /> Wipe All Data & Logout
                    </Button>
                </div>
             </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {sessionToDelete && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 text-red-500 mb-4">
                  <Trash2 size={24} />
                  <h3 className="text-lg font-bold text-white">Delete Session?</h3>
                </div>
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete this session? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setSessionToDelete(null)}>Cancel</Button>
                  <Button variant="danger" onClick={confirmDeleteSession}>Delete Permanently</Button>
                </div>
             </div>
          </div>
        )}

        {/* Error Modal */}
        {error && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-red-900/50 p-6 rounded-lg max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold">Analysis Error</h3>
              </div>
              <p className="text-slate-300 mb-6">{error}</p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setError(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
