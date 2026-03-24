import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  enrolledAt: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Enrollment', enrollmentSchema);
