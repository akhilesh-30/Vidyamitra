/**
 * Seed runner for Class 9 CBSE Mathematics and Science.
 */
import { createClient } from "@supabase/supabase-js";

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      /* try next */
    }
  }
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env.local / .env`);
  return v;
}

type Letter = "a" | "b" | "c" | "d";

interface QuestionSeed {
  question_text: string;
  options: string[];
  correct: Letter;
  difficulty: 1 | 2 | 3;
}

interface TopicSeed {
  name: string;
  sequence: number;
  pdfUrl: string;
  questions: QuestionSeed[];
}

interface SubjectBundle {
  board: string;
  class_level: number;
  name: string;
  topics: TopicSeed[];
}

const CLASS_9_MATH: TopicSeed[] = [
  {
    name: "Number Systems",
    sequence: 1,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh101.pdf",
    questions: [
      { question_text: "Every rational number is also a...", options: ["Natural number", "Whole number", "Real number", "Irrational number"], correct: "c", difficulty: 1 },
      { question_text: "Which of the following is an irrational number?", options: ["0.25", "√4", "√7", "3/5"], correct: "c", difficulty: 1 },
      { question_text: "The value of 1/(√2) with rationalized denominator is...", options: ["√2/2", "2/√2", "√2", "1/2"], correct: "a", difficulty: 2 },
      { question_text: "Simplify: (3 + √3)(3 − √3)", options: ["6", "9", "3", "0"], correct: "a", difficulty: 2 },
    ],
  },
  {
    name: "Polynomials",
    sequence: 2,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh102.pdf",
    questions: [
      { question_text: "Degree of the polynomial 4x³ + 2x² − x + 5 is...", options: ["1", "2", "3", "4"], correct: "c", difficulty: 1 },
      { question_text: "What is p(0) for p(x) = x² − 4x + 3?", options: ["3", "-3", "0", "1"], correct: "a", difficulty: 1 },
      { question_text: "Factorise: x² − 7x + 12", options: ["(x−3)(x−4)", "(x+3)(x−4)", "(x−2)(x−6)", "(x+2)(x+6)"], correct: "a", difficulty: 2 },
      { question_text: "Zero of the polynomial p(x) = 3x − 6 is...", options: ["-2", "2", "3", "-6"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Coordinate Geometry",
    sequence: 3,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh103.pdf",
    questions: [
      { question_text: "The point (−4, 6) lies in which quadrant?", options: ["Quadrant I", "Quadrant II", "Quadrant III", "Quadrant IV"], correct: "b", difficulty: 1 },
      { question_text: "The coordinates of origin are...", options: ["(1, 1)", "(0, 1)", "(1, 0)", "(0, 0)"], correct: "d", difficulty: 1 },
      { question_text: "The distance of point (4, 3) from the x-axis is...", options: ["4 units", "3 units", "5 units", "7 units"], correct: "b", difficulty: 2 },
      { question_text: "Any point lying on the y-axis has x-coordinate equal to...", options: ["1", "-1", "0", "Any real number"], correct: "c", difficulty: 1 },
    ],
  },
  {
    name: "Linear Equations in Two Variables",
    sequence: 4,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh104.pdf",
    questions: [
      { question_text: "A linear equation in two variables ax + by + c = 0 has...", options: ["A unique solution", "Two solutions", "Infinitely many solutions", "No solution"], correct: "c", difficulty: 1 },
      { question_text: "Which of the following is a solution of 2x + y = 7?", options: ["(1, 5)", "(2, 2)", "(3, 2)", "(0, 5)"], correct: "a", difficulty: 2 },
      { question_text: "The graph of the equation x = 4 is a straight line...", options: ["Parallel to x-axis", "Parallel to y-axis", "Passing through origin", "Inclined at 45 degrees"], correct: "b", difficulty: 1 },
      { question_text: "Equation of the x-axis is...", options: ["x = 0", "y = 0", "x + y = 0", "x = y"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Introduction to Euclid's Geometry",
    sequence: 5,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh105.pdf",
    questions: [
      { question_text: "The boundaries of solids are...", options: ["Surfaces", "Lines", "Points", "Curves"], correct: "a", difficulty: 1 },
      { question_text: "How many straight lines can pass through two given distinct points?", options: ["Zero", "Exactly one", "Two", "Infinitely many"], correct: "b", difficulty: 1 },
      { question_text: "Things which are equal to the same thing are...", options: ["Unequal", "Equal to one another", "Perpendicular", "Parallel"], correct: "b", difficulty: 1 },
      { question_text: "A line segment has...", options: ["One endpoint", "Two endpoints", "No endpoints", "Infinite length"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Lines and Angles",
    sequence: 6,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh106.pdf",
    questions: [
      { question_text: "An angle measuring 140° is classified as...", options: ["Acute angle", "Right angle", "Obtuse angle", "Reflex angle"], correct: "c", difficulty: 1 },
      { question_text: "If two angles are complementary, their sum is...", options: ["90°", "180°", "270°", "360°"], correct: "a", difficulty: 1 },
      { question_text: "When two lines intersect, vertically opposite angles are...", options: ["Supplementary", "Complementary", "Equal", "Linear pair"], correct: "c", difficulty: 1 },
      { question_text: "If two parallel lines are cut by a transversal, alternate interior angles are...", options: ["Equal", "Supplementary", "Complementary", "Unequal"], correct: "a", difficulty: 2 },
    ],
  },
  {
    name: "Triangles",
    sequence: 7,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh107.pdf",
    questions: [
      { question_text: "Sum of three angles of a triangle is always...", options: ["90°", "180°", "270°", "360°"], correct: "b", difficulty: 1 },
      { question_text: "In an equilateral triangle, each interior angle measures...", options: ["45°", "60°", "90°", "120°"], correct: "b", difficulty: 1 },
      { question_text: "Which congruence criterion requires two sides and the included angle?", options: ["SSS", "SAS", "ASA", "RHS"], correct: "b", difficulty: 1 },
      { question_text: "In a right triangle, the longest side is called...", options: ["Base", "Altitude", "Hypotenuse", "Median"], correct: "c", difficulty: 1 },
    ],
  },
  {
    name: "Quadrilaterals",
    sequence: 8,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh108.pdf",
    questions: [
      { question_text: "Sum of all four interior angles of a quadrilateral is...", options: ["180°", "270°", "360°", "540°"], correct: "c", difficulty: 1 },
      { question_text: "In a parallelogram, opposite angles are...", options: ["Supplementary", "Equal", "Complementary", "Acute"], correct: "b", difficulty: 1 },
      { question_text: "A quadrilateral whose all sides are equal and all angles are 90° is a...", options: ["Rhombus", "Rectangle", "Square", "Trapezium"], correct: "c", difficulty: 1 },
      { question_text: "Diagonals of a rhombus...", options: ["Are equal", "Bisect each other at right angles", "Do not bisect each other", "Are parallel"], correct: "b", difficulty: 2 },
    ],
  },
  {
    name: "Circles",
    sequence: 9,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh109.pdf",
    questions: [
      { question_text: "The longest chord of a circle is the...", options: ["Radius", "Secant", "Diameter", "Arc"], correct: "c", difficulty: 1 },
      { question_text: "Angle subtended by a diameter in a semicircle is...", options: ["45°", "60°", "90°", "180°"], correct: "c", difficulty: 1 },
      { question_text: "Equal chords of a circle subtend...", options: ["Equal angles at the centre", "Supplementary angles", "Right angles", "Unequal angles"], correct: "a", difficulty: 2 },
      { question_text: "Angles in the same segment of a circle are...", options: ["Complementary", "Supplementary", "Equal", "Different"], correct: "c", difficulty: 2 },
    ],
  },
  {
    name: "Heron's Formula",
    sequence: 10,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh110.pdf",
    questions: [
      { question_text: "In Heron's formula Area = √[s(s-a)(s-b)(s-c)], s represents...", options: ["Side length", "Perimeter", "Semi-perimeter", "Surface area"], correct: "c", difficulty: 1 },
      { question_text: "For a triangle with sides 6 cm, 8 cm, 10 cm, the semi-perimeter is...", options: ["12 cm", "24 cm", "14 cm", "10 cm"], correct: "a", difficulty: 1 },
      { question_text: "Area of a triangle with sides 6 cm, 8 cm, 10 cm is...", options: ["24 cm²", "48 cm²", "30 cm²", "18 cm²"], correct: "a", difficulty: 2 },
      { question_text: "Heron's formula is especially useful when...", options: ["Height is unknown but all 3 sides are known", "Angles are known", "Only one side is known", "Area is known"], correct: "a", difficulty: 1 },
    ],
  },
  {
    name: "Surface Areas and Volumes",
    sequence: 11,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh111.pdf",
    questions: [
      { question_text: "Total surface area of a cube of edge 'a' is...", options: ["4a²", "6a²", "a³", "12a"], correct: "b", difficulty: 1 },
      { question_text: "Volume of a cylinder with radius 'r' and height 'h' is...", options: ["2πrh", "πr²h", "4/3 πr³", "1/3 πr²h"], correct: "b", difficulty: 1 },
      { question_text: "Curved surface area of a cone of radius r and slant height l is...", options: ["πrl", "2πrh", "πr²", "πr(l+r)"], correct: "a", difficulty: 2 },
      { question_text: "Volume of a sphere of radius r is...", options: ["4πr²", "4/3 πr³", "2/3 πr³", "3πr³"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Statistics",
    sequence: 12,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iemh112.pdf",
    questions: [
      { question_text: "The difference between maximum and minimum value in a data set is...", options: ["Mean", "Median", "Mode", "Range"], correct: "d", difficulty: 1 },
      { question_text: "The mean of first 5 natural numbers (1, 2, 3, 4, 5) is...", options: ["2", "3", "3.5", "4"], correct: "b", difficulty: 1 },
      { question_text: "The value that appears most frequently in a dataset is...", options: ["Mean", "Median", "Mode", "Variance"], correct: "c", difficulty: 1 },
      { question_text: "A bar graph with contiguous rectangles representing class intervals is a...", options: ["Pie chart", "Histogram", "Frequency polygon", "Pictograph"], correct: "b", difficulty: 2 },
    ],
  },
];

const CLASS_9_SCIENCE: TopicSeed[] = [
  {
    name: "Matter in Our Surroundings",
    sequence: 1,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc101.pdf",
    questions: [
      { question_text: "Which state of matter has definite volume but no fixed shape?", options: ["Solid", "Liquid", "Gas", "Plasma"], correct: "b", difficulty: 1 },
      { question_text: "Direct change from solid state to gas without passing through liquid is called...", options: ["Evaporation", "Condensation", "Sublimation", "Fusion"], correct: "c", difficulty: 1 },
      { question_text: "Boiling point of pure water at normal atmospheric pressure is...", options: ["100 K", "273 K", "373 K", "0 K"], correct: "c", difficulty: 2 },
      { question_text: "Evaporation causes cooling because particles absorb energy from...", options: ["Sunlight", "Surroundings", "Chemical reactions", "Convection currents"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Is Matter Around Us Pure?",
    sequence: 2,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc102.pdf",
    questions: [
      { question_text: "Which of the following is a homogeneous mixture?", options: ["Salt solution in water", "Chalk powder in water", "Sand in water", "Oil in water"], correct: "a", difficulty: 1 },
      { question_text: "The scattering of light by colloidal particles is called...", options: ["Refraction", "Tyndall effect", "Reflection", "Dispersion"], correct: "b", difficulty: 1 },
      { question_text: "Brass is an alloy (solid solution) of...", options: ["Copper and Tin", "Copper and Zinc", "Iron and Carbon", "Aluminum and Copper"], correct: "b", difficulty: 2 },
      { question_text: "A pure chemical compound always contains elements combined in a fixed ratio by...", options: ["Volume", "Mass", "Density", "Temperature"], correct: "b", difficulty: 2 },
    ],
  },
  {
    name: "Atoms and Molecules",
    sequence: 3,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc103.pdf",
    questions: [
      { question_text: "Law of conservation of mass in a chemical reaction was stated by...", options: ["Lavoisier", "Proust", "Dalton", "Bohr"], correct: "a", difficulty: 1 },
      { question_text: "Molecular mass of water (H₂O) is...", options: ["16 u", "18 u", "20 u", "14 u"], correct: "b", difficulty: 1 },
      { question_text: "The chemical formula of Calcium Carbonate is...", options: ["CaCO₃", "CaO", "Ca(HCO₃)₂", "CaCl₂"], correct: "a", difficulty: 1 },
      { question_text: "Avogadro number represents number of particles in 1 mole, equal to...", options: ["6.022 × 10²³", "6.022 × 10²²", "3.011 × 10²³", "1.602 × 10⁻¹⁹"], correct: "a", difficulty: 2 },
    ],
  },
  {
    name: "Structure of the Atom",
    sequence: 4,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc104.pdf",
    questions: [
      { question_text: "Electrons were discovered by...", options: ["J.J. Thomson", "E. Rutherford", "James Chadwick", "Niels Bohr"], correct: "a", difficulty: 1 },
      { question_text: "Neutrons are subatomic particles with...", options: ["Positive charge", "Negative charge", "No electric charge", "Double positive charge"], correct: "c", difficulty: 1 },
      { question_text: "Isotopes are atoms of same element having...", options: ["Same mass number", "Same atomic number, different mass number", "Different atomic number", "Same number of neutrons"], correct: "b", difficulty: 2 },
      { question_text: "Maximum capacity of M-shell (n=3) for electrons is...", options: ["2", "8", "18", "32"], correct: "c", difficulty: 2 },
    ],
  },
  {
    name: "The Fundamental Unit of Life",
    sequence: 5,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc105.pdf",
    questions: [
      { question_text: "Cells were first discovered by Robert Hooke in...", options: ["1665", "1831", "1839", "1855"], correct: "a", difficulty: 1 },
      { question_text: "Which cell organelle is known as the 'Powerhouse of the cell'?", options: ["Ribosome", "Golgi apparatus", "Mitochondria", "Lysosome"], correct: "c", difficulty: 1 },
      { question_text: "The main component of plant cell wall is...", options: ["Cellulose", "Protein", "Lipid", "Starch"], correct: "a", difficulty: 1 },
      { question_text: "Lysosomes are often termed as...", options: ["Protein factories", "Suicide bags", "Control room", "Kitchen of cell"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Tissues",
    sequence: 6,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc106.pdf",
    questions: [
      { question_text: "Which plant tissue is responsible for transport of water and minerals?", options: ["Phloem", "Xylem", "Parenchyma", "Collenchyma"], correct: "b", difficulty: 1 },
      { question_text: "Blood is an example of which type of animal tissue?", options: ["Epithelial tissue", "Fluid connective tissue", "Muscular tissue", "Nervous tissue"], correct: "b", difficulty: 1 },
      { question_text: "The functional unit of nervous tissue is...", options: ["Nephron", "Neuron", "Sarcomere", "Osteocyte"], correct: "b", difficulty: 1 },
      { question_text: "Plant tissue with actively dividing cells is called...", options: ["Meristematic tissue", "Permanent tissue", "Epidermis", "Cortex"], correct: "a", difficulty: 1 },
    ],
  },
  {
    name: "Motion",
    sequence: 7,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc107.pdf",
    questions: [
      { question_text: "SI unit of velocity is...", options: ["km/h", "m/s", "m/s²", "cm/s"], correct: "b", difficulty: 1 },
      { question_text: "The rate of change of velocity is called...", options: ["Speed", "Distance", "Acceleration", "Displacement"], correct: "c", difficulty: 1 },
      { question_text: "Area under a velocity-time graph gives the magnitude of...", options: ["Displacement", "Acceleration", "Force", "Speed"], correct: "a", difficulty: 2 },
      { question_text: "First equation of uniformly accelerated motion is...", options: ["v = u + at", "s = ut + ½at²", "v² = u² + 2as", "s = (u+v)t"], correct: "a", difficulty: 1 },
    ],
  },
  {
    name: "Force and Laws of Motion",
    sequence: 8,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc108.pdf",
    questions: [
      { question_text: "Newton's first law of motion is also known as the Law of...", options: ["Momentum", "Inertia", "Action-Reaction", "Conservation"], correct: "b", difficulty: 1 },
      { question_text: "SI unit of force is...", options: ["Joule", "Watt", "Newton", "Pascal"], correct: "c", difficulty: 1 },
      { question_text: "Momentum is given by the product of...", options: ["Mass × Velocity", "Mass × Acceleration", "Force × Time", "Mass × Distance"], correct: "a", difficulty: 1 },
      { question_text: "Newton's third law states that action and reaction forces are...", options: ["Equal, opposite, and act on different bodies", "Unequal and opposite", "Equal and act on same body", "Always zero"], correct: "a", difficulty: 2 },
    ],
  },
  {
    name: "Gravitation",
    sequence: 9,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc109.pdf",
    questions: [
      { question_text: "Universal law of gravitation was formulated by...", options: ["Galileo", "Isaac Newton", "Kepler", "Archimedes"], correct: "b", difficulty: 1 },
      { question_text: "Standard acceleration due to gravity (g) near Earth's surface is approximately...", options: ["9.8 m/s²", "9.8 m/s", "10 m/s", "6.67 × 10⁻¹¹ N m²/kg²"], correct: "a", difficulty: 1 },
      { question_text: "Mass of an object remains constant, while weight...", options: ["Also remains constant", "Changes with acceleration due to gravity", "Is always zero", "Is independent of location"], correct: "b", difficulty: 2 },
      { question_text: "The upward force exerted by a fluid on an immersed object is called...", options: ["Gravitational force", "Buoyant force", "Frictional force", "Tension"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Work and Energy",
    sequence: 10,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc110.pdf",
    questions: [
      { question_text: "Work done is zero when the angle between force and displacement is...", options: ["0°", "45°", "90°", "180°"], correct: "c", difficulty: 2 },
      { question_text: "SI unit of work and energy is...", options: ["Watt", "Newton", "Joule", "Pascal"], correct: "c", difficulty: 1 },
      { question_text: "Kinetic energy of a body of mass 'm' moving with velocity 'v' is...", options: ["mv", "mgh", "½mv²", "½mv"], correct: "c", difficulty: 1 },
      { question_text: "Commercial unit of electrical energy (1 kilowatt-hour) equals...", options: ["3.6 × 10⁶ Joules", "1000 Joules", "3600 Joules", "1.6 × 10⁻¹⁹ Joules"], correct: "a", difficulty: 2 },
    ],
  },
  {
    name: "Sound",
    sequence: 11,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc111.pdf",
    questions: [
      { question_text: "Sound waves in air are classified as...", options: ["Transverse waves", "Longitudinal waves", "Electromagnetic waves", "Light waves"], correct: "b", difficulty: 1 },
      { question_text: "The audible range of frequencies for normal human hearing is...", options: ["20 Hz to 20,000 Hz", "2 Hz to 200 Hz", "200 Hz to 2,000 Hz", "Above 20,000 Hz"], correct: "a", difficulty: 1 },
      { question_text: "Sound cannot travel through...", options: ["Solids", "Liquids", "Gases", "Vacuum"], correct: "d", difficulty: 1 },
      { question_text: "An echo is produced due to...", options: ["Refraction of sound", "Reflection of sound", "Diffraction of sound", "Absorption of sound"], correct: "b", difficulty: 1 },
    ],
  },
  {
    name: "Improvement in Food Resources",
    sequence: 12,
    pdfUrl: "https://ncert.nic.in/textbook/pdf/iesc112.pdf",
    questions: [
      { question_text: "Which of the following is a Kharif crop grown during rainy season?", options: ["Wheat", "Gram", "Paddy (Rice)", "Mustard"], correct: "c", difficulty: 1 },
      { question_text: "Rearing of honey bees for honey and wax production is called...", options: ["Pisciculture", "Sericulture", "Apiculture", "Horticulture"], correct: "c", difficulty: 1 },
      { question_text: "Compost prepared using earthworms to hasten degradation is called...", options: ["Green manure", "Vermicompost", "NPK fertilizer", "Biochar"], correct: "b", difficulty: 1 },
      { question_text: "Macronutrients needed in large amounts by plants include...", options: ["Iron, Zinc, Copper", "Nitrogen, Phosphorus, Potassium", "Boron, Chlorine", "Manganese, Molybdenum"], correct: "b", difficulty: 2 },
    ],
  },
];

const BUNDLES: SubjectBundle[] = [
  {
    board: "CBSE",
    class_level: 9,
    name: "Mathematics",
    topics: CLASS_9_MATH,
  },
  {
    board: "CBSE",
    class_level: 9,
    name: "Science",
    topics: CLASS_9_SCIENCE,
  },
];

async function main(): Promise<void> {
  loadEnv();
  const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("🌱 Starting Class 9 CBSE Seed...");

  let totalSubjects = 0;
  let totalTopics = 0;
  let totalLinks = 0;
  let totalQuestions = 0;

  for (const bundle of BUNDLES) {
    const { data: existingSubj } = await sb
      .from("subjects")
      .select("id")
      .eq("board", bundle.board)
      .eq("class_level", bundle.class_level)
      .eq("name", bundle.name)
      .maybeSingle();

    let subjectId: string;
    if (existingSubj) {
      subjectId = existingSubj.id as string;
      console.log(`✓ Subject exists: ${bundle.name} (Class ${bundle.class_level} ${bundle.board})`);
    } else {
      const { data, error } = await sb
        .from("subjects")
        .insert({ board: bundle.board, class_level: bundle.class_level, name: bundle.name })
        .select("id")
        .single();
      if (error) throw new Error(`Could not create subject ${bundle.name}: ${error.message}`);
      subjectId = data.id as string;
      totalSubjects++;
      console.log(`+ Created subject: ${bundle.name} (Class ${bundle.class_level} ${bundle.board})`);
    }

    for (const topicSeed of bundle.topics) {
      const { data: existingTopic } = await sb
        .from("topics")
        .select("id")
        .eq("subject_id", subjectId)
        .eq("name", topicSeed.name)
        .maybeSingle();

      let topicId: string;
      if (existingTopic) {
        topicId = existingTopic.id as string;
      } else {
        const { data, error } = await sb
          .from("topics")
          .insert({ subject_id: subjectId, name: topicSeed.name, sequence: topicSeed.sequence })
          .select("id")
          .single();
        if (error) throw new Error(`Could not create topic ${topicSeed.name}: ${error.message}`);
        topicId = data.id as string;
        totalTopics++;
      }

      // PDF link
      const { data: hasPdf } = await sb
        .from("content_links")
        .select("id")
        .eq("topic_id", topicId)
        .eq("type", "pdf")
        .maybeSingle();
      if (!hasPdf) {
        await sb.from("content_links").insert({
          topic_id: topicId,
          type: "pdf",
          title: `Read the chapter — ${topicSeed.name} (NCERT PDF)`,
          url: topicSeed.pdfUrl,
        });
        totalLinks++;
      }

      // YouTube link
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        topicSeed.name + " class 9 ncert " + bundle.name.toLowerCase()
      )}`;
      const { data: hasYt } = await sb
        .from("content_links")
        .select("id")
        .eq("topic_id", topicId)
        .eq("type", "youtube")
        .maybeSingle();
      if (!hasYt) {
        await sb.from("content_links").insert({
          topic_id: topicId,
          type: "youtube",
          title: `Watch lessons on YouTube — ${topicSeed.name}`,
          url: ytUrl,
        });
        totalLinks++;
      }

      // Questions
      const { count: qCount } = await sb
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("topic_id", topicId);

      if (!qCount || qCount === 0) {
        for (const q of topicSeed.questions) {
          const { error } = await sb.from("questions").insert({
            topic_id: topicId,
            question_text: q.question_text,
            options: q.options,
            correct_option: q.correct,
            difficulty: q.difficulty,
          });
          if (error) throw new Error(`Could not create question in ${topicSeed.name}: ${error.message}`);
          totalQuestions++;
        }
      }
    }
  }

  console.log(`\n🎉 Seed Completed!`);
  console.log(`New entities created this run:`);
  console.log(`  Subjects: ${totalSubjects}`);
  console.log(`  Topics: ${totalTopics}`);
  console.log(`  Links: ${totalLinks}`);
  console.log(`  Questions: ${totalQuestions}`);

  // Query and print all DB counts
  const { count: sCount } = await sb.from("subjects").select("id", { count: "exact", head: true });
  const { count: tCount } = await sb.from("topics").select("id", { count: "exact", head: true });
  const { count: clCount } = await sb.from("content_links").select("id", { count: "exact", head: true });
  const { count: qCount } = await sb.from("questions").select("id", { count: "exact", head: true });
  const { count: stuCount } = await sb.from("students").select("id", { count: "exact", head: true });

  console.log(`\n=== TOTAL DATABASE STATS ===`);
  console.log(`  Students: ${stuCount}`);
  console.log(`  Subjects: ${sCount}`);
  console.log(`  Topics: ${tCount}`);
  console.log(`  Content Links: ${clCount}`);
  console.log(`  Questions: ${qCount}`);
}

main().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
