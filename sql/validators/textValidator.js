// Plain-text validator for non-JavaScript challenges (e.g. raw SQL, Active
// Directory / PowerShell). It does NOT parse the submission as JavaScript — it
// matches the raw submitted text against simple rules, so any language is fine.
//
// Reads rules from challenge.validation.parseRules. Supported rule shapes:
//   { "rule": "contains-string", "value": "WHERE", "ignoreCase": true, "failMessage": "...", "passMessage": "..." }
//   { "rule": "no-string",       "value": "DROP",  "ignoreCase": true, "failMessage": "..." }
//   { "rule": "regex",           "pattern": "\\bGROUP\\s+BY\\b", "flags": "i", "failMessage": "..." }
//   { "rule": "not-regex",       "pattern": "DELETE\\s+FROM",     "flags": "i", "failMessage": "..." }
// Scoring mirrors backendAstValidator: full points only when every rule passes,
// otherwise a partial score proportional to the number of rules passed.

function norm(s, ignoreCase) {
  return ignoreCase ? String(s).toLowerCase() : String(s);
}

function applyRule(code, rule) {
  switch (rule.rule) {
    case 'contains-string': {
      const found = norm(code, rule.ignoreCase).includes(norm(rule.value, rule.ignoreCase));
      return found
        ? { passed: true, message: rule.passMessage || `Found "${rule.value}"` }
        : { passed: false, message: rule.failMessage || `Missing: "${rule.value}"` };
    }
    case 'no-string': {
      const found = norm(code, rule.ignoreCase).includes(norm(rule.value, rule.ignoreCase));
      return !found
        ? { passed: true, message: rule.passMessage || 'Correct' }
        : { passed: false, message: rule.failMessage || `Should not contain: "${rule.value}"` };
    }
    case 'regex': {
      let re;
      try { re = new RegExp(rule.pattern, rule.flags || ''); }
      catch (e) { return { passed: false, message: `Invalid regex: ${e.message}` }; }
      return re.test(code)
        ? { passed: true, message: rule.passMessage || 'Pattern matched' }
        : { passed: false, message: rule.failMessage || `Expected pattern: ${rule.pattern}` };
    }
    case 'not-regex': {
      let re;
      try { re = new RegExp(rule.pattern, rule.flags || ''); }
      catch (e) { return { passed: false, message: `Invalid regex: ${e.message}` }; }
      return !re.test(code)
        ? { passed: true, message: rule.passMessage || 'Correct' }
        : { passed: false, message: rule.failMessage || `Should not match: ${rule.pattern}` };
    }
    default:
      return { passed: false, message: `Unknown rule: ${rule.rule}` };
  }
}

export default function textValidator(challenge, files) {
  const editableFile = challenge.files.find(f => f.editable);
  if (!editableFile) return { passed: false, score: 0, checks: [], message: 'No editable file found' };

  const code = files[editableFile.filename] ?? editableFile.content ?? '';
  const rules = challenge.validation?.parseRules || [];

  const checks = rules.map(rule => {
    try {
      const result = applyRule(code, rule);
      return { description: rule.description, passed: result.passed, message: result.message };
    } catch (e) {
      return { description: rule.description, passed: false, message: e.message };
    }
  });

  if (checks.length === 0) return { passed: true, score: challenge.points, checks: [], message: 'Accepted' };

  const passedCount = checks.filter(c => c.passed).length;
  const allPassed = passedCount === checks.length;
  return {
    passed: allPassed,
    score: allPassed ? challenge.points : Math.floor(challenge.points * (passedCount / checks.length)),
    checks,
    message: allPassed ? 'All checks passed!' : 'Some checks failed. Keep going!',
  };
}
