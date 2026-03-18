import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongooseConnect.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Exam = require('../../../models/Exam.js');

export async function GET() {
  try {
    await dbConnect();
    const exams = await Exam.find({});
    const questions = [];

    exams.forEach((exam) => {
      exam.questions.forEach((q) => {
        questions.push({
          id: q._id,
          examId: exam._id,
          examType: exam.examType,
          year: exam.year,
          stream: exam.stream,
          course: exam.course,
          text: q.text,
          choices: q.choices,
          correct: q.correct,
          solution: q.solution,
        });
      });
    });

    return NextResponse.json(questions);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { grade, examType, year, stream, course, question } = body || {};

    if (!grade || !examType || !year || !stream || !course) {
      return NextResponse.json({ error: 'Missing exam metadata' }, { status: 400 });
    }

    if (!question || !question.text || !question.choices || !question.correct || !question.solution) {
      return NextResponse.json({ error: 'Missing question data' }, { status: 400 });
    }

    // Find or create exam
    let exam = await Exam.findOne({ grade, examType, year, stream, course });
    if (!exam) {
      exam = new Exam({ grade, examType, year, stream, course, questions: [] });
    }

    exam.questions.push({
      text: question.text,
      choices: question.choices,
      correct: question.correct,
      solution: question.solution,
    });

    await exam.save();
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

