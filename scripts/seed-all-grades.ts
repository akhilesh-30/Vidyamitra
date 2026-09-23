/**
 * Comprehensive Seed runner for Classes 5 to 10 (CBSE & Maharashtra State Board).
 * Populates Subjects, Topics, Content Links (NCERT/eBalbharati PDF + YouTube), and Questions.
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
  board: "CBSE" | "MAHARASHTRA";
  class_level: number;
  name: string;
  topics: TopicSeed[];
}

const ALL_BUNDLES: SubjectBundle[] = [
  // ==================== CBSE CLASS 5 ====================
  {
    board: "CBSE",
    class_level: 5,
    name: "Mathematics",
    topics: [
      {
        name: "The Fish Tale (Numbers & Measurement)",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/eemh101.pdf",
        questions: [
          { question_text: "How many thousands make 1 Lakh?", options: ["10", "100", "1000", "10000"], correct: "b", difficulty: 1 },
          { question_text: "If a boat travels 20 km in 1 hour, how far will it travel in 4 hours?", options: ["60 km", "80 km", "100 km", "40 km"], correct: "b", difficulty: 1 },
          { question_text: "One crore is equal to how many millions?", options: ["1 Million", "10 Millions", "100 Millions", "1000 Millions"], correct: "b", difficulty: 2 },
          { question_text: "If 1 kg of fresh fish becomes 1/3 kg of dried fish, 600 kg fresh fish gives...", options: ["200 kg", "150 kg", "300 kg", "100 kg"], correct: "a", difficulty: 2 },
        ],
      },
      {
        name: "Shapes and Angles",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/eemh102.pdf",
        questions: [
          { question_text: "An angle shaped like the letter 'L' is a...", options: ["Acute angle", "Right angle", "Obtuse angle", "Straight angle"], correct: "b", difficulty: 1 },
          { question_text: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correct: "b", difficulty: 1 },
          { question_text: "An angle less than a right angle is called...", options: ["Acute angle", "Obtuse angle", "Reflex angle", "Straight angle"], correct: "a", difficulty: 1 },
          { question_text: "The angle between hour and minute hands at 3:00 is...", options: ["45°", "60°", "90°", "180°"], correct: "c", difficulty: 1 },
        ],
      },
      {
        name: "Parts and Wholes (Fractions)",
        sequence: 3,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/eemh104.pdf",
        questions: [
          { question_text: "What fraction of a rupee is 50 paise?", options: ["1/4", "1/2", "3/4", "1/5"], correct: "b", difficulty: 1 },
          { question_text: "Which of the following is equivalent to 2/4?", options: ["1/3", "1/2", "3/5", "2/3"], correct: "b", difficulty: 1 },
          { question_text: "Half of 1/2 is...", options: ["1", "1/4", "1/8", "1/3"], correct: "b", difficulty: 2 },
          { question_text: "If a pizza has 8 equal slices and you eat 3, what fraction remains?", options: ["3/8", "5/8", "1/2", "4/8"], correct: "b", difficulty: 1 },
        ],
      },
      {
        name: "Area and its Boundary",
        sequence: 4,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/eemh111.pdf",
        questions: [
          { question_text: "Perimeter of a square of side 5 cm is...", options: ["10 cm", "20 cm", "25 cm", "15 cm"], correct: "b", difficulty: 1 },
          { question_text: "Area of a rectangle of length 6 cm and width 4 cm is...", options: ["20 cm²", "24 cm²", "10 cm²", "12 cm²"], correct: "b", difficulty: 1 },
          { question_text: "The distance around the boundary of a closed shape is its...", options: ["Area", "Perimeter", "Volume", "Diagonal"], correct: "b", difficulty: 1 },
          { question_text: "A square has area 36 cm². Its perimeter is...", options: ["24 cm", "12 cm", "36 cm", "18 cm"], correct: "a", difficulty: 2 },
        ],
      },
    ],
  },
  {
    board: "CBSE",
    class_level: 5,
    name: "Environmental Studies",
    topics: [
      {
        name: "Super Senses (Animals & Habitats)",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/eevs101.pdf",
        questions: [
          { question_text: "Which animal uses echolocation and sounds to navigate in dark?", options: ["Eagle", "Bat", "Cat", "Dog"], correct: "b", difficulty: 1 },
          { question_text: "Silkworm can find its female from kilometres away by her...", options: ["Sound", "Smell", "Colour", "Footsteps"], correct: "b", difficulty: 1 },
          { question_text: "Ants leave behind a scent called...", options: ["Pheromone", "Nectar", "Honey", "Wax"], correct: "a", difficulty: 2 },
          { question_text: "Which bird has eyes in front of its head like humans?", options: ["Crow", "Owl", "Sparrow", "Pigeon"], correct: "b", difficulty: 1 },
        ],
      },
      {
        name: "Seeds and Seeds",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/eevs105.pdf",
        questions: [
          { question_text: "Which part of the plant develops into a seed after pollination?", options: ["Leaf", "Stem", "Ovule", "Root"], correct: "c", difficulty: 2 },
          { question_text: "Velcro was invented after observing seeds of...", options: ["Burdock", "Pea", "Mango", "Papaya"], correct: "a", difficulty: 2 },
          { question_text: "Dandelion seeds are dispersed mainly by...", options: ["Water", "Wind", "Animals", "Explosion"], correct: "b", difficulty: 1 },
          { question_text: "What do seeds need to germinate?", options: ["Only sunlight", "Air, water, and proper temperature", "Only soil", "Fertilizer only"], correct: "b", difficulty: 1 },
        ],
      },
    ],
  },

  // ==================== CBSE CLASS 6 ====================
  {
    board: "CBSE",
    class_level: 6,
    name: "Mathematics",
    topics: [
      {
        name: "Knowing Our Numbers",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/femh101.pdf",
        questions: [
          { question_text: "The smallest 5-digit number is...", options: ["10000", "99999", "11111", "10001"], correct: "a", difficulty: 1 },
          { question_text: "1 Million = how many Lakhs?", options: ["1 Lakh", "10 Lakhs", "100 Lakhs", "1000 Lakhs"], correct: "b", difficulty: 1 },
          { question_text: "Roman numeral for 50 is...", options: ["C", "D", "L", "M"], correct: "c", difficulty: 1 },
          { question_text: "Estimate 730 + 998 to nearest hundreds:", options: ["1700", "1800", "1600", "1750"], correct: "a", difficulty: 2 },
        ],
      },
      {
        name: "Whole Numbers & Integers",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/femh102.pdf",
        questions: [
          { question_text: "Smallest natural number is...", options: ["0", "1", "-1", "2"], correct: "b", difficulty: 1 },
          { question_text: "Additive identity for whole numbers is...", options: ["1", "0", "-1", "None"], correct: "b", difficulty: 1 },
          { question_text: "Compute: (−5) + (−7)", options: ["12", "−12", "2", "−2"], correct: "b", difficulty: 1 },
          { question_text: "Which integer lies between −2 and 0?", options: ["1", "−1", "2", "−3"], correct: "b", difficulty: 1 },
        ],
      },
      {
        name: "Fractions and Decimals",
        sequence: 3,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/femh107.pdf",
        questions: [
          { question_text: "Which is greater: 0.5 or 0.05?", options: ["0.5", "0.05", "Both equal", "Cannot tell"], correct: "a", difficulty: 1 },
          { question_text: "Convert 3/5 to decimal:", options: ["0.3", "0.5", "0.6", "0.15"], correct: "c", difficulty: 1 },
          { question_text: "Simplify: 2/3 + 1/6", options: ["3/9", "5/6", "1/2", "3/6"], correct: "b", difficulty: 2 },
          { question_text: "Product of 0.2 × 0.3 is...", options: ["0.6", "0.06", "6", "0.006"], correct: "b", difficulty: 2 },
        ],
      },
    ],
  },
  {
    board: "CBSE",
    class_level: 6,
    name: "Science",
    topics: [
      {
        name: "Components of Food",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/fesc101.pdf",
        questions: [
          { question_text: "Carbohydrates and fats mainly provide our body with...", options: ["Proteins", "Energy", "Roughage", "Minerals"], correct: "b", difficulty: 1 },
          { question_text: "Deficiency of Vitamin C causes...", options: ["Beriberi", "Scurvy", "Rickets", "Night blindness"], correct: "b", difficulty: 1 },
          { question_text: "Iodine solution turns blue-black in the presence of...", options: ["Fat", "Protein", "Starch", "Sugar"], correct: "c", difficulty: 2 },
          { question_text: "Dietary fibers are also known as...", options: ["Vitamins", "Roughage", "Minerals", "Lipids"], correct: "b", difficulty: 1 },
        ],
      },
      {
        name: "Sorting Materials into Groups",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/fesc102.pdf",
        questions: [
          { question_text: "Materials through which things can be seen clearly are called...", options: ["Opaque", "Transparent", "Translucent", "Lustrous"], correct: "b", difficulty: 1 },
          { question_text: "Which of the following floats on water?", options: ["Iron nail", "Dry leaf", "Stone", "Glass marble"], correct: "b", difficulty: 1 },
          { question_text: "The shine on a freshly cut metal surface is called...", options: ["Hardness", "Lustre", "Texture", "Conductivity"], correct: "b", difficulty: 1 },
          { question_text: "Substances that dissolve completely in water are...", options: ["Insoluble", "Soluble", "Immiscible", "Precipitates"], correct: "b", difficulty: 1 },
        ],
      },
    ],
  },

  // ==================== CBSE CLASS 7 ====================
  {
    board: "CBSE",
    class_level: 7,
    name: "Mathematics",
    topics: [
      {
        name: "Integers",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/gemh101.pdf",
        questions: [
          { question_text: "The product of (−1) × (−1) × (−1) is...", options: ["1", "−1", "0", "3"], correct: "b", difficulty: 1 },
          { question_text: "(−30) ÷ 10 = ?", options: ["3", "−3", "30", "−300"], correct: "b", difficulty: 1 },
          { question_text: "Which property is shown by a × b = b × a?", options: ["Associative", "Commutative", "Distributive", "Closure"], correct: "b", difficulty: 2 },
          { question_text: "(−20) × (−2) × (−5) × 1 = ?", options: ["200", "−200", "100", "−100"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Simple Equations",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/gemh104.pdf",
        questions: [
          { question_text: "If 3x + 2 = 11, then x = ...", options: ["3", "4", "5", "2"], correct: "a", difficulty: 1 },
          { question_text: "Solve: y/5 = 7", options: ["35", "12", "2", "7/5"], correct: "a", difficulty: 1 },
          { question_text: "Sum of three consecutive integers is 33. The middle integer is...", options: ["10", "11", "12", "9"], correct: "b", difficulty: 2 },
          { question_text: "If 4(m + 3) = 24, then m = ...", options: ["3", "4", "5", "6"], correct: "a", difficulty: 2 },
        ],
      },
    ],
  },
  {
    board: "CBSE",
    class_level: 7,
    name: "Science",
    topics: [
      {
        name: "Nutrition in Plants",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/gesc101.pdf",
        questions: [
          { question_text: "The green pigment in plant leaves is...", options: ["Carotene", "Chlorophyll", "Xanthophyll", "Anthocyanin"], correct: "b", difficulty: 1 },
          { question_text: "Tiny pores on leaf surface through which gas exchange occurs are...", options: ["Stomata", "Chloroplasts", "Xylem", "Phloem"], correct: "a", difficulty: 1 },
          { question_text: "Which organism is a parasite?", options: ["Pitcher plant", "Cuscuta (Amarbel)", "Mushroom", "Algae"], correct: "b", difficulty: 2 },
          { question_text: "Lichens show symbiotic relationship between...", options: ["Alga and Fungus", "Plant and Animal", "Bacteria and Virus", "Moss and Fern"], correct: "a", difficulty: 2 },
        ],
      },
      {
        name: "Heat and Temperature",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/gesc103.pdf",
        questions: [
          { question_text: "Normal human body temperature is approximately...", options: ["35°C", "37°C", "39°C", "98.6°C"], correct: "b", difficulty: 1 },
          { question_text: "Heat transfer in liquids and gases primarily happens by...", options: ["Conduction", "Convection", "Radiation", "Insulation"], correct: "b", difficulty: 2 },
          { question_text: "Heat from the Sun reaches Earth through...", options: ["Conduction", "Convection", "Radiation", "Advection"], correct: "c", difficulty: 1 },
          { question_text: "Materials that do not allow heat to pass through easily are...", options: ["Conductors", "Insulators", "Radiators", "Absorbers"], correct: "b", difficulty: 1 },
        ],
      },
    ],
  },

  // ==================== CBSE CLASS 8 (Adding Science) ====================
  {
    board: "CBSE",
    class_level: 8,
    name: "Science",
    topics: [
      {
        name: "Crop Production and Management",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/hesc101.pdf",
        questions: [
          { question_text: "Kharif crops are sown in the month of...", options: ["June-July", "October-November", "March-April", "January-February"], correct: "a", difficulty: 1 },
          { question_text: "The process of loosening and turning the soil is called...", options: ["Harvesting", "Tilling / Ploughing", "Threshing", "Winnowing"], correct: "b", difficulty: 1 },
          { question_text: "Rhizobium bacteria fix atmospheric nitrogen in roots of...", options: ["Cereal crops", "Leguminous plants", "Tubers", "Fruit trees"], correct: "b", difficulty: 2 },
          { question_text: "Drip irrigation system is most suitable for areas with...", options: ["Excess water", "Water scarcity", "Heavy rainfall", "Water logging"], correct: "b", difficulty: 1 },
        ],
      },
      {
        name: "Microorganisms: Friend and Foe",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/hesc102.pdf",
        questions: [
          { question_text: "Which microorganism converts milk into curd?", options: ["Lactobacillus", "Yeast", "Rhizobium", "Penicillium"], correct: "a", difficulty: 1 },
          { question_text: "Alexander Fleming discovered...", options: ["Vaccine for Smallpox", "Penicillin", "Fermentation", "Bacillus anthracis"], correct: "b", difficulty: 1 },
          { question_text: "Female Anopheles mosquito acts as a carrier for...", options: ["Dengue virus", "Malaria parasite", "Cholera bacteria", "Typhoid"], correct: "b", difficulty: 1 },
          { question_text: "The process of conversion of sugar into alcohol is...", options: ["Nitrogen fixation", "Fermentation", "Pasteurization", "Moulding"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Force and Pressure",
        sequence: 3,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/hesc108.pdf",
        questions: [
          { question_text: "A push or pull on an object is called a...", options: ["Pressure", "Force", "Friction", "Gravity"], correct: "b", difficulty: 1 },
          { question_text: "Pressure is defined as...", options: ["Force × Area", "Force / Area", "Area / Force", "Force × Velocity"], correct: "b", difficulty: 1 },
          { question_text: "Atmospheric pressure is measured using a...", options: ["Thermometer", "Barometer", "Hydrometer", "Voltmeter"], correct: "b", difficulty: 1 },
          { question_text: "Pressure exerted by water at the bottom of a container depends on...", options: ["Base area only", "Height of water column", "Color of water", "Atmospheric humidity"], correct: "b", difficulty: 2 },
        ],
      },
    ],
  },

  // ==================== CBSE CLASS 10 ====================
  {
    board: "CBSE",
    class_level: 10,
    name: "Mathematics",
    topics: [
      {
        name: "Real Numbers",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jemh101.pdf",
        questions: [
          { question_text: "The Fundamental Theorem of Arithmetic states that every composite number can be uniquely factored into...", options: ["Even numbers", "Primes", "Odd numbers", "Fractions"], correct: "b", difficulty: 1 },
          { question_text: "If HCF(a, b) = 1, then a and b are called...", options: ["Twin primes", "Co-prime numbers", "Composite", "Even numbers"], correct: "b", difficulty: 1 },
          { question_text: "√3 is a/an...", options: ["Rational number", "Irrational number", "Integer", "Terminating decimal"], correct: "b", difficulty: 1 },
          { question_text: "For any two positive integers a and b: HCF(a,b) × LCM(a,b) = ...", options: ["a + b", "a × b", "a / b", "a² + b²"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Polynomials",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jemh102.pdf",
        questions: [
          { question_text: "A quadratic polynomial ax² + bx + c can have at most how many zeroes?", options: ["1", "2", "3", "0"], correct: "b", difficulty: 1 },
          { question_text: "If α and β are zeroes of ax² + bx + c, then α + β = ...", options: ["c/a", "−b/a", "b/a", "−c/a"], correct: "b", difficulty: 1 },
          { question_text: "If α and β are zeroes of ax² + bx + c, then α × β = ...", options: ["c/a", "−c/a", "b/a", "−b/a"], correct: "a", difficulty: 1 },
          { question_text: "The number of zeroes of a polynomial is equal to number of points where its graph intersects the...", options: ["y-axis", "x-axis", "Origin", "Line y=x"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Quadratic Equations",
        sequence: 3,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jemh104.pdf",
        questions: [
          { question_text: "The discriminant D of ax² + bx + c = 0 is given by...", options: ["b² − 4ac", "b² + 4ac", "4ac − b²", "√b² − 4ac"], correct: "a", difficulty: 1 },
          { question_text: "If D = 0, the roots of the quadratic equation are...", options: ["Real and distinct", "Real and equal", "Not real", "Imaginary"], correct: "b", difficulty: 1 },
          { question_text: "Solve: x² − 9 = 0", options: ["x = 3 only", "x = ±3", "x = 9", "x = ±9"], correct: "b", difficulty: 1 },
          { question_text: "If one root of 2x² + kx − 6 = 0 is 2, then k = ...", options: ["1", "−1", "2", "−2"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Trigonometry",
        sequence: 4,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jemh108.pdf",
        questions: [
          { question_text: "sin²θ + cos²θ = ?", options: ["0", "1", "2", "tanθ"], correct: "b", difficulty: 1 },
          { question_text: "The value of sin 30° is...", options: ["1/2", "√3/2", "1/√2", "1"], correct: "a", difficulty: 1 },
          { question_text: "tan 45° = ?", options: ["0", "1/2", "1", "√3"], correct: "c", difficulty: 1 },
          { question_text: "sec²θ − tan²θ = ?", options: ["0", "1", "−1", "cot²θ"], correct: "b", difficulty: 2 },
        ],
      },
    ],
  },
  {
    board: "CBSE",
    class_level: 10,
    name: "Science",
    topics: [
      {
        name: "Chemical Reactions and Equations",
        sequence: 1,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jesc101.pdf",
        questions: [
          { question_text: "Reaction in which heat is released along with formation of products is called...", options: ["Endothermic", "Exothermic", "Photochemical", "Electrolytic"], correct: "b", difficulty: 1 },
          { question_text: "Rusting of iron is an example of...", options: ["Reduction only", "Corrosion (Redox reaction)", "Neutralisation", "Precipitation"], correct: "b", difficulty: 1 },
          { question_text: "In the reaction 2H₂ + O₂ → 2H₂O, hydrogen is...", options: ["Oxidised", "Reduced", "Precipitated", "Decomposed"], correct: "a", difficulty: 2 },
          { question_text: "Limewater turns milky on passing CO₂ due to formation of...", options: ["Calcium bicarbonate", "Calcium carbonate (CaCO₃)", "Calcium oxide", "Calcium sulfate"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Acids, Bases and Salts",
        sequence: 2,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jesc102.pdf",
        questions: [
          { question_text: "pH of a neutral solution at 25°C is...", options: ["0", "7", "14", "1"], correct: "b", difficulty: 1 },
          { question_text: "Acid present in lemon and orange is...", options: ["Acetic acid", "Citric acid", "Lactic acid", "Tartaric acid"], correct: "b", difficulty: 1 },
          { question_text: "Bleaching powder chemical formula is...", options: ["CaO", "CaOCl₂", "CaCO₃", "CaSO₄·½H₂O"], correct: "b", difficulty: 2 },
          { question_text: "Baking soda is chemically known as...", options: ["Sodium Carbonate", "Sodium Hydrogen Carbonate (NaHCO₃)", "Sodium Hydroxide", "Sodium Chloride"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Life Processes",
        sequence: 3,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jesc105.pdf",
        questions: [
          { question_text: "The functional filtration unit of human kidneys is called...", options: ["Neuron", "Nephron", "Alveoli", "Glomerulus only"], correct: "b", difficulty: 1 },
          { question_text: "Breakdown of pyruvate into lactic acid during vigorous exercise in muscle cells causes...", options: ["Energy burst", "Cramps", "Fever", "Sweating"], correct: "b", difficulty: 1 },
          { question_text: "Site of complete digestion of carbohydrates, proteins, and fats is...", options: ["Stomach", "Small intestine", "Large intestine", "Liver"], correct: "b", difficulty: 2 },
          { question_text: "Which blood vessels carry oxygenated blood from lungs to heart?", options: ["Pulmonary artery", "Pulmonary vein", "Vena cava", "Aorta"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Light: Reflection and Refraction",
        sequence: 4,
        pdfUrl: "https://ncert.nic.in/textbook/pdf/jesc109.pdf",
        questions: [
          { question_text: "The focal length f and radius of curvature R of a spherical mirror are related as...", options: ["f = 2R", "f = R/2", "f = R", "f = R²"], correct: "b", difficulty: 1 },
          { question_text: "Power of a lens having focal length 1 metre is...", options: ["1 Dioptre (1 D)", "2 D", "0.5 D", "10 D"], correct: "a", difficulty: 1 },
          { question_text: "Rear-view mirror used in vehicles is a...", options: ["Plane mirror", "Concave mirror", "Convex mirror", "Cylindrical mirror"], correct: "c", difficulty: 1 },
          { question_text: "Refractive index of diamond with respect to air is approximately...", options: ["1.33", "1.52", "2.42", "1.00"], correct: "c", difficulty: 2 },
        ],
      },
    ],
  },

  // ==================== MAHARASHTRA STATE BOARD (CLASSES 5 TO 10) ====================
  {
    board: "MAHARASHTRA",
    class_level: 5,
    name: "Mathematics",
    topics: [
      {
        name: "Roman Numerals & Number Work",
        sequence: 1,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/503030040.pdf",
        questions: [
          { question_text: "In Roman numerals, the number 15 is written as...", options: ["VVV", "XV", "VX", "XXV"], correct: "b", difficulty: 1 },
          { question_text: "How is 50 written in Roman numerals?", options: ["C", "L", "D", "X"], correct: "b", difficulty: 1 },
          { question_text: "Read the number: 7,49,362. The place value of 4 is...", options: ["4,000", "40,000", "400", "40"], correct: "b", difficulty: 2 },
          { question_text: "Smallest 6-digit number is...", options: ["1,00,000", "9,99,999", "1,11,111", "1,00,001"], correct: "a", difficulty: 1 },
        ],
      },
    ],
  },
  {
    board: "MAHARASHTRA",
    class_level: 6,
    name: "Mathematics",
    topics: [
      {
        name: "Basic Concepts in Geometry",
        sequence: 1,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/603030040.pdf",
        questions: [
          { question_text: "Points that lie on the same straight line are called...", options: ["Collinear points", "Non-collinear points", "Coplanar points", "Concurrent points"], correct: "a", difficulty: 1 },
          { question_text: "A flat surface that extends infinitely in all directions is a...", options: ["Ray", "Line segment", "Plane", "Point"], correct: "c", difficulty: 1 },
          { question_text: "How many lines can be drawn passing through a single point?", options: ["One", "Two", "Infinite number", "Zero"], correct: "c", difficulty: 1 },
          { question_text: "A line segment has...", options: ["Definite length with 2 end points", "Infinite length", "One end point", "No endpoints"], correct: "a", difficulty: 1 },
        ],
      },
    ],
  },
  {
    board: "MAHARASHTRA",
    class_level: 7,
    name: "Mathematics",
    topics: [
      {
        name: "Geometrical Constructions & HCF/LCM",
        sequence: 1,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/703030040.pdf",
        questions: [
          { question_text: "The point of concurrence of the angle bisectors of a triangle is called the...", options: ["Circumcentre", "Incentre", "Orthocentre", "Centroid"], correct: "b", difficulty: 2 },
          { question_text: "HCF of two consecutive even numbers is always...", options: ["1", "2", "4", "0"], correct: "b", difficulty: 2 },
          { question_text: "Product of two numbers is 120. If their HCF is 2, their LCM is...", options: ["60", "240", "120", "30"], correct: "a", difficulty: 2 },
          { question_text: "Two angles whose measures add up to 90° are called...", options: ["Supplementary", "Complementary", "Linear pair", "Opposite"], correct: "b", difficulty: 1 },
        ],
      },
    ],
  },
  {
    board: "MAHARASHTRA",
    class_level: 8,
    name: "Mathematics",
    topics: [
      {
        name: "Rational and Irrational Numbers",
        sequence: 1,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/803030040.pdf",
        questions: [
          { question_text: "The numbers of the form m/n where m, n are integers and n ≠ 0 are...", options: ["Irrational numbers", "Rational numbers", "Whole numbers only", "Natural numbers only"], correct: "b", difficulty: 1 },
          { question_text: "The decimal form of 7/4 is...", options: ["1.75", "1.5", "1.25", "1.8"], correct: "a", difficulty: 1 },
          { question_text: "√3 is an...", options: ["Integer", "Rational number", "Irrational number", "Whole number"], correct: "c", difficulty: 1 },
          { question_text: "Which number lies halfway between 1/3 and 1/2?", options: ["5/12", "1/5", "2/5", "3/5"], correct: "a", difficulty: 2 },
        ],
      },
      {
        name: "Parallel Lines and Transversals",
        sequence: 2,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/803030040.pdf",
        questions: [
          { question_text: "Lines in the same plane that do not intersect are called...", options: ["Intersecting lines", "Parallel lines", "Perpendicular lines", "Coincident lines"], correct: "b", difficulty: 1 },
          { question_text: "Corresponding angles formed by parallel lines and transversal are...", options: ["Congruent", "Supplementary", "Complementary", "Unequal"], correct: "a", difficulty: 1 },
          { question_text: "Interior angles on the same side of a transversal are...", options: ["Equal", "Supplementary (add to 180°)", "Complementary", "Reflex"], correct: "b", difficulty: 2 },
          { question_text: "If one alternate angle is 65°, the other alternate angle is...", options: ["115°", "65°", "90°", "25°"], correct: "b", difficulty: 1 },
        ],
      },
    ],
  },
  {
    board: "MAHARASHTRA",
    class_level: 9,
    name: "Mathematics",
    topics: [
      {
        name: "Sets & Real Numbers",
        sequence: 1,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/903030040.pdf",
        questions: [
          { question_text: "A set having only one element is called a...", options: ["Null set", "Singleton set", "Finite set", "Universal set"], correct: "b", difficulty: 1 },
          { question_text: "Order of the surd ∛5 is...", options: ["1", "2", "3", "5"], correct: "c", difficulty: 1 },
          { question_text: "Absolute value of |−15| is...", options: ["−15", "15", "0", "1/15"], correct: "b", difficulty: 1 },
          { question_text: "If A = {1, 2, 3} and B = {2, 3, 4}, then A ∩ B = ...", options: ["{1, 4}", "{2, 3}", "{1, 2, 3, 4}", "∅"], correct: "b", difficulty: 2 },
        ],
      },
      {
        name: "Polynomials & Linear Equations",
        sequence: 2,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/903030040.pdf",
        questions: [
          { question_text: "The degree of a non-zero constant polynomial is...", options: ["1", "0", "Not defined", "2"], correct: "b", difficulty: 1 },
          { question_text: "Coefficient form of x³ − 2 is...", options: ["(1, -2)", "(1, 0, 0, -2)", "(1, 0, -2)", "(1, 1, -2)"], correct: "b", difficulty: 2 },
          { question_text: "Find value of 2x + 3y when x = 2, y = 1:", options: ["7", "6", "8", "5"], correct: "a", difficulty: 1 },
          { question_text: "Degree of the polynomial √5 is...", options: ["1/2", "0", "1", "5"], correct: "b", difficulty: 1 },
        ],
      },
    ],
  },
  {
    board: "MAHARASHTRA",
    class_level: 10,
    name: "Mathematics",
    topics: [
      {
        name: "Linear Equations in Two Variables",
        sequence: 1,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/1003030040.pdf",
        questions: [
          { question_text: "Cramer's Rule uses which concept to solve simultaneous equations?", options: ["Determinants", "Matrices", "Quadratic formula", "Factoring"], correct: "a", difficulty: 1 },
          { question_text: "Value of determinant | 3  2 | / | 4  5 | is...", options: ["7", "15 − 8 = 7", "23", "−7"], correct: "b", difficulty: 2 },
          { question_text: "Degree of each variable in a linear equation is...", options: ["0", "1", "2", "3"], correct: "a", difficulty: 1 },
          { question_text: "If Dx = 24 and D = 6, then x = ...", options: ["4", "18", "144", "30"], correct: "a", difficulty: 1 },
        ],
      },
      {
        name: "Quadratic Equations & Arithmetic Progression",
        sequence: 2,
        pdfUrl: "https://cart.ebalbharati.in/BalBooks/ebooks/1003030040.pdf",
        questions: [
          { question_text: "In an A.P., the nth term formula is tn = ...", options: ["a + nd", "a + (n−1)d", "a + (n+1)d", "na + d"], correct: "b", difficulty: 1 },
          { question_text: "For the A.P. 2, 7, 12, ..., common difference d is...", options: ["2", "5", "7", "10"], correct: "b", difficulty: 1 },
          { question_text: "Roots of quadratic equation x² − 5x + 6 = 0 are...", options: ["2, 3", "−2, −3", "1, 6", "−1, −6"], correct: "a", difficulty: 2 },
          { question_text: "Discriminant Δ = b² − 4ac. If Δ < 0, roots are...", options: ["Real and equal", "Real and unequal", "Not real", "Zero"], correct: "c", difficulty: 1 },
        ],
      },
    ],
  },
];

async function main(): Promise<void> {
  loadEnv();
  const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("🌱 Starting All-Grades Master Seed (Classes 5–10 · CBSE & MAHARASHTRA)...");

  let totalSubjects = 0;
  let totalTopics = 0;
  let totalLinks = 0;
  let totalQuestions = 0;

  for (const bundle of ALL_BUNDLES) {
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
    } else {
      const { data, error } = await sb
        .from("subjects")
        .insert({ board: bundle.board, class_level: bundle.class_level, name: bundle.name })
        .select("id")
        .single();
      if (error) throw new Error(`Could not create subject ${bundle.name}: ${error.message}`);
      subjectId = data.id as string;
      totalSubjects++;
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
          title: `Read the chapter — ${topicSeed.name} (${bundle.board === "CBSE" ? "NCERT" : "State Board"} PDF)`,
          url: topicSeed.pdfUrl,
        });
        totalLinks++;
      }

      // YouTube link
      const ytQuery = `${topicSeed.name} class ${bundle.class_level} ${bundle.board.toLowerCase()} ${bundle.name.toLowerCase()}`;
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`;
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

  console.log(`\n🎉 Master Seed Completed!`);
  console.log(`New entities added this run:`);
  console.log(`  Subjects: ${totalSubjects}`);
  console.log(`  Topics: ${totalTopics}`);
  console.log(`  Links: ${totalLinks}`);
  console.log(`  Questions: ${totalQuestions}`);

  const { count: sCount } = await sb.from("subjects").select("id", { count: "exact", head: true });
  const { count: tCount } = await sb.from("topics").select("id", { count: "exact", head: true });
  const { count: clCount } = await sb.from("content_links").select("id", { count: "exact", head: true });
  const { count: qCount } = await sb.from("questions").select("id", { count: "exact", head: true });

  console.log(`\n=== TOTAL DATABASE STATS ACROSS ALL GRADES ===`);
  console.log(`  Total Subjects: ${sCount}`);
  console.log(`  Total Topics: ${tCount}`);
  console.log(`  Total Content Links: ${clCount}`);
  console.log(`  Total Questions: ${qCount}`);
}

main().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
