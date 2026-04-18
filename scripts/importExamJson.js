#!/usr/bin/env node
/**
 * Upsert one exam document from a JSON file (same shape as models/Exam.js + questions array).
 *
 * Usage:
 *   MONGODB_URI="your-atlas-uri" node scripts/importExamJson.js data/exams/2015/social/Mathematics.json
 *
 * Imports all JSON files under data/exams:
 *   MONGODB_URI="..." node scripts/importExamJson.js --all
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const config = require('../config');
const Exam = require('../models/Exam');

function walkJson(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkJson(p, acc);
    else if (name.endsWith('.json')) acc.push(p);
  }
  return acc;
}

async function importOne(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const { grade, examType, year, stream, course, questions } = data;

  if (!grade || !examType || !year || !stream || !course || !Array.isArray(questions)) {
    throw new Error(`Invalid exam JSON: ${filePath}`);
  }

  const cleaned = questions.map((q) => ({
    number: q.number,
    text: q.text,
    choices: q.choices,
    correct: q.correct,
    solution: q.solution,
  }));

  const doc = await Exam.findOneAndUpdate(
    { grade, examType, year, stream, course },
    {
      $set: {
        grade,
        examType,
        year,
        stream,
        course,
        questions: cleaned,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`OK ${year} ${stream} ${course}: ${doc.questions.length} questions (${filePath})`);
}

async function main() {
  const uri = config.MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in config.js or environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const root = path.join(__dirname, '..', 'data', 'exams');
  const args = process.argv.slice(2);

  if (args[0] === '--all') {
    const files = walkJson(root);
    if (!files.length) {
      console.error('No JSON files under data/exams. Run: python3 scripts/build_all_exams.py');
      process.exit(1);
    }
    for (const f of files.sort()) {
      await importOne(f);
    }
  } else if (args[0]) {
    await importOne(path.resolve(args[0]));
  } else {
    console.error('Usage: node scripts/importExamJson.js <file.json> | --all');
    process.exit(1);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
