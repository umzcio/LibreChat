import { Schema } from 'mongoose';
import type { IZdock } from '~/types';

const zdockSchema = new Schema<IZdock>(
  {
    zdockId: {
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

zdockSchema.index({ author: 1, updatedAt: -1 });
zdockSchema.index({ zdockId: 1, author: 1, tenantId: 1 }, { unique: true });

export default zdockSchema;
