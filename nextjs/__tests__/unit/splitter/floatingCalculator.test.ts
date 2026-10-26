import { safeEvaluate } from '@/lib/splitter/calculatorEngine';

describe('Floating Calculator Safe Evaluate Engine', () => {
  test('evaluates simple arithmetic (+, -, *, /)', () => {
    expect(safeEvaluate('10 + 20').result).toBe(30);
    expect(safeEvaluate('50 - 18.5').result).toBe(31.5);
    expect(safeEvaluate('12 × 4').result).toBe(48);
    expect(safeEvaluate('100 ÷ 4').result).toBe(25);
  });

  test('respects operator precedence (BODMAS / PEMDAS)', () => {
    expect(safeEvaluate('10 + 5 × 2').result).toBe(20);
    expect(safeEvaluate('100 - 20 ÷ 4').result).toBe(95);
    expect(safeEvaluate('(10 + 5) × 2').result).toBe(30);
  });

  test('handles decimal operations with high precision without JS floating quirks', () => {
    // In standard JS: 0.1 + 0.2 = 0.30000000000000004
    const res = safeEvaluate('0.1 + 0.2');
    expect(res.result).toBe(0.3);
  });

  test('evaluates percentage expressions correctly for expense calculations', () => {
    // 100 + 10% tax/service charge = 110
    expect(safeEvaluate('100 + 10%').result).toBe(110);

    // 100 - 15% discount = 85
    expect(safeEvaluate('100 - 15%').result).toBe(85);

    // 200 * 18% GST = 36
    expect(safeEvaluate('200 × 18%').result).toBe(36);

    // Standalone 50% = 0.5
    expect(safeEvaluate('50%').result).toBe(0.5);
  });

  test('auto-balances unclosed parentheses while typing', () => {
    // User typed "(50 + 25" without closing paren yet
    expect(safeEvaluate('(50 + 25').result).toBe(75);
    expect(safeEvaluate('((10 + 5) × 2').result).toBe(30);
  });

  test('strips trailing operators safely while typing', () => {
    // User typed "150 + " and hasn't typed next number
    expect(safeEvaluate('150 +').result).toBe(150);
    expect(safeEvaluate('150 ×').result).toBe(150);
  });

  test('handles division by zero gracefully', () => {
    const res = safeEvaluate('100 ÷ 0');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Divide by zero');
  });

  test('handles empty or whitespace expression', () => {
    expect(safeEvaluate('').result).toBe(0);
    expect(safeEvaluate('   ').result).toBe(0);
  });
});
