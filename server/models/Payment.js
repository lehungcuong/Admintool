import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  amount: { type: Number, default: 0 },
  expectedAmount: { type: Number, default: 500000 },
  note: { type: String, default: '' },
  paidAt: { type: String, default: '' },
  referenceCode: String,
  gateway: String,
  paymentMethod: { type: String, default: 'manual' },
}, { timestamps: true });

paymentSchema.index({ studentId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Payment', paymentSchema);
