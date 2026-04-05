// ================
// CONSTANTS
// ================
const CONFIG = {
  MAX_TOTAL: 23,
  TEAM_SIZE: 5,
  MAX_PLAYERS: 8,
  ANIMATION_DELAY: {
    FADE_OUT: 150,
    FADE_IN: 50,
    SCROLL: 100,
    CARD_STAGGER: 0.02,
    BUTTON_FEEDBACK: 100,
    COPY_SUCCESS: 1500,
  },
};

const GAME_TYPES = {
  EIGHT_BALL: {
    value: '8',
    highRanks: new Set([6, 7]),
    validNumbers: new Set([2, 3, 4, 5, 6, 7]),
  },
  NINE_BALL: {
    value: '9',
    highRanks: new Set([7, 8, 9]),
    validNumbers: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]),
  },
};

const SVG = {
  CLIPBOARD: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  CHECKMARK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
};

// =================
// STATE
// =================
const State = {
  allGeneratedTeams: [],
  playersList: [],
  activeFilterIndices: new Set(),

  reset() {
    this.allGeneratedTeams = [];
    this.playersList = [];
    this.activeFilterIndices.clear();
  },
};

// ===================
// DOM HELPERS
// ===================
const DOM = {
  get(id) {
    return document.getElementById(id);
  },

  getAll(selector) {
    return document.querySelectorAll(selector);
  },

  show(element) {
    element.style.display = 'block';
  },

  hide(element) {
    element.style.display = 'none';
  },

  setOpacity(element, value) {
    element.style.opacity = value;
  },
};

