// localExecutionService.js — Browser-native code evaluator for Code Wars
// src/features/challenges/services/localExecutionService.js
//
// Replaces codeExecutionService.js (Piston + Edge Function).
// All execution happens inside the browser via new Function().
//
// Architecture:
//   runPublicTests(opts)  → runs 3-4 visible tests
//   submitSolution(opts)  → runs all tests (public + hidden)
//   getProblem(id)        → returns problem metadata
//
// Security notes:
//   • new Function() runs in the same JS context — this is intentional
//     for a project context. For production, use an iframe sandbox.
//   • Python is NOT executable in-browser; we return a structured error
//     explaining that Python needs Pyodide/server-side support.
//
// Python support path (when ready):
//   1. Load pyodide: await loadPyodide()
//   2. await pyodide.runPythonAsync(code + '\n' + pythonHarness)
//   3. Parse stdout from captured sys.stdout
// ─────────────────────────────────────────────────────────────────

import { getProblemById, randomProblem } from '../features/challenges/data/localProblems'
import { supabase } from '../services/supabaseClient'

// ── Function name map per problem ────────────────────────────────
// Maps problem slug → { javascript: 'functionName', python: 'function_name' }
// Used to extract the contestant's function from their code.
const FN_NAMES = {
  'reverse-words':         { javascript: 'reverseWords',         python: 'reverse_words'         },
  'two-sum':               { javascript: 'twoSum',               python: 'two_sum'               },
  'valid-parentheses':     { javascript: 'isValid',              python: 'is_valid'              },
  'max-subarray':          { javascript: 'maxSubArray',          python: 'max_sub_array'         },
  'climb-stairs':          { javascript: 'climbStairs',          python: 'climb_stairs'          },
  'is-palindrome':         { javascript: 'isPalindrome',         python: 'is_palindrome'         },
  'merge-sorted-arrays':   { javascript: 'merge',                python: 'merge'                 },
  'contains-duplicate':    { javascript: 'containsDuplicate',    python: 'contains_duplicate'    },
  'best-time-stock':       { javascript: 'maxProfit',            python: 'max_profit'            },
  'longest-common-prefix': { javascript: 'longestCommonPrefix',  python: 'longest_common_prefix' },
  'fizz-buzz':             { javascript: 'fizzBuzz',             python: 'fizz_buzz'             },
  'product-except-self':   { javascript: 'productExceptSelf',    python: 'product_except_self'   },
}

// ── JavaScript evaluator ─────────────────────────────────────────
function evalJS(code, fnName) {
  // Wrap in IIFE to avoid polluting global scope and to capture the fn
  // We return a reference to the named function after eval.
  // eslint-disable-next-line no-new-func
  const wrapped = new Function(`
    "use strict";
    ${code}
    if (typeof ${fnName} === 'undefined') {
      throw new Error("Function '${fnName}' not found. Make sure your function is named exactly '${fnName}'.");
    }
    return ${fnName};
  `)
  return wrapped()
}

