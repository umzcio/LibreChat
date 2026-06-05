export type TZdock = {
  zdockId: string;
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

export type TZdockListResponse = {
  projects: TZdock[];
  nextCursor: string | null;
};

export type TCreateZdockRequest = Pick<TZdock, 'name'> &
  Partial<
    Pick<
      TZdock,
      'description' | 'instructions' | 'color' | 'icon' | 'conversationDefaults' | 'pinnedAgents'
    >
  >;

export type TUpdateZdockRequest = Partial<
  Omit<TZdock, 'zdockId' | 'author' | 'createdAt' | 'updatedAt'>
>;
