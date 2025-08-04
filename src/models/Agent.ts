import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAgent extends Document {
  name: string;
  description: string;
  companyId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      minlength: [2, 'Agent name must be at least 2 characters long'],
      maxlength: [100, 'Agent name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Agent description is required'],
      trim: true,
      minlength: [10, 'Agent description must be at least 10 characters long'],
      maxlength: [500, 'Agent description cannot exceed 500 characters']
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for better performance
AgentSchema.index({ companyId: 1, name: 1 });
AgentSchema.index({ name: 'text', description: 'text' });

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema); 