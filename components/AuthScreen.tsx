
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Button } from './ui/Button';
import { Brain, Key, User, Lock, ExternalLink, ArrowRight, Info } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
  existingUser: UserProfile | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, existingUser }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(existingUser ? 'login' : 'signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKeysInput, setApiKeysInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!username || !password || !apiKeysInput.trim()) {
        setError("All fields are required.");
        return;
      }

      // Process keys: split by newline or comma, trim whitespace, filter empty
      const keys = apiKeysInput
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      if (keys.length === 0) {
        setError("Please enter at least one API Key.");
        return;
      }
      
      // Simple validation for API Key format (starts with AI)
      const invalidKeys = keys.filter(k => !k.startsWith('AI'));
      if (invalidKeys.length > 0) {
        setError("One or more keys do not look valid (should start with 'AI').");
        return;
      }

      onLogin({ username, password, apiKeys: keys });
    } else {
      // Login Mode
      if (!username || !password) {
        setError("Please enter username and password.");
        return;
      }

      // Check against stored user (Simple Simulation)
      if (existingUser) {
        if (existingUser.username === username && existingUser.password === password) {
           onLogin(existingUser);
        } else {
           setError("Invalid username or password.");
        }
      } else {
        setError("No user found. Please sign up.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-purple-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10">
        <div className="flex flex-col items-center mb-8">
           <div className="p-3 bg-blue-600 rounded-xl text-white mb-4 shadow-lg shadow-blue-900/20">
             <Brain size={32} />
           </div>
           <h1 className="text-2xl font-bold text-white">Cognitive Mirror</h1>
           <p className="text-slate-400 text-sm mt-1">Debug your thinking process</p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-950/50 rounded-lg mb-6 border border-slate-800">
           <button 
             onClick={() => { setMode('login'); setError(null); }}
             className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Login
           </button>
           <button 
             onClick={() => { setMode('signup'); setError(null); }}
             className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Sign Up
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Username</label>
            <div className="relative">
               <User className="absolute left-3 top-2.5 text-slate-600" size={16} />
               <input 
                 type="text" 
                 value={username}
                 onChange={e => setUsername(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                 placeholder="Enter your username"
               />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Password</label>
            <div className="relative">
               <Lock className="absolute left-3 top-2.5 text-slate-600" size={16} />
               <input 
                 type="password" 
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                 placeholder="••••••••"
               />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="pt-2 border-t border-slate-800/50 mt-2">
              <div className="flex justify-between items-center mb-1 ml-1">
                 <label className="block text-xs font-medium text-slate-400">Gemini API Keys</label>
                 <a 
                   href="https://aistudio.google.com/app/apikey" 
                   target="_blank" 
                   rel="noreferrer"
                   className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                 >
                   Get Free Keys <ExternalLink size={10} />
                 </a>
              </div>
              <div className="relative">
                 <Key className="absolute left-3 top-3 text-slate-600" size={16} />
                 <textarea 
                   value={apiKeysInput}
                   onChange={e => setApiKeysInput(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[80px]"
                   placeholder="AIza... (One per line for cyclic usage)"
                 />
              </div>
              <div className="flex items-start gap-2 mt-2 bg-slate-900/50 p-2 rounded border border-slate-800">
                <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                   Enter multiple keys to cycle through them automatically. This prevents "Rate Limit" errors on the Free Tier.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" size="lg">
            {mode === 'login' ? 'Unlock Dashboard' : 'Create Account'} <ArrowRight size={16} className="ml-2" />
          </Button>
        </form>

        {existingUser && mode === 'signup' && (
           <p className="text-center text-xs text-amber-500 mt-4">
             Note: Creating a new account will overwrite the existing user on this device.
           </p>
        )}
      </div>
    </div>
  );
};
