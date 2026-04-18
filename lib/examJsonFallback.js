/**
 * Load exam JSON shipped in data/exams/<year>/<stream>/<Course>.json
 * and attach stable string _ids so the client can track answers (same shape as Mongo docs).
 */
import fs from 'fs';
import path from 'path';

function safeId(year, stream, course, num, index) {
  const n = num != null ? num : index + 1;
  return `json-${year}-${stream}-${course}-${n}`;
}

export function loadExamJsonFromDisk(grade, examType, year, stream, course) {
  const file = path.join(process.cwd(), 'data', 'exams', year, stream, `${course}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  if (data.grade !== grade || data.examType !== examType || data.year !== year || data.stream !== stream || data.course !== course) {
    return null;
  }
  const questions = (data.questions || []).map((q, i) => ({
    ...q,
    _id: safeId(year, stream, course, q.number, i),
  }));
  return {
    _id: `exam-json-${year}-${stream}-${course}`,
    grade: data.grade,
    examType: data.examType,
    year: data.year,
    stream: data.stream,
    course: data.course,
    questions,
  };
}

export function loadAllQuestionsFromDisk() {
  const root = path.join(process.cwd(), 'data', 'exams');
  if (!fs.existsSync(root)) {
    return [];
  }
  const out = [];
  const years = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const y of years) {
    const ypath = path.join(root, y.name);
    const streams = fs.readdirSync(ypath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const s of streams) {
      const spath = path.join(ypath, s.name);
      const files = fs.readdirSync(spath).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        const course = f.replace(/\.json$/i, '');
        const full = path.join(spath, f);
        try {
          const data = JSON.parse(fs.readFileSync(full, 'utf8'));
          const examId = `exam-json-${data.year}-${data.stream}-${data.course}`;
          (data.questions || []).forEach((q, i) => {
            out.push({
              id: safeId(data.year, data.stream, data.course, q.number, i),
              examId,
              examType: data.examType,
              year: data.year,
              stream: data.stream,
              course: data.course,
              number: typeof q.number === 'number' ? q.number : i + 1,
              text: q.text,
              choices: q.choices,
              correct: q.correct,
              solution: q.solution,
            });
          });
        } catch {
          // skip invalid
        }
      }
    }
  }
  out.sort((a, b) => {
    const ak = `${a.examType}|${a.year}|${a.stream}|${a.course}`;
    const bk = `${b.examType}|${b.year}|${b.stream}|${b.course}`;
    if (ak < bk) return -1;
    if (ak > bk) return 1;
    return (a.number || 0) - (b.number || 0);
  });
  return out;
}
