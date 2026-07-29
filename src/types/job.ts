export type JobStatus = "open" | "in_progress" | "filled" | "closed";

export type Job = {
  id: number;
  title: string;
  description: string;
  budget: number;
  currency: string;
  requiredCapabilities: string[];
  deadline: string;
  status: JobStatus;
  poster: string;
  bidsCount: number;
  createdAt: string;
};

export type JobDraft = {
  title: string;
  description: string;
  budget: string;
  requiredCapabilities: string[];
  deadline: string;
};
