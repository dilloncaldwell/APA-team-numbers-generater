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
  currentTeam: 'myTeam', // 'myTeam' or 'opponent'
  teams: {
    myTeam: {
      allGeneratedTeams: [],
      currentDisplayedTeams: [],
      playersList: [],
      filterStates: new Map(), // index -> 'normal' | 'required' | 'excluded'
      gameType: '8',
    },
    opponent: {
      allGeneratedTeams: [],
      currentDisplayedTeams: [],
      playersList: [],
      filterStates: new Map(),
      gameType: '8',
    },
  },

  getCurrentTeamData() {
    return this.teams[this.currentTeam];
  },

  reset() {
    this.teams.myTeam = {
      allGeneratedTeams: [],
      currentDisplayedTeams: [],
      playersList: [],
      filterStates: new Map(),
      gameType: '8',
    };
    this.teams.opponent = {
      allGeneratedTeams: [],
      currentDisplayedTeams: [],
      playersList: [],
      filterStates: new Map(),
      gameType: '8',
    };
  },
};

// ===================
// LOCAL STORAGE
// ===================
const Storage = {
  KEYS: {
    MY_TEAM_STATE: 'apa_myTeam_state',
    OPPONENT_STATE: 'apa_opponent_state',
  },

  saveTeamState(team, teamData) {
    const stateKey = team === 'myTeam' ? this.KEYS.MY_TEAM_STATE : this.KEYS.OPPONENT_STATE;

    const state = {
      allGeneratedTeams: teamData.allGeneratedTeams,
      playersList: teamData.playersList,
      gameType: teamData.gameType,
      filterStates: Array.from(teamData.filterStates.entries()),
      playersInput: DOM.get('players').value,
    };

    localStorage.setItem(stateKey, JSON.stringify(state));
  },

  loadTeamState(team) {
    const stateKey = team === 'myTeam' ? this.KEYS.MY_TEAM_STATE : this.KEYS.OPPONENT_STATE;
    const savedState = localStorage.getItem(stateKey);

    if (!savedState) {
      return null;
    }

    try {
      const state = JSON.parse(savedState);
      return {
        allGeneratedTeams: state.allGeneratedTeams || [],
        playersList: state.playersList || [],
        gameType: state.gameType || '8',
        filterStates: new Map(state.filterStates || []),
        playersInput: state.playersInput || '',
      };
    } catch (e) {
      return null;
    }
  },

  clear() {
    Object.values(this.KEYS).forEach((key) => localStorage.removeItem(key));
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
  create(players, preserveFilters = true) {
    const filterButtonsDiv = DOM.get('filterButtons');
    const filterContainer = DOM.get('filterContainer');
    const teamData = State.getCurrentTeamData();

    filterButtonsDiv.innerHTML = '';

    // Only clear filters if explicitly told to (new generation)
    if (!preserveFilters) {
      teamData.filterStates.clear();
    }

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
      this.cycle(index);
      btn.blur();
    };

    btn.addEventListener('click', handleClick);
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleClick();
    });

    container.appendChild(btn);
  },

  cycle(index) {
    const teamData = State.getCurrentTeamData();
    const currentState = teamData.filterStates.get(index) || 'normal';

    // Cycle: normal -> required -> excluded -> normal
    let newState;
    if (currentState === 'normal') {
      newState = 'required';
    } else if (currentState === 'required') {
      newState = 'excluded';
    } else {
      newState = 'normal';
    }

    if (newState === 'normal') {
      teamData.filterStates.delete(index);
    } else {
      teamData.filterStates.set(index, newState);
    }

    this.updateDisplay();
    this.apply();
  },

  updateDisplay() {
    const teamData = State.getCurrentTeamData();

    DOM.getAll('.filter-btn').forEach((btn) => {
      const index = parseInt(btn.dataset.index);
      const state = teamData.filterStates.get(index) || 'normal';

      btn.classList.remove('required', 'excluded');
      if (state !== 'normal') {
        btn.classList.add(state);
      }
    });
  },

  apply() {
    const teamData = State.getCurrentTeamData();

    if (teamData.filterStates.size === 0) {
      teamData.currentDisplayedTeams = teamData.allGeneratedTeams;
      TeamRenderer.render(teamData.allGeneratedTeams);
      this.updateCount(teamData.allGeneratedTeams.length, teamData.allGeneratedTeams.length);
      CopyHandler.updateTeams(teamData.allGeneratedTeams);
      Storage.saveTeamState(State.currentTeam, teamData);
      return;
    }

    const { required, excluded } = this.buildRequirements();
    const filteredTeams = this.filterTeams(required, excluded);

    teamData.currentDisplayedTeams = filteredTeams;
    TeamRenderer.render(filteredTeams);
    this.updateCount(filteredTeams.length, teamData.allGeneratedTeams.length);
    CopyHandler.updateTeams(filteredTeams);
    Storage.saveTeamState(State.currentTeam, teamData);
  },

  buildRequirements() {
    const teamData = State.getCurrentTeamData();
    const required = {};
    const excluded = {};

    teamData.filterStates.forEach((state, idx) => {
      const num = teamData.playersList[idx];

      if (state === 'required') {
        required[num] = (required[num] || 0) + 1;
      } else if (state === 'excluded') {
        excluded[num] = (excluded[num] || 0) + 1;
      }
    });

    return { required, excluded };
  },

  filterTeams(required, excluded) {
    const teamData = State.getCurrentTeamData();

    return teamData.allGeneratedTeams.filter((team) => {
      const teamCounts = Utils.countOccurrences(team);

      // Check excluded counts: if we have 3 fours and excluded 1, max allowed is 2
      for (const [num, excludedCount] of Object.entries(excluded)) {
        const numValue = parseInt(num);
        const teamCount = teamCounts[numValue] || 0;
        const maxAllowed =
          (Utils.countOccurrences(teamData.playersList)[numValue] || 0) - excludedCount;

        if (teamCount > maxAllowed) {
          return false;
        }
      }

      // Check if team meets required number counts
      return Object.entries(required).every(
        ([num, requiredCount]) => (teamCounts[num] || 0) >= requiredCount,
      );
    });
  },

  updateCount(filtered, total) {
    const teamData = State.getCurrentTeamData();
    const filterCountDiv = DOM.get('filterCount');
    const hasFilters = teamData.filterStates.size > 0;

    filterCountDiv.textContent = hasFilters ? `Showing ${filtered} of ${total} teams` : '';
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
    copyAllBtn.onclick = () => this.copyAllTeams();
  },

  updateTeams(teams) {
    const copyAllBtn = DOM.get('copyAllBtn');
    copyAllBtn.style.display = teams.length > 0 ? 'inline-flex' : 'none';
  },

  copyAllTeams() {
    const teamData = State.getCurrentTeamData();
    const allTeams = teamData.currentDisplayedTeams.map((team) => team.join(' ')).join('\n');
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
    const teamData = State.getCurrentTeamData();

    teamData.allGeneratedTeams = teams;
    teamData.currentDisplayedTeams = teams;
    teamData.playersList = players;
    teamData.filterStates.clear(); // Clear filters on new generation
    teamData.gameType = gameType;

    this.updateTeamCount(teams);
    CopyHandler.setup(teams);
    FilterSystem.create(players, false); // Clear filters on new generation
    TeamRenderer.render(teams);

    this.toggleSections();

    DOM.get('results').classList.add('show');
    Utils.scrollTo('resultsSection');

    // Save complete team state to local storage
    Storage.saveTeamState(State.currentTeam, teamData);
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
    const teamData = State.getCurrentTeamData();
    teamData.allGeneratedTeams = [];
    teamData.currentDisplayedTeams = [];
    teamData.playersList = [];
    teamData.filterStates.clear();

    // Save the cleared state
    Storage.saveTeamState(State.currentTeam, teamData);

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
  touchStartY: 0,
  touchStartTime: 0,
  isTouchMove: false,

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

      // Track touch start
      btn.addEventListener(
        'touchstart',
        (e) => {
          this.touchStartY = e.touches[0].clientY;
          this.touchStartTime = Date.now();
          this.isTouchMove = false;
        },
        { passive: true },
      );

      // Track if user is scrolling
      btn.addEventListener(
        'touchmove',
        (e) => {
          const touchMoveY = e.touches[0].clientY;
          const deltaY = Math.abs(touchMoveY - this.touchStartY);

          // If moved more than 10px, consider it a scroll
          if (deltaY > 10) {
            this.isTouchMove = true;
          }
        },
        { passive: true },
      );

      // Only trigger on touchend if not scrolling
      btn.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - this.touchStartTime;

        // Prevent click if:
        // - User was scrolling
        // - Touch was too quick (< 50ms, likely accidental)
        if (!this.isTouchMove && touchDuration >= 50) {
          e.preventDefault();
          handleClick();
        }
      });

      // Regular click for mouse/desktop
      btn.addEventListener('click', (e) => {
        // Only handle click if it wasn't from a touch event
        if (e.detail !== 0) {
          handleClick();
        }
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

    const handleClear = () => {
      playersInput.value = '';
      clearBtn.blur();
      playersInput.focus();
      ErrorHandler.hide();
      this.updateState();
    };

    const handleBackspace = () => {
      const currentValue = playersInput.value.trim();
      const numbers = Utils.parsePlayerInput(currentValue);

      if (numbers.length > 0) {
        numbers.pop();
        playersInput.value = numbers.join(' ');
      }

      this.updateState();
      backspaceBtn.blur();
      playersInput.focus();
    };

    // Clear button
    clearBtn.addEventListener('click', (e) => {
      if (e.detail !== 0) handleClear();
    });

    clearBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleClear();
    });

    // Backspace button
    backspaceBtn.addEventListener('click', (e) => {
      if (e.detail !== 0) handleBackspace();
    });

    backspaceBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleBackspace();
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
// TEAM TAB HANDLER
// ===================
const TeamTabHandler = {
  init() {
    DOM.getAll('.team-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const team = tab.dataset.team;
        this.switchTeam(team);
      });
    });

    // Load saved data on init
    this.loadSavedData();
  },

  switchTeam(team) {
    if (State.currentTeam === team) return;

    // Save current team state before switching
    const currentTeamData = State.getCurrentTeamData();
    if (currentTeamData.allGeneratedTeams.length > 0) {
      Storage.saveTeamState(State.currentTeam, currentTeamData);
    }

    State.currentTeam = team;

    // Update tab UI
    DOM.getAll('.team-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.team === team);
    });

    // Load saved data for this team
    this.loadTeamData(team);
  },

  loadSavedData() {
    // Load data for current team on page load
    this.loadTeamData(State.currentTeam);
  },

  loadTeamData(team) {
    const savedState = Storage.loadTeamState(team);
    const playersInput = DOM.get('players');
    const teamData = State.teams[team];

    if (!savedState || savedState.allGeneratedTeams.length === 0) {
      // No saved state or no teams generated, show form with saved input
      playersInput.value = savedState ? savedState.playersInput : '';

      if (savedState && savedState.gameType) {
        const gameTypeRadio = document.querySelector(
          `input[name="gameType"][value="${savedState.gameType}"]`,
        );
        if (gameTypeRadio) {
          gameTypeRadio.checked = true;
          NumberPad.updateVisibility(savedState.gameType);
        }
      }

      NumberPad.updateState();
      DOM.get('resultsSection').style.display = 'none';
      DOM.get('formSection').style.display = 'block';
      return;
    }

    // Restore team data from saved state
    teamData.allGeneratedTeams = savedState.allGeneratedTeams;
    teamData.currentDisplayedTeams = savedState.allGeneratedTeams;
    teamData.playersList = savedState.playersList;
    teamData.filterStates = savedState.filterStates;
    teamData.gameType = savedState.gameType;

    // Set form values
    playersInput.value = savedState.playersInput;
    const gameTypeRadio = document.querySelector(
      `input[name="gameType"][value="${savedState.gameType}"]`,
    );
    if (gameTypeRadio) {
      gameTypeRadio.checked = true;
      NumberPad.updateVisibility(savedState.gameType);
    }

    NumberPad.updateState();

    // Show results with saved filters
    this.showExistingResults(teamData);
  },

  showExistingResults(teamData) {
    DOM.get('formSection').style.display = 'none';
    DOM.get('resultsSection').style.display = 'block';

    ResultsDisplay.updateTeamCount(teamData.allGeneratedTeams);
    CopyHandler.setup(teamData.allGeneratedTeams);
    FilterSystem.create(teamData.playersList, true); // Preserve existing filters

    // Update filter button display
    FilterSystem.updateDisplay();

    // Apply saved filters to show correct results
    FilterSystem.apply();

    DOM.get('results').classList.add('show');
  },
};

