import mongoose from 'mongoose';

const extraFeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('ExtraFee', extraFeeSchema);
