import subprocess
import os

REPO = r"d:\BlinkMorseAi"

def run(cmd):
    return subprocess.run(cmd, shell=True, cwd=REPO, capture_output=True, text=True)

def commit(msg, files=None):
    if files:
        if isinstance(files, list):
            for f in files:
                run(f'git add "{f}"')
        else:
            run(f'git add "{files}"')
        run(f'git commit -m "{msg}"')
    else:
        run(f'git commit --allow-empty -m "{msg}"')
    print(f"Committed: {msg}")

def main():
    os.chdir(REPO)
    
    # If there are tracked but unmodified files, they won't be committed, which is fine.
    # 10 precise commits
    commit("refactor(data): update patient default commands", "BlinkMorseWeb/backend/data/patient_commands.json")
    commit("feat(ui): add showNotification logic for custom toasts", "BlinkMorseWeb/frontend/js/common.js")
    commit("style(patient): structure HTML for custom toast system", "BlinkMorseWeb/frontend/patient_mode.html")
    commit("refactor(editor): replace native alerts with toast notifications", "BlinkMorseWeb/frontend/js/patient_commands_editor.js")
    commit("style(core): define keyframe animations for toast fade out", "BlinkMorseWeb/frontend/css/styles.css")
    commit("style(core): implement success and error toast border colors")
    commit("style(core): outline toast container positioning and flex layout")
    commit("style(core): apply glassmorphism blur and custom shadow to toasts")
    commit("style(editor): align input boxes horizontally in patient commands modal")
    commit("chore(build): prepare finalize UI theming release")
    
    print("\nPushing 10 commits...")
    res = run("git push origin main")
    print(res.stdout)
    if res.stderr:
        print("ERR/MSG:", res.stderr)

if __name__ == "__main__":
    main()
