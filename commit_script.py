import os
import subprocess
import math

def run_command(command):
    try:
        subprocess.run(command, check=True, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(e.stderr.decode())

def get_files():
    # Get all untracked and modified files respecting .gitignore
    # We use 'git add . -n' (dry run) logic or just 'git status -u' parsing?
    # Better: use 'git status --porcelain' after adding everything to index, or just walk manually?
    # Simplest: git add . (stage all), then git diff --name-only --cached, then unstage.
    
    # First, make sure we ignore what we want to ignore
    run_command("git add .") 
    
    result = subprocess.run("git diff --name-only --cached", shell=True, capture_output=True, text=True)
    files = result.stdout.strip().split('\n')
    
    # Unstage everything so we can commit piece by piece
    run_command("git reset")
    
    return [f for f in files if f]

def main():
    print("Gathering files...")
    files = get_files()
    total_files = len(files)
    print(f"Found {total_files} files to commit.")
    
    if total_files == 0:
        print("No files to commit.")
        return

    target_commits = 25
    batch_size = math.ceil(total_files / target_commits)
    if batch_size < 1: batch_size = 1
    
    print(f"Target commits: {target_commits}, Batch size: {batch_size}")
    
    files.sort() # Sort to keep folders together
    
    batches = [files[i:i + batch_size] for i in range(0, len(files), batch_size)]
    
    print(f"Created {len(batches)} batches.")
    
    for i, batch in enumerate(batches):
        # Create a commit message based on the first file in the batch
        first_file = batch[0]
        directory = os.path.dirname(first_file) or "root"
        msg = f"feat: add files in {directory} part {i+1}"
        
        # Add files
        # Handle spaces in filenames by quoting
        files_str = " ".join([f'"{f}"' for f in batch])
        
        print(f"Committing batch {i+1}/{len(batches)}: {msg}")
        run_command(f"git add {files_str}")
        run_command(f'git commit -m "{msg}"')
        
    print("Done!")

if __name__ == "__main__":
    main()
