import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  nom: { type: String, required: true },
  tailleLot: { type: Number, required: true },
  objectifHeure: { type: Number, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Operation', schema);
