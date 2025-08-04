import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  threadId: Types.ObjectId;
  role: 'assistant' | 'user';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: 'Thread',
      required: [true, 'Thread ID is required'],
      index: true
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['assistant', 'user'],
        message: 'Role must be either assistant or user'
      }
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      minlength: [1, 'Content must be at least 1 character long'],
      maxlength: [10000, 'Content cannot exceed 10000 characters']
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for better performance
MessageSchema.index({ threadId: 1, createdAt: 1 });
MessageSchema.index({ threadId: 1, role: 1 });
MessageSchema.index({ content: 'text' });

export const Message = mongoose.model<IMessage>('Message', MessageSchema); 