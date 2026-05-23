// localProblems.js — Self-hosted problem bank for Code Wars
// src/features/challenges/data/localProblems.js
//
// 12 hand-crafted problems with:
//   • title, slug, difficulty, tags, description, examples
//   • starter code  (javascript + python)
//   • public tests  (3–4 visible cases)
//   • hidden tests  (3–5 cases, not shown during run)
//   • solution      (JS reference — used only for sanity-checking)
//
// Each problem's test suite is defined as a pure JS function that
// receives the contestant's evaluated function and returns an array
// of { name, pass, expected, got, hidden } objects.
// ─────────────────────────────────────────────────────────────────

// ── Tiny test helpers (live inside each harness) ─────────────────
// eq(a,b)        deep-equal via JSON (handles arrays/objects)
// eqSet(a,b)     order-insensitive array equality (sorted JSON)
// near(a,b,eps)  float comparison
// ─────────────────────────────────────────────────────────────────

export const PROBLEMS = [

  // ── 1 ────────────────────────────────────────────────────────────
  {
    id:         'reverse-words',
    slug:       'reverse-words',
    title:      'Reverse Words',
    difficulty: 'easy',
    tags:       ['strings', 'arrays'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Given a string \`s\`, reverse the order of the words.

A **word** is defined as a sequence of non-space characters. Words in \`s\` are separated by at least one space.

Return a string of the words in reverse order concatenated by a single space.

**Note:** \`s\` may contain leading or trailing spaces or multiple spaces between two words. The returned string should only have a single space separating the words. Do not include any extra spaces.`,

    examples: [
      { input: `s = "the sky is blue"`,  output: `"blue is sky the"` },
      { input: `s = "  hello world  "`,  output: `"world hello"` },
      { input: `s = "a good   example"`, output: `"example good a"` },
    ],

    starter: {
      javascript: `/**
 * @param {string} s
 * @return {string}
 */
function reverseWords(s) {
  // your code here
}`,
      python: `def reverse_words(s: str) -> str:
    # your code here
    pass`,
    },

    // JS harness — receives the contestant fn, returns test results
    harness: (fn) => {
      const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: eq(got, expected), expected: JSON.stringify(expected), got: JSON.stringify(got), hidden })
      return [
        t('basic sentence',   fn('the sky is blue'),      'blue is sky the'),
        t('leading spaces',   fn('  hello world  '),      'world hello'),
        t('multiple spaces',  fn('a good   example'),     'example good a'),
        t('single word',      fn('a'),                    'a'),
        t('preserve case',    fn('Hello World'),           'World Hello',     true),
        t('tabs/extra gaps',  fn('   spaces   between  '),'between spaces',   true),
        t('three words rev',  fn('one two three'),         'three two one',   true),
      ]
    },
  },

  // ── 2 ────────────────────────────────────────────────────────────
  {
    id:         'two-sum',
    slug:       'two-sum',
    title:      'Two Sum',
    difficulty: 'easy',
    tags:       ['arrays', 'hash-map'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Given an array of integers \`nums\` and an integer \`target\`, return **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,

    examples: [
      { input: `nums = [2,7,11,15], target = 9`, output: `[0,1]` },
      { input: `nums = [3,2,4], target = 6`,     output: `[1,2]` },
      { input: `nums = [3,3], target = 6`,        output: `[0,1]` },
    ],

    starter: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // your code here
}`,
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const eqSet = (a, b) => JSON.stringify([...(a||[])].sort((x,y)=>x-y)) === JSON.stringify([...(b||[])].sort((x,y)=>x-y))
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: eqSet(got, expected), expected: JSON.stringify(expected), got: JSON.stringify(got), hidden })
      return [
        t('basic',           fn([2,7,11,15], 9),       [0,1]),
        t('middle elements', fn([3,2,4], 6),            [1,2]),
        t('duplicates',      fn([3,3], 6),              [0,1]),
        t('negatives',       fn([-1,-2,-3,-4,-5], -8), [2,4]),
        t('zero target',     fn([-3,4,3,90], 0),       [0,2],  true),
        t('large array',     fn([1,5,3,7,2,8], 10),    [2,3],  true),
        t('one pair only',   fn([0,4,3,0], 0),         [0,3],  true),
      ]
    },
  },

  // ── 3 ────────────────────────────────────────────────────────────
  {
    id:         'valid-parentheses',
    slug:       'valid-parentheses',
    title:      'Valid Parentheses',
    difficulty: 'easy',
    tags:       ['stack', 'strings'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is **valid**.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,

    examples: [
      { input: `s = "()"`,     output: `true`  },
      { input: `s = "()[]{}"`, output: `true`  },
      { input: `s = "(]"`,     output: `false` },
    ],

    starter: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // your code here
}`,
      python: `def is_valid(s: str) -> bool:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: got === expected, expected: String(expected), got: String(got), hidden })
      return [
        t('simple parens',  fn('()'),      true),
        t('all types',      fn('()[]{}'),  true),
        t('wrong closer',   fn('(]'),      false),
        t('wrong order',    fn('([)]'),    false),
        t('nested valid',   fn('{[]}'),    true),
        t('empty string',   fn(''),        true,  true),
        t('deeply nested',  fn('{[()]}'),  true,  true),
        t('single open',    fn('('),       false, true),
        t('only closers',   fn(')'),       false, true),
      ]
    },
  },

  // ── 4 ────────────────────────────────────────────────────────────
  {
    id:         'max-subarray',
    slug:       'max-subarray',
    title:      'Maximum Subarray',
    difficulty: 'medium',
    tags:       ['dynamic-programming', 'arrays'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Given an integer array \`nums\`, find the **subarray** with the largest sum, and return its sum.

A **subarray** is a contiguous non-empty sequence of elements within an array.`,

    examples: [
      { input: `nums = [-2,1,-3,4,-1,2,1,-5,4]`, output: `6`  },
      { input: `nums = [1]`,                       output: `1`  },
      { input: `nums = [5,4,-1,7,8]`,              output: `23` },
    ],

    starter: {
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // your code here
}`,
      python: `def max_sub_array(nums: list[int]) -> int:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: got === expected, expected: String(expected), got: String(got), hidden })
      return [
        t('standard case',   fn([-2,1,-3,4,-1,2,1,-5,4]), 6),
        t('single element',  fn([1]),                       1),
        t('all positive',    fn([5,4,-1,7,8]),              23),
        t('all negative',    fn([-2,-1]),                  -1),
        t('single negative', fn([-1]),                     -1,  true),
        t('mix with zeros',  fn([0,-3,1,1]),                2,  true),
        t('large pos tail',  fn([-10,1,2,3,4,5]),          15,  true),
      ]
    },
  },

  // ── 5 ────────────────────────────────────────────────────────────
  {
    id:         'climb-stairs',
    slug:       'climb-stairs',
    title:      'Climbing Stairs',
    difficulty: 'easy',
    tags:       ['dynamic-programming', 'math'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb **1** or **2** steps. In how many distinct ways can you climb to the top?`,

    examples: [
      { input: `n = 2`, output: `2`, note: `1+1 or 2` },
      { input: `n = 3`, output: `3`, note: `1+1+1, 1+2, 2+1` },
    ],

    starter: {
      javascript: `/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  // your code here
}`,
      python: `def climb_stairs(n: int) -> int:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: got === expected, expected: String(expected), got: String(got), hidden })
      return [
        t('n=1',  fn(1),  1),
        t('n=2',  fn(2),  2),
        t('n=3',  fn(3),  3),
        t('n=4',  fn(4),  5),
        t('n=5',  fn(5),  8,  true),
        t('n=10', fn(10), 89, true),
        t('n=15', fn(15), 987,true),
      ]
    },
  },

  // ── 6 ────────────────────────────────────────────────────────────
  {
    id:         'is-palindrome',
    slug:       'is-palindrome',
    title:      'Valid Palindrome',
    difficulty: 'easy',
    tags:       ['strings', 'two-pointers'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string \`s\`, return \`true\` if it is a **palindrome**, or \`false\` otherwise.`,

    examples: [
      { input: `s = "A man, a plan, a canal: Panama"`, output: `true`  },
      { input: `s = "race a car"`,                      output: `false` },
      { input: `s = " "`,                               output: `true`  },
    ],

    starter: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // your code here
}`,
      python: `def is_palindrome(s: str) -> bool:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: got === expected, expected: String(expected), got: String(got), hidden })
      return [
        t('classic phrase',   fn('A man, a plan, a canal: Panama'), true),
        t('not palindrome',   fn('race a car'),                      false),
        t('single space',     fn(' '),                               true),
        t('numbers mixed',    fn('0P'),                              false),
        t('empty string',     fn(''),                                true,  true),
        t('digits only',      fn('121'),                             true,  true),
        t('special chars',    fn('.,'),                              true,  true),
      ]
    },
  },

  // ── 7 ────────────────────────────────────────────────────────────
  {
    id:         'merge-sorted-arrays',
    slug:       'merge-sorted-arrays',
    title:      'Merge Sorted Array',
    difficulty: 'easy',
    tags:       ['arrays', 'two-pointers', 'sorting'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `You are given two integer arrays \`nums1\` and \`nums2\`, sorted in **non-decreasing** order, and two integers \`m\` and \`n\`, representing the number of elements in \`nums1\` and \`nums2\` respectively.

**Merge** \`nums2\` into \`nums1\` as one sorted array **in-place**.

The final sorted array should not be returned by the function, but instead be stored inside the array \`nums1\`. To accommodate this, \`nums1\` has a length of \`m + n\`, where the first \`m\` elements denote the elements that should be merged, and the last \`n\` elements are set to \`0\` and should be ignored.

**Return** the merged array (we check the return value for convenience).`,

    examples: [
      { input: `nums1=[1,2,3,0,0,0], m=3, nums2=[2,5,6], n=3`, output: `[1,2,2,3,5,6]` },
      { input: `nums1=[1], m=1, nums2=[], n=0`,                 output: `[1]`           },
      { input: `nums1=[0], m=0, nums2=[1], n=1`,                output: `[1]`           },
    ],

    starter: {
      javascript: `/**
 * @param {number[]} nums1
 * @param {number} m
 * @param {number[]} nums2
 * @param {number} n
 * @return {number[]}
 */
function merge(nums1, m, nums2, n) {
  // modify nums1 in-place, then return it
}`,
      python: `def merge(nums1: list[int], m: int, nums2: list[int], n: int) -> list[int]:
    # modify nums1 in-place, then return it
    pass`,
    },

    harness: (fn) => {
      const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
      const t = (name, args, expected, hidden = false) => {
        const got = fn(...args)
        return { name, pass: eq(got, expected), expected: JSON.stringify(expected), got: JSON.stringify(got), hidden }
      }
      return [
        t('standard',        [[1,2,3,0,0,0],3,[2,5,6],3],  [1,2,2,3,5,6]),
        t('empty nums2',     [[1],1,[],0],                   [1]),
        t('empty nums1',     [[0],0,[1],1],                  [1]),
        t('all nums2 smaller', [[4,5,6,0,0,0],3,[1,2,3],3], [1,2,3,4,5,6], true),
        t('duplicates',      [[1,1,2,0,0],3,[1,2],2],       [1,1,1,2,2],   true),
        t('single overlap',  [[2,0],1,[1],1],               [1,2],          true),
      ]
    },
  },

  // ── 8 ────────────────────────────────────────────────────────────
  {
    id:         'contains-duplicate',
    slug:       'contains-duplicate',
    title:      'Contains Duplicate',
    difficulty: 'easy',
    tags:       ['arrays', 'hash-set'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Given an integer array \`nums\`, return \`true\` if any value appears **at least twice** in the array, and return \`false\` if every element is distinct.`,

    examples: [
      { input: `nums = [1,2,3,1]`,   output: `true`  },
      { input: `nums = [1,2,3,4]`,   output: `false` },
      { input: `nums = [1,1,1,3,3,4,3,2,4,2]`, output: `true` },
    ],

    starter: {
      javascript: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
function containsDuplicate(nums) {
  // your code here
}`,
      python: `def contains_duplicate(nums: list[int]) -> bool:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: got === expected, expected: String(expected), got: String(got), hidden })
      return [
        t('has duplicate',   fn([1,2,3,1]),           true),
        t('all distinct',    fn([1,2,3,4]),            false),
        t('many dupes',      fn([1,1,1,3,3,4,3,2,4,2]),true),
        t('single element',  fn([1]),                  false),
        t('two same',        fn([7,7]),                true,  true),
        t('negatives',       fn([-1,-1,0,1]),          true,  true),
        t('large distinct',  fn([1,2,3,4,5,6,7,8,9]), false, true),
      ]
    },
  },

  // ── 9 ────────────────────────────────────────────────────────────
  {
    id:         'best-time-stock',
    slug:       'best-time-stock',
    title:      'Best Time to Buy and Sell Stock',
    difficulty: 'easy',
    tags:       ['arrays', 'greedy'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the **maximum profit** you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.`,

    examples: [
      { input: `prices = [7,1,5,3,6,4]`, output: `5`, note: `Buy day 2 (price=1), sell day 5 (price=6)` },
      { input: `prices = [7,6,4,3,1]`,   output: `0`, note: `No profitable transaction possible` },
    ],

    starter: {
      javascript: `/**
 * @param {number[]} prices
 * @return {number}
 */
function maxProfit(prices) {
  // your code here
}`,
      python: `def max_profit(prices: list[int]) -> int:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: got === expected, expected: String(expected), got: String(got), hidden })
      return [
        t('standard',        fn([7,1,5,3,6,4]), 5),
        t('decreasing',      fn([7,6,4,3,1]),   0),
        t('two days',        fn([1,2]),          1),
        t('same price',      fn([3,3]),          0),
        t('big jump',        fn([1,2,3,4,5]),   4, true),
        t('buy last day',    fn([5,4,3,2,1]),   0, true),
        t('valley early',    fn([2,4,1,7]),      6, true),
      ]
    },
  },

  // ── 10 ───────────────────────────────────────────────────────────
  {
    id:         'longest-common-prefix',
    slug:       'longest-common-prefix',
    title:      'Longest Common Prefix',
    difficulty: 'easy',
    tags:       ['strings'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Write a function to find the longest common prefix string amongst an array of strings.

If there is no common prefix, return an empty string \`""\`.`,

    examples: [
      { input: `strs = ["flower","flow","flight"]`, output: `"fl"` },
      { input: `strs = ["dog","racecar","car"]`,    output: `""` },
    ],

    starter: {
      javascript: `/**
 * @param {string[]} strs
 * @return {string}
 */
function longestCommonPrefix(strs) {
  // your code here
}`,
      python: `def longest_common_prefix(strs: list[str]) -> str:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: got === expected, expected: JSON.stringify(expected), got: JSON.stringify(got), hidden })
      return [
        t('fl prefix',       fn(['flower','flow','flight']),     'fl'),
        t('no prefix',       fn(['dog','racecar','car']),        ''),
        t('single string',   fn(['alone']),                      'alone'),
        t('all same',        fn(['aa','aa','aa']),               'aa'),
        t('empty in list',   fn(['','b','c']),                   '',    true),
        t('full match',      fn(['abc','abc']),                  'abc', true),
        t('one char prefix', fn(['abcd','abxy','abzz']),         'ab',  true),
      ]
    },
  },

  // ── 11 ───────────────────────────────────────────────────────────
  {
    id:         'fizz-buzz',
    slug:       'fizz-buzz',
    title:      'FizzBuzz',
    difficulty: 'easy',
    tags:       ['math', 'strings', 'simulation'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Given an integer \`n\`, return a string array \`answer\` (**1-indexed**) where:

- \`answer[i] == "FizzBuzz"\` if \`i\` is divisible by 3 and 5.
- \`answer[i] == "Fizz"\` if \`i\` is divisible by 3.
- \`answer[i] == "Buzz"\` if \`i\` is divisible by 5.
- \`answer[i] == i\` (as a string) if none of the above conditions are true.`,

    examples: [
      { input: `n = 3`, output: `["1","2","Fizz"]` },
      { input: `n = 5`, output: `["1","2","Fizz","4","Buzz"]` },
      { input: `n = 15`,output: `["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]` },
    ],

    starter: {
      javascript: `/**
 * @param {number} n
 * @return {string[]}
 */
function fizzBuzz(n) {
  // your code here
}`,
      python: `def fizz_buzz(n: int) -> list[str]:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: eq(got, expected), expected: JSON.stringify(expected), got: JSON.stringify(got), hidden })
      return [
        t('n=3',  fn(3),  ['1','2','Fizz']),
        t('n=5',  fn(5),  ['1','2','Fizz','4','Buzz']),
        t('n=15', fn(15), ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz']),
        t('n=1',  fn(1),  ['1']),
        t('n=6',  fn(6),  ['1','2','Fizz','4','Buzz','Fizz'], true),
        t('n=20 last el', (() => { const r=fn(20); return [r[r.length-1]] })(), ['Buzz'], true),
      ]
    },
  },

  // ── 12 ───────────────────────────────────────────────────────────
  {
    id:         'product-except-self',
    slug:       'product-except-self',
    title:      'Product of Array Except Self',
    difficulty: 'medium',
    tags:       ['arrays', 'prefix-sum'],
    timeLimit:  5000,
    languages:  ['javascript', 'python'],

    description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.

The product of any prefix or suffix of \`nums\` is **guaranteed** to fit in a **32-bit** integer.

You must write an algorithm that runs in **O(n)** time and **without** using the division operation.`,

    examples: [
      { input: `nums = [1,2,3,4]`, output: `[24,12,8,6]`  },
      { input: `nums = [-1,1,0,-3,3]`, output: `[0,0,9,0,0]` },
    ],

    starter: {
      javascript: `/**
 * @param {number[]} nums
 * @return {number[]}
 */
function productExceptSelf(nums) {
  // your code here
}`,
      python: `def product_except_self(nums: list[int]) -> list[int]:
    # your code here
    pass`,
    },

    harness: (fn) => {
      const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
      const t = (name, got, expected, hidden = false) =>
        ({ name, pass: eq(got, expected), expected: JSON.stringify(expected), got: JSON.stringify(got), hidden })
      return [
        t('standard',     fn([1,2,3,4]),        [24,12,8,6]),
        t('with zeros',   fn([-1,1,0,-3,3]),    [0,0,9,0,0]),
        t('two elements', fn([1,2]),             [2,1]),
        t('all ones',     fn([1,1,1,1]),         [1,1,1,1]),
        t('two zeros',    fn([0,0]),             [0,0],         true),
        t('negatives',    fn([-1,-2,-3,-4]),     [-24,-12,-8,-6],true),
        t('mixed',        fn([2,3,4,5]),         [60,40,30,24], true),
      ]
    },
  },
]

// ── Index helpers ────────────────────────────────────────────────
export const PROBLEMS_BY_ID   = Object.fromEntries(PROBLEMS.map(p => [p.id, p]))
export const PROBLEMS_BY_SLUG = Object.fromEntries(PROBLEMS.map(p => [p.slug, p]))

export function getProblemById(id) {
  return PROBLEMS_BY_ID[id] ?? PROBLEMS_BY_SLUG[id] ?? null
}

/** Pick a random problem (optionally excluding a list of ids) */
export function randomProblem(excludeIds = []) {
  const pool = PROBLEMS.filter(p => !excludeIds.includes(p.id))
  return pool[Math.floor(Math.random() * pool.length)] ?? PROBLEMS[0]
}