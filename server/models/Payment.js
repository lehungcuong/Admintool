import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  paidAt: { type: String, default: '' },
}, { timestamps: true });

paymentSchema.index({ studentId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Payment', paymentSchema);
