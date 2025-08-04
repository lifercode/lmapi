import mongoose, { Document, Schema, Types } from 'mongoose';

// Define the allowed origin values
export enum ThreadOrigin {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram', 
  WEBSITE = 'website',
  TIKTOK = 'tiktok',
  MESSENGER = 'messenger'
}

export interface IThread extends Document {
  contactId: Types.ObjectId;
  agentId: Types.ObjectId;
  name: string;
  origin: ThreadOrigin;
  createdAt: Date;
  updatedAt: Date;
}

const ThreadSchema: Schema = new Schema(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Contact ID is required'],
      index: true
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Thread name is required'],
      trim: true,
      minlength: [2, 'Thread name must be at least 2 characters long'],
      maxlength: [200, 'Thread name cannot exceed 200 characters']
    },
    origin: {
      type: String,
      required: [true, 'Origin is required'],
      enum: {
        values: Object.values(ThreadOrigin),
        message: 'Origin must be one of: whatsapp, instagram, website, tiktok, messenger'
      },
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for better performance
ThreadSchema.index({ contactId: 1, name: 1 });
ThreadSchema.index({ agentId: 1, name: 1 });
ThreadSchema.index({ origin: 1, agentId: 1 });
ThreadSchema.index({ origin: 1, contactId: 1 });
ThreadSchema.index({ name: 'text' });

export const Thread = mongoose.model<IThread>('Thread', ThreadSchema); 