import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'accountant', 'receptionist', 'student'], required: true },
  displayName: { type: String, required: true },
  studentName: { type: String }, // Chỉ dùng cho role student
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
