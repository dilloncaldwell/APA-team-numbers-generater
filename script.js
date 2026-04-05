const MAX_TOTAL = 23;
const TEAM_SIZE = 5;
const MAX_PLAYERS = 8;

// Global state for filtering
let allGeneratedTeams = [];
let playersList = [];
let activeFilterIndices = new Set();

// Get all combinations of array
function* combinations(array, size) {
  if (size === 0) {
    yield [];
    return;
  }
  if (array.length === 0) return;

  const [first, ...rest] = array;

  // Include first element
  for (const combo of combinations(rest, size - 1)) {
    yield [first, ...combo];
  }

  // Exclude first element
  for (const combo of combinations(rest, size)) {
    yield combo;
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  document.getElementById('results').classList.remove('show');
}

function hideError() {
  document.getElementById('error').style.display = 'none';
}

function generateTeams(players, gameType) {
  const highs = gameType === '8' ? new Set([6, 7]) : new Set([7, 8, 9]);
  const validTeams = new Set();

  for (const combo of combinations(players, TEAM_SIZE)) {
    const total = combo.reduce((sum, num) => sum + num, 0);
    const highCount = combo.filter((num) => highs.has(num)).length;

    if (total <= MAX_TOTAL && highCount <= 2) {
      // Sort and convert to string for uniqueness
      const sortedTeam = [...combo].sort((a, b) => a - b);
      validTeams.add(JSON.stringify(sortedTeam));
    }
  }

  // Convert back to arrays and sort
  return Array.from(validTeams)
    .map((str) => JSON.parse(str))
    .sort((a, b) => {
      for (let i = 0; i < TEAM_SIZE; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
      }
      return 0;
    });
}

function createFilterButtons(players) {
  const filterButtonsDiv = document.getElementById('filterButtons');
  const filterContainer = document.getElementById('filterContainer');

  filterButtonsDiv.innerHTML = '';
  activeFilterIndices.clear();

  if (players.length === 0) {
    filterContainer.style.display = 'none';
    return;
  }

  filterContainer.style.display = 'block';

  players.forEach((num, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = num;
    btn.dataset.index = index;

    btn.addEventListener('click', () => {
      toggleFilter(index);
      btn.blur();
    });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      toggleFilter(index);
      btn.blur();
    });

    filterButtonsDiv.appendChild(btn);
  });

  updateFilterDisplay();
}

function toggleFilter(index) {
  if (activeFilterIndices.has(index)) {
    activeFilterIndices.delete(index);
  } else {
    activeFilterIndices.add(index);
  }

  updateFilterDisplay();
  applyFilters();
}

