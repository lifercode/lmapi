import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification {
  provider: 'email' | 'sms' | 'slack' | 'webhook';
  value: string | null;
  enabled: boolean;
}

export interface ICompany extends Document {
  name: string;
  notifications: INotification[];
  brandLogoUrl: string;
  brandColor: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema({
  provider: {
    type: String,
    enum: {
      values: ['email', 'sms', 'whatsapp'],
      message: 'Provider must be one of: email, sms, whatsapp'
    },
    required: [true, 'Notification provider is required']
  },
  value: {
    type: String,
    required: false,
    trim: true,
    maxlength: [255, 'Notification value cannot exceed 255 characters'],
    default: null
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const CompanySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters long'],
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    notifications: {
      type: [NotificationSchema],
      default: [],
      validate: {
        validator: function(notifications: INotification[]) {
          // Validate unique provider per company
          const providers = notifications.map(n => n.provider);
          return providers.length === new Set(providers).size;
        },
        message: 'Each notification provider can only be used once per company'
      }
    },
    brandLogoUrl: {
      type: String,
      required: [true, 'Brand logo URL is required'],
      trim: true,
      match: [
        /^(https?:\/\/).*\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/i,
        'Please provide a valid image URL'
      ]
    },
    brandColor: {
      type: String,
      required: [true, 'Brand color is required'],
      trim: true,
      match: [
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        'Please provide a valid hex color (e.g., #FF5733 or #F57)'
      ]
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for better performance
CompanySchema.index({ userId: 1, name: 1 });
CompanySchema.index({ name: 'text' });

export const Company = mongoose.model<ICompany>('Company', CompanySchema); 