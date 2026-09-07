/**
 * Seed content for the F2 milestone: Class 8 · CBSE · Mathematics
 * (NCERT rationalised syllabus, 13 chapters).
 *
 * PDFs point at the NCERT-hosted per-chapter files (verified reachable at
 * ncert.nic.in/textbook/pdf/hemh1XX.pdf). The YouTube entries open a
 * topical YouTube search so a student always lands on real lessons without
 * us curating individual video IDs that can rot.
 *
 * Every question below has been hand-written and hand-checked. options are
 * stored in display order; correct_option is the letter key a..d.
 */

export const SUBJECT_SEED = {
  board: "CBSE",
  class_level: 8,
  name: "Mathematics",
} as const;

export interface TopicSeed {
  name: string;
  sequence: number;
  pdfUrl: string;
  questions: {
    question_text: string;
    options: string[];
    correct: "a" | "b" | "c" | "d";
    difficulty: 1 | 2 | 3;
  }[];
}

const ncertPdf = (n: number) => `https://ncert.nic.in/textbook/pdf/hemh1${String(n).padStart(2, "0")}.pdf`;

const youTubeSearch = (chapter: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(chapter + " class 8 ncert maths")}`;

export const TOPIC_SEEDS: TopicSeed[] = [
  {
    name: "Rational Numbers",
    sequence: 1,
    pdfUrl: ncertPdf(1),
    questions: [
      {
        question_text: "Which of these numbers is rational?",
        options: ["3/4", "√2", "π", "0.1010010001…"],
        correct: "a",
        difficulty: 1,
      },
      {
        question_text: "What is the additive inverse of −5/8?",
        options: ["−8/5", "5/8", "8/5", "−5/8"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "Simplify: (−3/7) + (2/7)",
        options: ["5/7", "−5/7", "−1/7", "1/7"],
        correct: "c",
        difficulty: 2,
      },
      {
        question_text: "How many rational numbers lie between 1/3 and 1/2?",
        options: ["None", "Exactly one", "Exactly ten", "Infinitely many"],
        correct: "d",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Linear Equations in One Variable",
    sequence: 2,
    pdfUrl: ncertPdf(2),
    questions: [
      {
        question_text: "Solve for x: x + 7 = 12",
        options: ["5", "−5", "19", "84"],
        correct: "a",
        difficulty: 1,
      },
      {
        question_text: "Solve for x: 2x − 3 = 7",
        options: ["2", "5", "8", "−2"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "Solve for x: 5x − 1 = 2x + 11",
        options: ["2", "3", "4", "6"],
        correct: "c",
        difficulty: 2,
      },
      {
        question_text: "Three times a number, plus 5, gives 20. What is the number?",
        options: ["3", "5", "15", "25"],
        correct: "b",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Understanding Quadrilaterals",
    sequence: 3,
    pdfUrl: ncertPdf(3),
    questions: [
      {
        question_text: "What do the four angles of any quadrilateral add up to?",
        options: ["180°", "270°", "360°", "540°"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "In a parallelogram, opposite angles are…",
        options: ["Complementary", "Equal", "Always 90°", "Unequal"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "Each interior angle of a regular hexagon is…",
        options: ["90°", "108°", "120°", "135°"],
        correct: "c",
        difficulty: 2,
      },
      {
        question_text: "The angle sum of a polygon with n sides is…",
        options: ["n × 180°", "(n − 2) × 180°", "(n + 2) × 180°", "(n − 2) × 90°"],
        correct: "b",
        difficulty: 3,
      },
    ],
  },
  {
    name: "Data Handling",
    sequence: 4,
    pdfUrl: ncertPdf(4),
    questions: [
      {
        question_text: "A coin is tossed once. What is the probability of getting heads?",
        options: ["0", "1/2", "1", "1/4"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "A fair die is rolled. What is the probability of getting an even number?",
        options: ["1/6", "1/3", "1/2", "2/3"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "Find the mean of 4, 8 and 12.",
        options: ["6", "8", "9", "10"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "Find the median of 2, 4, 6, 8, 10.",
        options: ["4", "5", "6", "8"],
        correct: "c",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Squares and Square Roots",
    sequence: 5,
    pdfUrl: ncertPdf(5),
    questions: [
      {
        question_text: "What is √144?",
        options: ["11", "12", "13", "14"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "What is 15² ?",
        options: ["150", "215", "225", "255"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "How many non-square numbers lie between 10² and 11² ?",
        options: ["10", "20", "21", "22"],
        correct: "b",
        difficulty: 3,
      },
      {
        question_text: "Which of these is a perfect square?",
        options: ["1024", "2000", "1234", "999"],
        correct: "a",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Cubes and Cube Roots",
    sequence: 6,
    pdfUrl: ncertPdf(6),
    questions: [
      {
        question_text: "What is the cube of 5?",
        options: ["15", "25", "125", "250"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "What is ∛64?",
        options: ["2", "4", "8", "16"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "What is ∛216?",
        options: ["4", "5", "6", "8"],
        correct: "c",
        difficulty: 2,
      },
      {
        question_text: "Which of these numbers is a perfect cube?",
        options: ["343", "81", "121", "2000"],
        correct: "a",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Comparing Quantities",
    sequence: 7,
    pdfUrl: ncertPdf(7),
    questions: [
      {
        question_text: "What is 20% of 250?",
        options: ["25", "40", "50", "75"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "A school bag is marked ₹800 and has a 10% discount. What do you pay?",
        options: ["₹790", "₹720", "₹710", "₹700"],
        correct: "b",
        difficulty: 2,
      },
      {
        question_text: "Simple interest on ₹1000 at 5% per year for 2 years is…",
        options: ["₹50", "₹100", "₹110", "₹200"],
        correct: "b",
        difficulty: 2,
      },
      {
        question_text: "Write 0.25 as a percentage.",
        options: ["2.5%", "25%", "250%", "0.25%"],
        correct: "b",
        difficulty: 1,
      },
    ],
  },
  {
    name: "Algebraic Expressions and Identities",
    sequence: 8,
    pdfUrl: ncertPdf(8),
    questions: [
      {
        question_text: "Simplify: 2x + 3x − x",
        options: ["5x", "6x", "4x", "3x"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "What is the coefficient of x in 3x² + 5x − 2?",
        options: ["3", "5", "−2", "2"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "Expand (x + 3)(x − 3).",
        options: ["x² − 9", "x² + 9", "x² + 6x + 9", "x² − 6x + 9"],
        correct: "a",
        difficulty: 2,
      },
      {
        question_text: "Evaluate x² + 2x + 1 when x = 2.",
        options: ["7", "8", "9", "11"],
        correct: "c",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Mensuration",
    sequence: 9,
    pdfUrl: ncertPdf(9),
    questions: [
      {
        question_text: "Area of a rectangle 8 cm long and 5 cm wide is…",
        options: ["13 cm²", "26 cm²", "40 cm²", "45 cm²"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "What is the area of a square with side 6 cm?",
        options: ["12 cm²", "24 cm²", "36 cm²", "48 cm²"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "Volume of a cuboid that is 3 cm × 2 cm × 4 cm is…",
        options: ["9 cm³", "14 cm³", "20 cm³", "24 cm³"],
        correct: "d",
        difficulty: 1,
      },
      {
        question_text: "Parallel sides of a trapezium are 6 cm and 10 cm, height 4 cm. Its area is…",
        options: ["16 cm²", "32 cm²", "40 cm²", "64 cm²"],
        correct: "b",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Exponents and Powers",
    sequence: 10,
    pdfUrl: ncertPdf(10),
    questions: [
      {
        question_text: "What is 10³ ?",
        options: ["30", "100", "1000", "10000"],
        correct: "c",
        difficulty: 1,
      },
      {
        question_text: "What is 2⁵ ?",
        options: ["10", "25", "30", "32"],
        correct: "d",
        difficulty: 1,
      },
      {
        question_text: "What is (−3)² ?",
        options: ["−9", "−6", "6", "9"],
        correct: "d",
        difficulty: 1,
      },
      {
        question_text: "What is 10⁻² equal to?",
        options: ["−100", "−20", "1/100", "1/20"],
        correct: "c",
        difficulty: 2,
      },
    ],
  },
  {
    name: "Direct and Inverse Proportions",
    sequence: 11,
    pdfUrl: ncertPdf(11),
    questions: [
      {
        question_text: "5 pens cost ₹50. At the same rate, what do 8 pens cost?",
        options: ["₹70", "₹80", "₹90", "₹100"],
        correct: "b",
        difficulty: 2,
      },
      {
        question_text: "4 workers finish a job in 12 days. How long would 8 workers take?",
        options: ["24 days", "12 days", "6 days", "3 days"],
        correct: "c",
        difficulty: 2,
      },
      {
        question_text: "A car travelling at 60 km/h takes 2 hours. At 40 km/h, how long for the same trip?",
        options: ["1.5 hours", "2.5 hours", "3 hours", "4 hours"],
        correct: "c",
        difficulty: 3,
      },
      {
        question_text: "y varies directly with x. When x = 3, y = 12. When x = 5, y is…",
        options: ["15", "18", "20", "24"],
        correct: "c",
        difficulty: 3,
      },
    ],
  },
  {
    name: "Factorisation",
    sequence: 12,
    pdfUrl: ncertPdf(12),
    questions: [
      {
        question_text: "Factorise: 6x + 9",
        options: ["3(2x + 3)", "3(2x + 9)", "6(x + 3)", "2(3x + 9)"],
        correct: "a",
        difficulty: 1,
      },
      {
        question_text: "Factorise: x² − 16",
        options: ["(x − 4)²", "(x + 4)(x − 4)", "(x + 8)(x − 8)", "(x + 4)²"],
        correct: "b",
        difficulty: 2,
      },
      {
        question_text: "The common factor of 12a²b and 8ab² is…",
        options: ["2ab", "4ab", "2a²b²", "4a²b²"],
        correct: "b",
        difficulty: 2,
      },
      {
        question_text: "Which is the correct factorisation of x² + 5x + 6?",
        options: ["(x + 2)(x + 3)", "(x + 1)(x + 6)", "(x + 2)(x + 4)", "(x − 2)(x − 3)"],
        correct: "a",
        difficulty: 3,
      },
    ],
  },
  {
    name: "Introduction to Graphs",
    sequence: 13,
    pdfUrl: ncertPdf(13),
    questions: [
      {
        question_text: "What are the coordinates of the origin?",
        options: ["(1, 1)", "(0, 1)", "(1, 0)", "(0, 0)"],
        correct: "d",
        difficulty: 1,
      },
      {
        question_text: "On the x-axis, the y-coordinate of every point is…",
        options: ["0", "1", "Always positive", "Any number"],
        correct: "a",
        difficulty: 1,
      },
      {
        question_text: "The point (3, 4) has…",
        options: ["x = 4, y = 3", "x = 3, y = 4", "x = 7", "y = 3"],
        correct: "b",
        difficulty: 1,
      },
      {
        question_text: "A distance–time graph that is a straight line through the origin means the object is moving…",
        options: [
          "At a constant speed",
          "Faster and faster",
          "Slower and slower",
          "Not moving at all",
        ],
        correct: "a",
        difficulty: 2,
      },
    ],
  },
];

export function buildYouTubeLink(chapter: string): { title: string; url: string } {
  return {
    title: `Watch lessons on YouTube — ${chapter}`,
    url: youTubeSearch(chapter),
  };
}

export function buildPdfLink(chapter: string, url: string): { title: string; url: string } {
  return {
    title: `Read the chapter — ${chapter} (NCERT PDF)`,
    url,
  };
}
