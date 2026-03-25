import mongoose from 'mongoose';

const extraFeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  appliesTo: { type: String, enum: ['all', 'level', 'class'], default: 'all' },
  targetLevel: { type: String, default: '' },
  targetClassId: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('ExtraFee', extraFeeSchema);
