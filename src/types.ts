export interface TechnicalSolution {
  title: string;
  steps: string[];
  explanation: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
}

export interface ResourceLink {
  label: string;
  url: string;
  type: 'Documentation' | 'Video' | 'Download' | 'Article';
}

export interface LocalNeuralResult {
  model_name: string;
  prediction: string;
  confidence: number;
  raw_logits: Record<string, number>;
}

export interface AnalysisResult {
  problemSummary: string;
  rootCause: string;
  solutions: TechnicalSolution[];
  resources: ResourceLink[];
  urgency: 'Low' | 'Medium' | 'High';
  localAnalysis?: LocalNeuralResult;
}

export interface AnalysisHistory {
  id: string;
  text: string;
  result: AnalysisResult;
  timestamp: number;
}
