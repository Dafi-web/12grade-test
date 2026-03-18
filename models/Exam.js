const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  choices: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true },
  },
  correct: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
  },
  solution: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

const ExamSchema = new mongoose.Schema({
  grade: {
    type: String,
    required: true,
    default: '12',
  },
  examType: {
    type: String,
    enum: ['entrance', 'remedial'],
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  stream: {
    type: String,
    enum: ['natural', 'social'],
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  questions: [QuestionSchema],
}, {
  timestamps: true,
});

// Compound index for efficient queries
ExamSchema.index({ grade: 1, examType: 1, year: 1, stream: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Exam', ExamSchema);
