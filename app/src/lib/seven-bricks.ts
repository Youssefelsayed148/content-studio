/**
 * Callaway's 7 Bricks Deep Analysis System
 * 
 * This is the second-pass analysis for videos that have already been identified
 * as viral. It goes much deeper than the initial analysis, breaking down the
 * exact mechanics of why this specific video outperformed the creator's average.
 * 
 * The 7 Bricks:
 * 1. TOPIC — What is this about and why does the audience care?
 * 2. ANGLE — What is the unique perspective or contrarian take?
 * 3. HOOK (First 3 Seconds) — Visual + Spoken + Text alignment
 * 4. STORY STRUCTURE — Case study, listicle, problem-solution, myth-busting, comparison
 * 5. VISUAL FORMAT — Camera style, layout, motion graphics
 * 6. KEY VISUALS — Specific elements that aid understanding
 * 7. AUDIO — Music, voiceover, sound effects strategy
 * 
 * Plus: WINNING BRICKS — Which 2-3 bricks made THIS video go viral?
 */

export const SEVEN_BRICKS_DEEP_ANALYSIS_PROMPT = `You are a world-class viral video analyst. This video performed SIGNIFICANTLY better than this creator's average content. Your job is to reverse-engineer exactly why.

Analyze this video using Callaway's 7 Bricks system. Go deeper than surface-level observations. Focus on SPECIFIC mechanics, not general descriptions.

---

# BRICK 1: TOPIC

**What is this video about in one sentence?**

**Why does the target audience care about this topic RIGHT NOW?**
- What fear, desire, or frustration does it tap into?
- What is the emotional urgency?

**Investment/Real Estate Adaptation:**
- What is the financial equivalent of this topic?
- How does this translate to someone interested in fractional real estate investing?

---

# BRICK 2: ANGLE

**What is the unique perspective or contrarian take?**

**What common belief is this video challenging?**
- What does the average person believe that this video proves wrong?
- What assumption does it break?

**Investment Adaptation:**
- What Egyptian investment belief can we challenge with this same angle?
- What conventional wisdom about real estate, certificates, or wealth-building does this contradict?

---

# BRICK 3: HOOK (FIRST 3 SECONDS)

This is the most important brick. Triple alignment required.

**Visual Hook (What do you see in the first frame?)**
- Describe the exact visual composition
- What color, object, or person dominates the frame?
- Why does this stop the scroll?

**Spoken Hook (What are the first words spoken?)**
- Exact first line if possible
- Why do these specific words create curiosity or tension?

**Text Overlay Hook (What text appears on screen?)**
- What words appear in the first 3 seconds?
- How do they reinforce the visual and spoken hooks?

**Triple Alignment Check:**
Do all three hooks confirm the same promise? (Yes/No)
If yes, explain how they reinforce each other.
If no, identify which hook is weakest.

**Investment Adaptation:**
How can we create triple alignment for a fractional real estate hook?
What visual + spoken + text combination would stop an Egyptian investor from scrolling?

---

# BRICK 4: STORY STRUCTURE

**What story format does this video use?**
- Case study (I tried X, here's what happened)
- Listicle (3 things you need to know about X)
- Problem-solution (Here's the problem, here's how to fix it)
- Myth-busting (Everyone thinks X, but actually Y)
- Comparison (X vs Y, which is better)
- Transformation (Before/After)
- Narrative (Character journey)

**Why does this structure work for this specific topic?**
- Where does tension build?
- Where does the viewer get a dopamine hit?
- What makes them watch until the end?

**Investment Adaptation:**
Can we use this same story structure for investment content?
What would the equivalent be for explaining fractional real estate?

---

# BRICK 5: VISUAL FORMAT

**What is the camera/layout style?**
- Talking head (person speaking directly to camera)
- POV/hands-only (viewer's perspective)
- Split screen (side-by-side comparison)
- Screen recording with voiceover
- B-roll montage with text overlay
- Cinematic/steadicam movement
- Static/tabletop setup

**What makes this visual format effective for this message?**
- Would a different format weaken the impact?
- Why this choice and not another?

**Investment Adaptation:**
Can our creators (Nadeem, Driven Properties team) replicate this visual format?
What equipment or setup would be needed?

---

# BRICK 6: KEY VISUALS

**What specific visual elements help the viewer understand or feel?**
- Arrows pointing to key details
- Circles highlighting important parts
- Numbers/stats animated on screen
- Before/after comparisons
- Graphics showing process/timeline
- Close-ups of faces/hands/objects
- Motion tracking or zoom effects

**Which visual element was most memorable?**
- What do you still see in your mind after watching?
- Why did that specific visual stick?

**Investment Adaptation:**
What motion graphics or B-roll would enhance a real estate investment video?
What visual would make a financial concept instantly understandable?

---

# BRICK 7: AUDIO

**What is the music/sound strategy?**
- Trending audio (recognizable song)
- Original voiceover only (no music)
- Background music (subtle, not distracting)
- Sound effects timed to visual beats
- Silence as a tool (strategic pauses)

**How does audio support or enhance the message?**
- Does the music create emotion, urgency, or calm?
- Are there moments where audio shifts to signal importance?

**Investment Adaptation:**
Should we use trending audio or focus on voiceover clarity?
What background music tone fits transparent, founder-led investment content?

---

# WINNING BRICKS: WHY THIS WENT VIRAL

Not all 7 bricks are equally strong. Identify the 2-3 bricks that made THIS specific video outperform the creator's average.

**Which brick stopped the scroll?**
(Usually Hook or Visual Format)

**Which brick made viewers watch until the end?**
(Usually Story Structure or Angle)

**Which brick made viewers want to comment or share?**
(Usually Angle or Topic)

**Final Verdict:**
List the 2-3 winning bricks in order of importance and explain WHY each one was decisive in making this video go viral.

---

Be specific. Use timestamps where possible. Quote exact text or dialogue. The goal is a forensic breakdown that someone else could use to replicate the viral mechanics.`;
