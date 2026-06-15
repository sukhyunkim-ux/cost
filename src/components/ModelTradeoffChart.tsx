import React, { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ModelInfo } from '../types';
import { ArrowUpRight, DollarSign, Activity, Zap, Cpu, Award } from 'lucide-react';

interface ModelTradeoffChartProps {
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  onSelectModel: (model: ModelInfo) => void;
}

export default function ModelTradeoffChart({
  models,
  selectedModel,
  onSelectModel,
}: ModelTradeoffChartProps) {
  const [activeBenchmark, setActiveBenchmark] = useState<'mmlu' | 'coding' | 'math' | 'elo'>('mmlu');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate pricing metrics for easy visualization
  const processedData = useMemo(() => {
    return models.map((model) => {
      // average cost of 1M input & 1M output tokens
      const avgCostPerM = (model.inputPricePerM + model.outputPricePerM) / 2;
      
      // select target benchmark score
      let score = model.scoreMMLU;
      if (activeBenchmark === 'coding') score = model.scoreCoding;
      if (activeBenchmark === 'math') score = model.scoreMath;
      if (activeBenchmark === 'elo') score = model.scoreArenaElo;

      return {
        ...model,
        avgCostPerM,
        activeScore: score,
        displayName: model.name.length > 25 ? `${model.name.substring(0, 25)}...` : model.name,
      };
    });
  }, [models, activeBenchmark]);

  // Filters
  const filteredData = useMemo(() => {
    return processedData.filter((m) => {
      const matchFamily = familyFilter === 'all' || 
        (familyFilter === 'qwen' && m.family.startsWith('qwen')) ||
        (familyFilter === 'qwen-open' && m.family === 'qwen-open') ||
        (familyFilter === 'qwen-api' && m.family === 'qwen-commercial') ||
        (familyFilter === 'competitors' && m.family.startsWith('competitors'));

      const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchFamily && matchSearch;
    });
  }, [processedData, familyFilter, searchQuery]);

  // Grouped for chart rendering
  const series = useMemo(() => {
    const qwenOpen = filteredData.filter(d => d.family === 'qwen-open');
    const qwenCom = filteredData.filter(d => d.family === 'qwen-commercial');
    const qwenSpec = filteredData.filter(d => d.family === 'qwen-specialized');
    const competitors = filteredData.filter(d => d.family.startsWith('competitors'));

    return [
      { name: 'Qwen Open Weights', data: qwenOpen, fill: '#10B981' }, // Emerald
      { name: 'Qwen Commercial API', data: qwenCom, fill: '#3B82F6' }, // Blue
      { name: 'Qwen Specialized (Coder/Math)', data: qwenSpec, fill: '#8B5CF6' }, // Purple
      { name: 'Western Competitors', data: competitors, fill: '#EF4444' }, // Red
    ];
  }, [filteredData]);

  const benchmarkDetails = {
    mmlu: { name: 'MMLU Benchmark', desc: 'General knowledge (0-100 scale). Gauges broad language capability across 57 subjects.' },
    coding: { name: 'HumanEval Coding', desc: 'Code writing capability (0-100 scale). Measures correct Python code completions.' },
    math: { name: 'GSM8K Math Accuracy', desc: 'Grade school multi-step math word problems (0-100 scale). Benchmarks analytical logic.' },
    elo: { name: 'LMSYS Arena Standard', desc: 'Normalized human evaluation score scaled 50-100. Measures actual user chat preference.' },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ModelInfo & { avgCostPerM: number; activeScore: number } = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3.5 rounded-lg shadow-xl max-w-xs text-xs space-y-2 backdrop-blur-md">
          <div className="font-bold text-slate-100 text-sm">{data.name}</div>
          <div className="flex justify-between text-slate-300">
            <span>Core Parameters:</span>
            <span className="font-mono font-medium text-slate-100">{data.parameters}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Avg Blended Price:</span>
            <span className="font-mono font-medium text-amber-400">${data.avgCostPerM.toFixed(4)}/M tok</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Score:</span>
            <span className="font-mono font-bold text-emerald-400">{data.activeScore.toFixed(1)}%</span>
          </div>
          <div className="text-slate-400 italic text-[11px] pt-1 border-t border-slate-850">
            {data.description.substring(0, 100)}...
          </div>
          <div className="text-[10px] text-indigo-400 font-semibold mt-1">
            Click node to view full details
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart Panel */}
      <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[580px]" id="chart-panel">
        
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/40 pb-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Intelligence vs. Price Map
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Compare value ROI. Top left equals optimal efficiency (High Capability, Low Cost).
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {(['mmlu', 'coding', 'math', 'elo'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveBenchmark(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeBenchmark === key
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <div className="w-full sm:w-auto flex items-center gap-2 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5">
            <span className="text-slate-500 text-xs font-semibold whitespace-nowrap">Group:</span>
            <select
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
              className="bg-transparent text-slate-300 text-xs font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="all">All Models</option>
              <option value="qwen">Qwen Ecosystem</option>
              <option value="qwen-open">Qwen Open Weights</option>
              <option value="qwen-api">Qwen Commercial API</option>
              <option value="competitors">Western Competitors</option>
            </select>
          </div>

          <div className="w-full sm:flex-1">
            <input
              type="text"
              placeholder="Search specific model (e.g. Llama, Coder, 72b)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-slate-500 transition-all placeholder-slate-500"
            />
          </div>
        </div>

        {/* Chart View */}
        <div className="flex-1 w-full bg-slate-950/40 rounded-xl p-3 relative" style={{ minHeight: '320px' }}>
          
          {/* Y Axis Labels for direction */}
          <div className="absolute top-4 left-14 z-10 text-[10px] uppercase font-bold text-emerald-400/80 bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/20">
            More Intelligent ↑
          </div>
          <div className="absolute bottom-16 right-4 z-10 text-[10px] uppercase font-bold text-rose-400/80 bg-slate-900/80 px-2 py-0.5 rounded border border-rose-500/20">
            More Costly →
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                type="number"
                dataKey="avgCostPerM"
                name="Price per Million"
                unit="$"
                stroke="#64748B"
                fontSize={10}
                domain={[0, 'auto']}
                tickFormatter={(val) => `$${val.toFixed(2)}`}
              />
              <YAxis
                type="number"
                dataKey="activeScore"
                name="Benchmark Score"
                unit="%"
                stroke="#64748B"
                fontSize={10}
                domain={[40, 100]}
              />
              <ZAxis range={[100, 450]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              {/* Reference lines for zones */}
              <ReferenceLine y={80} stroke="#475569" strokeDasharray="5 5" label={{ value: "High Tier Intelligence", fill: "#94A3B8", fontSize: 9, position: 'top' }} />

              {series.map((s) => (
                <Scatter
                  key={s.name}
                  name={s.name}
                  data={s.data}
                  fill={s.fill}
                  onClick={(node) => onSelectModel(node)}
                  className="cursor-pointer"
                >
                  {s.data.map((entry, index) => {
                    const isSelected = selectedModel?.id === entry.id;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        stroke={isSelected ? '#FFFFFF' : s.fill}
                        strokeWidth={isSelected ? 3 : 1}
                        fill={s.fill}
                        opacity={isSelected ? 1 : 0.8}
                        className="transition-all duration-300 hover:scale-125 focus:outline-none"
                      />
                    );
                  })}
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-slate-700/30 text-xs">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} />
              <span className="text-slate-300 font-medium">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card / Inspector Sidebar */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between" id="model-inspector">
        {selectedModel ? (
          <div className="space-y-5 flex-1 flex flex-col justify-between">
            {/* Model Title & Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedModel.family.startsWith('qwen')
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                }`}>
                  {selectedModel.parameters === 'Closed API' ? 'Commercial API' : `${selectedModel.parameters} Weights`}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  {selectedModel.type.toUpperCase()}
                </span>
              </div>
              <h4 className="text-xl font-bold text-slate-100 leading-tight">
                {selectedModel.name}
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                {selectedModel.description}
              </p>
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-2 gap-3.5 bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-amber-400" /> Input Price
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  ${selectedModel.inputPricePerM.toFixed(3)}
                  <span className="text-[10px] text-slate-400 font-normal"> /M tokens</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-red-400" /> Output Price
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  ${selectedModel.outputPricePerM.toFixed(3)}
                  <span className="text-[10px] text-slate-400 font-normal"> /M tokens</span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-indigo-400" /> Context Window
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  {(selectedModel.contextWindow / 1000).toFixed(0)}K
                  <span className="text-[10px] text-slate-400 font-normal"> tokens</span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <Award className="h-3 w-3 text-emerald-400" /> Avg Speed
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  ~{selectedModel.speedTokensPerSec}
                  <span className="text-[10px] text-slate-400 font-normal"> tok/s</span>
                </div>
              </div>
            </div>

            {/* Benchmark Scores */}
            <div className="space-y-3">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Benchmark Quality Breakdown
              </h5>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 font-semibold mb-1">
                    <span>MMLU (General Intelligence)</span>
                    <span className="text-emerald-400 font-mono">{selectedModel.scoreMMLU}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style={{ width: `${selectedModel.scoreMMLU}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-semibold mb-1">
                    <span>HumanEval (Syntactic Coding)</span>
                    <span className="text-purple-400 font-mono">{selectedModel.scoreCoding}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full" style={{ width: `${selectedModel.scoreCoding}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-semibold mb-1">
                    <span>GSM8K (Logical Mathematics)</span>
                    <span className="text-blue-400 font-mono">{selectedModel.scoreMath}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" style={{ width: `${selectedModel.scoreMath}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-700/30">
              <div className="flex justify-between">
                <span className="text-slate-400">Hosting Requirement:</span>
                <span className="text-slate-200 font-medium flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5 text-slate-400" />
                  {selectedModel.hardwareRequired}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Distribution License:</span>
                <span className="text-slate-200 font-semibold max-w-[180px] truncate text-right">
                  {selectedModel.license}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Release Date:</span>
                <span className="text-slate-200 font-mono">
                  {selectedModel.releaseDate}
                </span>
              </div>
            </div>

            {/* CTA action */}
            <div className="pt-2">
              <a
                href={selectedModel.family === 'qwen-commercial' ? 'https://www.alibabacloud.com/help/en/model-studio/' : `https://huggingface.co/Qwen/${selectedModel.name}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500/50 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 font-medium text-xs shadow-sm"
              >
                Access Model Assets
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 my-auto text-slate-500 space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/40">
              <Zap className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-300">No Model Monitored</p>
              <p className="text-[11px] text-slate-500 max-w-[200px] mt-1">
                Click any coordinate bubble in the graph to inspect live benchmark telemetry and API pricing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
