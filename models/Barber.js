import mongoose from 'mongoose';

const BarberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Barber', BarberSchema);
