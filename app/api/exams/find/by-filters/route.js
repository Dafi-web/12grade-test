import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongooseConnect.js';
import { loadExamJsonFromDisk } from '../../../../../lib/examJsonFallback.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// models/Exam.js is CommonJS (module.exports), so require it.
const Exam = require('../../../../../models/Exam.js');

export async function GET(req) {
  const url = new URL(req.url);
  const grade = url.searchParams.get('grade');
  const examType = url.searchParams.get('examType');
  const year = url.searchParams.get('year');
  const stream = url.searchParams.get('stream');
  const course = url.searchParams.get('course');

  if (!grade || !examType || !year || !stream || !course) {
    return NextResponse.json({ error: 'Missing required filters' }, { status: 400 });
  }

  try {
    if (process.env.MONGODB_URI) {
      await dbConnect();
      const exam = await Exam.findOne({ grade, examType, year, stream, course }).lean();
      if (exam && exam.questions?.length) {
        return NextResponse.json(exam);
      }
    }
  } catch {
    // Mongo unavailable or empty — use shipped JSON below
  }

  const fallback = loadExamJsonFromDisk(grade, examType, year, stream, course);
  if (fallback?.questions?.length) {
    return NextResponse.json(fallback);
  }

  return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
}

