export const MARKS_CORRECT = 1;
export const MARKS_WRONG = -0.25;

export function scoreAttempt(questions, answers = {}, grades = {}) {
  let correct = 0, wrong = 0, skipped = 0, descriptiveSubmitted = 0, descriptivePending = 0, score = 0;
  const rows = questions.map((question, index) => {
    const selected = answers[index];
    const isDescriptive = question.type === 'descriptive';
    const blank = selected === undefined || selected === null || String(selected).trim() === '';
    let status = 'Skipped';
    let awardedMarks = 0;
    if (isDescriptive) {
      if (blank) skipped += 1;
      else {
        descriptiveSubmitted += 1;
        const grade = grades[index];
        if (grade && Number.isFinite(Number(grade.score))) {
          awardedMarks = Math.max(0, Math.min(Number(question.marks || 0), Number(grade.score)));
          score += awardedMarks;
          status = 'Graded';
        } else {
          descriptivePending += 1;
          status = 'Pending Review';
        }
      }
    } else if (blank) skipped += 1;
    else if (Number(selected) === Number(question.answer)) {
      correct += 1;
      awardedMarks = Number(question.marks ?? MARKS_CORRECT);
      score += awardedMarks;
      status = 'Correct';
    } else {
      wrong += 1;
      awardedMarks = -Number(question.negativeMarks ?? Math.abs(MARKS_WRONG));
      score += awardedMarks;
      status = 'Wrong';
    }
    return { question, index, selected, status, awardedMarks, grade: grades[index] || null };
  });
  const objectiveAttempted = correct + wrong;
  return {
    correct, wrong, skipped, descriptiveSubmitted, descriptivePending,
    attempted: objectiveAttempted + descriptiveSubmitted,
    objectiveAttempted, total: questions.length,
    maxScore: Number(questions.reduce((sum, question) => sum + Number(question.marks || 0), 0).toFixed(2)),
    score: Number(score.toFixed(2)),
    accuracy: objectiveAttempted ? Math.round((correct / objectiveAttempted) * 100) : 0,
    rows,
  };
}

function aggregate(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row) || 'Uncategorized';
    if (!map.has(key)) map.set(key, { name: key, total: 0, correct: 0, wrong: 0, skipped: 0, pending: 0, graded: 0, activeMs: 0, score: 0, maxScore: 0 });
    const item = map.get(key);
    item.total += 1;
    if (row.status === 'Correct') item.correct += 1;
    else if (row.status === 'Wrong') item.wrong += 1;
    else if (row.status === 'Skipped') item.skipped += 1;
    else if (row.status === 'Pending Review') item.pending += 1;
    else if (row.status === 'Graded') item.graded += 1;
    item.score += Number(row.awardedMarks || 0);
    item.maxScore += Number(row.question.marks || 0);
    item.activeMs += row.activeMs || 0;
  });
  return [...map.values()].map((item) => ({
    ...item,
    attempted: item.correct + item.wrong + item.pending + item.graded,
    accuracy: item.correct + item.wrong ? Math.round((item.correct / (item.correct + item.wrong)) * 100) : 0,
    averageSeconds: item.total ? Math.round(item.activeMs / item.total / 1000) : 0,
  }));
}

export function buildAnalytics({ questions, answers = {}, grades = {}, timeByQuestion = {}, visits = {}, answerChanges = {}, marked = {} }) {
  const score = scoreAttempt(questions, answers, grades);
  const rows = score.rows.map((row) => ({
    ...row,
    activeMs: timeByQuestion[row.index] || 0,
    activeSeconds: Math.round((timeByQuestion[row.index] || 0) / 1000),
    visits: visits[row.index] || 0,
    answerChanges: answerChanges[row.index] || 0,
    marked: Boolean(marked[row.index]),
    wordCount: row.question.type === 'descriptive' ? String(row.selected || '').trim().split(/\s+/).filter(Boolean).length : 0,
  }));
  const totalActiveMs = rows.reduce((sum, row) => sum + row.activeMs, 0);
  return {
    ...score, rows, totalActiveMs, totalActiveSeconds: Math.round(totalActiveMs / 1000),
    averageSeconds: rows.length ? Math.round(totalActiveMs / rows.length / 1000) : 0,
    bySubject: aggregate(rows, (row) => row.question.subject), byTopic: aggregate(rows, (row) => row.question.topic),
    slowest: [...rows].sort((a, b) => b.activeMs - a.activeMs).slice(0, Math.min(5, rows.length)),
    totalVisits: rows.reduce((sum, row) => sum + row.visits, 0), totalAnswerChanges: rows.reduce((sum, row) => sum + row.answerChanges, 0),
  };
}

