
import React, { useState } from 'react';
import { AppState, Session, Pattern } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Brain, Activity, TrendingUp, AlertOctagon, Trash2, Code, X, Copy, Check, Lock, ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  state: AppState;
  onDeleteSession: (id: string) => void;
  onViewAnalysis: (session: Session) => void;
}

export const Dashboard: React.FC<Props> = ({ state, onDeleteSession, onViewAnalysis }) => {
  const [viewingCodeSession, setViewingCodeSession] = useState<Session | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [copied, setCopied] = useState(false);

  const totalSessions = state.sessions.length;
  const analyzedSessions = state.sessions.filter(s => s.analysis && !s.isExcluded).length;
  
  // Calculate Reliance Metrics (Includes both Full Solution and Pseudocode/Logic reveals)
  const sessionsWithReliance = state.sessions.filter(s => 
    s.toolUsage && (s.toolUsage.fullSolutionRevealCount > 0 || s.toolUsage.pseudoCodeRevealCount > 0)
  ).length;
  const reliancePercentage = totalSessions > 0 ? Math.round((sessionsWithReliance / totalSessions) * 100) : 0;

  // Prepare chart data
  const mistakeCounts: Record<string, number> = {};
  state.sessions.forEach(s => {
    if (s.analysis && !s.isExcluded) {
      s.analysis.mistakes.forEach(m => {
        mistakeCounts[m.type] = (mistakeCounts[m.type] || 0) + 1;
      });
    }
  });

  const chartData = Object.keys(mistakeCounts).map(key => ({
    name: key,
    count: mistakeCounts[key]
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#6366f1'];

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeCodeModal = () => {
    setViewingCodeSession(null);
    setCopied(false);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Cognitive Dashboard</h1>
        <p className="text-slate-400">Your problem-solving identity, analyzed over time.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/30 text-blue-400 rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Sessions</p>
              <h3 className="text-2xl font-bold text-white">{totalSessions}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-900/30 text-purple-400 rounded-lg">
              <Brain size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Patterns Identified</p>
              <h3 className="text-2xl font-bold text-white">{state.globalPatterns.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-900/30 text-amber-400 rounded-lg">
              <AlertOctagon size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Analyzed Problems</p>
              <h3 className="text-2xl font-bold text-white">{analyzedSessions}</h3>
            </div>
          </div>
        </div>

        {/* Reliance Score Card */}
        <div className={`p-6 rounded-lg border ${reliancePercentage > 50 ? 'bg-red-900/20 border-red-900/50' : 'bg-slate-800 border-slate-700'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${reliancePercentage > 50 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Help Reliance</p>
              <h3 className={`text-2xl font-bold ${reliancePercentage > 50 ? 'text-red-400' : 'text-green-400'}`}>{reliancePercentage}%</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Reliance Warning Banner */}
      {reliancePercentage > 50 && (
         <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 animate-pulse">
            <AlertOctagon className="text-red-500 shrink-0 mt-1" size={24} />
            <div>
               <h4 className="font-bold text-red-400">High Reliance Detected</h4>
               <p className="text-slate-300 text-sm">
                 You used logic reveals or full solutions in {reliancePercentage}% of problems — try using hints or validation to improve retention.
               </p>
            </div>
         </div>
      )}

      {/* Charts & Patterns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg border border-slate-700 h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-6">Mistake Type Frequency</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                cursor={{ fill: '#334155', opacity: 0.2 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Patterns List */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 h-[400px] overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-semibold text-white mb-4">Recurring Patterns</h3>
          {state.globalPatterns.length === 0 ? (
            <div className="text-center text-slate-500 mt-12">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
              <p>No patterns detected yet.</p>
              <p className="text-xs mt-2">Complete more sessions to unlock insights.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.globalPatterns
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5)
                .map(pattern => (
                <div 
                  key={pattern.id} 
                  className="p-3 bg-slate-900 rounded border-l-4 border-purple-500 hover:bg-slate-800/80 cursor-pointer transition-colors group"
                  onClick={() => setSelectedPattern(pattern)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-medium text-purple-200 group-hover:text-purple-100">{pattern.name}</h4>
                    <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 rounded">x{pattern.frequency}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 group-hover:text-slate-300">{pattern.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Recent History */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
           <h3 className="text-lg font-semibold text-white">Recent Sessions</h3>
        </div>
        <div className="divide-y divide-slate-700">
           {state.sessions.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No sessions recorded.</div>
           ) : (
              state.sessions.slice().reverse().slice(0, 10).map(s => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors group">
                  <div>
                    <h4 className="text-slate-200 font-medium truncate max-w-md flex items-center gap-2">
                        {s.title}
                        {s.mode === 'exam' && <Lock size={12} className="text-red-400" />}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 flex gap-2">
                      <span>{new Date(s.startTime).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{s.snapshots.length} snapshots</span>
                      {s.isExcluded && <span className="text-amber-500">• Excluded</span>}
                      {s.toolUsage && s.toolUsage.fullSolutionRevealCount > 0 && <span className="text-red-400">• Solution Used</span>}
                      {s.toolUsage && s.toolUsage.pseudoCodeRevealCount > 0 && <span className="text-amber-400">• Pseudocode Used</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                     {s.analysis ? (
                       <button
                         onClick={() => onViewAnalysis(s)}
                         className="flex items-center gap-1 text-xs bg-green-900/30 text-green-400 border border-green-900/50 px-2 py-1 rounded hover:bg-green-900/50 transition-colors"
                       >
                         <Brain size={12} /> View Analysis
                       </button>
                     ) : (
                       <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">Incomplete</span>
                     )}
                     
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingCodeSession(s);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded" 
                          title="View Code"
                        >
                          <Code size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                             e.stopPropagation();
                             onDeleteSession(s.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded" 
                          title="Delete Session"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
                </div>
              ))
           )}
        </div>
      </div>

      {/* Code Viewer Modal */}
      {viewingCodeSession && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8">
           <div className="bg-slate-900 w-full max-w-4xl max-h-[80vh] flex flex-col rounded-lg border border-slate-700 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                 <h3 className="font-medium text-slate-200">{viewingCodeSession.title} - Final Code</h3>
                 <div className="flex items-center gap-4">
                     <button 
                        onClick={() => handleCopyCode(viewingCodeSession.snapshots[viewingCodeSession.snapshots.length - 1]?.code || "")}
                        className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
                     >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        {copied ? "Copied" : "Copy"}
                     </button>
                     <button onClick={closeCodeModal} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                     </button>
                 </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 p-6">
                 <pre className="font-mono text-sm text-slate-300">
                    {viewingCodeSession.snapshots[viewingCodeSession.snapshots.length - 1]?.code}
                 </pre>
              </div>
           </div>
        </div>
      )}

      {/* Pattern Details Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-900 w-full max-w-2xl rounded-lg border border-purple-900/50 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900">
                 <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                       <Brain className="text-purple-400" size={24} />
                       {selectedPattern.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-900/50">
                           Frequency: {selectedPattern.frequency}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${
                            selectedPattern.severity === 'high' ? 'bg-red-900/30 text-red-300 border-red-900/50' : 
                            selectedPattern.severity === 'medium' ? 'bg-amber-900/30 text-amber-300 border-amber-900/50' : 
                            'bg-blue-900/30 text-blue-300 border-blue-900/50'
                        }`}>
                           Severity: {selectedPattern.severity.toUpperCase()}
                        </span>
                    </div>
                 </div>
                 <button onClick={() => setSelectedPattern(null)} className="text-slate-400 hover:text-white">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                 <div className="mb-6">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-slate-200 leading-relaxed text-sm">
                       {selectedPattern.description}
                    </p>
                 </div>
                 
                 <div>
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Historical Examples</h4>
                    {selectedPattern.examples.length > 0 ? (
                        <div className="space-y-3">
                           {selectedPattern.examples.map((ex, i) => (
                              <div key={i} className="bg-slate-950 p-4 rounded border border-slate-800 text-sm text-slate-300 font-mono">
                                 {ex}
                              </div>
                           ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 italic">No specific examples recorded.</p>
                    )}
                 </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                  <Button onClick={() => setSelectedPattern(null)}>Close</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
