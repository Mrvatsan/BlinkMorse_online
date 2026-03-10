/**
 * Patient Commands Editor UI Logic
 */

let currentCommands = {};

/**
 * Initialize the modal and fetch commands
 */
async function initCommandsEditor() {
    await fetchEditableCommands();
}

/**
 * Fetch commands from API and render editor list
 */
async function fetchEditableCommands() {
    try {
        const response = await fetchAPI('/api/patient_commands');
        if (response.success) {
            currentCommands = response.commands;
            renderEditorList();
        }
    } catch (error) {
        console.error('Failed to load commands for editor:', error);
    }
}

/**
 * Render the list of commands inside the modal
 */
function renderEditorList() {
    const listContainer = document.getElementById('editCommandsList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (Object.keys(currentCommands).length === 0) {
        listContainer.innerHTML = '<p class="text-light text-center">No commands found. Add one below!</p>';
        return;
    }

    for (const [pattern, command] of Object.entries(currentCommands)) {
        const item = document.createElement('div');
        item.className = 'edit-command-item d-flex justify-content-between align-items-center mb-2 p-2 bg-dark rounded border border-secondary';
        item.innerHTML = `
            <div>
                <strong>${command}</strong> <span class="text-accent ms-2">${formatMorsePattern(pattern)}</span>
            </div>
            <button class="btn btn-sm btn-danger remove-btn" data-pattern="${pattern}">🗑️ Remove</button>
        `;
        listContainer.appendChild(item);
    }

    // Attach event listeners to remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const pat = this.getAttribute('data-pattern');
            delete currentCommands[pat];
            renderEditorList();
        });
    });
}

/**
 * Open the Edit Modal
 */
function openEditModal() {
    fetchEditableCommands().then(() => {
        document.getElementById('editCommandsModal').style.display = 'flex';
    });
}

/**
 * Close the Edit Modal
 */
function closeEditModal() {
    document.getElementById('editCommandsModal').style.display = 'none';
}

/**
 * Add a new command from the form inputs
 */
function addNewCommand() {
    const textInput = document.getElementById('newCommandText').value.trim().toUpperCase();
    const patternInput = document.getElementById('newCommandPattern').value.trim();

    if (!textInput || !patternInput) {
        alert("Please enter both text and a Morse pattern.");
        return;
    }

    // basic validation for morse pattern (only dots and dashes)
    const validPattern = /^[.-]+$/.test(patternInput);
    if (!validPattern) {
        alert("Pattern must contain only dots '.' and dashes '-'");
        return;
    }

    currentCommands[patternInput] = textInput;

    // Clear inputs
    document.getElementById('newCommandText').value = '';
    document.getElementById('newCommandPattern').value = '';

    renderEditorList();
}

/**
 * Save the updated commands to the backend API
 */
async function saveCommands() {
    try {
        const saveBtn = document.getElementById('saveCommandsBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const response = await fetchAPI('/api/patient_commands', {
            method: 'POST',
            body: JSON.stringify({ commands: currentCommands })
        });

        if (response.success) {
            closeEditModal();
            // Reload commands in the main patient mode UI
            if (typeof loadPatientCommands === 'function') {
                await loadPatientCommands();
            }
            alert('Commands saved successfully!');
        } else {
            alert('Failed to save commands.');
        }
    } catch (error) {
        console.error('Error saving commands', error);
        alert('An error occurred while saving.');
    } finally {
        const saveBtn = document.getElementById('saveCommandsBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Changes';
    }
}

// Global exposure for onClick handlers
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.addNewCommand = addNewCommand;
window.saveCommands = saveCommands;

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initCommandsEditor);
