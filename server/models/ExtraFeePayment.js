import mongoose from 'mongoose';

const extraFeePaymentSchema = new mongoose.Schema({
  feeId: { type: String, required: true },
  studentId: { type: String, required: true },
  amount: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
}, { timestamps: true });

extraFeePaymentSchema.index({ feeId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('ExtraFeePayment', extraFeePaymentSchema);