export function coachInsights(analytics) {
  const insights = [];
  if (analytics.objectiveAttempted) {
    if (analytics.accuracy < 70) insights.push('Accuracy is the first constraint. Reduce speculative attempts and verify the final step before saving.');
    else if (analytics.accuracy < 85) insights.push('Accuracy is workable but still leaks marks. Review each wrong answer before increasing speed.');
    else insights.push('Objective accuracy is strong. The next gain should come from selection and execution speed.');
  }
  if (analytics.descriptivePending) insights.push(`${analytics.descriptivePending} descriptive response${analytics.descriptivePending === 1 ? '' : 's'} await AI or manual review.`);
  const attemptRate = analytics.total ? analytics.attempted / analytics.total : 0;
  if (attemptRate < 0.7) insights.push('Attempt rate was below 70%. Bank direct questions first and return to longer items later.');
  if (analytics.totalAnswerChanges > Math.max(2, analytics.total * 0.2)) insights.push('Frequent answer changes may be costing time. Change an answer only when you can identify the original mistake.');
  if (analytics.averageSeconds > 90) insights.push('Average active time exceeded 90 seconds per item. Use a first-visit cap for objective questions.');
  const weak = analytics.byTopic.filter((topic) => topic.correct + topic.wrong >= 2).sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weak && weak.accuracy < 70) insights.push(`${weak.name} is the clearest objective weak area (${weak.accuracy}% accuracy).`);
  const slow = analytics.slowest[0];
  if (slow && slow.question.type !== 'descriptive' && slow.activeSeconds > Math.max(120, analytics.averageSeconds * 2)) insights.push(`Question ${slow.index + 1} consumed ${slow.activeSeconds}s; review why you stayed instead of moving on.`);
  return insights.slice(0, 6);
}

export function buildCoachPacket(attempt, analytics) {
  return {
    schemaVersion: 2, exam: attempt.title, completedAt: attempt.completedAt, isTestRun: Boolean(attempt.isTestRun),
    summary: { score: analytics.score, maxScore: analytics.maxScore, total: analytics.total, correct: analytics.correct, wrong: analytics.wrong, skipped: analytics.skipped, descriptivePending: analytics.descriptivePending, accuracy: analytics.accuracy, elapsedSeconds: attempt.elapsedSeconds, activeQuestionSeconds: analytics.totalActiveSeconds, answerChanges: analytics.totalAnswerChanges },
    subjectBreakdown: analytics.bySubject, topicBreakdown: analytics.byTopic,
    responses: analytics.rows.map((row) => ({
      number: row.index + 1, type: row.question.type || 'mcq', subject: row.question.subject, section: row.question.section, topic: row.question.topic,
      question: row.question.question,
      response: row.question.type === 'descriptive' ? (row.selected || null) : (row.selected === undefined || row.selected === null ? null : row.question.options[row.selected]),
      correctOption: row.question.type === 'descriptive' ? null : row.question.options[row.question.answer],
      modelAnswer: row.question.modelAnswer || '', rubric: row.question.rubric || [], wordLimit: row.question.wordLimit || 0,
      status: row.status, awardedMarks: row.awardedMarks, maximumMarks: row.question.marks, activeSeconds: row.activeSeconds, visits: row.visits, answerChanges: row.answerChanges, markedForReview: row.marked, explanation: row.question.explanation || '',
    })),
  };
}

export function buildGeminiPrompt(packet) {
  return `You are my evidence-based bank-exam performance coach. Analyze this objective and/or descriptive attempt. For descriptive responses, score against the supplied maximum marks and rubric, then give line-level improvements and a better outline. For objective responses, diagnose accuracy, question selection, time management and avoidable negative marking. Return: (1) score adjustment for descriptive items, (2) three most important patterns, (3) a three-session plan with measurable targets, and (4) decision rules for my next test. Do not infer weakness from a test run.\n\nATTEMPT_PACKET\n${JSON.stringify(packet, null, 2)}`;
}
