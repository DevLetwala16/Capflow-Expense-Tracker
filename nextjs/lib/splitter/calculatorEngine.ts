/**
 * Safe, robust math evaluation engine for the Floating Expense Calculator.
 * Supports:
 * - standard operations: +, -, *, /, %
 * - operator precedence (BODMAS / PEMDAS)
 * - parentheses
 * - percentage calculation (+ 10%, - 15%, * 18%, etc.)
 * - decimal precision cleaning (avoids 0.1 + 0.2 = 0.30000000000000004)
 * - live preview evaluations with safe fallback
 */

export interface EvaluationResult {
  success: boolean;
  result: number;
  error?: string;
}

/**
 * Tokenize and parse arithmetic expression safely with +, -, *, /, %, parentheses.
 */
export function tokenizeExpression(rawExpr: string): string[] {
  let expr = rawExpr.replace(/×/g, "*").replace(/÷/g, "/");

  // Percentage expansion:
  // e.g. 100 + 10% -> 100 + (100 * 10 / 100)
  // e.g. 100 - 10% -> 100 - (100 * 10 / 100)
  // e.g. 200 * 15% -> 200 * (15 / 100)
  // e.g. 200 / 10% -> 200 / (10 / 100)
  // e.g. 50% -> (50 / 100)
  expr = expr.replace(
    /(\d+(?:\.\d+)?)\s*([\+\-])\s*(\d+(?:\.\d+)?)%/g,
    "($1 $2 ($1 * $3 / 100))"
  );
  expr = expr.replace(
    /(\d+(?:\.\d+)?)\s*([\*\/])\s*(\d+(?:\.\d+)?)%/g,
    "($1 $2 ($3 / 100))"
  );
  expr = expr.replace(/(\d+(?:\.\d+)?)%/g, "($1 / 100)");

  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let numStr = "";
      while (i < expr.length && /\d|\./.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push(numStr);
      continue;
    }
    i++;
  }
  return tokens;
}

export function parseTokens(tokens: string[]): number {
  let index = 0;

  function parsePrimary(): number {
    if (index >= tokens.length) return 0;
    const token = tokens[index];

    if (token === "(") {
      index++; // consume '('
      const val = parseAddSub();
      if (index < tokens.length && tokens[index] === ")") {
        index++; // consume ')'
      }
      return val;
    }

    if (token === "-") {
      index++; // unary minus
      return -parsePrimary();
    }
    if (token === "+") {
      index++; // unary plus
      return parsePrimary();
    }

    const num = parseFloat(token);
    index++;
    return isNaN(num) ? 0 : num;
  }

  function parseMulDiv(): number {
    let left = parsePrimary();
    while (index < tokens.length) {
      const op = tokens[index];
      if (op === "*" || op === "/") {
        index++;
        const right = parsePrimary();
        if (op === "*") {
          left = left * right;
        } else {
          if (right === 0) throw new Error("Divide by zero");
          left = left / right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (index < tokens.length) {
      const op = tokens[index];
      if (op === "+" || op === "-") {
        index++;
        const right = parseMulDiv();
        if (op === "+") {
          left = left + right;
        } else {
          left = left - right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  return parseAddSub();
}

/**
 * Safely evaluates an arithmetic expression and rounds to clean precision.
 */
export function safeEvaluate(expr: string): EvaluationResult {
  try {
    if (!expr || !expr.trim()) return { success: true, result: 0 };

    // Strip trailing operator if user is still typing (e.g. "100 + " -> 100)
    let sanitized = expr.trim().replace(/[+\-×÷*/.]+$/, "").trim();
    if (!sanitized) return { success: true, result: 0 };

    // Balance unclosed open parens
    const openParens = (sanitized.match(/\(/g) || []).length;
    const closeParens = (sanitized.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      sanitized += ")".repeat(openParens - closeParens);
    }

    const tokens = tokenizeExpression(sanitized);
    if (tokens.length === 0) return { success: true, result: 0 };

    const value = parseTokens(tokens);
    if (!isFinite(value) || isNaN(value)) {
      return { success: false, result: 0, error: "Calculation error" };
    }
    // Clean precision artifacts (e.g. 0.1 + 0.2)
    const rounded = Math.round(value * 10000) / 10000;
    return { success: true, result: rounded };
  } catch (err: any) {
    return { success: false, result: 0, error: err.message || "Error" };
  }
}