// ===================
// UTILITY FUNCTIONS
// ===================
const Utils = {
  // Generate all combinations of array
  *combinations(array, size) {
    if (size === 0) {
      yield [];
      return;
    }
    if (array.length === 0) return;

    const [first, ...rest] = array;

    for (const combo of this.combinations(rest, size - 1)) {
      yield [first, ...combo];
    }

    for (const combo of this.combinations(rest, size)) {
      yield combo;
    }
  },

  // Parse player input into array of numbers
  parsePlayerInput(input) {
    return input
      .trim()
      .split(/\s+/)
      .filter((n) => n)
      .map((str) => parseInt(str, 10));
  },

  // Count occurrences of each number in array
  countOccurrences(array) {
    const counts = {};
    array.forEach((num) => {
      counts[num] = (counts[num] || 0) + 1;
    });
    return counts;
  },

  // Smooth scroll to element
  scrollTo(elementId) {
    setTimeout(() => {
      DOM.get(elementId).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, CONFIG.ANIMATION_DELAY.SCROLL);
  },
};

// ===================
// ERROR HANDLING
// ===================
const ErrorHandler = {
  show(message) {
    const errorDiv = DOM.get('error');
    errorDiv.textContent = message;
    DOM.show(errorDiv);
    DOM.get('results').classList.remove('show');
  },

  hide() {
    DOM.hide(DOM.get('error'));
  },

  validate(players) {
    if (!players || players.length === 0) {
      this.show('Please enter player skill levels.');
      return false;
    }

    if (players.some((num) => isNaN(num) || num < 1 || num > 9)) {
      this.show('All skill levels must be numbers between 1 and 9.');
      return false;
    }

    if (players.length < CONFIG.TEAM_SIZE) {
      this.show(`You must provide at least ${CONFIG.TEAM_SIZE} players.`);
      return false;
    }

    if (players.length > CONFIG.MAX_PLAYERS) {
      this.show(`Maximum of ${CONFIG.MAX_PLAYERS} players allowed per team.`);
      return false;
    }

    return true;
  },
};

// ===================
// TEAM GENERATION
// ===================
const TeamGenerator = {
  generate(players, gameType) {
    const gameConfig = gameType === '8' ? GAME_TYPES.EIGHT_BALL : GAME_TYPES.NINE_BALL;
    const validTeams = new Set();

    for (const combo of Utils.combinations(players, CONFIG.TEAM_SIZE)) {
      if (this.isValidTeam(combo, gameConfig.highRanks)) {
        const sortedTeam = [...combo].sort((a, b) => a - b);
        validTeams.add(JSON.stringify(sortedTeam));
      }
    }

    return this.sortTeams(validTeams);
  },

  isValidTeam(combo, highRanks) {
    const total = combo.reduce((sum, num) => sum + num, 0);
    const highCount = combo.filter((num) => highRanks.has(num)).length;
    return total <= CONFIG.MAX_TOTAL && highCount <= 2;
  },

  sortTeams(validTeams) {
    return Array.from(validTeams)
      .map((str) => JSON.parse(str))
      .sort((a, b) => {
        for (let i = 0; i < CONFIG.TEAM_SIZE; i++) {
          if (a[i] !== b[i]) return a[i] - b[i];
        }
        return 0;
      });
  },
};

// ===================
// FILTER SYSTEM
// ===================
const FilterSystem = {
  create(players) {
    const filterButtonsDiv = DOM.get('filterButtons');
    const filterContainer = DOM.get('filterContainer');

    filterButtonsDiv.innerHTML = '';
    State.activeFilterIndices.clear();

    if (players.length === 0) {
      DOM.hide(filterContainer);
      return;
    }

    DOM.show(filterContainer);
    players.forEach((num, index) => this.createButton(num, index, filterButtonsDiv));
    this.updateDisplay();
  },

  createButton(num, index, container) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = num;
    btn.dataset.index = index;

    const handleClick = () => {
      this.toggle(index);
      btn.blur();
    };

    btn.addEventListener('click', handleClick);
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleClick();
    });

    container.appendChild(btn);
  },

  toggle(index) {
    if (State.activeFilterIndices.has(index)) {
      State.activeFilterIndices.delete(index);
    } else {
      State.activeFilterIndices.add(index);
    }

    this.updateDisplay();
    this.apply();
  },

  updateDisplay() {
    DOM.getAll('.filter-btn').forEach((btn) => {
      const index = parseInt(btn.dataset.index);
      btn.classList.toggle('active', State.activeFilterIndices.has(index));
    });
  },

  apply() {
    if (State.activeFilterIndices.size === 0) {
      TeamRenderer.render(State.allGeneratedTeams);
      this.updateCount(State.allGeneratedTeams.length, State.allGeneratedTeams.length);
      return;
    }

    const requirements = this.buildRequirements();
    const filteredTeams = this.filterTeams(requirements);

    TeamRenderer.render(filteredTeams);
    this.updateCount(filteredTeams.length, State.allGeneratedTeams.length);
  },

  buildRequirements() {
    const requirements = {};
    State.activeFilterIndices.forEach((idx) => {
      const num = State.playersList[idx];
      requirements[num] = (requirements[num] || 0) + 1;
    });
    return requirements;
  },

  filterTeams(requirements) {
    return State.allGeneratedTeams.filter((team) => {
      const teamCounts = Utils.countOccurrences(team);
      return Object.entries(requirements).every(
        ([num, required]) => (teamCounts[num] || 0) >= required,
      );
    });
  },

  updateCount(filtered, total) {
    const filterCountDiv = DOM.get('filterCount');
    filterCountDiv.textContent =
      State.activeFilterIndices.size > 0 ? `Showing ${filtered} of ${total} teams` : '';
  },
};

