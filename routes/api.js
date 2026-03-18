const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');

// Get all exams (with optional filters)
router.get('/exams', async (req, res) => {
  try {
    const { grade, examType, year, stream, course } = req.query;
    const filter = {};
    
    if (grade) filter.grade = grade;
    if (examType) filter.examType = examType;
    if (year) filter.year = year;
    if (stream) filter.stream = stream;
    if (course) filter.course = course;

    const exams = await Exam.find(filter);
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unique courses for a given filter combination
router.get('/courses', async (req, res) => {
  try {
    const { grade, examType, year, stream } = req.query;
    const filter = {};
    
    if (grade) filter.grade = grade;
    if (examType) filter.examType = examType;
    if (year) filter.year = year;
    if (stream) filter.stream = stream;

    const exams = await Exam.find(filter, 'course');
    const courses = [...new Set(exams.map(e => e.course))];
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific exam
router.get('/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find exam by filters
router.get('/exams/find/by-filters', async (req, res) => {
  try {
    const { grade, examType, year, stream, course } = req.query;
    
    if (!grade || !examType || !year || !stream || !course) {
      return res.status(400).json({ error: 'Missing required filters' });
    }

    const exam = await Exam.findOne({
      grade,
      examType,
      year,
      stream,
      course,
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a question to an exam (create exam if it doesn't exist)
router.post('/questions', async (req, res) => {
  try {
    const { grade, examType, year, stream, course, question } = req.body;

    if (!grade || !examType || !year || !stream || !course) {
      return res.status(400).json({ error: 'Missing exam metadata' });
    }

    if (!question || !question.text || !question.choices || !question.correct || !question.solution) {
      return res.status(400).json({ error: 'Missing question data' });
    }

    // Find or create exam
    let exam = await Exam.findOne({
      grade,
      examType,
      year,
      stream,
      course,
    });

    if (!exam) {
      exam = new Exam({
        grade,
        examType,
        year,
        stream,
        course,
        questions: [],
      });
    }

    // Add question
    exam.questions.push({
      text: question.text,
      choices: question.choices,
      correct: question.correct,
      solution: question.solution,
    });

    await exam.save();
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all questions (for admin list)
router.get('/questions', async (req, res) => {
  try {
    const exams = await Exam.find({});
    const questions = [];
    
    exams.forEach(exam => {
      exam.questions.forEach(q => {
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

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a question
router.delete('/questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const exam = await Exam.findOne({ 'questions._id': questionId });
    
    if (!exam) {
      return res.status(404).json({ error: 'Question not found' });
    }

    exam.questions.pull({ _id: questionId });
    await exam.save();
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a question (edit text, choices, correct answer, and solution)
router.put('/questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { question } = req.body;

    if (!question || !question.text || !question.choices || !question.correct || !question.solution) {
      return res.status(400).json({ error: 'Missing question data' });
    }

    const exam = await Exam.findOne({ 'questions._id': questionId });
    if (!exam) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const subdoc = exam.questions.id(questionId);
    if (!subdoc) {
      return res.status(404).json({ error: 'Question not found' });
    }

    subdoc.text = question.text;
    subdoc.choices = question.choices;
    subdoc.correct = question.correct;
    subdoc.solution = question.solution;

    await exam.save();

    res.json({
      message: 'Question updated successfully',
      questionId,
      updated: {
        id: subdoc._id,
        text: subdoc.text,
        choices: subdoc.choices,
        correct: subdoc.correct,
        solution: subdoc.solution,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
