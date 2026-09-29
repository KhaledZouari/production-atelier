import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  operationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operation', required: true },
  chaine: { type: String, required: true },
  date: { type: Date, required: true },
  heureDebut: { type: String, required: true },
  heureFin: { type: String, required: true },
  nbLots: { type: Number, min: 1, required: true },
  totalPieces: Number,
  heuresTravail: Number,
  piecesParHeure: Number,
  rendement: Number,
  jetonIds: [String],
  valide: { type: Boolean, default: false },
  validePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
export default mongoose.model('Production', schema);