function updateFilterDisplay() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach((btn) => {
    const index = parseInt(btn.dataset.index);
    if (activeFilterIndices.has(index)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function applyFilters() {
  if (activeFilterIndices.size === 0) {
    // No filters active, show all teams
    renderTeams(allGeneratedTeams);
    updateFilterCount(allGeneratedTeams.length, allGeneratedTeams.length);
    return;
  }

  // Build requirements map from active filters
  const requirements = {};
  activeFilterIndices.forEach((idx) => {
    const num = playersList[idx];
    requirements[num] = (requirements[num] || 0) + 1;
  });

  // Filter teams based on requirements
  const filteredTeams = allGeneratedTeams.filter((team) => {
    // Count occurrences in this team
    const teamCounts = {};
    team.forEach((num) => {
      teamCounts[num] = (teamCounts[num] || 0) + 1;
    });

    // Check if team meets all requirements
    return Object.entries(requirements).every(([num, required]) => {
      return (teamCounts[num] || 0) >= required;
    });
  });

  renderTeams(filteredTeams);
  updateFilterCount(filteredTeams.length, allGeneratedTeams.length);
}

function updateFilterCount(filtered, total) {
  const filterCountDiv = document.getElementById('filterCount');
  if (activeFilterIndices.size > 0) {
    filterCountDiv.textContent = `Showing ${filtered} of ${total} teams`;
  } else {
    filterCountDiv.textContent = '';
  }
}

function renderTeams(teams) {
  const teamsListDiv = document.getElementById('teamsList');

  // Fade out existing content
  teamsListDiv.style.opacity = '0';

  setTimeout(() => {
    teamsListDiv.innerHTML = '';

    if (teams.length === 0) {
      teamsListDiv.innerHTML = '<div class="no-results">No plays match the selected filters.</div>';
    } else {
      teams.forEach((team, index) => {
        const total = team.reduce((sum, num) => sum + num, 0);
        const card = document.createElement('div');
        card.className = 'team-card';
        card.style.animationDelay = `${index * 0.02}s`;
        card.innerHTML = `
          <div class="team-numbers">${team.join(', ')}</div>
          <div class="team-total">Total: ${total}</div>
        `;
        teamsListDiv.appendChild(card);
      });
    }

    // Fade in new content
    setTimeout(() => {
      teamsListDiv.style.opacity = '1';
    }, 50);
  }, 150);
}

function displayResults(teams, gameType, players) {
  const resultsDiv = document.getElementById('results');
  const teamCountSpan = document.getElementById('teamCount');
  const copyAllBtn = document.getElementById('copyAllBtn');

  // Store globally for filtering
  allGeneratedTeams = teams;
  playersList = players;
  activeFilterIndices.clear();

  teamCountSpan.textContent = `${teams.length} unique team${teams.length !== 1 ? 's' : ''}`;

  // Setup copy all button
  copyAllBtn.style.display = teams.length > 0 ? 'inline-flex' : 'none';
  copyAllBtn.onclick = () => {
    const allTeams = teams.map((team) => team.join(' ')).join('\n');
    navigator.clipboard
      .writeText(allTeams)
      .then(() => {
        const originalHTML = copyAllBtn.innerHTML;
        copyAllBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        copyAllBtn.style.color = 'var(--success-color)';
        setTimeout(() => {
          copyAllBtn.innerHTML = originalHTML;
          copyAllBtn.style.color = '';
        }, 1500);
      })
      .catch(() => {
        // Silently fail - clipboard not available
        console.log('Clipboard not available');
      });
  };

  // Create filter buttons
  createFilterButtons(players);

  // Render initial teams
  renderTeams(teams);

  // Show results section, hide form section
  document.getElementById('formSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'block';

  resultsDiv.classList.add('show');

  // Smooth scroll to results
  setTimeout(() => {
    document
      .getElementById('resultsSection')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Number pad functionality
function initNumberPad() {
  const playersInput = document.getElementById('players');
  const numberButtons = document.querySelectorAll('.number-btn');
  const clearBtn = document.getElementById('clear');
  const backspaceBtn = document.getElementById('backspace');

  numberButtons.forEach((btn) => {
    const handleNumberClick = () => {
      const currentValue = playersInput.value.trim();
      const currentPlayers = currentValue ? currentValue.split(/\s+/).filter((n) => n) : [];

      // Check if we've reached the max player limit
      if (currentPlayers.length >= MAX_PLAYERS) {
        showError(`Maximum of ${MAX_PLAYERS} players allowed per team.`);
        btn.blur();
        return;
      }

      const number = btn.getAttribute('data-number');

      // Add space if there's already content
      playersInput.value = currentValue ? currentValue + ' ' + number : number;

      // Update button states
      updateNumberPadState();

      // Add visual feedback
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 100);

      // Blur button to prevent stuck hover state on mobile
      btn.blur();

      // Focus input to show cursor
      playersInput.focus();
    };

    btn.addEventListener('click', handleNumberClick);
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleNumberClick();
    });
  });

  clearBtn.addEventListener('click', () => {
    playersInput.value = '';
    clearBtn.blur();
    playersInput.focus();
    hideError();
    updateNumberPadState();
  });

  backspaceBtn.addEventListener('click', () => {
    const currentValue = playersInput.value.trim();
    const numbers = currentValue.split(/\s+/).filter((n) => n);

    if (numbers.length > 0) {
      numbers.pop();
      playersInput.value = numbers.join(' ');
    }

    updateNumberPadState();
    backspaceBtn.blur();
    playersInput.focus();
  });

  // Allow keyboard input as well
  playersInput.addEventListener('keydown', (e) => {
    // Allow backspace, delete, arrow keys, tab
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      return;
    }

    // Allow Ctrl/Cmd + A, C, V, X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }

    // Only allow numbers and space
    if (!/^[1-9\s]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  // Update button states when user types
  playersInput.addEventListener('input', () => {
    updateNumberPadState();
  });
}

// Update number pad button states based on player count
function updateNumberPadState() {
  const playersInput = document.getElementById('players');
  const currentValue = playersInput.value.trim();
  const currentPlayers = currentValue ? currentValue.split(/\s+/).filter((n) => n) : [];
  const numberButtons = document.querySelectorAll('.number-btn');
  const playerCountSpan = document.getElementById('playerCount');

  // Update player count display
  if (playerCountSpan) {
    const count = currentPlayers.length;
    const color = count >= MAX_PLAYERS ? 'var(--accent-primary)' : 'var(--text-secondary)';
    playerCountSpan.textContent = `(${count}/${MAX_PLAYERS})`;
    playerCountSpan.style.color = color;
  }

  numberButtons.forEach((btn) => {
    // Don't override game type restrictions
    const number = parseInt(btn.getAttribute('data-number'));
    const gameType = document.querySelector('input[name="gameType"]:checked').value;
    const isRestrictedByGameType =
      gameType === '8' && (number === 1 || number === 8 || number === 9);

    if (!isRestrictedByGameType) {
      if (currentPlayers.length >= MAX_PLAYERS) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }
  });
}

// Update number pad availability based on game type
function updateNumberPadVisibility(gameType) {
  const numberButtons = document.querySelectorAll('.number-btn');

  numberButtons.forEach((btn) => {
    const number = parseInt(btn.getAttribute('data-number'));

    if (gameType === '8') {
      // 8-ball: disable 1, 8, and 9 (only 2-7 available)
      if (number === 1 || number === 8 || number === 9) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    } else {
      // 9-ball: all numbers available (1-9)
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });

  // Update button states after availability change
  updateNumberPadState();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  initNumberPad();

  // Set initial number pad visibility
  const initialGameType = document.querySelector('input[name="gameType"]:checked').value;
  updateNumberPadVisibility(initialGameType);

  // Update number pad when game type changes
  document.querySelectorAll('input[name="gameType"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      updateNumberPadVisibility(e.target.value);
      hideError();
    });
  });

  // Regenerate button handler
  document.getElementById('regenerateBtn').addEventListener('click', () => {
    // Reset filters
    activeFilterIndices.clear();
    allGeneratedTeams = [];
    playersList = [];

    // Hide results section, show form section
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('formSection').style.display = 'block';

    // Clear error if any
    hideError();

    // Scroll to form
    setTimeout(() => {
      document.getElementById('formSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });

  document.getElementById('teamForm').addEventListener('submit', function (e) {
    e.preventDefault();
    hideError();

    const playersInput = document.getElementById('players').value.trim();
    const gameType = document.querySelector('input[name="gameType"]:checked').value;

    if (!playersInput) {
      showError('Please enter player skill levels.');
      return;
    }

    // Parse players
    const playerStrings = playersInput.split(/\s+/);
    const players = [];

    for (const str of playerStrings) {
      const num = parseInt(str, 10);
      if (isNaN(num) || num < 1 || num > 9) {
        showError('All skill levels must be numbers between 1 and 9.');
        return;
      }
      players.push(num);
    }

    if (players.length < TEAM_SIZE) {
      showError(`You must provide at least ${TEAM_SIZE} players.`);
      return;
    }

    if (players.length > MAX_PLAYERS) {
      showError(`Maximum of ${MAX_PLAYERS} players allowed per team.`);
      return;
    }

    // Generate teams
    const teams = generateTeams(players, gameType);
    displayResults(teams, gameType, players);
  });

  // Allow Enter key in input to submit
  document.getElementById('players').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('teamForm').dispatchEvent(new Event('submit'));
    }
  });
});