// ===================
// TEAM RENDERER
// ===================
const TeamRenderer = {
  render(teams) {
    const teamsListDiv = DOM.get('teamsList');

    DOM.setOpacity(teamsListDiv, '0');

    setTimeout(() => {
      teamsListDiv.innerHTML =
        teams.length === 0 ? this.createNoResultsHTML() : this.createTeamCardsHTML(teams);

      setTimeout(() => {
        DOM.setOpacity(teamsListDiv, '1');
      }, CONFIG.ANIMATION_DELAY.FADE_IN);
    }, CONFIG.ANIMATION_DELAY.FADE_OUT);
  },

  createNoResultsHTML() {
    return '<div class="no-results">No plays match the selected filters.</div>';
  },

  createTeamCardsHTML(teams) {
    return teams.map((team, index) => this.createTeamCard(team, index)).join('');
  },

  createTeamCard(team, index) {
    const total = team.reduce((sum, num) => sum + num, 0);
    const delay = index * CONFIG.ANIMATION_DELAY.CARD_STAGGER;

    return `
      <div class="team-card" style="animation-delay: ${delay}s">
        <div class="team-numbers">${team.join(', ')}</div>
        <div class="team-total">Total: ${total}</div>
      </div>
    `;
  },
};

// ===================
// COPY FUNCTIONALITY
// ===================
const CopyHandler = {
  setup(teams) {
    const copyAllBtn = DOM.get('copyAllBtn');
    copyAllBtn.style.display = teams.length > 0 ? 'inline-flex' : 'none';
    copyAllBtn.onclick = () => this.copyAllTeams(teams);
  },

  copyAllTeams(teams) {
    const allTeams = teams.map((team) => team.join(' ')).join('\n');
    const copyAllBtn = DOM.get('copyAllBtn');

    navigator.clipboard
      .writeText(allTeams)
      .then(() => this.showSuccess(copyAllBtn))
      .catch(() => console.log('Clipboard not available'));
  },

  showSuccess(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = SVG.CHECKMARK;
    button.style.color = 'var(--success-color)';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.color = '';
    }, CONFIG.ANIMATION_DELAY.COPY_SUCCESS);
  },
};

// ===================
// RESULTS DISPLAY
// ===================
const ResultsDisplay = {
  show(teams, gameType, players) {
    State.allGeneratedTeams = teams;
    State.playersList = players;
    State.activeFilterIndices.clear();

    this.updateTeamCount(teams);
    CopyHandler.setup(teams);
    FilterSystem.create(players);
    TeamRenderer.render(teams);
    this.toggleSections();

    DOM.get('results').classList.add('show');
    Utils.scrollTo('resultsSection');
  },

  updateTeamCount(teams) {
    const teamCountSpan = DOM.get('teamCount');
    teamCountSpan.textContent = `${teams.length} unique team${teams.length !== 1 ? 's' : ''}`;
  },

  toggleSections() {
    DOM.get('formSection').style.display = 'none';
    DOM.get('resultsSection').style.display = 'block';
  },

  reset() {
    State.reset();
    DOM.get('resultsSection').style.display = 'none';
    DOM.get('formSection').style.display = 'block';
    ErrorHandler.hide();
    Utils.scrollTo('formSection');
  },
};

