import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  classId: { type: String, default: '' },
  day: { type: String, required: true },
  time: { type: String, required: true },
  room: { type: String, default: '' },
  level: { type: String, default: '' },
  className: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Schedule', scheduleSchema);