// ── Safe runner (catches runtime throws) ─────────────────────────
function safeRun(fn, args) {
  try {
    const result = fn(...args)
    return { ok: true, value: result }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Core JS execution ─────────────────────────────────────────────
async function executeJS({ code, problem, mode }) {
  const fnName = FN_NAMES[problem.slug]?.javascript
  if (!fnName) {
    return { pass: false, tests: [], execMs: 0,
      error: `No function name mapping for problem '${problem.slug}'` }
  }

  let fn
  const started = Date.now()

  // 1. Compile phase
  try {
    fn = evalJS(code, fnName)
  } catch (err) {
    return {
      pass:   false,
      tests:  [],
      execMs: 0,
      error:  formatSyntaxError(err.message, fnName),
    }
  }

  // 2. Run harness — wrap each test in safeRun to catch per-test throws
  let allTests
  try {
    // The harness calls fn() for each test case and returns test result objects.
    // We wrap the harness fn so individual test errors don't kill the suite.
    allTests = problem.harness((...args) => {
      const r = safeRun(fn, args)
      if (!r.ok) throw new Error(r.error)
      return r.value
    })
  } catch (err) {
    return {
      pass:   false,
      tests:  [],
      execMs: Date.now() - started,
      error:  `Runtime error: ${err.message}`,
    }
  }

  const execMs = Date.now() - started

  // 3. Filter by mode
  const publicTests = allTests.filter(t => !t.hidden)
  const tests = mode === 'submit' ? allTests : publicTests
  const pass  = tests.length > 0 && tests.every(t => t.pass)

  return { pass, tests, execMs }
}

// ── Python stub ───────────────────────────────────────────────────
// Python cannot run natively in the browser without Pyodide.
// This returns a structured, friendly error.
function executePython() {
  return {
    pass:  false,
    tests: [],
    execMs: 0,
    error: [
      'Python execution is not yet available in browser mode.',
      '',
      'Options:',
      '  1. Switch to JavaScript (same problem, same tests)',
      '  2. Pyodide integration is on the roadmap',
    ].join('\n'),
  }
}

// ── Error formatter ───────────────────────────────────────────────
function formatSyntaxError(msg, fnName) {
  const lines = []
  if (msg.includes('not found') || msg.includes('undefined')) {
    lines.push(`Function '${fnName}' not found.`)
    lines.push(`Make sure your function is named exactly: ${fnName}`)
  } else if (msg.includes('SyntaxError') || msg.includes('Unexpected')) {
    lines.push('Syntax error in your code:')
    lines.push(msg.replace(/^.*?:\s*/, ''))
    lines.push('')
    lines.push('Common causes:')
    lines.push('  · Missing closing bracket } or parenthesis )')
    lines.push('  · Unclosed string literal')
    lines.push('  · Return statement outside function')
  } else {
    lines.push('Compilation error:')
    lines.push(msg)
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────
// Public API — mirrors codeExecutionService.js interface exactly
// ─────────────────────────────────────────────────────────────────

/**
 * Run public (visible) tests only.
 * @param {{ code: string, language: string, problemId: string }} opts
 */
export async function runPublicTests({ code, language, problemId }) {
  if (!problemId) {
    return { pass: false, tests: [], execMs: 0,
      error: 'No problem loaded yet. Wait for the problem to finish loading.' }
  }

  const problem = getProblemById(problemId)
  if (!problem) {
    return { pass: false, tests: [], execMs: 0,
      error: `Problem '${problemId}' not found in local problem bank.` }
  }

  if (language === 'python' || language === 'typescript') {
    return executePython()
  }

  return executeJS({ code, problem, mode: 'public' })
}

/**
 * Submit solution — runs public + hidden tests, logs to DB.
 * @param {{ code: string, language: string, problemId: string, matchId?: string }} opts
 */
export async function submitSolution({ code, language, problemId, matchId }) {
  if (!problemId) {
    return { pass: false, tests: [], execMs: 0,
      error: 'No problem loaded. Cannot submit.' }
  }

  const problem = getProblemById(problemId)
  if (!problem) {
    return { pass: false, tests: [], execMs: 0,
      error: `Problem '${problemId}' not found in local problem bank.` }
  }

  if (language === 'python' || language === 'typescript') {
    return executePython()
  }

  const result = await executeJS({ code, problem, mode: 'submit' })

  // Log to DB (fire and forget)
  if (matchId && result) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) return
      supabase.from('cw_submissions').insert({
        match_id:           matchId,
        player_id:          user.id,
        // problem_id is uuid in DB — omit it; slug stored separately if column exists
        language,
        code,
        mode:         'submit',
        pass:         result.pass,
        tests_passed: result.tests?.filter(t => t.pass).length ?? 0,
        tests_total:  result.tests?.length ?? 0,
        exec_ms:      result.execMs,
      }).then(({ error: logErr }) => {
        if (logErr) console.warn('[exec] Failed to log submission:', logErr.message)
      })
    })
  }

  return result
}

/**
 * Fetch problem metadata.
 * Supports the same interface as the old getProblem() — but reads from local bank.
 * @param {string} problemId  UUID or slug
 */
export async function getProblem(problemId) {
  if (!problemId) throw new Error('problemId is required')

  const problem = getProblemById(problemId)
  if (!problem) throw new Error(`Problem not found: ${problemId}`)

  // Return shape compatible with what Arena.jsx / ProblemPanel.jsx expects
  return {
    id:           problem.id,
    slug:         problem.slug,
    title:        problem.title,
    description:  problem.description,
    difficulty:   problem.difficulty,
    tags:         problem.tags,
    languages:    problem.languages,
    starter:      problem.starter,
    examples:     problem.examples,
    time_limit_ms:problem.timeLimit,
  }
}

/**
 * Pick a random problem for a match.
 * Call this in WaitingRoom / matchmaking instead of fetching from cw_problems.
 * @param {string[]} [excludeIds]
 */
export function getRandomProblem(excludeIds = []) {
  return randomProblem(excludeIds)
}