// ===================
// NUMBER PAD
// ===================
const NumberPad = {
  init() {
    this.bindButtons();
    this.bindControls();
    this.bindKeyboard();
    this.updateState();
  },

  bindButtons() {
    DOM.getAll('.number-btn').forEach((btn) => {
      const handleClick = () => {
        this.handleNumberClick(btn);
        btn.blur();
      };

      btn.addEventListener('click', handleClick);
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleClick();
      });
    });
  },

  handleNumberClick(btn) {
    const playersInput = DOM.get('players');
    const currentValue = playersInput.value.trim();
    const currentPlayers = Utils.parsePlayerInput(currentValue);

    if (currentPlayers.length >= CONFIG.MAX_PLAYERS) {
      ErrorHandler.show(`Maximum of ${CONFIG.MAX_PLAYERS} players allowed per team.`);
      return;
    }

    const number = btn.getAttribute('data-number');
    playersInput.value = currentValue ? `${currentValue} ${number}` : number;

    this.updateState();
    this.animateButton(btn);
    playersInput.focus();
  },

  animateButton(btn) {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = '';
    }, CONFIG.ANIMATION_DELAY.BUTTON_FEEDBACK);
  },

  bindControls() {
    const playersInput = DOM.get('players');
    const clearBtn = DOM.get('clear');
    const backspaceBtn = DOM.get('backspace');

    clearBtn.addEventListener('click', () => {
      playersInput.value = '';
      clearBtn.blur();
      playersInput.focus();
      ErrorHandler.hide();
      this.updateState();
    });

    backspaceBtn.addEventListener('click', () => {
      const currentValue = playersInput.value.trim();
      const numbers = Utils.parsePlayerInput(currentValue);

      if (numbers.length > 0) {
        numbers.pop();
        playersInput.value = numbers.join(' ');
      }

      this.updateState();
      backspaceBtn.blur();
      playersInput.focus();
    });
  },

  bindKeyboard() {
    const playersInput = DOM.get('players');

    playersInput.addEventListener('keydown', (e) => {
      if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
        return;
      }

      if (!/^[1-9\s]$/.test(e.key)) {
        e.preventDefault();
      }
    });

    playersInput.addEventListener('input', () => this.updateState());
  },

  updateState() {
    const playersInput = DOM.get('players');
    const currentPlayers = Utils.parsePlayerInput(playersInput.value);

    this.updatePlayerCount(currentPlayers.length);
    this.updateButtonStates(currentPlayers.length);
  },

  updatePlayerCount(count) {
    const playerCountSpan = DOM.get('playerCount');
    if (!playerCountSpan) return;

    const color = count >= CONFIG.MAX_PLAYERS ? 'var(--accent-primary)' : 'var(--text-secondary)';
    playerCountSpan.textContent = `(${count}/${CONFIG.MAX_PLAYERS})`;
    playerCountSpan.style.color = color;
  },

  updateButtonStates(playerCount) {
    const gameType = document.querySelector('input[name="gameType"]:checked').value;

    DOM.getAll('.number-btn').forEach((btn) => {
      const number = parseInt(btn.getAttribute('data-number'));
      const isRestrictedByGameType =
        gameType === '8' && (number === 1 || number === 8 || number === 9);

      if (!isRestrictedByGameType) {
        this.setButtonState(btn, playerCount >= CONFIG.MAX_PLAYERS);
      }
    });
  },

  setButtonState(btn, disabled) {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.4' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  },

  updateVisibility(gameType) {
    const gameConfig = gameType === '8' ? GAME_TYPES.EIGHT_BALL : GAME_TYPES.NINE_BALL;

    DOM.getAll('.number-btn').forEach((btn) => {
      const number = parseInt(btn.getAttribute('data-number'));
      const isValid = gameConfig.validNumbers.has(number);

      this.setButtonState(btn, !isValid);
    });

    this.updateState();
  },
};

// ===================
// FORM HANDLER
// ===================
const FormHandler = {
  init() {
    const form = DOM.get('teamForm');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    DOM.get('players').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  },

  handleSubmit() {
    ErrorHandler.hide();

    const playersInput = DOM.get('players').value;
    const gameType = document.querySelector('input[name="gameType"]:checked').value;
    const players = Utils.parsePlayerInput(playersInput);

    if (!ErrorHandler.validate(players)) {
      return;
    }

    const teams = TeamGenerator.generate(players, gameType);
    ResultsDisplay.show(teams, gameType, players);
  },
};

// ===================
// GAME TYPE HANDLER
// ===================
const GameTypeHandler = {
  init() {
    const initialGameType = document.querySelector('input[name="gameType"]:checked').value;
    NumberPad.updateVisibility(initialGameType);

    DOM.getAll('input[name="gameType"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        NumberPad.updateVisibility(e.target.value);
        ErrorHandler.hide();
      });
    });
  },
};

// ===================
// APP INITIALIZATION
// ===================
const App = {
  init() {
    NumberPad.init();
    GameTypeHandler.init();
    FormHandler.init();
    this.bindRegenerateButton();
  },

  bindRegenerateButton() {
    DOM.get('regenerateBtn').addEventListener('click', () => {
      ResultsDisplay.reset();
    });
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
