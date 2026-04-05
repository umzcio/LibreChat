export type TProject = {
  projectId: string;
  name: string;
  description?: string;
  instructions?: string;
  color?: string;
  icon?: string;
  author: string;
  conversationDefaults?: Record<string, unknown>;
  pinnedAgents?: string[];
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
  memory?: string[];
  memoryUpdatedAt?: string;
};

export type TProjectListParams = {
  cursor?: string;
  limit?: number;
  isArchived?: boolean;
  search?: string;
};

export type TProjectListResponse = {
  projects: TProject[];
  nextCursor: string | null;
};

export type TCreateProjectRequest = Pick<TProject, 'name'> &
  Partial<
    Pick<
      TProject,
      'description' | 'instructions' | 'color' | 'icon' | 'conversationDefaults' | 'pinnedAgents'
    >
  >;

export type TUpdateProjectRequest = Partial<
  Omit<TProject, 'projectId' | 'author' | 'createdAt' | 'updatedAt'>
>;
