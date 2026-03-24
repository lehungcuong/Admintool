import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  level: { type: String, default: 'prestarter' },
  teacherId: { type: String, default: '' },
  capacity: { type: Number, default: 20 },
  room: { type: String, default: '' },
  schedule: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Class', classSchema);
