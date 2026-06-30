/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, 
  MessageSquare, 
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, 
  MessageSquare, 
  Search, 
  Cpu, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  ArrowRight,
  History,
  Trash2,
  Share2,
  Sparkles,
  BookOpen,
  Video,
  Download,
  FileText,
  Clock,
  Zap,
  Lock,
  User,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, AnalysisHistory, TechnicalSolution, ResourceLink, LocalNeuralResult } from './types';

// Initialize Gemini in Frontend (as per best practices)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const URGENCY_COLORS = {
  High: '#ef4444', 
  Medium: '#f59e0b',
  Low: '#10b981',
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [followupText, setFollowupText] = useState('');

  // Auth state
  const [authStatus, setAuthStatus] = useState<'idle' | 'staff' | 'guest'>('idle');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Load history from localStorage
  useEffect(() => {
    const currentUser = localStorage.getItem('tech_guard_user');
    if (currentUser && currentUser !== 'guest') {
      setUsername(currentUser);
      setAuthStatus('staff');
      const saved = localStorage.getItem(`tech_guard_history_${currentUser}`);
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load history", e);
        }
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (authStatus === 'staff' && username) {
      localStorage.setItem(`tech_guard_history_${username}`, JSON.stringify(history));
    }
  }, [history, username, authStatus]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername.trim()) {
      setUsername(loginUsername.trim());
      setAuthStatus('staff');
      localStorage.setItem('tech_guard_user', loginUsername.trim());
      
      const saved = localStorage.getItem(`tech_guard_history_${loginUsername.trim()}`);
      if (saved) {
        try { setHistory(JSON.parse(saved)); } catch (e) {}
      } else {
        setHistory([]);
      }
    }
  };

  const handleGuest = () => {
    setUsername('guest');
    setAuthStatus('guest');
    setHistory([]);
    // Do NOT save guest user in localStorage for privacy
  };

  const analyzeProblem = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null); // Clear previous result to show loading state properly

    try {
      // 1. Call Local Neural Engine (Backend Python)
      const localPromise = fetch('/api/local-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      }).then(res => res.ok ? res.json() : null).catch(() => null);

      // 2. Call Reasoning Engine (Cloud Gemini)
      const prompt = `You are TechGuard AI, support agent for Jay Enterprises (IT Infrastructure, Networking, CCTV, Power Backup).
Issue: "${inputText}"
Reply with JSON: { "problemSummary": "...", "rootCause": "...", "solutions": [{ "title": "...", "steps": ["..."], "explanation": "...", "difficulty": "Easy|Intermediate|Advanced" }], "resources": [{ "label": "...", "url": "...", "type": "Documentation|Video|Download|Article" }], "urgency": "Low|Medium|High" }`;

      const aiPromise = ai.models.generateContent({
        model: "gemini-1.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              problemSummary: { type: Type.STRING },
              rootCause: { type: Type.STRING },
              solutions: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    explanation: { type: Type.STRING },
                    difficulty: { type: Type.STRING, enum: ['Easy', 'Intermediate', 'Advanced'] }
                  },
                  required: ['title', 'steps', 'explanation', 'difficulty']
                } 
              },
              resources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    url: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Documentation', 'Video', 'Download', 'Article'] }
                  },
                  required: ['label', 'url', 'type']
                }
              },
              urgency: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            },
            required: ['problemSummary', 'rootCause', 'solutions', 'resources', 'urgency']
          }
        }
      });

      // Execute both in parallel for speed
      const [localData, aiResponse] = await Promise.all([localPromise, aiPromise]);
      
      const data = JSON.parse(aiResponse.text);
      const combinedResult: AnalysisResult = {
        ...data,
        localAnalysis: localData as LocalNeuralResult || undefined
      };

      setResult(combinedResult);
      
      const newEntry: AnalysisHistory = {
        id: crypto.randomUUID(),
        text: inputText,
        result: combinedResult,
        timestamp: Date.now()
      };
      
      setHistory(prev => [newEntry, ...prev.slice(0, 19)]); // Keep last 20
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || String(err);
      const isLimitError = msg.includes('503') || msg.toLowerCase().includes('demand') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('unavailable');
      const errorMessage = isLimitError ? "API limit exhausted. Please wait a moment and try again." : msg;
      setError(`AI Diagnosis failed: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFollowup = async () => {
    if (!followupText.trim() || !result) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `You are TechGuard AI for Jay Enterprises.
Prev Issue: "${inputText}"
Prev Summary: "${result.problemSummary}"
User Follow-up: "${followupText}"
Update diagnosis and reply with JSON: { "problemSummary": "...", "rootCause": "...", "solutions": [{ "title": "...", "steps": ["..."], "explanation": "...", "difficulty": "Easy|Intermediate|Advanced" }], "resources": [{ "label": "...", "url": "...", "type": "Documentation|Video|Download|Article" }], "urgency": "Low|Medium|High" }`;

      const aiPromise = ai.models.generateContent({
        model: "gemini-1.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              problemSummary: { type: Type.STRING },
              rootCause: { type: Type.STRING },
              solutions: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    explanation: { type: Type.STRING },
                    difficulty: { type: Type.STRING, enum: ['Easy', 'Intermediate', 'Advanced'] }
                  },
                  required: ['title', 'steps', 'explanation', 'difficulty']
                } 
              },
              resources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    url: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Documentation', 'Video', 'Download', 'Article'] }
                  },
                  required: ['label', 'url', 'type']
                }
              },
              urgency: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            },
            required: ['problemSummary', 'rootCause', 'solutions', 'resources', 'urgency']
          }
        }
      });

      const aiResponse = await aiPromise;
      const data = JSON.parse(aiResponse.text);
      
      const updatedResult: AnalysisResult = {
        ...data,
        localAnalysis: result.localAnalysis
      };

      setResult(updatedResult);
      const newText = inputText + "\nFollow-up: " + followupText;
      setInputText(newText);
      setFollowupText('');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const newEntry: AnalysisHistory = {
        id: crypto.randomUUID(),
        text: newText,
        result: updatedResult,
        timestamp: Date.now()
      };
      setHistory(prev => [newEntry, ...prev.slice(0, 19)]);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || String(err);
      const isLimitError = msg.includes('503') || msg.toLowerCase().includes('demand') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('unavailable');
      const errorMessage = isLimitError ? "API limit exhausted. Please wait a moment and try again." : msg;
      setError(`AI Follow-up failed: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadFromHistory = (item: AnalysisHistory) => {
    setInputText(item.text);
    setResult(item.result);
    // On mobile, close history panel
    if (window.innerWidth < 1024) {
      setShowHistory(false);
    }
    // Scroll to results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'Documentation': return <BookOpen className="w-4 h-4" />;
      case 'Video': return <Video className="w-4 h-4" />;
      case 'Download': return <Download className="w-4 h-4" />;
      case 'Article': return <FileText className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your troubleshooting history?')) {
      setHistory([]);
      if (username) {
        localStorage.removeItem(`tech_guard_history_${username}`);
      }
    }
  };

  if (authStatus === 'idle') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-8 text-center border-b border-indigo-900/50 relative overflow-hidden">
             <img src="./jay-logo.png" alt="Jay Enterprises Logo" className="w-16 h-16 object-contain mx-auto mb-4 relative z-10 drop-shadow-xl" />
             <h1 className="text-2xl font-black text-white tracking-tight relative z-10">JAY ENTERPRISES</h1>
             <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1 relative z-10">TechGuard AI Terminal</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" /> Staff ID
                </label>
                <input 
                  type="text" 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-800 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" /> Password
                </label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter staff password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-800 font-medium"
                />
              </div>
              
              <button 
                type="submit"
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" /> Secure Login
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={handleGuest}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold tracking-wide transition-all active:scale-[0.98]"
              >
                Continue as Public Guest
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed font-medium px-4">
                Guest mode does not save diagnostic history and resets upon closing.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img src="./jay-logo.png" alt="Jay Enterprises Logo" className="w-10 h-10 object-contain drop-shadow-md" />
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tight text-indigo-950 leading-none">JAY ENTERPRISES</span>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none mt-1">TechGuard IT Support</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {authStatus === 'staff' ? (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          ) : (
            <span className="text-xs font-bold text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm flex items-center gap-2">
              <User className="w-3 h-3" /> GUEST
            </span>
          )}
          <button 
            onClick={() => {
              setAuthStatus('idle');
              setHistory([]);
              setUsername('');
              localStorage.removeItem('tech_guard_user');
            }}
            className="text-xs font-bold text-slate-400 hover:text-slate-500 transition-colors ml-4 underline underline-offset-4"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* History Sidebar - Overlay on small screens, sidebar on large */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="fixed inset-y-0 left-0 w-80 bg-white z-[60] shadow-2xl border-r border-slate-200 lg:static lg:col-span-3 lg:h-[calc(100vh-120px)] lg:bg-transparent lg:shadow-none lg:border-none overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Troubleshooting History
                  </h3>
                  <button onClick={() => setShowHistory(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm italic bg-white rounded-2xl border border-slate-100">
                      No previous diagnostics.
                    </div>
                  ) : (
                    history.map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            item.result.urgency === 'High' ? 'bg-red-100 text-red-700' :
                            item.result.urgency === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.result.urgency} Priority
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                          {item.text}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium italic truncate">
                          {item.result.problemSummary}
                        </p>
                      </button>
                    ))
                  )}
                  {history.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="w-full py-3 text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" /> Clear All History
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop for mobile sidebar */}
        {showHistory && (
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[55] lg:hidden" 
            onClick={() => setShowHistory(false)}
          />
        )}

        {/* Main Content Area */}
        <div className={`${showHistory ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-8 transition-all duration-300`}>
          
          {/* Input Section */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Search className="text-blue-600 w-6 h-6" />
                <h2 className="text-2xl font-bold text-slate-800">Support Terminal</h2>
              </div>
              
              <p className="text-slate-500 text-sm mb-6 leading-relaxed max-w-2xl">
                Describe your IT infrastructure, networking, CCTV, or hardware issue. 
                TechGuard AI by Jay Enterprises will diagnose the root cause and provide optimized solutions.
              </p>

              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ex: My laptop keeps blue-screening when I open Chrome, and the fans are making a loud clicking noise..."
                  className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none text-base placeholder:text-slate-400 shadow-inner"
                />
                <div className="absolute bottom-4 right-4 text-[10px] text-slate-300 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  {inputText.length} bytes
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={analyzeProblem}
                  disabled={isAnalyzing || !inputText.trim()}
                  className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-white transition-all shadow-lg
                    ${isAnalyzing || !inputText.trim() 
                      ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 hover:shadow-indigo-500/30 active:scale-[0.98]'
                    }`}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Running AI Diagnostics...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      Launch Diagnostics
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setInputText('')}
                  className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all text-sm"
                >
                  Clear Input
                </button>
              </div>

              {/* Error Message Display */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Diagnosis Error</h4>
                      <p className="text-sm">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <AnimatePresence mode="wait">
            {!result ? (
              !isAnalyzing && (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 flex flex-col items-center justify-center text-center p-12 bg-white/50 rounded-3xl border-2 border-dashed border-slate-300"
                >
                  <div className="bg-slate-200 p-5 rounded-full mb-6">
                    <Cpu className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3 text-balance">The system is ready for input</h3>
                  <p className="text-slate-500 max-w-md text-base leading-relaxed">
                    Once you provide problem details, our deep learning engine will generate technical fixes and link you to relevant resources.
                  </p>
                </motion.div>
              )
            ) : (
              <motion.div
                key={result.problemSummary}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {/* Result Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full ${
                        result.urgency === 'High' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                        result.urgency === 'Medium' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                      }`} />
                      <span className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Diagnosis Report</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 leading-tight">
                      {result.problemSummary}
                    </h2>
                    {/* Local Neural Engine Tag */}
                    {result.localAnalysis && result.localAnalysis.confidence !== undefined && (
                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Local Neural Engine</p>
                            <p className="text-sm font-bold text-slate-800">{result.localAnalysis.prediction}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Confidence</p>
                          <p className="text-sm font-black text-blue-600">{(result.localAnalysis.confidence * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-6">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Analyzed: {new Date().toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-bold">{result.urgency} Urgency</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 rounded-3xl shadow-xl shadow-indigo-900/20 text-white flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-indigo-300 uppercase tracking-widest text-[10px] block mb-2">Root Cause Analysis</span>
                      <p className="text-sm leading-relaxed font-medium text-slate-100">
                        {result.rootCause}
                      </p>
                    </div>
                    <div className="mt-6 flex gap-2">
                       <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                       <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Verified Jay Enterprises Solution</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Solutions */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Step-by-Step Fixes
                      </h3>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{result.solutions.length} Methods Found</span>
                    </div>

                    {result.solutions.map((solution, sIdx) => (
                      <motion.div 
                        key={sIdx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: sIdx * 0.1 }}
                        className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center group-hover:bg-slate-50 transition-colors">
                          <h4 className="font-bold text-slate-900">{solution.title}</h4>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
                            solution.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                            solution.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {solution.difficulty}
                          </span>
                        </div>
                        <div className="p-6 space-y-4">
                          <p className="text-xs text-slate-500 italic leading-relaxed">
                            {solution.explanation}
                          </p>
                          <div className="space-y-3">
                            {solution.steps.map((step, stepIdx) => (
                              <div key={stepIdx} className="flex gap-3 items-start group/step">
                                <span className="flex-shrink-0 w-5 h-5 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center text-[10px] font-bold group-hover/step:bg-indigo-600 group-hover/step:text-white transition-colors">
                                  {stepIdx + 1}
                                </span>
                                <span className="text-sm text-slate-600 leading-tight pt-0.5">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Resources & Links */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <ExternalLink className="w-5 h-5 text-indigo-600" />
                      Helpful Links & Resources
                    </h3>
                    
                    <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute bottom-0 right-0 opacity-10 p-4">
                         <Search className="w-32 h-32" />
                       </div>
                       
                       <div className="relative z-10 space-y-4">
                         {result.resources.map((link, lIdx) => (
                           <motion.a
                             key={lIdx}
                             href={link.url}
                             target="_blank"
                             rel="noopener noreferrer"
                             initial={{ opacity: 0, x: 20 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: 0.3 + (lIdx * 0.1) }}
                             className="block group"
                           >
                             <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all">
                               <div className="flex items-center gap-3">
                                 <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    {getResourceIcon(link.type)}
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="text-sm font-bold">{link.label}</span>
                                   <span className="text-[10px] text-slate-400 uppercase tracking-widest">{link.type}</span>
                                 </div>
                               </div>
                               <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                             </div>
                           </motion.a>
                         ))}
                         
                         {result.resources.length === 0 && (
                           <p className="text-slate-400 text-sm italic">No specific external resources required for this fix.</p>
                         )}
                       </div>

                       <div className="mt-8 pt-8 border-t border-white/10">
                          <h4 className="flex items-center gap-2 text-blue-400 font-bold mb-4 italic text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Pro Support Note
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Always back up your important data before attempting hardware fixes or registry modifications. If the problem persists, contact a certified professional technician.
                          </p>
                       </div>
                    </div>

                    {/* History Visual */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="text-indigo-600 w-5 h-5" />
                          <h3 className="font-bold text-slate-800">Support Metrics</h3>
                        </div>
                      </div>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                          <BarChart data={[
                            { name: 'Complexity', value: result.solutions.some(s => s.difficulty === 'Advanced') ? 95 : 60 },
                            { name: 'Risk Level', value: result.urgency === 'High' ? 85 : 40 },
                            { name: 'Success Rate', value: 92 }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                            />
                            <YAxis hide />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} label={{ position: 'top', fill: '#64748b', fontSize: 10, formatter: (val: number) => `${val}%` }}>
                              <Cell fill="#4f46e5" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#10b981" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Follow-up Section */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mt-8">
                  <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Follow-up Chat
                  </h3>
                  <p className="text-slate-500 text-sm mb-4">
                    Still need help? Provide more details or ask a follow-up question, and we'll regenerate the entire analysis.
                  </p>
                  <textarea
                    value={followupText}
                    onChange={(e) => setFollowupText(e.target.value)}
                    placeholder="Ex: I tried the SMC reset but the issue still persists. The fan noise is louder now..."
                    className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none text-base placeholder:text-slate-400 shadow-inner mb-4"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleFollowup}
                      disabled={isAnalyzing || !followupText.trim()}
                      className={`px-8 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-lg
                        ${isAnalyzing || !followupText.trim()
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                        }`}
                    >
                      {isAnalyzing ? 'Regenerating...' : 'Generate again'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={() => {
                      setInputText('');
                      setResult(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-3 hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Diagnose Another Problem
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-6 mt-8 border-t border-indigo-500/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center md:items-start gap-6">
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <img src="./jay-logo.png" alt="Jay Enterprises Logo" className="w-6 h-6 object-contain" />
              <h3 className="text-lg font-black text-white tracking-tight">JAY ENTERPRISES</h3>
            </div>
            <p className="text-xs text-indigo-300 font-bold mb-2 uppercase tracking-wider">IT Infrastructure Developer and Support</p>
            <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-400 font-medium">
              <ul className="space-y-1">
                <li>• Networking Security</li>
                <li>• Network Infrastructure</li>
                <li>• Internet & Cloud Services</li>
              </ul>
              <ul className="space-y-1">
                <li>• Power Backup Solutions</li>
                <li>• Computers and Peripherals</li>
                <li>• CCTV & Optical Network Solutions</li>
              </ul>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col text-xs space-y-2 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-700/50 md:pl-8">
            <h4 className="font-bold text-white uppercase tracking-wider mb-1">Contact Us</h4>
            <div className="space-y-1.5">
              <p className="text-slate-300 flex items-start"><span className="text-indigo-400 font-bold w-16 shrink-0">Address:</span><span className="flex-1">Shop No. 3, Shri Sudarshan Plaza, MSEB-Vrundavan Vilas Road, Vishrambag, Sangli, 416416</span></p>
              <p className="text-slate-300 flex items-start"><span className="text-indigo-400 font-bold w-16 shrink-0">Phone:</span><span className="flex-1">9850833066, 9405678249</span></p>
              <p className="text-slate-300 flex items-start"><span className="text-indigo-400 font-bold w-16 shrink-0">Email:</span><span className="flex-1">jayenterprisessangli@gmail.com</span></p>
            </div>
          </div>
        </div>
        <div className="text-center mt-6 text-[10px] text-slate-500 font-medium tracking-wide">
          © {new Date().getFullYear()} Jay Enterprises. Offering our best IT services for the last 25 years...
        </div>
      </footer>
    </div>
  );
}
