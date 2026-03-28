const MAX_TOTAL = 23;
const TEAM_SIZE = 5;
const MAX_PLAYERS = 8;

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

function displayResults(teams, gameType) {
  const resultsDiv = document.getElementById('results');
  const teamsListDiv = document.getElementById('teamsList');
  const teamCountSpan = document.getElementById('teamCount');
  // const highRanksSpan = document.getElementById('highRanks');
  const copyAllBtn = document.getElementById('copyAllBtn');

  const highs = gameType === '8' ? [6, 7] : [7, 8, 9];

  teamCountSpan.textContent = `${teams.length} unique play${teams.length !== 1 ? 's' : ''}`;
  // highRanksSpan.textContent = ` | High ranks: ${highs.join(', ')}`;

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

  teamsListDiv.innerHTML = '';

  if (teams.length === 0) {
    teamsListDiv.innerHTML =
      '<div class="no-results">No valid teams found with these players.</div>';
  } else {
    teams.forEach((team) => {
      const total = team.reduce((sum, num) => sum + num, 0);
      const card = document.createElement('div');
      card.className = 'team-card';
      card.innerHTML = `
        <div class="team-numbers">${team.join(', ')}</div>
        <div class="team-total">Total: ${total}</div>
      `;

      teamsListDiv.appendChild(card);
    });
  }

  resultsDiv.classList.add('show');

  // Smooth scroll to results
  setTimeout(() => {
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// Theme management
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  // Check if user has a saved preference, otherwise use system preference
  let savedTheme = localStorage.getItem('theme');

  if (!savedTheme) {
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    savedTheme = prefersDark ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme, themeIcon);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme, themeIcon);

    // Update theme-color meta tag
    const themeColor = newTheme === 'dark' ? '#1e1e2e' : '#8839ef';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
  });
}

function updateThemeIcon(theme, iconElement) {
  iconElement.textContent = theme === 'light' ? '🌙' : '☀️';
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
  initTheme();
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
    displayResults(teams, gameType);
  });

  // Allow Enter key in input to submit
  document.getElementById('players').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('teamForm').dispatchEvent(new Event('submit'));
    }
  });
});
