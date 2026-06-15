export interface ModelInfo {
  id: string;
  name: string;
  family: 'qwen-commercial' | 'qwen-open' | 'qwen-specialized' | 'competitors-closed' | 'competitors-open';
  type: 'general' | 'coder' | 'math';
  parameters: string;
  inputPricePerM: number;
  outputPricePerM: number;
  contextWindow: number;
  scoreMMLU: number; // MMLU or MMLU-Pro (0-100)
  scoreCoding: number; // HumanEval or similar (0-100)
  scoreMath: number; // GSM8K or similar (0-100)
  scoreArenaElo: number; // Arena rating standardized (0-100 scale here, but maps from Elo)
  speedTokensPerSec: number;
  description: string;
  tier: 'Entry' | 'Mid' | 'High-End' | 'Elite';
  hardwareRequired: string;
  license: string;
  releaseDate: string;
}

export interface GPUInfo {
  id: string;
  name: string;
  hourlyCost: number;
  vram: number;
  maxTokensPerSec: number;
  recommendedFor: string[];
}

export interface RouterParams {
  category: 'general' | 'coder' | 'math' | 'translation' | 'latency';
  contextLength: 'short' | 'mid' | 'large'; // short < 8k, mid < 32k, large 128k
  priority: number; // 0 = Pure Budget, 100 = Absolute Quality
  concurrency: number; // concurrent requests estimate
  estimatedMonthlyRequests: number;
}
