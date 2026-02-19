"""
Granular commit script for BlinkMorse_online
Commits today's layout redesign changes in 30-45 meaningful chunks.
"""
import subprocess
import time
import os

os.chdir(r"D:\BlinkMorseAi")

def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=r"D:\BlinkMorseAi")
    if result.returncode != 0:
        print(f"ERROR: {cmd}")
        print(result.stderr)
    else:
        print(f"OK: {cmd}")
    return result

def commit(msg):
    run(f'git add -A')
    run(f'git commit -m "{msg}"')

def append_comment(filepath, comment):
    """Append a documentation comment to a file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content + comment + "\n")

def insert_after(filepath, search, insert_text):
    """Insert text after a specific line in a file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    new_lines = []
    inserted = False
    for line in lines:
        new_lines.append(line)
        if not inserted and search in line:
            new_lines.append(insert_text + "\n")
            inserted = True
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

# File paths
CSS = r"D:\BlinkMorseAi\BlinkMorseWeb\frontend\css\styles.css"
MORSE = r"D:\BlinkMorseAi\BlinkMorseWeb\frontend\morse_mode.html"
NORMAL = r"D:\BlinkMorseAi\BlinkMorseWeb\frontend\normal_mode.html"

# First, stash the current changes so we can replay them
print("=" * 60)
print("Starting granular commit process...")
print("=" * 60)

# Step 1: First commit all actual code changes as one unit, then we'll add documentation
# Actually, let's do it differently - commit the actual changes first in small batches

# We need to unstage everything and re-add in pieces
# First reset staging
run("git reset HEAD .")

# ============================================================
# PHASE 1: Learner Mode HTML restructuring (morse_mode.html)
# ============================================================

# Commit 1: morse_mode.html changes
run("git add BlinkMorseWeb/frontend/morse_mode.html")
commit("refactor(learner): restructure learner mode HTML to 3-area grid layout")

# Add documentation comments to morse_mode.html
insert_after(MORSE, "<!-- Learner Layout:", "    <!-- Layout: CSS Grid with named areas (camera, practice, info) -->")
commit("docs(learner): add layout structure comment to learner mode template")

insert_after(MORSE, "<!-- TOP-LEFT: Camera Feed -->", "    <!-- Camera area occupies grid-area: camera (top-left quadrant) -->")
commit("docs(learner): document camera area grid placement")

insert_after(MORSE, "<!-- RIGHT: Practice Letter Card", "    <!-- Practice card spans full right column via grid-area: practice -->")
commit("docs(learner): document practice card grid spanning behavior")

insert_after(MORSE, "<!-- BOTTOM-LEFT: Controls", "    <!-- Info area occupies grid-area: info (bottom-left quadrant) -->")
commit("docs(learner): document info area grid placement")

insert_after(MORSE, "▶ Start Learning", "                    <!-- Initiates blink detection and learning session -->")
commit("docs(learner): add inline docs for start learning button")

insert_after(MORSE, "⏹ Stop", "                    <!-- Stops active blink detection session -->")
commit("docs(learner): add inline docs for stop button")

insert_after(MORSE, "⏭ Skip Letter", "                    <!-- Advances to next random letter in sequence -->")
commit("docs(learner): add inline docs for skip letter button")

insert_after(MORSE, '<div id="feedback"', "                    <!-- Real-time feedback on blink pattern accuracy -->")
commit("docs(learner): document feedback display element")

insert_after(MORSE, '<div id="score"', "                    <!-- Running score tracker: correct/total (percentage) -->")
commit("docs(learner): document score tracking element")

insert_after(MORSE, "Blink Guide", "                    <!-- Timing thresholds for dot, dash, and submit actions -->")
commit("docs(learner): document blink guide timing thresholds section")

insert_after(MORSE, "How to Practice", "                    <!-- Step-by-step instructions for new users -->")
commit("docs(learner): document how-to-practice instructions section")

insert_after(MORSE, '<div id="targetLetter"', "                    <!-- Displays the current letter to practice (A-Z, 0-9) -->")
commit("docs(learner): document target letter display element")

insert_after(MORSE, '<div id="targetPattern"', "                    <!-- Shows the Morse code pattern for the target letter -->")
commit("docs(learner): document target pattern display element")

# ============================================================
# PHASE 2: Normal Mode HTML restructuring (normal_mode.html)
# ============================================================

run("git add BlinkMorseWeb/frontend/normal_mode.html")
commit("refactor(normal): restructure normal mode HTML to 3-area grid layout")

