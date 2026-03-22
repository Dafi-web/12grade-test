import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongooseConnect.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Exam = require('../../../../models/Exam.js');

export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const { questionId } = params;

    const exam = await Exam.findOne({ 'questions._id': questionId });
    if (!exam) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    exam.questions.pull({ _id: questionId });
    await exam.save();
    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { questionId } = params;
    const body = await req.json();
    const { question } = body || {};

    if (!question || !question.text || !question.choices || !question.correct || !question.solution) {
      return NextResponse.json({ error: 'Missing question data' }, { status: 400 });
    }

    const exam = await Exam.findOne({ 'questions._id': questionId });
    if (!exam) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const subdoc = exam.questions.id(questionId);
    if (!subdoc) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Preserve existing number; do not renumber on update
    subdoc.text = question.text;
    subdoc.choices = question.choices;
    subdoc.correct = question.correct;
    subdoc.solution = question.solution;

    await exam.save();

    return NextResponse.json({
      message: 'Question updated successfully',
      questionId,
      updated: {
        id: subdoc._id,
        number: subdoc.number,
        text: subdoc.text,
        choices: subdoc.choices,
        correct: subdoc.correct,
        solution: subdoc.solution,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

