import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  matricule: { type: String, unique: true, required: true },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  photo: String,
  chaine: String,
  dateEmbauche: Date,
  active: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Employee', schema);
