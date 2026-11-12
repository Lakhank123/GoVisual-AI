import { create } from 'zustand';

export interface Job {
  jobId: string;
  generationId: string;
  status: string;
  progress: number;
}

export interface Provider {
  name: string;
  enabled: boolean;
  capabilities: Record<string, any>;
  model: string;
  version: string;
  health: string;
  estimated_latency_ms: number;
}

interface GenerationState {
  activeJobs: Job[];
  providers: Provider[];
  
  addJob: (job: Job) => void;
  updateJob: (jobId: string, status: string, progress: number) => void;
  setProviders: (providers: Provider[]) => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  activeJobs: [],
  providers: [],

  addJob: (job) => set((state) => ({ activeJobs: [...state.activeJobs, job] })),
  
  updateJob: (jobId, status, progress) => set((state) => ({
    activeJobs: state.activeJobs.map(j => 
      j.jobId === jobId ? { ...j, status, progress } : j
    )
  })),

  setProviders: (providers) => set({ providers }),
}));
