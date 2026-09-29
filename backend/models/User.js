import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','chef_chaine','superviseur'], required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  actif: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('User', schema);
