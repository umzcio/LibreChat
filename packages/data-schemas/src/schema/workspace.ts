import { Schema } from 'mongoose';
import type { IWorkspaceSession } from '~/types';

const workspaceSchema = new Schema<IWorkspaceSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      required: true,
      default: 'code',
      enum: ['code'],
    },
    workingCopyRoot: {
      type: String,
      required: true,
    },
    openFiles: {
      type: [String],
      default: [],
    },
    activeFile: {
      type: String,
    },
    fileBindings: {
      type: [
        new Schema(
          {
            fileId: {
              type: String,
            },
            filename: {
              type: String,
              required: true,
            },
            relativePath: {
              type: String,
              required: true,
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

workspaceSchema.index({ user: 1, updatedAt: -1 });
workspaceSchema.index({ conversationId: 1, user: 1, tenantId: 1 }, { unique: true });

export default workspaceSchema;
