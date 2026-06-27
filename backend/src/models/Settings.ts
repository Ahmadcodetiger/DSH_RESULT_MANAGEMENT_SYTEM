import { Schema, model } from 'mongoose';

const SettingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'school_info',
    },
    schoolName: {
      type: String,
      default: 'Home of Young Huffaz Academy',
    },
    address: {
      type: String,
      default: 'Address complex, Takushara, Abuja, Nigeria',
    },
    phoneNumbers: {
      type: String,
      default: '+2348037322312, +2349033245467',
    },
    email: {
      type: String,
      default: 'info@younghuffaz.com',
    },
    bankName: {
      type: String,
      default: 'Huffaz Trust Bank',
    },
    accountName: {
      type: String,
      default: 'Home of Young Huffaz Academy',
    },
    accountNumber: {
      type: String,
      default: '1023456789',
    },
    currentAcademicYear: {
      type: String,
      default: '2025/2026',
    },
    currentTerm: {
      type: String,
      default: 'Second Term',
    },
    annexes: {
      type: [String],
      default: [],
      // List of school branches/annexes, e.g. ["Main Campus", "Takushara Annex"]
    },
  },
  {
    timestamps: true,
  }
);

export default model('Settings', SettingsSchema);
