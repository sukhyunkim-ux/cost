import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modelsData } from './data/modelsData';
import { ModelInfo } from './types';
import ModelTradeoffChart from './components/ModelTradeoffChart';
import PolicyRouter from './components/PolicyRouter';
import CostCalculator from './components/CostCalculator';
import ModelCatalog from './components/ModelCatalog';

import {
  TrendingUp,
  Cpu,
  Layers,
  Calculator,
  Compass,
  Award,
  DollarSign,
  HelpCircle,
  Menu,
  Activity,
  Zap,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'router' | 'roi' | 'catalog'>('matrix');
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(modelsData.find(m => m.id === 'qwen25-32b-instruct') || null);

  const handleSelectModel = (model: ModelInfo) => {
    setSelectedModel(model);
  };

  // Compute key high-level dashboard variables
  const qwenModelsCount = modelsData.filter(m => m.id.startsWith('qwen')).length;
  const cheapestModelPrice = Math.min(...modelsData.filter(m => m.id.startsWith('qwen')).map(m => (m.inputPricePerM + m.outputPricePerM) / 2));
  const topBenchScore = Math.max(...modelsData.filter(m => m.id.startsWith('qwen')).map(m => m.scoreMMLU));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1 px-2.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                Qwen Hub
              </span>
              <span>Cost-Quality Decision Matrix</span>
            </h1>
            <p className="text-xs text-slate-400">
              Evaluate deployment policies. Instantly compare models across benchmarks, commercial APIs, and localized GPU infrastructure.
            </p>
          </div>

          {/* Quick high-level stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="bg-slate-905 border border-slate-850 rounded-xl p-2 px-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Indexed Nodes</span>
                <span className="font-bold text-slate-200 font-mono">{modelsData.length} Models ({qwenModelsCount} Qwen)</span>
              </div>
            </div>

            <div className="bg-slate-905 border border-slate-850 rounded-xl p-2 px-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Starting Rate</span>
                <span className="font-bold text-emerald-400 font-mono">${cheapestModelPrice.toFixed(2)}/M tokens</span>
              </div>
            </div>

            <div className="bg-slate-905 border border-slate-850 rounded-xl p-2 px-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Top Benchmark</span>
                <span className="font-bold text-slate-200 font-mono">{topBenchScore.toFixed(1)}% MMLU</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-900 pb-px">
          <nav className="flex gap-2 w-full overflow-x-auto pb-2">
            {[
              {
                id: 'matrix',
                label: 'Cost-Quality Mapping',
                desc: 'Value Efficiency Map',
                icon: Activity,
              },
              {
                id: 'router',
                label: 'Policy Target Router',
                desc: 'Smart Workload Recommendation',
                icon: Compass,
              },
              {
                id: 'roi',
                label: 'ROI & Hosting Calculator',
                desc: 'Compute Cost Projection',
                icon: Calculator,
              },
              {
                id: 'catalog',
                label: 'Specifications Catalog',
                desc: 'Quantization & Licensing',
                icon: Cpu,
              },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-3.5 rounded-2xl border text-left transition-all relative group flex items-start gap-3 select-none ${
                    isActive
                      ? 'bg-slate-900 border-slate-800 text-white shadow-inner'
                      : 'bg-transparent border-transparent text-slate-450 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                  style={{ minWidth: '180px' }}
                >
                  <div className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                    isActive 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-500 group-hover:text-slate-300'
                  }`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5 truncate text-left">
                    <span className="font-bold text-xs block leading-tight">{tab.label}</span>
                    <span className="text-[10px] text-slate-500 block truncate font-medium">{tab.desc}</span>
                  </div>

                  {/* Active highlight line bottom */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-6 right-6 h-0.5 bg-emerald-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dynamic Tab Panes with Fade Animation for seamless experience */}
        <div className="pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.23, ease: 'easeOut' }}
            >
              {activeTab === 'matrix' && (
                <ModelTradeoffChart
                  models={modelsData}
                  selectedModel={selectedModel}
                  onSelectModel={handleSelectModel}
                />
              )}

              {activeTab === 'router' && (
                <PolicyRouter
                  models={modelsData}
                  onSelectModel={handleSelectModel}
                />
              )}

              {activeTab === 'roi' && (
                <CostCalculator
                  models={modelsData}
                  selectedModel={selectedModel}
                />
              )}

              {activeTab === 'catalog' && (
                <ModelCatalog
                  models={modelsData}
                  selectedModel={selectedModel}
                  onSelectModel={handleSelectModel}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer detailing architectural specs & licensing */}
      <footer className="border-t border-slate-900 py-6 mt-12 bg-slate-950/80 text-center text-[11px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            <Cpu className="h-3.5 w-3.5" />
            <span>Structured Cost Policies Engine v2.5 • Optimized for Qwen LLMs</span>
          </div>
          <div>
            <span>Referenced with Alibaba DashScope pricing indices: 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
