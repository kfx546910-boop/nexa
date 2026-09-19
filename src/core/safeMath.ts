const TOKEN_PATTERN = /^\d+(?:\.\d+)?(?:[+\-*/]\d+(?:\.\d+)?)+$/;

export function evaluateSimpleArithmetic(input: string): number | null {
  const normalized = input.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  if (!TOKEN_PATTERN.test(normalized)) return null;

  const numbers = normalized.split(/[+\-*/]/).map(Number);
  const operators = normalized.match(/[+\-*/]/g) || [];
  if (numbers.some(number => !Number.isFinite(number)) || numbers.length !== operators.length + 1) return null;

  const values = [numbers[0]];
  for (let index = 0; index < operators.length; index += 1) {
    const operator = operators[index];
    const next = numbers[index + 1];
    if (operator === '*' || operator === '/') {
      const previous = values.pop()!;
      if (operator === '/' && next === 0) return null;
      values.push(operator === '*' ? previous * next : previous / next);
    } else {
      values.push(operator === '+' ? next : -next);
    }
  }

  const result = values.reduce((sum, value) => sum + value, 0);
  return Number.isFinite(result) ? result : null;
}
