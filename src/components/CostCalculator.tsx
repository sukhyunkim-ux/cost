import React, { useState, useMemo } from 'react';
import { ModelInfo, GPUInfo } from '../types';
import { gpusData } from '../data/modelsData';
import { DollarSign, Cpu, AlertTriangle, Lightbulb, Scale, Calculator, TrendingDown } from 'lucide-react';

interface CostCalculatorProps {
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
}

export default function CostCalculator({ models, selectedModel }: CostCalculatorProps) {
  // Simulator inputs
  const [volume, setVolume] = useState<number>(300000); // 300k requests/month
  const [promptTokens, setPromptTokens] = useState<number>(1000); // 1,000 prompt tokens
  const [completionTokens, setCompletionTokens] = useState<number>(300); // 300 completion tokens
  
  // Hosting details
  const [selectedGpuId, setSelectedGpuId] = useState<string>('nvidia-l4');
  const [gpuDutyCycle, setGpuDutyCycle] = useState<number>(100); // 100% on (24/7) vs scale-on-demand
  
  const selectedGPU = useMemo(() => {
    return gpusData.find(g => g.id === selectedGpuId) || gpusData[1];
  }, [selectedGpuId]);

  // Calculations
  const metrics = useMemo(() => {
    const totalTokensPerReq = promptTokens + completionTokens;
    const monthlyTotalTokens = volume * totalTokensPerReq;
    const peakTokensPerSecondRequired = (monthlyTotalTokens / (30.4 * 24 * 3600)) * 2.5; // multiplier of 2.5 for peak factor
    
    // Self hosting math
    const hoursPerMonth = 730;
    const gpusNeeded = Math.ceil(peakTokensPerSecondRequired / selectedGPU.maxTokensPerSec);
    const rawGpuMonthlyCost = selectedGPU.hourlyCost * hoursPerMonth * (gpuDutyCycle / 100) * gpusNeeded;
    const standardOverhead = 25; // flat $25 storage & network overhead per GPU
    const totalSelfHostingCost = rawGpuMonthlyCost + (standardOverhead * gpusNeeded);

    // Compute costs for all models
    const comparison = models.map((model) => {
      const promptCost = (volume * promptTokens * model.inputPricePerM) / 1000000;
      const completionCost = (volume * completionTokens * model.outputPricePerM) / 1000000;
      const totalCost = promptCost + completionCost;

      return {
        ...model,
        promptCost,
        completionCost,
        totalCost,
      };
    }).sort((a, b) => a.totalCost - b.totalCost);

    return {
      monthlyTotalTokens,
      peakTokensPerSecondRequired,
      gpusNeeded,
      totalSelfHostingCost,
      comparison,
    };
  }, [volume, promptTokens, completionTokens, selectedGPU, gpuDutyCycle, models]);

  // Identify host vs API breakeven or advice
  const selfHostAdvice = useMemo(() => {
    // find cost of hosting Llama-3-72B open weights equivalents vs self hosting
    const targetQwenOpenCost = metrics.comparison.find(c => c.id === 'qwen25-72b-instruct')?.totalCost || 200;
    const selfHostingCost = metrics.totalSelfHostingCost;

    const isHostingCheaper = selfHostingCost < targetQwenOpenCost;
    const ratio = targetQwenOpenCost / (selfHostingCost || 1);

    return {
      isHostingCheaper,
      ratio,
      targetQwenOpenCost,
      savings: Math.abs(targetQwenOpenCost - selfHostingCost),
    };
  }, [metrics]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* Parameters Panel */}
      <div className="xl:col-span-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md space-y-6">
        <div>
          <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-400" />
            ROI & Cost Calculator
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Model the economic scale of API calls vs local/dedicated hosting of Qwen.
          </p>
        </div>

        {/* Token and volume controls */}
        <div className="space-y-4">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Workload Specification</h4>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Monthly Volume (Requests)</span>
              <span className="font-mono font-bold text-slate-100">{volume.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="10000"
              max="2000000"
              step="10000"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Avg. Prompt Length</span>
              <span className="font-mono font-bold text-slate-100">{promptTokens.toLocaleString()} tokens</span>
            </div>
            <input
              type="range"
              min="100"
              max="8000"
              step="50"
              value={promptTokens}
              onChange={(e) => setPromptTokens(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Avg. Generation Length</span>
              <span className="font-mono font-bold text-slate-100">{completionTokens.toLocaleString()} tokens</span>
            </div>
            <input
              type="range"
              min="50"
              max="4000"
              step="50"
              value={completionTokens}
              onChange={(e) => setCompletionTokens(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Hosting Setup Option */}
        <div className="space-y-4 pt-4 border-t border-slate-700/35">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Dedicated GPU Configuration</h4>
          
          <div className="space-y-2">
            <label className="text-xs text-slate-300">Self-hosting Cloud Node</label>
            <select
              value={selectedGpuId}
              onChange={(e) => setSelectedGpuId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              {gpusData.map(gpu => (
                <option key={gpu.id} value={gpu.id}>
                  {gpu.name} (${gpu.hourlyCost}/hr)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Active Duty Schedule</span>
              <span className="font-mono font-bold text-slate-100">{gpuDutyCycle}% (Always On)</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="10"
              value={gpuDutyCycle}
              onChange={(e) => setGpuDutyCycle(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Mini stats */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-750/50 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Total Monthly Tokens:</span>
            <span className="text-slate-200 font-mono font-semibold">{(metrics.monthlyTotalTokens / 1000000).toFixed(1)} Million</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Concurrency Load:</span>
            <span className="text-slate-200 font-mono font-semibold">~{metrics.peakTokensPerSecondRequired.toFixed(1)} tok/s peak</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">GPUs Cluster Size:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {metrics.gpusNeeded}x {selectedGPU.name.split(' (')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison results */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Advice / Callout banner */}
        <div className="bg-gradient-to-r from-indigo-950/40 via-slate-800/30 to-slate-900/40 border border-slate-700/60 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl">
              {selfHostAdvice.isHostingCheaper ? <TrendingDown className="h-6 w-6" /> : <Scale className="h-6 w-6" />}
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-slate-150 flex items-center gap-2">
                Deployment Policy Advice
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  {selfHostAdvice.isHostingCheaper ? "Self-Host Advantage" : "API Framework Advantage"}
                </span>
              </h4>
              <p className="text-xs text-slate-350 leading-relaxed max-w-2xl">
                {selfHostAdvice.isHostingCheaper ? (
                  <>
                    At this volume, self-hosting <strong>Qwen2.5-72B</strong> open weights on a dedicated GPU cluster is <strong>{selfHostAdvice.ratio.toFixed(1)}x cheaper</strong> than calling hosted equivalent models. You would save approximately <strong>${(selfHostAdvice.savings).toFixed(2)} / month</strong> by renting server blocks directly compared to tokens billing!
                  </>
                ) : (
                  <>
                    API routing remains cost-efficient. Unless data confidentiality demands 100% offline edge execution, leveraging Alibaba's <strong>DashScope client API</strong> or open-weight API hosts (DeepInfra, OpenRouter) is cheaper because we don't pay 24/7 idle GPU rental costs. We bypass <strong>${metrics.totalSelfHostingCost.toFixed(0)}/month</strong> in fixed compute charges.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Comparative Matrix */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-700/35">
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Monthly Billing Comparison</h3>
              <p className="text-slate-400 text-xs">Total charges based on inputs prompt sizes and volume.</p>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-indigo-400">USD / Month</span>
          </div>

          <div className="space-y-4">
            
            {/* 1. Show the Custom GPU Hosting bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5" />
                  Self-Hosted Custom Qwen Node ({metrics.gpusNeeded}x GPU)
                </span>
                <span className="font-mono font-bold text-indigo-300">${metrics.totalSelfHostingCost.toFixed(2)}</span>
              </div>
              <div className="w-full bg-slate-900/60 rounded-full h-3 overflow-hidden border border-indigo-500/20">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((metrics.totalSelfHostingCost / Math.max(...metrics.comparison.map(c => c.totalCost))) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 italic px-0.5">
                <span>Constant cost, unlimited throughput up to cluster limit</span>
                <span>Fixed Monthly Server Rate</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-slate-700/20 py-1" />

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {metrics.comparison.map((model) => {
                const isSelected = selectedModel?.id === model.id;
                
                // Color mapping
                let barColor = 'from-slate-600 to-slate-400';
                if (model.id.startsWith('qwen25')) {
                  barColor = 'from-emerald-600 to-teal-400';
                } else if (model.id.startsWith('qwen')) {
                  barColor = 'from-blue-600 to-cyan-400';
                } else if (model.id.startsWith('gpt')) {
                  barColor = 'from-red-600 to-orange-400';
                }

                const maxCostVal = Math.max(...metrics.comparison.map(c => c.totalCost));
                const barWidthPercent = maxCostVal > 0 ? (model.totalCost / maxCostVal) * 100 : 0;

                return (
                  <div key={model.id} className={`space-y-1 p-2 rounded-lg transition-all ${
                    isSelected ? 'bg-slate-700/20 border border-slate-600/30 shadow' : 'hover:bg-slate-900/10'
                  }`}>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <span className={`w-2 h-2 rounded-full ${
                          model.family === 'qwen-commercial' ? 'bg-blue-400' :
                          model.family === 'qwen-open' ? 'bg-emerald-400' :
                          model.family === 'qwen-specialized' ? 'bg-purple-400' : 'bg-red-400'
                        }`} />
                        {model.name}
                        {isSelected && (
                          <span className="text-[9px] bg-slate-800 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                            Monitored
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-350">${model.totalCost.toFixed(2)}</span>
                    </div>

                    <div className="w-full bg-slate-900/60 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-300`} 
                        style={{ width: `${Math.max(barWidthPercent, 1.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
