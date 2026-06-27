import { Schema, model } from 'mongoose';

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'TEACHER', 'PARENT', 'ACCOUNTANT', 'DIRECTOR'],
      default: 'TEACHER',
      required: true,
    },
    // For teachers, to assign which level/sections and subject they can grade
    assignedClasses: [
      {
        level: { type: String, required: true }, // e.g. "5" or "Early Years 1"
        section: { type: String, required: true }, // e.g. "ALLO"
        subjectName: { type: String, required: true }, // e.g. "Literacy"
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model('User', UserSchema);
