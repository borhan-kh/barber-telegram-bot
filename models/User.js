import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  telegram_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  full_name: {
    type: String,
    required: true
  },
  phone_number: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['fa', 'en'],
    default: 'en'
  }
}, {
  timestamps: true
});

export default mongoose.model('User', UserSchema);
