#!/usr/bin/env python3
"""Build Vidyamitra / Seva Innovation Challenge 2026 — 6-slide .pptx.

Content is drawn from the real project files (app/*.tsx, lib/*). Numbers
that only you can supply are left as obvious [fill] blanks.

Slide model follows the Seva Innovation Challenge reference template:
  1. Title
  2. The Problem
  3. Our Solution & Innovation
  4. Feasibility & Implementation
  5. Impact & Scalability
  6. Team/Individual & Support Required
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import datetime

# ---------------------------------------------------------------------------
# Palette — calm, school-friendly, close to the app's feel.
# ---------------------------------------------------------------------------
BRAND      = RGBColor(0xF0, 0xB2, 0x5A)   # warm amber
SAGE       = RGBColor(0x8F, 0xB9, 0x96)   # calm green
VIOLET     = RGBColor(0x7A, 0x6F, 0xB0)   # soft violet
ROSE       = RGBColor(0xE0, 0x8B, 0x8B)   # soft red for stress/flags
EMBER      = RGBColor(0xC8, 0x70, 0x2E)   # deeper amber
INK        = RGBColor(0x24, 0x15, 0x03)   # near-black warm
PAPER      = RGBColor(0xF2, 0xF0, 0xEB)   # warm off-white
PAPER_DEEP = RGBColor(0xE9, 0xE4, 0xD6)   # slightly darker panel
LINE       = RGBColor(0xD8, 0xD0, 0xC0)
TEXT       = RGBColor(0x33, 0x2A, 0x1E)
TEXT_FAINT = RGBColor(0x7A, 0x70, 0x62)

FONT       = "Calibri"
FONT_HEAD  = "Calibri"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def solid(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def add_rect(slide, x, y, w, h, color, line=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(0.75)
    shp.shadow.inherit = False
    return shp


def add_text(slide, x, y, w, h, runs, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, space_after=Pt(4), line_spacing=1.0):
    """runs: list of paragraphs; each paragraph is list of (text, size, bold, color, italic)."""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Pt(2)
    tf.margin_right = Pt(2)
    tf.margin_top = Pt(1)
    tf.margin_bottom = Pt(1)
    for i, para in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = space_after
        p.space_before = Pt(0)
        if line_spacing:
            p.line_spacing = line_spacing
        for (text, size, bold, color, italic) in para:
            r = p.add_run()
            r.text = text
            r.font.size = Pt(size)
            r.font.bold = bold
            r.font.italic = italic
            r.font.name = FONT
            r.font.color.rgb = color
    return tb


def section_label(slide, text, color=BRAND):
    """Small uppercase eyebrow label."""
    add_text(slide, Inches(0.6), Inches(0.32), Inches(9), Inches(0.3),
             [[(text.upper(), 12, True, color, False)]])


def slide_number(slide, n, total=6):
    add_text(slide, Inches(8.6), Inches(7.05), Inches(1.1), Inches(0.3),
             [[(f"{n} / {total}", 9, False, TEXT_FAINT, False)]],
             align=PP_ALIGN.RIGHT)


def footer(slide, text):
    add_text(slide, Inches(0.6), Inches(7.05), Inches(7.5), Inches(0.3),
             [[(text, 9, False, TEXT_FAINT, True)]])


def panel(slide, x, y, w, h, fill=PAPER_DEEP, line=LINE):
    return add_rect(slide, x, y, w, h, fill, line)


def bullet_block(slide, x, y, w, h, items, size=13.5, color=TEXT,
                 gap=Pt(6), lead=None, lead_color=None):
    """items: list of (text, bold?) or (lead, text, bold?)."""
    runs = []
    for it in items:
        if isinstance(it, str):
            lead_txt, body, bold = "", it, False
        elif len(it) == 2:
            lead_txt, body = it
            bold = False
        else:
            lead_txt, body, bold = it
        para = []
        if lead_txt:
            para.append((lead_txt, size, True, lead_color or BRAND, False))
        para.append((body, size, bold, color, False))
        runs.append(para)
    return add_text(slide, x, y, w, h, runs, space_after=gap, line_spacing=1.02)


# ---------------------------------------------------------------------------
# Slide 1 — Title
# ---------------------------------------------------------------------------

def slide_1(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    # background
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, PAPER)

    # left band
    add_rect(slide, 0, 0, Inches(0.35), prs.slide_height, BRAND)
    # faint panel behind title
    panel(slide, Inches(0.85), Inches(1.55), Inches(8.3), Inches(3.1), PAPER_DEEP, LINE)

    section_label(slide, "Seva Innovation Challenge 2026  ·  Reference Pitch Deck", VIOLET)

    add_text(slide, Inches(1.05), Inches(1.95), Inches(7.9), Inches(1.2),
             [[("Vidyamitra", 54, True, INK, False)]])

    add_text(slide, Inches(1.05), Inches(3.05), Inches(7.9), Inches(1.5),
             [[("A calm study companion for Classes 5–10 (CBSE & Maharashtra State Board)",
                19, True, TEXT, False)]],
             line_spacing=1.1)

    add_text(slide, Inches(1.05), Inches(3.75), Inches(7.9), Inches(1.0),
             [[("that pairs Maths & Science practice with daily mental-health check-ins, an adaptive plan "
                "that lightens on heavy days, an AI study companion, an anonymous peer space, and a "
                "counsellor console for the cases that need a human.",
                14.5, False, TEXT_FAINT, False)]],
             line_spacing=1.15)

    # bottom meta row
    add_rect(slide, Inches(1.05), Inches(5.05), Inches(4.6), Pt(2.2), LINE)
    add_text(slide, Inches(1.05), Inches(5.18), Inches(7.9), Inches(0.7),
             [[("Built by:  [Your name]", 12.5, False, TEXT, False)],
              [("Contact:  [your email / mobile]", 12.5, False, TEXT_FAINT, True)]],
             space_after=Pt(2))

    slide_number(slide, 1)
    footer(slide, "Seva Innovation Challenge 2026  |  Replace all bracketed text with your own content.")


# ---------------------------------------------------------------------------
# Slide 2 — The Problem
# ---------------------------------------------------------------------------

def slide_2(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, PAPER)

    section_label(slide, "Slide 2 of 6  ·  The Problem")
    add_text(slide, Inches(0.6), Inches(0.62), Inches(9), Inches(0.7),
             [[("What real challenge are we solving?", 30, True, INK, False)]])

    # Left column: problem story
    panel(slide, Inches(0.6), Inches(1.55), Inches(4.35), Inches(4.55))
    add_text(slide, Inches(0.8), Inches(1.72), Inches(4.0), Inches(0.4),
             [[("The Problem", 14, True, BRAND, False)]])
    bullet_block(slide, Inches(0.8), Inches(2.2), Inches(4.0), Inches(3.8),
        [
            ("Indian middle-school students carry two pressures at once: ", "rising academic load in Maths and Science, and unspoken stress that rarely gets noticed until it becomes a crisis."),
            ("Schools track marks but rarely track ", "how a student is actually doing day to day.", True),
            ("Teachers and parents see the scores, ", "not the stress.", True),
            ("Where counsellors exist at all, ", "they get involved only after something has already gone wrong."),
        ],
        size=13.5, gap=Pt(9))

    add_text(slide, Inches(0.8), Inches(5.55), Inches(4.0), Inches(0.5),
             [[("In most schools, a student's mental state is invisible until it is too late — "
                "there is no daily, low-effort signal.", 13, False, TEXT_FAINT, True)]],
             line_spacing=1.1)

    # Right column: who, evidence, gaps
    panel(slide, Inches(5.15), Inches(1.55), Inches(4.25), Inches(4.55))
    add_text(slide, Inches(5.35), Inches(1.72), Inches(3.9), Inches(0.4),
             [[("Who is affected, and where?", 14, True, BRAND, False)]])
    bullet_block(slide, Inches(5.35), Inches(2.2), Inches(3.9), Inches(1.6),
        [
            "Students of Classes 5–10 in CBSE and Maharashtra State Board schools — in classrooms, tuition, and at home.",
            "Teachers, parents and counsellors across those schools.",
        ],
        size=13, gap=Pt(6))

    add_text(slide, Inches(5.35), Inches(3.55), Inches(3.9), Inches(0.4),
             [[("Evidence (use your own numbers if you have them)", 12.5, True, VIOLET, False)]])
    bullet_block(slide, Inches(5.35), Inches(3.95), Inches(3.9), Inches(1.5),
        [
            "Rising anxiety and exam stress among school students have been flagged in NCERT school-learning and school-health guidance.",
            "Tele-MANAS 14416 is the government's free 24×7 mental-health helpline — a sign that student and youth distress is now a recognised, high-volume need.",
            "[__] students affected every year in the target area  (fill with your own estimate / survey, sample size and date)",
        ],
        size=12, gap=Pt(5), lead_color=ROSE)

    add_text(slide, Inches(5.35), Inches(5.5), Inches(3.9), Inches(0.55),
             [[("Why it matters: ", 12.5, True, ROSE, False),
               ("when academic stress goes unseen, it shows up later as burnout, dropping performance, absenteeism, and — in serious cases — a crisis a school is forced to respond to with far less time and far more cost.", 12.5, False, TEXT, False)]],
             line_spacing=1.08)

    slide_number(slide, 2)
    footer(slide, "Focus on the root cause, not just the symptom. Add photos of field visits or your prototype wherever possible.")


# ---------------------------------------------------------------------------
# Slide 3 — Solution & Innovation
# ---------------------------------------------------------------------------

def slide_3(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, PAPER)

    section_label(slide, "Slide 3 of 6  ·  Our Solution & Innovation")
    add_text(slide, Inches(0.6), Inches(0.62), Inches(9.2), Inches(0.7),
             [[("What have we built, how does it work, and what is new?", 30, True, INK, False)]])

    # Left: solution in brief
    panel(slide, Inches(0.6), Inches(1.5), Inches(5.9), Inches(2.35))
    add_text(slide, Inches(0.8), Inches(1.68), Inches(5.55), Inches(0.4),
             [[("Our solution in brief", 14, True, BRAND, False)]])
    add_text(slide, Inches(0.8), Inches(2.15), Inches(5.55), Inches(1.65),
             [[("Vidyamitra is a calm study companion for Classes 5–10 that pairs real Maths & Science practice "
                "with mental-health awareness in one place. Every day a student checks in with their mood, and the "
                "system adapts: on heavy days it lightens the plan, on good days it keeps going.",
                13.5, False, TEXT, False)],
              [("It has a full syllabus with live mastery bars, AI practice quizzes, AI revision sheets and timed test "
                "papers, an AI study companion ('Mitra') for doubts and feelings, an anonymous peer feed, a box-breathing "
                "and gratitude 'Mind Gym', and a counsellor console that quietly receives the cases that need a human.",
                13.5, False, TEXT, False)]],
             line_spacing=1.12, space_after=Pt(6))

    # placeholder chip for prototype image
    chip = add_rect(slide, Inches(4.85), Inches(1.55), Inches(1.5), Inches(0.4), BRAND)
    add_text(slide, Inches(4.85), Inches(1.55), Inches(1.5), Inches(0.4),
             [[("[ add prototype screenshot ]", 9, True, INK, True)]],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

    # How it works — 3 steps
    add_text(slide, Inches(0.6), Inches(4.0), Inches(9.2), Inches(0.35),
             [[("How it works", 14, True, BRAND, False)]])
    steps = [
        ("1", "Input", "A student signs in, does one daily mood check-in, and works through today's plan of Maths/Science questions, revision sheets or timed tests."),
        ("2", "Process", "Mood + stress data shape the adaptive plan; a rule quietly flags sustained low mood; the counsellor console receives flagged cases; the AI features answer in plain language."),
        ("3", "Output", "The student gets a plan that fits how they really feel that day, picks up mastery on weak topics, and — when needed — is connected to a counsellor instead of falling through the cracks."),
    ]
    sx = Inches(0.6)
    sw = Inches(2.93)
    for i, (num, title, desc) in enumerate(steps):
        x = sx + i * (sw + Inches(0.13))
        panel(slide, x, Inches(4.4), sw, Inches(1.55))
        add_rect(slide, x, Inches(4.4), sw, Inches(0.5), BRAND)
        add_text(slide, x, Inches(4.4), sw, Inches(0.5),
                 [[(num, 18, True, INK, False)]], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        add_text(slide, x + Inches(0.15), Inches(4.95), sw - Inches(0.3), Inches(0.4),
                 [[(title, 13.5, True, TEXT, False)]])
        add_text(slide, x + Inches(0.15), Inches(5.32), sw - Inches(0.3), Inches(0.65),
                 [[(desc, 11, False, TEXT_FAINT, False)]], line_spacing=1.05)

    slide_number(slide, 3)
    footer(slide, "Add a photo, sketch or screenshot of the prototype on the right of the text if available.")


# ---------------------------------------------------------------------------
# Slide 4 — Feasibility & Implementation
# ---------------------------------------------------------------------------

def slide_4(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, PAPER)

    section_label(slide, "Slide 4 of 6  ·  Feasibility & Implementation")
    add_text(slide, Inches(0.6), Inches(0.62), Inches(9.2), Inches(0.7),
             [[("How ready is the solution, and what will it take to put it on the ground?", 28, True, INK, False)]])

    # Stage badge
    add_rect(slide, Inches(0.6), Inches(1.5), Inches(3.0), Inches(0.6), SAGE)
    add_text(slide, Inches(0.6), Inches(1.5), Inches(3.0), Inches(0.6),
             [[("CURRENT STAGE:  Working Prototype", 12.5, True, INK, False)]],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

    add_text(slide, Inches(3.8), Inches(1.5), Inches(5.5), Inches(0.6),
             [[("Built and compiling — all flows are live: today/dashboard, learn, practice, exam, check-in, "
                "Mitra, community, games, progress, badges and the counsellor console.",
                12.5, False, TEXT_FAINT, False)]], line_spacing=1.08, anchor=MSO_ANCHOR.MIDDLE)

    # Two cols
    col_x = [Inches(0.6), Inches(5.15)]
    col_w = Inches(4.3)

    # Left: Tech + Cost
    panel(slide, col_x[0], Inches(2.25), col_w, Inches(3.15))
    add_text(slide, col_x[0] + Inches(0.2), Inches(2.4), col_w - Inches(0.4), Inches(0.35),
             [[("Technology", 13.5, True, BRAND, False)]])
    bullet_block(slide, col_x[0] + Inches(0.2), Inches(2.8), col_w - Inches(0.4), Inches(2.55),
        [
            ("Web app on Next.js (React), ", "runs locally at http://localhost:3000."),
            ("Student sign-in via Supabase", " — every data read/write goes through server route handlers that re-verify the session, so tables are never exposed to the browser."),
            ("10 tables", " — students, subjects, topics, content links, questions, attempts, mastery scores, stress logs, check-ins, escalations."),
            ("AI features use Groq server-side only", " — the key never leaves the server; quiz/revision/Mitra degrade gracefully with a friendly message when it is missing."),
        ],
        size=11.5, gap=Pt(5), lead_color=EMBER)

    add_text(slide, col_x[0] + Inches(0.2), Inches(5.5), col_w - Inches(0.4), Inches(0.35),
             [[("Estimated cost", 13.5, True, BRAND, False)]])
    bullet_block(slide, col_x[0] + Inches(0.2), Inches(5.85), col_w - Inches(0.4), Inches(0.6),
        [
            "Very low — it is software. Cost per student is essentially the running cost of the app plus the AI calls for the features a student actually uses. For one school pilot, the main cost is setup time and a small server/AI bill — no per-student hardware.",
        ],
        size=11, gap=Pt(3))

    # Right: Timeline + Partners
    panel(slide, col_x[1], Inches(2.25), col_w, Inches(3.15))
    add_text(slide, col_x[1] + Inches(0.2), Inches(2.4), col_w - Inches(0.4), Inches(0.35),
             [[("Timeline", 13.5, True, BRAND, False)]])
    bullet_block(slide, col_x[1] + Inches(0.2), Inches(2.8), col_w - Inches(0.4), Inches(2.55),
        [
            ("3 months — ", "pilot in one school: onboard a small group, run daily check-ins and adaptive practice, and have the counsellor console receive the first real flagged cases."),
            ("6 months — ", "refine from pilot feedback; stabilise the syllabus for both boards; add a real persistent peer store; begin teacher/parent visibility views."),
            ("12 months — ", "roll out to more schools/classes; formalise the counsellor workflow with the school; add whatever certification or IP makes sense."),
        ],
        size=11.5, gap=Pt(6), lead_color=SAGE)

    add_text(slide, col_x[1] + Inches(0.2), Inches(5.5), col_w - Inches(0.4), Inches(0.35),
             [[("Partners", 13.5, True, BRAND, False)]])
    bullet_block(slide, col_x[1] + Inches(0.2), Inches(5.85), col_w - Inches(0.4), Inches(0.6),
        [
            "A willing school (or a block/district education office) to pilot; a designated counsellor or school counsellor to man the console; ideally a faculty mentor and, later, a CSR or education department to take it further.",
        ],
        size=11, gap=Pt(3))

    slide_number(slide, 4)
    footer(slide, "Show how it is affordable. Mark where you are today; list milestones for 3, 6 and 12 months.")


# ---------------------------------------------------------------------------
# Slide 5 — Impact & Scalability
# ---------------------------------------------------------------------------

def slide_5(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, PAPER)

    section_label(slide, "Slide 5 of 6  ·  Impact & Scalability")
    add_text(slide, Inches(0.6), Inches(0.62), Inches(9.2), Inches(0.7),
             [[("What change will this create, and how can it grow?", 30, True, INK, False)]])

    # KPI strip
    kpis = [
        ("[__]", "Beneficiaries reached\nin first year\n(fill with your pilot number)"),
        ("[__%]", "Saving in cost / time\nvs current practice\n(use a real number only if you have one)"),
        ("[__]", "Jobs or livelihoods\ncreated or supported\n(fill only if you can)"),
    ]
    kw = Inches(2.93)
    for i, (big, sub) in enumerate(kpis):
        x = Inches(0.6) + i * (kw + Inches(0.13))
        panel(slide, x, Inches(1.5), kw, Inches(1.5))
        add_text(slide, x, Inches(1.62), kw, Inches(0.7),
                 [[(big, 30, True, BRAND, False)]], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        add_text(slide, x + Inches(0.15), Inches(2.35), kw - Inches(0.3), Inches(0.7),
                 [[(sub, 10.5, False, TEXT_FAINT, True)]], align=PP_ALIGN.CENTER, line_spacing=1.05)

    # Social impact
    panel(slide, Inches(0.6), Inches(3.2), Inches(4.3), Inches(2.75))
    add_text(slide, Inches(0.8), Inches(3.35), Inches(3.9), Inches(0.35),
             [[("Social impact", 13.5, True, BRAND, False)]])
    bullet_block(slide, Inches(0.8), Inches(3.75), Inches(3.9), Inches(2.1),
        [
            ("Quality of life & safety: ", "students get a calm daily space and a 14-day mood history; sustained low mood is quietly seen, not ignored."),
            ("Inclusion: ", "works for both CBSE and Maharashtra State Board, Classes 5–10; anonymous peer space is low-barrier; the crisis line Tele-MANAS 14416 (free, 24×7) is always visible."),
            ("Honest scope: ", "it is explicitly not a medical service — it is a school-facing early-signal and study companion."),
        ],
        size=11.5, gap=Pt(6), lead_color=SAGE)

    # Sustainability
    panel(slide, Inches(5.15), Inches(3.2), Inches(4.25), Inches(1.25))
    add_text(slide, Inches(5.35), Inches(3.35), Inches(3.9), Inches(0.35),
             [[("Sustainability", 13.5, True, BRAND, False)]])
    bullet_block(slide, Inches(5.35), Inches(3.72), Inches(3.9), Inches(0.75),
        [
            "Software-led, very low marginal cost per student. Long-term it can run on a school's own budget, a department budget, or CSR support; AI features are used selectively so cost stays tied to actual use.",
        ],
        size=11.5, gap=Pt(4))

    # Scale-up
    panel(slide, Inches(5.15), Inches(4.6), Inches(4.25), Inches(1.35))
    add_text(slide, Inches(5.35), Inches(4.75), Inches(3.9), Inches(0.35),
             [[("Scale-up plan", 13.5, True, BRAND, False)]])
    bullet_block(slide, Inches(5.35), Inches(5.1), Inches(3.9), Inches(0.85),
        [
            "Replicate to other schools/districts by onboarding per school with its counsellor and access code.",
            "Syllabus already covers both boards and Classes 5–10, so the content lift is mainly per-board/per-class additions, not a rebuild. Need: pilot feedback, a partner school/department, light incubation support.",
        ],
        size=11, gap=Pt(3))

    slide_number(slide, 5)
    footer(slide, "Be specific about beneficiaries, savings and jobs — use real numbers where you have them.")


# ---------------------------------------------------------------------------
# Slide 6 — Team & Support Required
# ---------------------------------------------------------------------------

def slide_6(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, PAPER)

    section_label(slide, "Slide 6 of 6  ·  Team / Individual & Support Required")
    add_text(slide, Inches(0.6), Inches(0.6), Inches(9.2), Inches(0.6),
             [[("Who is behind the idea — and what help do we need?", 30, True, INK, False)]])

    # Team block
    panel(slide, Inches(0.6), Inches(1.5), Inches(5.9), Inches(2.85))
    add_text(slide, Inches(0.8), Inches(1.66), Inches(5.5), Inches(0.35),
             [[("The team", 13.5, True, BRAND, False)]])

    team_rows = [
        ("[Your Name 1]", "[Role in team — e.g. Founder / Builder]", "[Qualification / expertise]"),
        ("[Name 2]", "[Role in team]", "[Qualification / expertise]"),
        ("[Name 3]", "[Role in team]", "[Qualification / expertise]"),
    ]
    ty = Inches(2.15)
    rh = Inches(0.72)
    for (name, role, qual) in team_rows:
        # photo placeholder
        add_rect(slide, Inches(0.8), ty, Inches(0.7), Inches(0.7), PAPER_DEEP, LINE)
        add_text(slide, Inches(0.8), ty, Inches(0.7), Inches(0.7),
                 [[("[photo]", 10, True, TEXT_FAINT, False)]], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        add_text(slide, Inches(1.65), ty - Inches(0.02), Inches(4.7), Inches(0.35),
                 [[(name, 13.5, True, TEXT, False)]])
        add_text(slide, Inches(1.65), ty + Inches(0.28), Inches(4.7), Inches(0.35),
                 [[(role, 11.5, False, TEXT_FAINT, False)]])
        add_text(slide, Inches(1.65), ty + Inches(0.5), Inches(4.7), Inches(0.35),
                 [[(qual, 11, False, TEXT_FAINT, True)]])
        ty += rh

    add_text(slide, Inches(0.8), Inches(4.5), Inches(5.5), Inches(0.3),
             [[("Mentor / faculty guide, if any:  [Name, designation]", 12, False, VIOLET, False)]])

    # Support block
    panel(slide, Inches(6.7), Inches(1.5), Inches(2.7), Inches(2.85))
    add_text(slide, Inches(6.9), Inches(1.66), Inches(2.35), Inches(0.35),
             [[("Support we are seeking", 13, True, BRAND, False)]])
    bullet_block(slide, Inches(6.9), Inches(2.05), Inches(2.35), Inches(2.2),
        [
            "Mentorship & technical guidance",
            "Pilot with a government department / school",
            "Funding / grant support",
            "Incubation & workspace",
            "Testing, certification or IP support",
        ],
        size=11.5, gap=Pt(6))

    # One-line close
    add_rect(slide, Inches(0.6), Inches(4.6), Inches(8.8), Inches(0.62), PAPER_DEEP, LINE)
    add_text(slide, Inches(0.8), Inches(4.6), Inches(8.4), Inches(0.62),
             [[("How the Challenge support will take this to the next stage:  ",
                12.5, True, TEXT, False),
               ("With mentorship, a school pilot and incubation, Vidyamitra moves from a working prototype in one "
                "school to a tested, low-cost early-signal and study companion that a department or CSR can adopt "
                "across more schools and classes.", 12.5, False, TEXT_FAINT, False)]],
             anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.05)

    # Thank you strip
    add_rect(slide, Inches(0.6), Inches(5.45), Inches(8.8), Inches(0.7), INK)
    add_text(slide, Inches(0.8), Inches(5.45), Inches(8.4), Inches(0.7),
             [[("Thank you  ·  ", 14, True, BRAND, False),
               ("[your contact email / mobile]", 12.5, False, RGBColor(0xF2, 0xF0, 0xEB), False)]],
             anchor=MSO_ANCHOR.MIDDLE)

    slide_number(slide, 6)
    footer(slide, "Replace bracketed team details with real names, roles and qualifications. Add photos where possible.")


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def main():
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)

    slide_1(prs)
    slide_2(prs)
    slide_3(prs)
    slide_4(prs)
    slide_5(prs)
    slide_6(prs)

    out = "Vidyamitra_Seva_Innovation_2026.pptx"
    prs.save(out)
    print("Saved:", out)
    print("Slides:", len(prs.slides._sldIdLst))


if __name__ == "__main__":
    main()
