import { Schema } from 'mongoose';
import type { MCPCosmeticOverrideDocument } from '~/types';

const mcpCosmeticOverrideSchema = new Schema<MCPCosmeticOverrideDocument>(
  {
    serverName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    iconPath: {
      type: String,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mcpCosmeticOverrideSchema;
