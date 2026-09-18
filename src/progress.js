export function averageSecondsForStatus(rows, status) {
  const matching = (Array.isArray(rows) ? rows : []).filter((row) => row.status === status);
  if (!matching.length) return 0;
  return Math.round(matching.reduce((sum, row) => sum + Math.max(0, Number(row.activeSeconds || 0)), 0) / matching.length);
}

export function buildSubjectTrends(attempts) {
  const bySubject = new Map();
  const ordered = (Array.isArray(attempts) ? attempts : [])
    .filter((attempt) => attempt && !attempt.isTestRun && attempt.analytics)
    .sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0));

  ordered.forEach((attempt) => {
    const subjects = Array.isArray(attempt.analytics.bySubject) ? attempt.analytics.bySubject : [];
    subjects.forEach((subject) => {
      if (!subject?.name) return;
      if (!bySubject.has(subject.name)) bySubject.set(subject.name, []);
      const subjectRows = (attempt.analytics.rows || []).filter((row) => row.question?.subject === subject.name);
      bySubject.get(subject.name).push({
        attemptId: attempt.id,
        title: attempt.title,
        completedAt: attempt.completedAt,
        accuracy: Number(subject.accuracy || 0),
        averageSeconds: Number(subject.averageSeconds || 0),
        averageCorrectSeconds: averageSecondsForStatus(subjectRows, 'Correct'),
        averageWrongSeconds: averageSecondsForStatus(subjectRows, 'Wrong'),
        averageSkippedSeconds: averageSecondsForStatus(subjectRows, 'Skipped'),
        attempted: Number(subject.attempted || 0),
        correct: Number(subject.correct || 0),
        wrong: Number(subject.wrong || 0),
        skipped: Number(subject.skipped || 0),
        score: Number(subject.score || 0),
        maxScore: Number(subject.maxScore || 0),
      });
    });
  });

  return [...bySubject.entries()]
    .map(([subject, points]) => ({ subject, points }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

export function summarizeSubjectTrend(points) {
  const safe = Array.isArray(points) ? points : [];
  const latest = safe.at(-1) || null;
  const previous = safe.at(-2) || null;
  return {
    attempts: safe.length,
    latestAccuracy: latest?.accuracy ?? 0,
    accuracyChange: latest && previous ? latest.accuracy - previous.accuracy : 0,
    latestAverageCorrectSeconds: latest?.averageCorrectSeconds ?? 0,
    latestAverageWrongSeconds: latest?.averageWrongSeconds ?? 0,
    latestAverageSkippedSeconds: latest?.averageSkippedSeconds ?? 0,
    averageAccuracy: safe.length ? Math.round(safe.reduce((sum, point) => sum + point.accuracy, 0) / safe.length) : 0,
  };
}

export function buildMistakeNotebook(attempts, state = {}) {
  const entries = new Map();
  const ordered = (Array.isArray(attempts) ? attempts : [])
    .filter((attempt) => attempt && !attempt.isTestRun && Array.isArray(attempt.analytics?.rows))
    .sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0));

  ordered.forEach((attempt) => {
    attempt.analytics.rows.forEach((row) => {
      const question = row?.question;
      if (!question?.id || question.type === 'descriptive') return;
      const status = row.status;
      let entry = entries.get(question.id);
      if (!entry && !['Wrong', 'Skipped'].includes(status)) return;
      if (!entry) entry = { questionId: question.id, question, wrongCount: 0, skippedCount: 0, correctCount: 0, latestStatus: status, lastMistakeAt: attempt.completedAt, latestActiveSeconds: 0 };
      entry.question = question;
      entry.latestStatus = status;
      entry.latestActiveSeconds = Number(row.activeSeconds || 0);
      if (status === 'Wrong') { entry.wrongCount += 1; entry.lastMistakeAt = attempt.completedAt; }
      else if (status === 'Skipped') { entry.skippedCount += 1; entry.lastMistakeAt = attempt.completedAt; }
      else if (status === 'Correct') entry.correctCount += 1;
      entries.set(question.id, entry);
    });
  });

  return [...entries.values()].map((entry) => {
    const saved = state[entry.questionId] || {};
    const mastered = Boolean(saved.mastered) && (!saved.masteredAt || new Date(entry.lastMistakeAt || 0) <= new Date(saved.masteredAt));
    return {
      ...entry,
      mastered,
      reopenedAfterMastery: Boolean(saved.mastered) && !mastered,
      note: String(saved.note || ''),
      improved: entry.latestStatus === 'Correct',
    };
  }).sort((a, b) => Number(a.mastered) - Number(b.mastered) || new Date(b.lastMistakeAt || 0) - new Date(a.lastMistakeAt || 0));
}