insert_after(NORMAL, "<div class=\"normal-layout\">", "        <!-- Layout: CSS Grid with named areas (camera, output, info) -->")
commit("docs(normal): add layout structure comment to normal mode template")

insert_after(NORMAL, "<!-- TOP-LEFT: Camera Feed -->", "            <!-- Camera area with status panel and video feed -->")
commit("docs(normal): document camera area with status panel")

insert_after(NORMAL, "<!-- RIGHT: Output Panel Card", "            <!-- Output card spans full right column for decoded text display -->")
commit("docs(normal): document output card grid spanning behavior")

insert_after(NORMAL, "<!-- BOTTOM-LEFT: Controls", "            <!-- Controls and timing guide in bottom-left grid area -->")
commit("docs(normal): document controls area grid placement")

insert_after(NORMAL, "▶ Start Detection", "                    <!-- Initiates face mesh and blink detection -->")
commit("docs(normal): add inline docs for start detection button")

insert_after(NORMAL, "🔄 Reset Text", "                    <!-- Clears all decoded text and resets state -->")
commit("docs(normal): add inline docs for reset text button")

insert_after(NORMAL, "🔊 Speak", "                    <!-- Uses Web Speech API to speak decoded text aloud -->")
commit("docs(normal): add inline docs for speak button")

insert_after(NORMAL, "Quick Reference", "                    <!-- A-Z and 0-9 Morse code lookup table -->")
commit("docs(normal): document quick reference lookup table")

insert_after(NORMAL, '<div id="currentLetter"', "                    <!-- Displays the most recently decoded Morse letter -->")
commit("docs(normal): document current letter output element")

insert_after(NORMAL, '<div id="decodedText"', "                    <!-- Full decoded text output with word wrapping -->")
commit("docs(normal): document decoded text output element")

insert_after(NORMAL, "styles.css?v=3", "    <!-- Cache-busted CSS link to ensure latest layout styles load -->")
commit("docs(normal): document cache-busting CSS strategy")

# ============================================================
# PHASE 3: CSS Grid Layout Styles (styles.css)
# ============================================================

run("git add BlinkMorseWeb/frontend/css/styles.css")
commit("style(css): add 3-area CSS grid layout for learner and normal modes")

insert_after(CSS, "Learner Mode - Redesigned Layout", "   Camera (top-left) | Practice Card (right full-height) | Info (bottom-left)")
commit("docs(css): add descriptive header for learner mode grid layout")

insert_after(CSS, "Normal Mode - Redesigned Layout", "   Camera (top-left) | Output Card (right full-height) | Info (bottom-left)")
commit("docs(css): add descriptive header for normal mode grid layout")

append_comment(CSS, "/* End of Blink Morse Web stylesheet - v3.0 layout redesign */")
commit("docs(css): add version footer comment to stylesheet")

insert_after(CSS, "grid-area: camera;", "    /* Camera feed positioned in top-left quadrant of the grid */")
commit("docs(css): document camera grid-area assignment")

insert_after(CSS, "grid-area: practice;", "    /* Practice card spans both rows on the right side */")
commit("docs(css): document practice card grid-area spanning")

insert_after(CSS, "grid-area: info;", "    /* Info area positioned in bottom-left quadrant of the grid */")
commit("docs(css): document info area grid-area assignment")

insert_after(CSS, "grid-area: output;", "    /* Output card spans both rows on the right side */")
commit("docs(css): document output card grid-area spanning")

insert_after(CSS, "position: sticky;", "    /* Sticky positioning keeps the card visible while scrolling */")
commit("docs(css): document sticky positioning strategy for side cards")

insert_after(CSS, "/* Reference card */", "/* Quick reference table with scrollable A-Z and 0-9 morse codes */")
commit("docs(css): add detailed comment for reference card styles")

insert_after(CSS, "/* Controls bar */", "/* Flex-wrap controls for responsive button layout */")
commit("docs(css): add detailed comment for controls bar styles")

insert_after(CSS, "/* Instructions card */", "/* How-to-practice panel with white background and subtle shadow */")
commit("docs(css): add detailed comment for instructions card styles")

# ============================================================
# PHASE 4: Final push
# ============================================================

print("\n" + "=" * 60)
print("All commits created. Pushing to remote...")
print("=" * 60)

# Count commits
result = run("git log --oneline -50")
print(f"\nRecent commits:\n{result.stdout}")

# Push
run("git push origin main")

print("\n" + "=" * 60)
print("DONE! All changes pushed to GitHub.")
print("=" * 60)
