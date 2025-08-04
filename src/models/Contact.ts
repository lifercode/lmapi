import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      default: null
    },
    email: {
      type: String,
      required: false,
      // unique: true,
      // sparse: true, // Only enforce uniqueness when value is not null/undefined
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address'
      ],
      default: null
    },
    phone: {
      type: String,
      required: false,
      // unique: true,
      // sparse: true, // Only enforce uniqueness when value is not null/undefined
      trim: true,
      match: [
        /^[\+]?[1-9][\d]{0,15}$/,
        'Please provide a valid phone number'
      ],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for unique fields for better performance
// ContactSchema.index({ email: 1 });
// ContactSchema.index({ phone: 1 });
ContactSchema.index({ name: 'text' });

export const Contact = mongoose.model<IContact>('Contact', ContactSchema); 