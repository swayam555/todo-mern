import mongoose from 'mongoose';

export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUSES = ['in_progress', 'completed'];

const taskSchema = new mongoose.Schema(
  {
    owner: { type: String, required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    dueAt: { type: Date, required: [true, 'Date & time is required'] },
    priority: { type: String, enum: { values: PRIORITIES, message: 'Priority must be low, medium or high' }, default: null },
    status: { type: String, enum: STATUSES, default: 'in_progress' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ owner: 1, dueAt: 1 });

taskSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.owner;
    return ret;
  },
});

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
