import React, { useState, useMemo } from 'react';
import { ModelInfo, RouterParams } from '../types';
import { Sliders, Shield, Layers, HelpCircle, Code, CheckCircle, Terminal, HelpCircle as HelpIcon, ArrowRight, Sparkles, Copy, Check } from 'lucide-react';

interface PolicyRouterProps {
  models: ModelInfo[];
  onSelectModel: (model: ModelInfo) => void;
}

export default function PolicyRouter({ models, onSelectModel }: PolicyRouterProps) {
  const [params, setParams] = useState<RouterParams>({
    category: 'general',
    contextLength: 'mid',
    priority: 50,
    concurrency: 5,
    estimatedMonthlyRequests: 50000,
  });

  const [copiedCode, setCopiedCode] = useState(false);

  // Recommendations generator
  const recommendations = useMemo(() => {
    // Standardize min/max costs for normalization
    const avgCosts = models.map(m => (m.inputPricePerM + m.outputPricePerM) / 2);
    const minCost = Math.min(...avgCosts);
    const maxCost = Math.max(...avgCosts);

    const scored = models.map((model) => {
      const avgCost = (model.inputPricePerM + model.outputPricePerM) / 2;
      
      // 1. Cost Score (Lower is better, so normalized is higher for low costs)
      // Normalize cost logarithmically or linearly. Let's use a nice range mapping
      let costScore = 1;
      if (maxCost > minCost) {
        // Use a inverse log formulation since LLM prices scale exponentially
        costScore = 1 - (Math.log(avgCost + 1) - Math.log(minCost + 1)) / (Math.log(maxCost + 1) - Math.log(minCost + 1));
      }

      // 2. Intelligence/Quality Score depending on context
      let qualityScore = model.scoreMMLU;
      if (params.category === 'coder') {
        qualityScore = model.scoreCoding * 0.8 + model.scoreMMLU * 0.2;
      } else if (params.category === 'math') {
        qualityScore = model.scoreMath * 0.8 + model.scoreMMLU * 0.2;
      } else if (params.category === 'translation') {
        qualityScore = model.scoreMMLU * 0.7 + model.scoreArenaElo * 0.3; // translations heavily benefit from conversational alignment
      } else if (params.category === 'latency') {
        // Weight speed heavily relative to size
        const speedFactor = Math.min(model.speedTokensPerSec / 150, 1) * 30; // max 30 pts for speed
        qualityScore = model.scoreArenaElo * 0.7 + speedFactor;
      }

      // Normalize Quality score out of 100 to decimal
      const normalizedQuality = qualityScore / 100;

      // 3. User choice priority balance
      const priorityFactor = params.priority / 100; // 0 = cost-focused, 1 = quality-focused
      
      let matchScore = (normalizedQuality * priorityFactor) + (costScore * (1 - priorityFactor));

      // 4. Multipliers/Penalties for Context Limits
      if (params.contextLength === 'large') {
        if (model.contextWindow < 128000) {
          matchScore *= 0.5; // Heavy penalty if huge context is required but the model only has 32k
        }
      } else if (params.contextLength === 'mid') {
        if (model.contextWindow < 32000) {
          matchScore *= 0.7; // minor penalty
        }
      }

      // Multiplier for category alignment
      if (params.category === 'coder' && model.type === 'coder') {
        matchScore *= 1.15; // Boost specialist code models
      }
      if (params.category === 'math' && model.type === 'math') {
        matchScore *= 1.15; // Boost specialist math models
      }

      // Cap match score at 1.0 (100%)
      const matchPercent = Math.min(Math.max(matchScore * 100, 0), 100);

      return {
        model,
        matchPercent,
        avgCost,
      };
    });

    // Sort by Match Score descending
    return scored.sort((a, b) => b.matchPercent - a.matchPercent);
  }, [models, params]);

  const topChoice = recommendations[0]?.model;
  const runnerUps = recommendations.slice(1, 4);

  // Suggested prompt based on category and model
  const suggestedPolicyPrompt = useMemo(() => {
    if (!topChoice) return '';
    const tempLimit = params.priority > 50 ? '0.2 (Rigorous)' : '0.7 (Creative)';
    
    let domainGuideline = '';
    if (params.category === 'coder') {
      domainGuideline = '- Write production-grade code adhering to Clean Code standards.\n- Avoid placeholder comments like // TODO or // implement here.\n- Provide exhaustive type annotations and error-handling.';
    } else if (params.category === 'math') {
      domainGuideline = '- Format all final equations in unambiguous LaTeX block styles.\n- Solve step-by-step using first principles chain-of-thought analysis.\n- Verify calculations and edge cases before outputting.';
    } else if (params.category === 'translation') {
      domainGuideline = '- Preserve colloquial tone and professional idioms precisely.\n- Do not literal-translate. Match natural native structural patterns.\n- Format output strictly as requested, avoiding conversational filler.';
    } else {
      domainGuideline = '- Answer objectively with scientific depth.\n- Align text structure to human-scannable paragraphs with markdown headings.';
    }

    return `SYSTEM: You are structured as a backend policy worker powered by ${topChoice.name}.
TEMPERATURE: ${tempLimit}
MAX_TOKENS: ${params.contextLength === 'large' ? '8192' : '2048'}
POLICIES:
${domainGuideline}
- Respond strictly using JSON or Markdown outputs without conversational fluff.
- Adhere to the security-bound token policy strictly limit output cost.`;
  }, [topChoice, params]);

  const apiConnectionCode = useMemo(() => {
    if (!topChoice) return '';
    const modelString = topChoice.id.includes('coder') ? 'qwen2.5-coder' : topChoice.id;
    return `import os
from openai import OpenAI

# Initialize client pointing to secure Qwen Endpoint
client = OpenAI(
    api_key=os.environ.get("QWEN_API_KEY", "your-key-here"),
    base_url="${topChoice.family === 'qwen-commercial' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1' : 'https://api.deepinfra.com/v1/openai'}"
)

completion = client.chat.completions.create(
    model="${modelString}",  # Target: ${topChoice.name}
    messages=[
        {"role": "system", "content": "Adhere strictly to the defined workspace token policies."},
        {"role": "user", "content": "Reflow the logic tree of this operational schedule."}
    ],
    temperature=0.3,
    max_tokens=2048
)

print(completion.choices[0].message.content)`;
  }, [topChoice]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(apiConnectionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Parameter Modalities Input */}
      <div className="xl:col-span-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md space-y-6">
        <div>
          <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
            <Sliders className="h-5 w-5 text-emerald-400" />
            Workspace Policy Router
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Set your target application priorities, and our routing index locates the perfect model profile.
          </p>
        </div>

        {/* 1. Category */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-slate-400" /> Task Workload Focus
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'general', label: 'Conversational', desc: 'Standard Q&A & Writing' },
              { id: 'coder', label: 'Software Coder', desc: 'Syntax / Logic / FIM' },
              { id: 'math', label: 'Symbolic Math', desc: 'Formulas & Calculuses' },
              { id: 'translation', label: 'Localization', desc: 'Fluent translations' },
              { id: 'latency', label: 'Real-time Chat', desc: 'Zero-latency response' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setParams({ ...params, category: cat.id as any })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  params.category === cat.id
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-500/5'
                    : 'bg-slate-900/45 border-slate-850 text-slate-450 hover:bg-slate-900 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div className="font-semibold text-xs">{cat.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Context Windows */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-slate-400" /> Context Length Requirements
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'short', label: 'Short (<8K)', desc: 'Standard Chat' },
              { id: 'mid', label: 'Medium (<32K)', desc: 'Files & Snippets' },
              { id: 'large', label: 'Large (128K)', desc: 'Whole Codebase' },
            ].map((len) => (
              <button
                key={len.id}
                onClick={() => setParams({ ...params, contextLength: len.id as any })}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  params.contextLength === len.id
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs">{len.label}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{len.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Priority Weight Slider */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400">Policy Core Weight</span>
            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
              {params.priority}% Priority
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={params.priority}
            onChange={(e) => setParams({ ...params, priority: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[11px] text-slate-500 px-0.5">
            <span className="flex items-center gap-0.5">📉 Save Budget (Aggressive Cost-Cut)</span>
            <span className="flex items-center gap-0.5">✨ Peak Quality (Elite Benchmarks) 📈</span>
          </div>
        </div>

        {/* Estimated Volume details */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-705/35">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Concurrency (Users)</label>
            <input
              type="number"
              min="1"
              value={params.concurrency}
              onChange={(e) => setParams({ ...params, concurrency: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full bg-slate-950/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly API Volumes</label>
            <input
              type="number"
              min="100"
              step="1000"
              value={params.estimatedMonthlyRequests}
              onChange={(e) => setParams({ ...params, estimatedMonthlyRequests: Math.max(100, parseInt(e.target.value) || 100) })}
              className="w-full bg-slate-950/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Structured Recommendation Dashboard */}
      <div className="xl:col-span-7 flex flex-col gap-6">
        {/* Top Recommendation Header Banner */}
        {topChoice && (
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-800/30 to-indigo-950/30 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            
            {/* Absolute background visual accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Product Info left */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5 fill-emerald-300" />
                  Primary Optimal Router Target
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    {topChoice.name}
                    <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                      {recommendations[0].matchPercent.toFixed(0)}% Match
                    </span>
                  </h3>
                  <p className="text-slate-300 text-xs max-w-lg leading-relaxed">
                    {topChoice.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1 text-xs">
                  <span className="text-slate-400 font-medium">
                    Blended Cost: <span className="text-amber-400 font-mono font-bold">${recommendations[0].avgCost.toFixed(4)}</span> /M tokens
                  </span>
                  <span className="text-slate-400 font-medium">
                    Latency: <span className="text-indigo-300 font-bold">~{(1000 / topChoice.speedTokensPerSec).toFixed(0)} ms / tok</span>
                  </span>
                  <span className="text-slate-400 font-medium">
                    Limits: <span className="text-teal-400 font-bold font-mono">{(topChoice.contextWindow / 1000).toFixed(0)}K</span>
                  </span>
                </div>
              </div>

              {/* Inspector Action Button right */}
              <button
                onClick={() => onSelectModel(topChoice)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-3 rounded-xl transition font-semibold text-xs flex items-center gap-1 shadow-lg shadow-emerald-500/10 shrink-0 self-start md:self-center"
              >
                Inspect Telemetry
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Lower layout: Code / Playbook details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {/* Best Policy System Rules */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-md flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-400" /> Optimal System Token Policy
            </h4>
            <div className="flex-1 bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between">
              <pre className="text-[11px] font-mono text-slate-350 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {suggestedPolicyPrompt}
              </pre>
              <div className="text-[10px] text-slate-500 italic mt-3 pt-2.5 border-t border-slate-800/60">
                Tip: This prompt constraints redundant output formatting to save overhead, boosting throughput velocity by up to 30%.
              </div>
            </div>
          </div>

          {/* Code Integrations */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-emerald-400" /> Python API Execution
              </h4>
              <button
                onClick={handleCopyCode}
                className="text-[10px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 border border-slate-750 px-2 py-1 rounded transition"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-450" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex-1 bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 overflow-hidden relative">
              <pre className="text-[10px] font-mono text-emerald-300 leading-relaxed overflow-x-auto h-[220px] select-all">
                {apiConnectionCode}
              </pre>
            </div>
          </div>
        </div>

        {/* Alternate runner ups list */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Alternative Multi-model Routing Path
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {runnerUps.map(({ model, matchPercent, avgCost }) => (
              <div
                key={model.id}
                onClick={() => onSelectModel(model)}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-3 rounded-lg cursor-pointer transition text-xs flex justify-between items-center"
              >
                <div className="truncate">
                  <div className="font-semibold text-slate-200 truncate">{model.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">${avgCost.toFixed(4)}/M blended</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-400 text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                    {matchPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
