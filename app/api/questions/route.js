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
      exam.questions.forEach((q, i) => {
        questions.push({
          id: q._id,
          examId: exam._id,
          examType: exam.examType,
          year: exam.year,
          stream: exam.stream,
          course: exam.course,
          number: typeof q.number === 'number' ? q.number : i + 1,
          text: q.text,
          choices: q.choices,
          correct: q.correct,
          solution: q.solution,
        });
      });
    });

    // Stable sort: by exam meta then question number
    questions.sort((a, b) => {
      const ak = `${a.examType}|${a.year}|${a.stream}|${a.course}`;
      const bk = `${b.examType}|${b.year}|${b.stream}|${b.course}`;
      if (ak < bk) return -1;
      if (ak > bk) return 1;
      return (a.number || 0) - (b.number || 0);
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

    const nextNumber =
      (exam.questions || []).reduce((m, q) => (typeof q.number === 'number' ? Math.max(m, q.number) : m), 0) + 1;

    exam.questions.push({
      number: nextNumber,
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

