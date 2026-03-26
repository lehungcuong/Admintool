import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  dob: { type: String, default: '' },
  level: { type: String, default: 'prestarter' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  enrolledAt: { type: Date, default: Date.now },
  tuitionAmount: { type: Number, default: 500000 },
  tuitionOverrides: { type: Map, of: Number, default: {} },
}, { timestamps: true });

export default mongoose.model('Student', studentSchema);
