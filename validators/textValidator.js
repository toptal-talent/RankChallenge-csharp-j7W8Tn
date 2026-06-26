export default function textValidator(challenge, files) {
  const editableFile = challenge.files.find(f => f.editable);
  if (!editableFile) return { passed: false, score: 0, checks: [], message: 'No editable file found' };

  const code = files[editableFile.filename] || editableFile.content;
  const astRules = challenge.validation?.checks || [];

  const checks = astRules.map(rule => {
    const astRule = rule.astRule || {};
    let passed = false;
    let message = rule.failMessage || 'Check failed';

    switch (astRule.type) {
      case 'contains-string':
        passed = code.includes(astRule.value);
        if (passed) message = 'Found';
        break;
      case 'no-string':
        passed = !code.includes(astRule.value);
        if (passed) message = 'Correct';
        break;
      default:
        message = `Unknown rule type: ${astRule.type}`;
    }

    return {
      description: rule.description,
      passed,
      message,
      points: rule.points || 0,
    };
  });

  const earnedPoints = checks.filter(c => c.passed).reduce((sum, c) => sum + c.points, 0);
  const totalPoints = checks.reduce((sum, c) => sum + c.points, 0);
  const allPassed = checks.every(c => c.passed);

  return {
    passed: allPassed,
    score: earnedPoints,
    checks,
    message: allPassed ? 'All checks passed!' : 'Some checks failed. Keep going!',
  };
}
