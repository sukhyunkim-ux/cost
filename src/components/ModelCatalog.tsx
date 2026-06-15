import React, { useState, useMemo } from 'react';
import { ModelInfo } from '../types';
import { Layers, Search, Cpu, Calendar, Award, Zap, BookOpen, HardDrive, ShieldCheck, ThumbsUp, Sparkles, Filter } from 'lucide-react';

interface ModelCatalogProps {
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  onSelectModel: (model: ModelInfo) => void;
}

export default function ModelCatalog({ models, selectedModel, onSelectModel }: ModelCatalogProps) {
  const [search, setSearch] = useState('');
  const [familyTab, setFamilyTab] = useState<'all' | 'open' | 'api' | 'specialized'>('all');

  const filtered = useMemo(() => {
    return models.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase()) ||
        m.hardwareRequired.toLowerCase().includes(search.toLowerCase());

      const matchesTab = familyTab === 'all' ||
        (familyTab === 'open' && m.family === 'qwen-open') ||
        (familyTab === 'api' && m.family === 'qwen-commercial') ||
        (familyTab === 'specialized' && m.family === 'qwen-specialized');

      return matchesSearch && matchesTab;
    });
  }, [models, search, familyTab]);

  return (
    <div className="space-y-6">
      
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'Complete Catalog' },
            { id: 'open', label: 'Qwen Open Weights' },
            { id: 'api', label: 'Qwen Enterprise APIs' },
            { id: 'specialized', label: 'Specialists (Coder/Math)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFamilyTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                familyTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                  : 'bg-slate-900/40 text-slate-450 border border-transparent hover:text-slate-200Hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search model specs or hardware..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-slate-350 text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((model) => {
          const isSelected = selectedModel?.id === model.id;
          
          let cardTypeLabel = 'General Utility';
          let borderTheme = 'border-slate-800/80';
          if (model.type === 'coder') {
            cardTypeLabel = 'Syntax Specialist';
            borderTheme = isSelected ? 'border-purple-500' : 'hover:border-purple-500/30';
          } else if (model.type === 'math') {
            cardTypeLabel = 'Numeric Analyst';
            borderTheme = isSelected ? 'border-blue-500' : 'hover:border-blue-500/30';
          } else if (model.family === 'qwen-commercial') {
            cardTypeLabel = 'Enterprise SaaS';
            borderTheme = isSelected ? 'border-amber-500' : 'hover:border-amber-500/30';
          } else {
            borderTheme = isSelected ? 'border-emerald-500' : 'hover:border-emerald-500/30';
          }

          return (
            <div
              key={model.id}
              onClick={() => onSelectModel(model)}
              className={`bg-slate-800/20 rounded-2xl p-5 border ${borderTheme} transition-all duration-300 cursor-pointer flex flex-col justify-between h-[280px] hover:shadow-lg relative overflow-hidden group select-none`}
            >
              {/* Corner accent glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent blur-xl scale-0 group-hover:scale-110 transition-all duration-500" />

              <div className="space-y-4">
                {/* Categorization & Metrics */}
                <div className="flex justify-between items-center text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                    model.type === 'coder' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/15' :
                    model.type === 'math' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/15' :
                    model.family === 'qwen-commercial' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/15' :
                    'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15'
                  }`}>
                    {cardTypeLabel}
                  </span>
                  
                  <span className="font-mono text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {model.releaseDate}
                  </span>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-100 text-base flex items-center justify-between">
                    {model.name}
                    {isSelected && (
                      <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse shrink-0 ml-1" />
                    )}
                  </h4>
                  <p className="text-slate-400 text-xs leading-normal line-clamp-3">
                    {model.description}
                  </p>
                </div>
              </div>

              {/* Specs footer */}
              <div className="pt-3 border-t border-slate-700/20 grid grid-cols-3 gap-2 text-[11px] font-medium text-slate-450">
                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-tight">Scope Limit</span>
                  <span className="text-slate-200 font-mono flex items-center gap-0.5">
                    <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                    {(model.contextWindow / 1000).toFixed(0)}K
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-tight">Avg Speed</span>
                  <span className="text-slate-200 font-mono flex items-center gap-0.5">
                    <Award className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {model.speedTokensPerSec} t/s
                  </span>
                </div>

                <div className="space-y-0.5 truncate">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-tight">Hardware Node</span>
                  <span className="text-slate-200 truncate flex items-center gap-0.5">
                    <Cpu className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{model.hardwareRequired.split('or ')[0]}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded detailed specifications if any model is selected */}
      {selectedModel && (
        <div className="mt-8 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700/40 pb-5">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> Comprehensive Technical Playbook Deep Dive
              </div>
              <h3 className="text-xl font-bold text-white">{selectedModel.name} Parameters</h3>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-900 border border-slate-750 text-xs text-slate-350 font-bold font-mono rounded-lg">
                Parameters: {selectedModel.parameters}
              </span>
              <span className="px-3 py-1 bg-slate-900 border border-slate-755 text-xs text-slate-350 font-bold font-mono rounded-lg">
                Type: {selectedModel.type.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Deploy recommendation column */}
            <div className="bg-slate-900/55 border border-slate-800/60 p-4.5 rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                <Cpu className="h-4 w-4" /> Quantization & Server Spec
              </h4>
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">FP16 (Pure unquantized)</span>
                  <span className="text-slate-200 font-mono text-xs">{selectedModel.parameters === 'Closed API' ? 'N/A (Managed SaaS)' : `Requires ~${(parseFloat(selectedModel.parameters.replace('B','')) * 2).toFixed(0)} GB VRAM`}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Recommended Deployment (Int8 / AWQ)</span>
                  <span className="font-semibold text-slate-150">{selectedModel.parameters === 'Closed API' ? 'Alibaba DashScope Cloud API Node' : `Fits on ${selectedModel.hardwareRequired}`}</span>
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/15 rounded-lg text-indigo-300">
                  <span className="font-bold block mb-0.5">Deployment Framework recommendation</span>
                  Use <strong>vLLM</strong> or <strong>Ollama</strong> as the serving engine. vLLM provides batch scheduling speedups of up to 400% on concurrent tasks.
                </div>
              </div>
            </div>

            {/* Strengths and task profile */}
            <div className="bg-slate-900/55 border border-slate-800/60 p-4.5 rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4" /> Targeted Task Profiles
              </h4>
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Primary Target Tasks:</span>
                  <p className="text-slate-300">
                    {selectedModel.type === 'coder' ? 'Intensive multi-file code editing, bug mitigation, unit tests generation, shell tasks.' :
                     selectedModel.type === 'math' ? 'Data analytics dashboards, statistical modeling calculations, calculus proofing.' :
                     'High-concurrency translations, agent interactions workflows, generalized question-answering pipelines.'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Benchmark Positioning:</span>
                  <p className="text-slate-300">
                    It achieves MMLU score of <strong>{selectedModel.scoreMMLU}%</strong> and reaches standard human preference level of <strong>{selectedModel.scoreArenaElo}%</strong> inside major evaluation setups.
                  </p>
                </div>
              </div>
            </div>

            {/* Operational instructions policy */}
            <div className="bg-slate-900/55 border border-slate-800/60 p-4.5 rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                <HardDrive className="h-4 w-4" /> Licensing & Distribution Policy
              </h4>
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Standard Distribution License</span>
                  <span className="text-slate-200 font-mono font-bold">{selectedModel.license}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Commercial Deployment Eligibility</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> Approved for commercial application build
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-lg text-emerald-300">
                  <span className="font-bold block mb-0.5">License Policy Guide</span>
                  Qwen open weight models (under 72B) use Apache 2.0 or custom Qwen licenses permitting commercial and commercial-derivative workloads freely.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
