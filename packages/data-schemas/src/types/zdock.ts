import type { Document, Types } from 'mongoose';

export interface IZdock extends Document {
  zdockId: string;
  name: string;
  description?: string;
  instructions?: string;
  color?: string;
  icon?: string;
  author: Types.ObjectId;
  conversationDefaults?: Record<string, unknown>;
  pinnedAgents?: string[];
  isArchived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;
  memory?: string[];
  memoryUpdatedAt?: Date | string;
}