// ===================
// RESET DATA HANDLER
// ===================
const ResetDataHandler = {
  init() {
    const resetBtn = DOM.get('resetDataBtn');
    const modal = DOM.get('resetModal');
    const cancelBtn = DOM.get('cancelReset');
    const confirmBtn = DOM.get('confirmReset');

    // Open modal
    resetBtn.addEventListener('click', () => {
      this.showModal();
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
      this.hideModal();
    });

    // Confirm button
    confirmBtn.addEventListener('click', () => {
      this.hideModal();
      this.resetAllData();
    });

    // Close on overlay click
    modal.querySelector('.modal-overlay').addEventListener('click', () => {
      this.hideModal();
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        this.hideModal();
      }
    });
  },

  showModal() {
    const modal = DOM.get('resetModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  },

  hideModal() {
    const modal = DOM.get('resetModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  },

  resetAllData() {
    // Clear local storage
    Storage.clear();

    // Reset state
    State.reset();
    State.currentTeam = 'myTeam';

    // Reset UI to My Team tab
    DOM.getAll('.team-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.team === 'myTeam');
    });

    // Clear form
    DOM.get('players').value = '';
    const defaultGameType = document.querySelector('input[name="gameType"][value="8"]');
    if (defaultGameType) {
      defaultGameType.checked = true;
      NumberPad.updateVisibility('8');
    }

    // Hide results
    DOM.get('resultsSection').style.display = 'none';
    DOM.get('formSection').style.display = 'block';

    NumberPad.updateState();
    ErrorHandler.hide();
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
    TeamTabHandler.init();
    ResetDataHandler.init();
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
