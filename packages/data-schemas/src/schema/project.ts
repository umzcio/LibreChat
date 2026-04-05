import { Schema } from 'mongoose';
import type { IProject } from '~/types';

const projectSchema = new Schema<IProject>(
  {
    projectId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      meiliIndex: true,
    },
    name: {
      type: String,
      required: true,
      meiliIndex: true,
    },
    description: {
      type: String,
      meiliIndex: true,
    },
    instructions: {
      type: String,
    },
    color: {
      type: String,
      default: '#3b82f6',
    },
    icon: {
      type: String,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationDefaults: {
      type: Schema.Types.Mixed,
      default: {},
    },
    pinnedAgents: {
      type: [String],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    tenantId: {
      type: String,
      index: true,
    },
    memory: {
      type: [{ type: String }],
      default: [],
    },
    memoryUpdatedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

projectSchema.index({ author: 1, updatedAt: -1 });
projectSchema.index({ projectId: 1, author: 1, tenantId: 1 }, { unique: true });

export default projectSchema;
