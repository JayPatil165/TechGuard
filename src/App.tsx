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
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisResult, AnalysisHistory, TechnicalSolution, ResourceLink } from './types';

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

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tech_guard_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('tech_guard_history', JSON.stringify(history));
  }, [history]);

  const analyzeProblem = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null); // Clear previous result to show loading state properly

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setResult(data);
      
      const newEntry: AnalysisHistory = {
        id: crypto.randomUUID(),
        text: inputText,
        result: data,
        timestamp: Date.now()
      };
      
      setHistory(prev => [newEntry, ...prev.slice(0, 19)]); // Keep last 20
    } catch (err) {
      console.error(err);
      setError("AI Diagnosis failed. Please try again.");
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
      localStorage.removeItem('tech_guard_history');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Cpu className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">TechGuard</span>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">AI Solutions</span>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <a href="#" className="hidden md:block text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">Documentation</a>
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
                Describe the computer symptoms, technical issues, or hardware failures you are experiencing. 
                TechGuard AI will diagnose the root cause and provide instant solutions.
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
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-[0.98]'
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
                    {result.localAnalysis && (
                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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

                  <div className="bg-blue-600 p-8 rounded-3xl shadow-xl shadow-blue-500/20 text-white flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-blue-200 uppercase tracking-widest text-[10px] block mb-2">Root Cause Analysis</span>
                      <p className="text-sm leading-relaxed font-medium">
                        {result.rootCause}
                      </p>
                    </div>
                    <div className="mt-6 flex gap-2">
                       <CheckCircle2 className="w-5 h-5 text-blue-300" />
                       <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Verified Solution Set</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Solutions */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
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
                                <span className="flex-shrink-0 w-5 h-5 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center text-[10px] font-bold group-hover/step:bg-blue-600 group-hover/step:text-white transition-colors">
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
                      <ExternalLink className="w-5 h-5 text-blue-600" />
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
                                 <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
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
                          <TrendingUp className="text-blue-600 w-5 h-5" />
                          <h3 className="font-bold text-slate-800">Support Metrics</h3>
                        </div>
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
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
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                              <Cell fill="#3b82f6" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#10b981" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={() => {
                      setInputText('');
                      setResult(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    Diagnose Another Problem
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>


    </div>
  );
}
