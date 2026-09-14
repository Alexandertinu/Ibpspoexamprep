export function reviewStatus(status) {
  if (status === 'Correct' || status === 'Graded') return { tone: 'correct', label: status };
  if (status === 'Wrong') return { tone: 'wrong', label: 'Incorrect' };
  if (status === 'Pending Review') return { tone: 'pending', label: status };
  return { tone: 'skipped', label: 'Skipped' };
}

export function reviewOptionState(question, selected, optionIndex) {
  const correct = question.type !== 'descriptive' && Number(question.answer) === optionIndex;
  const chosen = selected !== undefined && selected !== null && Number(selected) === optionIndex;
  return {
    correct,
    chosen,
    wrongChoice: chosen && !correct,
    className: correct ? 'correct-choice' : (chosen ? 'wrong-choice' : ''),
    label: correct && chosen ? 'Your answer · Correct' : (correct ? 'Correct answer' : (chosen ? 'Your answer' : '')),
  };
}

export function formatReviewDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}
