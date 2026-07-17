// ===== DOM ELEMENTS =====
const canvas = document.getElementById('layoutCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const flagCounter = document.getElementById('flagCounter');
const cityCounter = document.getElementById('cityCounter');
const buildingCounter = document.getElementById('buildingCounter');
const hqCounter = document.getElementById('hqCounter');
const nodeCounter = document.getElementById('nodeCounter');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const mapData = document.getElementById('mapData');
const copyMessage = document.getElementById('copyMessage');
const shortUrlButton = document.getElementById('shortUrlButton');
const copyShortUrlButton = document.getElementById('copyShortUrlButton');
const shortUrlContainer = document.getElementById('shortUrlContainer');
const shortUrlOutput = document.getElementById('shortUrlOutput');
const shortUrlError = document.getElementById('shortUrlError');
const clearButton = document.getElementById('clearButton');
const eraserCursor = document.getElementById('eraserCursor');

// ===== GRID CONFIGURATION =====
const baseGridSize = 30;
let gridSize = baseGridSize;
let zoom = 1;
let panX = 0;
let panY = 0;
let canvasWidth, canvasHeight;

// Diamond grid dimensions
const gridCols = 60;
const gridRows = 60;

// ===== GAME STATE =====
const entities = [];
const defaultCityLabelMode = "march";
const defaultWaveMode = false;
let selectedType = null;
let obstacleSize = 1; // 1, 2, 3 or 4 — placement drops N×N individual 1×1 obstacles
let selectedEntity = null;
let selectedEntities = new Set();
let cityCounterId = 1;
let bearTraps = [];
let enemyZones = []; // Array for enemy zones (max 3)
let cityTeams = {}; // Store team assignments for cities: {cityId: teamIndex}
let customTeams = []; // Dynamic array of teams: [{name: 'Team A', color: '#3B82F6'}, ...]
let showTeamsInBase = false;
const ALLIANCES = [
    { id: 'main', name: '主盟', short: '主', color: '#d7a928', areaColor: 'rgba(215, 169, 40, 0.32)' },
    { id: 'farm', name: '分盟', short: '分', color: '#3fae58', areaColor: 'rgba(63, 174, 88, 0.3)' },
    { id: 'blue', name: '蓝盟', short: '蓝', color: '#3f7fd8', areaColor: 'rgba(63, 127, 216, 0.28)' },
    { id: 'red', name: '红盟', short: '红', color: '#c94e45', areaColor: 'rgba(201, 78, 69, 0.28)' },
    { id: 'purple', name: '紫盟', short: '紫', color: '#8965d6', areaColor: 'rgba(137, 101, 214, 0.28)' },
    { id: 'orange', name: '橙盟', short: '橙', color: '#d9812e', areaColor: 'rgba(217, 129, 46, 0.3)' }
];
const DEFAULT_ALLIANCE_ID = 'main';
const DEFAULT_TEAMS = Object.freeze([
    Object.freeze({ name: '主队', color: '#3B82F6' }),
    Object.freeze({ name: '反制队', color: '#EF4444' })
]);
let activeAllianceId = DEFAULT_ALLIANCE_ID;
const INACTIVE_ALLIANCE_AREA_ALPHA = 0.18;
const INACTIVE_ALLIANCE_ENTITY_ALPHA = 0.78;
const INACTIVE_ALLIANCE_STROKE_ALPHA = 0.95;

// Initialize with default teams
function initializeDefaultTeams() {
    if (customTeams.length === 0) {
        customTeams = DEFAULT_TEAMS.map(team => ({ name: team.name, color: team.color }));
    }
}

let isDragging = false;
let isErasing = false;
let isPanning = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragSelectionStart = [];
let hasDragMovement = false;
let isBoxSelecting = false;
let selectionBoxStart = null;
let selectionBoxCurrent = null;
let selectionBoxAdditive = false;
let hasPendingEraseHistory = false;
let lastMouseX = 0;
let lastMouseY = 0;
let hasUnsavedChanges = false;
let ghostPreview = null;
let territoryPreview = null;
let cityLabelMode = defaultCityLabelMode;  // "march", "coords", "none"
let waveMode = defaultWaveMode;
let coordAnchor = { x: 600, y: 600 };
let worldmapPresence = null; // Uint8Array(1200*1200), key per cell; loaded on first activation
let worldmapLoading = false;
let showWorldmap = false;
let powerRankingMembers = [];
let allianceLeaderNames = new Set();
let placedPowerMembers = [];
let draggingPowerMember = null;
let powerMemberDropPreview = null;
let powerRankingScope = 'all';
let mapMode = 'base'; // 'base' or 'castle' (add island?)
const castleReservedSize = 12; // Size of the reserved castle area
const castleRedzoneThickness = 8; // Thickness of the redzone ring around the reserved area
const selectionPulseDurationMs = 1400;
let selectionPulseActiveUntil = 0;
let selectionPulseRafId = null;
let shortcutToastTimerId = null;
const selectionBoxMinPixels = 4;
let lastPointerClientX = null;
let lastPointerClientY = null;
const KEYBOARD_MOVE_HISTORY_DEBOUNCE_MS = 220;
let keyboardMoveHistoryTimerId = null;
const WORLDMAP_URL = 'https://raw.githubusercontent.com/wosnerdwarriors/wos-data/refs/heads/main/data/worldmap/worldmap.json';
const POWER_RANKINGS_URL = `${String(window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || `${window.location.origin}/`).replace(/\/?$/, '/')}data/power-rankings.json`;
const ALLIANCE_LEADERS_STORAGE_KEY = 'benben-alliance-leaders';
const POWER_RANKINGS_STORAGE_KEY = 'benben-power-ranking-members';
const ALLIANCE_DATA_SETTINGS_STORAGE_KEY = 'benben-alliance-data-settings';
const SWORD_TASKS_STORAGE_KEY = 'benben-sword-member-tasks';
const SWORD_FIRST_OCCUPATION_TASK_ID = 'system-first-occupation';
const SWORD_ACTIVE_LEGION_STORAGE_KEY = 'benben-sword-active-legion';
const SWORD_PLACEMENTS_STORAGE_PREFIX = 'benben-sword-placements';
const SWORD_ROSTER_STORAGE_PREFIX = 'benben-sword-roster';
let activeSwordLegion = localStorage.getItem(SWORD_ACTIVE_LEGION_STORAGE_KEY) === 'legion2' ? 'legion2' : 'legion1';
let battlefieldConnectionLines = [];
let selectedBattlefieldLineColor = 'blue';
let markedHaloRafId = null;

const BATTLEFIELD_LINE_COLORS = Object.freeze({
    blue: Object.freeze({
        label: '蓝线',
        stroke: 'rgba(20, 112, 176, 0.82)',
        dashedStroke: 'rgba(68, 151, 196, 0.58)',
        glow: 'rgba(68, 181, 255, 0.28)'
    }),
    gold: Object.freeze({
        label: '金线',
        stroke: 'rgba(222, 167, 36, 0.9)',
        dashedStroke: 'rgba(238, 194, 79, 0.62)',
        glow: 'rgba(255, 214, 90, 0.34)'
    }),
    red: Object.freeze({
        label: '红线',
        stroke: 'rgba(216, 74, 60, 0.88)',
        dashedStroke: 'rgba(231, 107, 94, 0.62)',
        glow: 'rgba(255, 94, 82, 0.32)'
    })
});

const TOOL_LABELS = Object.freeze({
    select: '选择',
    move: '平移',
    delete: '擦除',
    flag: '旗帜',
    city: '城市',
    building: '捕兽夹',
    hq: '总部',
    node: '节点',
    obstacle: '障碍',
    dog: '小狗',
    capybara: '卡皮巴拉',
    enemyzone: '敌方区域'
});

const ENTITY_LABELS = Object.freeze({
    flag: '旗帜',
    city: '城市',
    building: '捕兽夹',
    hq: '总部',
    node: '节点',
    obstacle: '障碍',
    enemyzone: '敌方区域',
    castle: '王城',
    turret: '炮塔'
});

const TOOL_SHORTCUT_LABELS = Object.freeze({
    select: 'Q',
    move: 'W',
    delete: 'E',
    flag: '1',
    city: '2',
    building: '3',
    hq: '4',
    node: '5',
    obstacle: '6',
    enemyzone: '7'
});

const TOOL_SHORTCUT_KEY_MAP = Object.freeze({
    q: 'select',
    w: 'move',
    '1': 'flag',
    '2': 'city',
    '3': 'building',
    '4': 'hq',
    '5': 'node',
    '6': 'obstacle',
    '7': 'enemyzone'
});

// Semi-transparent fill colors per key type (keys 1-6)
const WORLDMAP_KEY_COLORS = [
    null,
    'rgba(120, 120, 130, 0.55)', // 1 – mountain (grey)
    'rgba(25, 63, 102, 0.52)', // 2 – lake (blue)
    'rgba(210, 150,  50, 0.55)', // 3 – building (amber)
    'rgba(180,  60, 180, 0.60)', // 4 – castle (purple)
    'rgba(160,  50,  50, 0.55)', // 5 – fortress / stronghold (dark red)
    'rgba( 50, 170, 150, 0.55)', // 6 – facility area (green)
];

const SWORD_BATTLEFIELD_KEY = 'sword';
const SWORD_BATTLEFIELD_INITIAL_CODE = 'lp2:YzDMmGa88laZzqyyksdqZ9e7nN6dFaeWc2nxhM8rWu-4fDKMldTuETlyfJHyRyaOwBydfRIJ1UqJSlbRZgYGOkAcq6OUCuRVK-UpWSk9XzrvaefE50vXPp07W0lHKRkopJxsmWhknAzkJQF5xeX5RSlAdqaSlUGtDkTTk72Ln7Zufbly99M5G2CaLNLMEk0sMTUZwjQ9mzrzac-0p0uWP-1rhWkyTzI3NjPF1GQE0_Ry0vynC6fAlJuYmqaYmWMqN4Ypfzp79tP-7c-6lrycuQimyTjNIsncDFOTCUzTi6X7n_ZMf7qrHajvWWcDTJ9lokmaiRGmPlN4KOyY87QXU59Rmrl5ogGmPjOEvgYsjjQ3S8biM3OEpk4MTUkWwADBYpMFPPRWrnnatxKqPCknMTkbU7El3IZdPeg24NBiCE4IkFh3MgACLErA0Y5fCTiS8SsBRyx-JeBoxK8EHGP4lYAjB78ScFTgVwIOePxKwMGNV4kR4dA1Ihy6Rka1sbUA';
const SWORD_BATTLEFIELD_TEMPLATE = Object.freeze([
    Object.freeze({ name: '神剑祭坛', dx: -4, dy: -2, width: 3, height: 3, type: 'node', color: '#c9a23c', imageKey: 'swordAltar' }),
    Object.freeze({ name: '佣兵驻地', dx: -8, dy: -6, width: 3, height: 3, type: 'node', color: '#8f6a49', imageKey: 'mercenaryCamp' }),
    Object.freeze({ name: '教化大厅', dx: 1, dy: 3, width: 3, height: 3, type: 'node', color: '#7b7365', imageKey: 'educationHall' }),
    Object.freeze({ name: '钟塔', dx: -17, dy: -6, width: 3, height: 3, type: 'node', color: '#455d67', imageKey: 'clockTower' }),
    Object.freeze({ name: '四号护院', dx: -7, dy: -17, width: 3, height: 3, type: 'node', color: '#3f8b76', imageKey: 'courtyard' }),
    Object.freeze({ name: '西北庇护所', dx: -17, dy: 6, width: 3, height: 3, type: 'node', color: '#9a4f42', imageKey: 'shelter' }),
    Object.freeze({ name: '东南庇护所', dx: 11, dy: -11, width: 3, height: 3, type: 'node', color: '#2f77a0', imageKey: 'shelter' }),
    Object.freeze({ name: '一号护院', dx: -13, dy: 14, width: 3, height: 3, type: 'node', color: '#3f76c7', imageKey: 'courtyard' }),
    Object.freeze({ name: '三号护院', dx: 5, dy: 15, width: 3, height: 3, type: 'node', color: '#b84550', imageKey: 'courtyard' }),
    Object.freeze({ name: '马厩', dx: 15, dy: 6, width: 3, height: 3, type: 'building', color: 'black', imageKey: 'stable' }),
    Object.freeze({ name: '二号护院', dx: 6, dy: -17, width: 3, height: 3, type: 'building', color: 'black', imageKey: 'courtyard' }),
    Object.freeze({ dx: -6, dy: 13, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: -3, dy: 14, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: -2, dy: 15, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: 13, dy: 1, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: 14, dy: -2, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: 12, dy: -4, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: 2, dy: -15, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: -2, dy: -14, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: -4, dy: -13, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: -16, dy: 0, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: -14, dy: 2, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' }),
    Object.freeze({ dx: -12, dy: 3, width: 1, height: 1, type: 'obstacle', color: '#8B0000', imageKey: 'cellar' })
]);

const THREE_ALLIANCE_BATTLEFIELD_KEY = 'three-alliance';
const THREE_ALLIANCE_BATTLEFIELD_TEMPLATE = Object.freeze({
    nodes: Object.freeze([
        Object.freeze({ id: 'leftBase', name: '大地禁军', dx: -33, dy: -6, width: 2, height: 2, type: 'hq', color: '#5e6d78', imageKey: 'threeFactionBase' }),
        Object.freeze({ id: 'rightBase', name: '风暴禁军', dx: 33, dy: -6, width: 2, height: 2, type: 'hq', color: '#5e6d78', imageKey: 'threeFactionBase' }),
        Object.freeze({ id: 'bottomBase', name: '怒浪禁军', dx: -1, dy: 34, width: 2, height: 2, type: 'hq', color: '#5e6d78', imageKey: 'threeFactionBase' }),
        Object.freeze({ id: 'center', name: '潮汐神殿', dx: -2, dy: -1, width: 4, height: 4, type: 'hq', color: '#d2b553', imageKey: 'threeTideTemple' }),

        Object.freeze({ id: 'ctNw', name: '中转枢纽', dx: -7, dy: -8, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'ctNe', name: '中转枢纽', dx: 7, dy: -8, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'ctW', name: '中转枢纽', dx: -12, dy: 0, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'ctE', name: '中转枢纽', dx: 12, dy: 0, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'ctSw', name: '中转枢纽', dx: -7, dy: 8, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'ctSe', name: '中转枢纽', dx: 7, dy: 8, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),

        Object.freeze({ id: 'ln1', name: '遗迹', dx: -25, dy: -14, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'ln2', name: '遗迹群', dx: -19, dy: -14, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'ln3', name: '海之柱', dx: -14, dy: -11, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'ln4', name: '戍卫兵营', dx: -10, dy: -15, width: 2, height: 2, type: 'node', color: '#d0b84c', imageKey: 'threeCamp' }),
        Object.freeze({ id: 'ln5', name: '中转枢纽', dx: -4, dy: -15, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),

        Object.freeze({ id: 'lm1', name: '遗迹', dx: -28, dy: -4, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'lm2', name: '海之柱', dx: -22, dy: -2, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'lm3', name: '遗迹群', dx: -16, dy: -4, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'lm4', name: '遗迹', dx: -10, dy: -2, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'lm5', name: '海之柱', dx: -28, dy: 5, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'lm6', name: '海之柱', dx: -20, dy: 7, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'lm7', name: '遗迹', dx: -14, dy: 7, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),

        Object.freeze({ id: 'lb1', name: '中转枢纽', dx: -27, dy: 15, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'lb2', name: '遗迹群', dx: -20, dy: 18, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'lb3', name: '海之柱', dx: -14, dy: 16, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'lb4', name: '戍卫兵营', dx: -8, dy: 14, width: 2, height: 2, type: 'node', color: '#d0b84c', imageKey: 'threeCamp' }),
        Object.freeze({ id: 'lb5', name: '遗迹', dx: -3, dy: 18, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),

        Object.freeze({ id: 'rn1', name: '遗迹', dx: 25, dy: -14, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'rn2', name: '遗迹群', dx: 19, dy: -14, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'rn3', name: '海之柱', dx: 14, dy: -11, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'rn4', name: '戍卫兵营', dx: 10, dy: -15, width: 2, height: 2, type: 'node', color: '#d0b84c', imageKey: 'threeCamp' }),
        Object.freeze({ id: 'rn5', name: '中转枢纽', dx: 4, dy: -15, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),

        Object.freeze({ id: 'rm1', name: '遗迹', dx: 28, dy: -4, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'rm2', name: '海之柱', dx: 22, dy: -2, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'rm3', name: '遗迹群', dx: 16, dy: -4, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'rm4', name: '遗迹', dx: 10, dy: -2, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'rm5', name: '海之柱', dx: 28, dy: 5, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'rm6', name: '海之柱', dx: 20, dy: 7, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'rm7', name: '遗迹', dx: 14, dy: 7, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),

        Object.freeze({ id: 'rb1', name: '中转枢纽', dx: 27, dy: 15, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'rb2', name: '遗迹群', dx: 20, dy: 18, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'rb3', name: '海之柱', dx: 14, dy: 16, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'rb4', name: '中转枢纽', dx: 8, dy: 14, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'rb5', name: '遗迹', dx: 3, dy: 18, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),

        Object.freeze({ id: 'bn1', name: '中转枢纽', dx: -8, dy: 7, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'bn2', name: '中转枢纽', dx: 6, dy: 7, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'bm1', name: '遗迹群', dx: -10, dy: 13, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'bm2', name: '遗迹群', dx: 8, dy: 13, width: 2, height: 2, type: 'node', color: '#d8c63c', imageKey: 'threeRuinGroup' }),
        Object.freeze({ id: 'bm3', name: '戍卫兵营', dx: -2, dy: 15, width: 2, height: 2, type: 'node', color: '#d0b84c', imageKey: 'threeCamp' }),
        Object.freeze({ id: 'bs1', name: '海之柱', dx: -15, dy: 20, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'bs2', name: '海之柱', dx: -7, dy: 22, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'bs3', name: '海之柱', dx: 6, dy: 22, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'bs4', name: '海之柱', dx: 14, dy: 20, width: 1, height: 2, type: 'node', color: '#4f8da4', imageKey: 'threeSeaPillar' }),
        Object.freeze({ id: 'br1', name: '遗迹', dx: -18, dy: 25, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'br2', name: '遗迹', dx: -9, dy: 27, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'br3', name: '遗迹', dx: 7, dy: 27, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'br4', name: '遗迹', dx: 16, dy: 25, width: 2, height: 2, type: 'node', color: '#c8463d', imageKey: 'threeRuin' }),
        Object.freeze({ id: 'bt1', name: '中转枢纽', dx: -12, dy: 31, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' }),
        Object.freeze({ id: 'bt2', name: '中转枢纽', dx: 10, dy: 31, width: 2, height: 2, type: 'node', color: '#7b9ab1', imageKey: 'threeTransferHub' })
    ]),
    connections: Object.freeze([
        Object.freeze(['leftBase', 'lm1']), Object.freeze(['leftBase', 'lm5']), Object.freeze(['lm1', 'ln1']), Object.freeze(['lm1', 'lm2']), Object.freeze(['lm2', 'ln2']), Object.freeze(['lm2', 'lm5']), Object.freeze(['lm2', 'lm6']), Object.freeze(['lm2', 'lm3']), Object.freeze(['ln1', 'ln2']), Object.freeze(['ln2', 'ln3']), Object.freeze(['ln3', 'ln4']), Object.freeze(['ln4', 'ln5']), Object.freeze(['lm3', 'lm4']), Object.freeze(['lm4', 'ctNw']), Object.freeze(['ln5', 'ctNw']),
        Object.freeze(['lm5', 'lb1']), Object.freeze(['lm5', 'lm6']), Object.freeze(['lm6', 'lm7']), Object.freeze(['lm7', 'ctW']), Object.freeze(['lb1', 'lb2']), Object.freeze(['lb2', 'lb3']), Object.freeze(['lb3', 'lb4']), Object.freeze(['lb4', 'ctSw']), Object.freeze(['lb4', 'lb5']), Object.freeze(['lb5', 'ctSw']),
        Object.freeze(['rightBase', 'rm1']), Object.freeze(['rightBase', 'rm5']), Object.freeze(['rm1', 'rn1']), Object.freeze(['rm1', 'rm2']), Object.freeze(['rm2', 'rn2']), Object.freeze(['rm2', 'rm5']), Object.freeze(['rm2', 'rm6']), Object.freeze(['rm2', 'rm3']), Object.freeze(['rn1', 'rn2']), Object.freeze(['rn2', 'rn3']), Object.freeze(['rn3', 'rn4']), Object.freeze(['rn4', 'rn5']), Object.freeze(['rm3', 'rm4']), Object.freeze(['rm4', 'ctNe']), Object.freeze(['rn5', 'ctNe']),
        Object.freeze(['rm5', 'rb1']), Object.freeze(['rm5', 'rm6']), Object.freeze(['rm6', 'rm7']), Object.freeze(['rm7', 'ctE']), Object.freeze(['rb1', 'rb2']), Object.freeze(['rb2', 'rb3']), Object.freeze(['rb3', 'rb4']), Object.freeze(['rb4', 'ctSe']), Object.freeze(['rb4', 'rb5']), Object.freeze(['rb5', 'ctSe']),
        Object.freeze(['ctNw', 'center']), Object.freeze(['ctNe', 'center']), Object.freeze(['ctW', 'center']), Object.freeze(['ctE', 'center']), Object.freeze(['ctSw', 'center']), Object.freeze(['ctSe', 'center']),
        Object.freeze(['ctNw', 'ctNe', 'dashed']), Object.freeze(['ctW', 'ctE', 'dashed']), Object.freeze(['ctSw', 'ctSe', 'dashed']),
        Object.freeze(['center', 'bn1', 'dashed']), Object.freeze(['center', 'bn2', 'dashed']), Object.freeze(['bn1', 'bm1']), Object.freeze(['bn1', 'bm3']), Object.freeze(['bn2', 'bm2']), Object.freeze(['bn2', 'bm3']),
        Object.freeze(['bm1', 'bs1']), Object.freeze(['bm1', 'bs2']), Object.freeze(['bm3', 'bs2']), Object.freeze(['bm3', 'bs3']), Object.freeze(['bm2', 'bs3']), Object.freeze(['bm2', 'bs4']),
        Object.freeze(['bs1', 'br1']), Object.freeze(['bs2', 'br2']), Object.freeze(['bs3', 'br3']), Object.freeze(['bs4', 'br4']), Object.freeze(['br1', 'bt1']), Object.freeze(['br2', 'bt1']), Object.freeze(['br3', 'bt2']), Object.freeze(['br4', 'bt2']),
        Object.freeze(['bt1', 'bottomBase']), Object.freeze(['bt2', 'bottomBase']), Object.freeze(['bottomBase', 'br2']), Object.freeze(['bottomBase', 'br3'])
    ])
});

const ENTITY_IMAGE_DEFS = Object.freeze({
    swordAltar: Object.freeze({
        src: 'images/sword-altar-cutout.png',
        mode: 'sprite',
        scale: 1.78,
        lift: 0.26,
        labelOffset: 0.62
    }),
    mercenaryCamp: Object.freeze({
        src: 'images/mercenary-camp-cutout.png',
        mode: 'sprite',
        scale: 1.5,
        lift: 0.22,
        labelOffset: 0.54
    }),
    shelter: Object.freeze({
        src: 'images/shelter-cutout.png',
        mode: 'sprite',
        scale: 1.44,
        lift: 0.2,
        labelOffset: 0.52
    }),
    clockTower: Object.freeze({
        src: 'images/clock-tower-cutout.png',
        mode: 'sprite',
        scale: 1.18,
        lift: 0.18,
        labelOffset: 0.7
    }),
    courtyard: Object.freeze({
        src: 'images/courtyard-cutout.png',
        mode: 'sprite',
        scale: 1.42,
        lift: 0.2,
        labelOffset: 0.5
    }),
    stable: Object.freeze({
        src: 'images/stable-cutout.png',
        mode: 'sprite',
        scale: 1.48,
        lift: 0.2,
        labelOffset: 0.5
    }),
    educationHall: Object.freeze({
        src: 'images/education-hall-cutout.png',
        mode: 'sprite',
        scale: 1.5,
        lift: 0.2,
        labelOffset: 0.5
    }),
    cellar: Object.freeze({
        src: 'images/cellar-cutout.png',
        mode: 'sprite',
        scale: 1.85,
        lift: 0.18,
        labelOffset: 0.42
    }),
    threeTideTemple: Object.freeze({
        src: 'images/three-tide-temple.png',
        mode: 'sprite',
        scale: 1.18,
        lift: 0.2,
        labelOffset: 0.48
    }),
    threeTransferHub: Object.freeze({
        src: 'images/three-transfer-hub.png',
        mode: 'sprite',
        scale: 1.08,
        lift: 0.16,
        labelOffset: 0.48
    }),
    threeRuin: Object.freeze({
        src: 'images/three-ruin.png',
        mode: 'sprite',
        scale: 1.08,
        lift: 0.16,
        labelOffset: 0.48
    }),
    threeRuinGroup: Object.freeze({
        src: 'images/three-ruin-group.png',
        mode: 'sprite',
        scale: 1.08,
        lift: 0.16,
        labelOffset: 0.48
    }),
    threeSeaPillar: Object.freeze({
        src: 'images/three-sea-pillar.png',
        mode: 'sprite',
        scale: 1.04,
        lift: 0.2,
        labelOffset: 0.56
    }),
    threeCamp: Object.freeze({
        src: 'images/three-camp.png',
        mode: 'sprite',
        scale: 1.08,
        lift: 0.16,
        labelOffset: 0.48
    }),
    threeFactionBase: Object.freeze({
        src: 'images/three-faction-base.png',
        mode: 'sprite',
        scale: 1.14,
        lift: 0.16,
        labelOffset: 0.48
    })
});

const THREE_ALLIANCE_QUICK_BUILDINGS = Object.freeze({
    threeRuin: Object.freeze({
        name: '遗迹',
        width: 2,
        height: 2,
        type: 'node',
        color: '#c8463d',
        imageKey: 'threeRuin'
    }),
    threeRuinGroup: Object.freeze({
        name: '遗迹群',
        width: 2,
        height: 2,
        type: 'node',
        color: '#d8c63c',
        imageKey: 'threeRuinGroup'
    }),
    threeSeaPillar: Object.freeze({
        name: '海之柱',
        width: 1,
        height: 2,
        type: 'node',
        color: '#4f8da4',
        imageKey: 'threeSeaPillar'
    }),
    threeCamp: Object.freeze({
        name: '戍卫兵营',
        width: 2,
        height: 2,
        type: 'node',
        color: '#d0b84c',
        imageKey: 'threeCamp'
    }),
    threeTransferHub: Object.freeze({
        name: '中转枢纽',
        width: 2,
        height: 2,
        type: 'node',
        color: '#7b9ab1',
        imageKey: 'threeTransferHub'
    }),
    threeTideTemple: Object.freeze({
        name: '潮汐神殿',
        width: 4,
        height: 4,
        type: 'node',
        color: '#d2b553',
        imageKey: 'threeTideTemple'
    })
});

const SWORD_BATTLEFIELD_ENTITY_IMAGE_BY_NAME = Object.freeze({
    '神剑祭坛': 'swordAltar',
    '佣兵驻地': 'mercenaryCamp',
    '西北庇护所': 'shelter',
    '东南庇护所': 'shelter',
    '钟塔': 'clockTower',
    '四号护院': 'courtyard',
    '一号护院': 'courtyard',
    '二号护院': 'courtyard',
    '三号护院': 'courtyard',
    '马厩': 'stable',
    '教化大厅': 'educationHall'
});

const entityImageCache = new Map();

const DOG_OUTLINE_STROKES = Object.freeze([
    Object.freeze([
        [2, 24], [1, 20], [2, 17], [4, 14], [7, 12], [10, 11], [14, 11],
        [17, 12], [19, 14], [20, 16], [20, 18], [18, 20], [16, 21],
        [14, 21], [16, 22], [18, 23], [20, 22], [22, 20], [24, 18],
        [26, 16], [28, 14], [30, 12], [31, 10], [31, 8], [30, 6],
        [28, 4], [26, 3], [24, 3], [23, 4], [24, 5], [26, 5],
        [28, 6], [30, 8], [32, 10], [34, 12], [37, 12], [40, 13],
        [43, 15], [45, 18], [45, 20], [43, 22], [41, 23], [39, 22],
        [38, 21], [36, 21], [34, 22], [35, 23], [36, 24], [36, 27],
        [35, 30], [33, 32], [31, 32], [29, 30], [28, 27], [26, 26],
        [24, 28], [24, 31], [22, 34], [19, 35], [17, 33], [16, 30],
        [15, 27], [13, 25], [10, 25], [8, 28], [6, 29], [4, 28],
        [3, 26], [4, 24], [5, 22], [4, 21], [3, 22], [2, 24]
    ]),
    Object.freeze([[5, 14], [3, 11], [7, 12]]),
    Object.freeze([[24, 3], [24, 1], [27, 3]]),
    Object.freeze([[41, 16], [42, 17]]),
    Object.freeze([[36, 21], [39, 20], [41, 21]]),
    Object.freeze([[28, 27], [30, 25], [33, 26]]),
    Object.freeze([[13, 25], [15, 23], [17, 24]])
]);
const DOG_PATTERN_SCALE = 1;

function scaleDogPoint(point) {
    return [
        Math.round(point[0] * DOG_PATTERN_SCALE),
        Math.round(point[1] * DOG_PATTERN_SCALE)
    ];
}

function getLineCells(x0, y0, x1, y1) {
    const cells = [];
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        cells.push({ x: x0, y: y0 });
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }

    return cells;
}

function buildDogPatternCells() {
    const cells = new Map();

    DOG_OUTLINE_STROKES.forEach(stroke => {
        for (let i = 0; i < stroke.length - 1; i++) {
            const [x0, y0] = scaleDogPoint(stroke[i]);
            const [x1, y1] = scaleDogPoint(stroke[i + 1]);
            getLineCells(x0, y0, x1, y1).forEach(cell => {
                cells.set(`${cell.x},${cell.y}`, cell);
            });
        }
        stroke.forEach(point => {
            const [x, y] = scaleDogPoint(point);
            cells.set(`${x},${y}`, { x, y });
        });
    });

    const allCells = Array.from(cells.values());
    const minX = Math.min(...allCells.map(cell => cell.x));
    const maxX = Math.max(...allCells.map(cell => cell.x));
    const minY = Math.min(...allCells.map(cell => cell.y));
    const maxY = Math.max(...allCells.map(cell => cell.y));
    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);

    return allCells.map(cell => ({
        dx: cell.x - centerX,
        dy: cell.y - centerY
    }));
}

const DOG_PATTERN_CELLS = Object.freeze(buildDogPatternCells());

const CAPYBARA_OUTLINE_STROKES = Object.freeze([
    Object.freeze([
        [15, 5], [18, 2], [22, 4], [27, 4], [32, 5], [36, 8],
        [37, 13], [36, 17], [33, 21], [33, 24], [38, 28],
        [41, 31], [38, 34], [34, 33], [30, 35], [27, 39],
        [24, 42], [20, 45], [15, 46], [10, 44], [6, 40],
        [3, 35], [2, 30], [3, 25], [6, 21], [10, 17],
        [13, 14], [13, 10], [12, 8], [15, 5]
    ]),
    Object.freeze([[13, 7], [11, 5], [13, 3], [16, 5]]),
    Object.freeze([[23, 10]]),
    Object.freeze([[34, 24], [38, 27], [41, 27]]),
    Object.freeze([[32, 27], [36, 31], [40, 31]]),
    Object.freeze([[35, 25], [36, 29]]),
    Object.freeze([[38, 29], [41, 32]]),
    Object.freeze([[8, 40], [7, 43], [10, 43]]),
    Object.freeze([[17, 45], [16, 48], [19, 48]]),
    Object.freeze([[27, 39], [28, 42], [31, 42]])
]);
const CAPYBARA_PATTERN_SCALE = 0.92;

function scaleCapybaraPoint(point) {
    const stretchOriginX = 22;
    const bodyStretch = 1.18;
    return [
        Math.round((stretchOriginX + (point[0] - stretchOriginX) * bodyStretch) * CAPYBARA_PATTERN_SCALE),
        Math.round(point[1] * CAPYBARA_PATTERN_SCALE)
    ];
}

function getDogPatternAt(anchorX, anchorY) {
    return DOG_PATTERN_CELLS.map(cell => ({
        x: anchorX + cell.dx,
        y: anchorY + cell.dy,
        width: 1,
        height: 1,
        type: 'obstacle'
    }));
}

function buildPatternCellsFromStrokes(strokes, scalePoint) {
    const cells = new Map();

    strokes.forEach(stroke => {
        for (let i = 0; i < stroke.length - 1; i++) {
            const [x0, y0] = scalePoint(stroke[i]);
            const [x1, y1] = scalePoint(stroke[i + 1]);
            getLineCells(x0, y0, x1, y1).forEach(cell => {
                cells.set(`${cell.x},${cell.y}`, cell);
            });
        }
        stroke.forEach(point => {
            const [x, y] = scalePoint(point);
            cells.set(`${x},${y}`, { x, y });
        });
    });

    const allCells = Array.from(cells.values());
    const minX = Math.min(...allCells.map(cell => cell.x));
    const maxX = Math.max(...allCells.map(cell => cell.x));
    const minY = Math.min(...allCells.map(cell => cell.y));
    const maxY = Math.max(...allCells.map(cell => cell.y));
    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);

    return allCells.map(cell => ({
        dx: cell.x - centerX,
        dy: cell.y - centerY
    }));
}

function buildProjectedPatternCellsFromStrokes(strokes, scalePoint) {
    const cells = new Map();

    strokes.forEach(stroke => {
        for (let i = 0; i < stroke.length - 1; i++) {
            const [u0, v0] = scalePoint(stroke[i]);
            const [u1, v1] = scalePoint(stroke[i + 1]);
            getLineCells(u0, v0, u1, v1).forEach(screenCell => {
                const x = Math.round((screenCell.y + screenCell.x) / 2);
                const y = Math.round((screenCell.y - screenCell.x) / 2);
                cells.set(`${x},${y}`, { x, y });
            });
        }
        stroke.forEach(point => {
            const [u, v] = scalePoint(point);
            const x = Math.round((v + u) / 2);
            const y = Math.round((v - u) / 2);
            cells.set(`${x},${y}`, { x, y });
        });
    });

    const allCells = Array.from(cells.values());
    const minX = Math.min(...allCells.map(cell => cell.x));
    const maxX = Math.max(...allCells.map(cell => cell.x));
    const minY = Math.min(...allCells.map(cell => cell.y));
    const maxY = Math.max(...allCells.map(cell => cell.y));
    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);

    return allCells.map(cell => ({
        dx: cell.x - centerX,
        dy: cell.y - centerY
    }));
}

const CAPYBARA_PATTERN_CELLS = Object.freeze(
    buildProjectedPatternCellsFromStrokes(CAPYBARA_OUTLINE_STROKES, scaleCapybaraPoint)
);

function getCapybaraPatternAt(anchorX, anchorY) {
    return CAPYBARA_PATTERN_CELLS.map(cell => ({
        x: anchorX + cell.dx,
        y: anchorY + cell.dy,
        width: 1,
        height: 1,
        type: 'obstacle'
    }));
}

function getArtPatternAt(toolType, anchorX, anchorY) {
    if (toolType === 'dog') return getDogPatternAt(anchorX, anchorY);
    if (toolType === 'capybara') return getCapybaraPatternAt(anchorX, anchorY);
    return [];
}

function isArtPatternTool(toolType) {
    return ['dog', 'capybara'].includes(toolType);
}

function removeSwordBattlefieldEntities() {
    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i]?.battlefield === SWORD_BATTLEFIELD_KEY) {
            entities.splice(i, 1);
        }
    }
}

function removeBattlefieldEntities(battlefieldKey) {
    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i]?.battlefield === battlefieldKey) {
            entities.splice(i, 1);
        }
    }
    clearBattlefieldConnectionLines(battlefieldKey);
}

function clearBattlefieldConnectionLines(battlefieldKey) {
    battlefieldConnectionLines = battlefieldConnectionLines.filter(line => line.battlefield !== battlefieldKey);
}

function normalizeBattlefieldLineColor(value) {
    return Object.prototype.hasOwnProperty.call(BATTLEFIELD_LINE_COLORS, value) ? value : 'blue';
}

function getBattlefieldLineColor(value) {
    return BATTLEFIELD_LINE_COLORS[normalizeBattlefieldLineColor(value)];
}

function setBattlefieldConnectionLines(battlefieldKey, entityByTemplateId, connections) {
    clearBattlefieldConnectionLines(battlefieldKey);
    connections.forEach(connection => {
        const [fromId, toId, style = 'solid', color = 'blue'] = connection;
        const from = entityByTemplateId.get(fromId);
        const to = entityByTemplateId.get(toId);
        if (!from || !to) return;
        battlefieldConnectionLines.push({ battlefield: battlefieldKey, from, to, style, color: normalizeBattlefieldLineColor(color) });
    });
}

function isSameBattlefieldConnection(line, from, to) {
    return Boolean(line && (
        (line.from === from && line.to === to) ||
        (line.from === to && line.to === from)
    ));
}

function getBattlefieldConnection(from, to, battlefieldKey = THREE_ALLIANCE_BATTLEFIELD_KEY) {
    return battlefieldConnectionLines.find(line => (
        line.battlefield === battlefieldKey && isSameBattlefieldConnection(line, from, to)
    )) || null;
}

function addBattlefieldConnection(from, to, style = 'solid', battlefieldKey = THREE_ALLIANCE_BATTLEFIELD_KEY, color = selectedBattlefieldLineColor) {
    if (!from || !to || from === to) return false;
    if (getBattlefieldConnection(from, to, battlefieldKey)) return false;
    battlefieldConnectionLines.push({
        battlefield: battlefieldKey,
        from,
        to,
        style,
        color: normalizeBattlefieldLineColor(color),
        custom: true
    });
    return true;
}

function removeBattlefieldConnection(from, to, battlefieldKey = THREE_ALLIANCE_BATTLEFIELD_KEY) {
    const before = battlefieldConnectionLines.length;
    battlefieldConnectionLines = battlefieldConnectionLines.filter(line => !(
        line.battlefield === battlefieldKey && isSameBattlefieldConnection(line, from, to)
    ));
    return battlefieldConnectionLines.length !== before;
}

function getTwoSelectedConnectableEntities() {
    const selectedNow = getSelectedEntities().filter(entity => (
        entity && !entity.locked && entity.type !== 'castle' && entity.type !== 'turret'
    ));
    return selectedNow.length === 2 ? selectedNow : null;
}

function connectSelectedEntities() {
    const pair = getTwoSelectedConnectableEntities();
    if (!pair) {
        showShortcutToast('请先选中两个建筑');
        return;
    }
    if (!addBattlefieldConnection(pair[0], pair[1])) {
        const existingLine = getBattlefieldConnection(pair[0], pair[1]);
        if (existingLine) {
            existingLine.color = selectedBattlefieldLineColor;
            redraw();
            markUnsavedChanges();
            pushHistory();
            showShortcutToast(`已改为${getBattlefieldLineColor(selectedBattlefieldLineColor).label}`);
            return;
        }
        showShortcutToast('这两个建筑已经有线');
        return;
    }
    redraw();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast('已连接选中建筑');
}

function disconnectSelectedEntities() {
    const pair = getTwoSelectedConnectableEntities();
    if (!pair) {
        showShortcutToast('请先选中两个建筑');
        return;
    }
    if (!removeBattlefieldConnection(pair[0], pair[1])) {
        showShortcutToast('这两个建筑没有连线');
        return;
    }
    redraw();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast('已取消连线');
}

function setSelectedBattlefieldLineColor(color) {
    selectedBattlefieldLineColor = normalizeBattlefieldLineColor(color);
    updateConnectionColorPalette();
    const pair = getTwoSelectedConnectableEntities();
    if (!pair) {
        showShortcutToast(`已选择${getBattlefieldLineColor(selectedBattlefieldLineColor).label}`);
        return;
    }
    const existingLine = getBattlefieldConnection(pair[0], pair[1]);
    if (!existingLine) {
        showShortcutToast(`已选择${getBattlefieldLineColor(selectedBattlefieldLineColor).label}，连接时生效`);
        return;
    }
    existingLine.color = selectedBattlefieldLineColor;
    redraw();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast(`已染成${getBattlefieldLineColor(selectedBattlefieldLineColor).label}`);
}

function updateConnectionColorPalette() {
    document.querySelectorAll('[data-line-color]').forEach(button => {
        const active = normalizeBattlefieldLineColor(button.dataset.lineColor) === selectedBattlefieldLineColor;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function getBattlefieldEntitiesByTemplateId(battlefieldKey) {
    const entityByTemplateId = new Map();
    entities.forEach(entity => {
        if (entity?.battlefield === battlefieldKey && typeof entity.templateId === 'string') {
            entityByTemplateId.set(entity.templateId, entity);
        }
    });
    return entityByTemplateId;
}

function rebuildBattlefieldConnectionLinesFromEntities() {
    const templateEntityMap = getBattlefieldEntitiesByTemplateId(THREE_ALLIANCE_BATTLEFIELD_KEY);
    const hasThreeAllianceTemplate = THREE_ALLIANCE_BATTLEFIELD_TEMPLATE.connections.some(connection => (
        templateEntityMap.has(connection[0]) && templateEntityMap.has(connection[1])
    ));

    if (hasThreeAllianceTemplate) {
        setBattlefieldConnectionLines(
            THREE_ALLIANCE_BATTLEFIELD_KEY,
            templateEntityMap,
            THREE_ALLIANCE_BATTLEFIELD_TEMPLATE.connections
        );
        return;
    }

    const generatedGroups = ['self', 'earth', 'storm', 'wave']
        .map(groupId => entities.filter(entity => entity?.threeAllianceGroup === groupId));
    const hasGeneratedThreeAlliance = generatedGroups.some(group => group.length);
    const centerEntity = getThreeAllianceCenterEntity?.() || null;

    if (hasGeneratedThreeAlliance && centerEntity) {
        buildGeneratedThreeAllianceConnections(generatedGroups, centerEntity);
        return;
    }

    clearBattlefieldConnectionLines(THREE_ALLIANCE_BATTLEFIELD_KEY);
}

function getRuntimePublicAssetPath(relativePath) {
    const basePath = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || `${window.location.origin}/`;
    return `${basePath.replace(/\/?$/, '/')}${relativePath.replace(/^\/+/, '')}`;
}

function getEntityImage(key) {
    const imageDef = ENTITY_IMAGE_DEFS[key];
    if (!imageDef) return null;

    const cached = entityImageCache.get(key);
    if (cached) return cached;

    const image = new Image();
    const imageState = { image, loaded: false, failed: false };
    entityImageCache.set(key, imageState);

    image.onload = () => {
        imageState.loaded = true;
        requestRedraw();
    };
    image.onerror = () => {
        imageState.failed = true;
    };
    image.src = getRuntimePublicAssetPath(imageDef.src);

    return imageState;
}

function getEntityImageDef(entity) {
    return entity?.imageKey ? ENTITY_IMAGE_DEFS[entity.imageKey] || null : null;
}

function isEntitySpriteImage(entity) {
    return getEntityImageDef(entity)?.mode === 'sprite';
}

function applySwordBattlefieldEntityImages(entity) {
    if (!entity || entity.battlefield !== SWORD_BATTLEFIELD_KEY) return;
    if (entity.imageKey) return;

    const normalizedName = String(entity.name || '').trim();
    const imageKey = SWORD_BATTLEFIELD_ENTITY_IMAGE_BY_NAME[normalizedName];
    if (imageKey) {
        entity.imageKey = imageKey;
    }
}

function getThreeAllianceEntityImageKey(entity) {
    if (!entity) return '';
    const normalizedName = String(entity.name || '').trim();
    if (normalizedName.includes('潮汐神殿')) return 'threeTideTemple';
    if (normalizedName.includes('中转枢纽')) return 'threeTransferHub';
    if (normalizedName.includes('遗迹群')) return 'threeRuinGroup';
    if (normalizedName.includes('遗迹')) return 'threeRuin';
    if (normalizedName.includes('海之柱')) return 'threeSeaPillar';
    if (normalizedName.includes('戍卫兵营') || normalizedName.includes('成卫兵营')) return 'threeCamp';
    if (normalizedName.includes('大地禁军') || normalizedName.includes('风暴禁军') || normalizedName.includes('怒浪禁军')) {
        return 'threeFactionBase';
    }
    return '';
}

function getThreeAllianceBuildingTemplateForEntity(entity) {
    const imageKey = entity?.imageKey || getThreeAllianceEntityImageKey(entity);
    if (imageKey === 'threeRuin') return THREE_ALLIANCE_QUICK_BUILDINGS.threeRuin;
    if (imageKey === 'threeRuinGroup') return THREE_ALLIANCE_QUICK_BUILDINGS.threeRuinGroup;
    if (imageKey === 'threeSeaPillar') return THREE_ALLIANCE_QUICK_BUILDINGS.threeSeaPillar;
    if (imageKey === 'threeCamp') return THREE_ALLIANCE_QUICK_BUILDINGS.threeCamp;
    if (imageKey === 'threeTideTemple') return THREE_ALLIANCE_QUICK_BUILDINGS.threeTideTemple;
    if (imageKey === 'threeTransferHub') return THREE_ALLIANCE_QUICK_BUILDINGS.threeTransferHub;
    if (imageKey === 'threeFactionBase') {
        return {
            width: 2,
            height: 2,
            type: 'hq',
            color: '#5e6d78',
            imageKey: 'threeFactionBase'
        };
    }
    return null;
}

function applyThreeAllianceEntityImages(entity) {
    if (!entity || entity.battlefield !== THREE_ALLIANCE_BATTLEFIELD_KEY) return;
    if (entity.imageKey) return;
    const imageKey = getThreeAllianceEntityImageKey(entity);
    if (imageKey) {
        entity.imageKey = imageKey;
    }
}

function normalizeBattlefieldEntityAssets() {
    entities.forEach(entity => {
        applySwordBattlefieldEntityImages(entity);
        applyThreeAllianceEntityImages(entity);
    });
}

function markSwordBattlefieldEntities() {
    entities.forEach(entity => {
        if (['node', 'building', 'hq', 'enemyzone'].includes(entity.type)) {
            entity.battlefield = SWORD_BATTLEFIELD_KEY;
            applySwordBattlefieldEntityImages(entity);
        } else if (entity.type === 'obstacle') {
            entity.battlefield = SWORD_BATTLEFIELD_KEY;
            entity.imageKey = entity.imageKey || 'cellar';
        }
    });
}

function setSwordBattlefieldMode(active) {
    const enabled = Boolean(active);
    document.getElementById('rightSidebar')?.classList.toggle('sword-mode', enabled);
    document.body.classList.toggle('sword-mode', enabled);
    if (enabled) {
        loadSwordPlacementsForLegion(activeSwordLegion);
        updateSwordLegionButtons();
        renderSwordTaskPanel();
        renderFilteredPowerRankings();
        redraw();
    }
}

function placeSwordBattlefieldFallback() {
    setSwordBattlefieldMode(true);
    removeSwordBattlefieldEntities();

    const mid = anchorGridCell();
    const allianceId = normalizeAllianceId(activeAllianceId);
    const createdEntities = SWORD_BATTLEFIELD_TEMPLATE.map(item => ({
        x: mid.x + item.dx,
        y: mid.y + item.dy,
        width: item.width,
        height: item.height,
        type: item.type || 'node',
        color: item.color,
        ...(item.name ? { name: item.name } : {}),
        ...(item.imageKey ? { imageKey: item.imageKey } : {}),
        ...(isAllianceScopedType(item.type || 'node') ? { allianceId } : {}),
        battlefield: SWORD_BATTLEFIELD_KEY
    }));

    createdEntities.forEach(entity => entities.push(entity));
    bearTraps = entities.filter(entity => entity.type === 'building');
    setSelection(createdEntities, { primaryEntity: createdEntities[0], pulse: true });
    redraw();
    updateCounters();
    updateCityList();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast('已生成：神剑战场');
}

function placeSwordBattlefield() {
    const mapDataInput = document.getElementById('mapData');
    const mobileMapDataInput = document.getElementById('mobileMapData');

    try {
        if (mapDataInput) mapDataInput.value = SWORD_BATTLEFIELD_INITIAL_CODE;
        if (mobileMapDataInput) mobileMapDataInput.value = SWORD_BATTLEFIELD_INITIAL_CODE;
        loadMap();
        markSwordBattlefieldEntities();
        setSwordBattlefieldMode(true);
        if (mapDataInput) mapDataInput.value = SWORD_BATTLEFIELD_INITIAL_CODE;
        if (mobileMapDataInput) mobileMapDataInput.value = SWORD_BATTLEFIELD_INITIAL_CODE;
        setSelection([], { pulse: false });
        redraw();
        updateCounters();
        updateCityList();
        renderFilteredPowerRankings();
        markChangesSaved();
        pushHistory();
        showShortcutToast('已加载：神剑战场初始化模板');
    } catch (error) {
        console.warn('Failed to load sword battlefield initial code, using fallback template.', error);
        placeSwordBattlefieldFallback();
    }
}

function placeThreeAllianceBattlefield() {
    setSwordBattlefieldMode(false);
    removeSwordBattlefieldEntities();
    removeBattlefieldEntities(THREE_ALLIANCE_BATTLEFIELD_KEY);
    removeEditableMapEntities();

    const mid = anchorGridCell();
    const entityByTemplateId = new Map();
    const createdEntities = THREE_ALLIANCE_BATTLEFIELD_TEMPLATE.nodes.map(item => {
        const allianceId = getThreeAllianceTemplateAllianceId(item.id);
        const entity = {
            x: mid.x + item.dx,
            y: mid.y + item.dy,
            width: item.width,
            height: item.height,
            type: item.type || 'node',
            color: item.color,
            name: item.name,
            battlefield: THREE_ALLIANCE_BATTLEFIELD_KEY,
            templateId: item.id,
            threeAllianceGroup: getThreeAllianceTemplateGroup(item.id),
            ...(item.imageKey ? { imageKey: item.imageKey } : {}),
            ...(isAllianceScopedType(item.type || 'node') ? { allianceId } : {})
        };
        entityByTemplateId.set(item.id, entity);
        return entity;
    });

    createdEntities.forEach(entity => entities.push(entity));
    setBattlefieldConnectionLines(
        THREE_ALLIANCE_BATTLEFIELD_KEY,
        entityByTemplateId,
        THREE_ALLIANCE_BATTLEFIELD_TEMPLATE.connections
    );
    bearTraps = entities.filter(entity => entity.type === 'building');
    setSelection(createdEntities, { primaryEntity: createdEntities[0], pulse: true });
    redraw();
    updateCounters();
    updateCityList();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast('已生成：三盟争霸');
}

function getViewportCenterGridPosition() {
    const rect = canvas.getBoundingClientRect();
    return screenToDiamond(rect.width / 2, rect.height / 2);
}

function findNearbyValidPosition(startX, startY, entityTemplate, maxRadius = 18) {
    const baseX = Math.round(startX - (entityTemplate.width || 1) / 2);
    const baseY = Math.round(startY - (entityTemplate.height || 1) / 2);
    if (isPositionValid(baseX, baseY, { ...entityTemplate, x: baseX, y: baseY })) {
        return { x: baseX, y: baseY };
    }

    for (let radius = 1; radius <= maxRadius; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const candidates = [
                { x: baseX + dx, y: baseY - radius },
                { x: baseX + dx, y: baseY + radius }
            ];
            for (const candidate of candidates) {
                if (isPositionValid(candidate.x, candidate.y, { ...entityTemplate, ...candidate })) {
                    return candidate;
                }
            }
        }

        for (let dy = -radius + 1; dy <= radius - 1; dy++) {
            const candidates = [
                { x: baseX - radius, y: baseY + dy },
                { x: baseX + radius, y: baseY + dy }
            ];
            for (const candidate of candidates) {
                if (isPositionValid(candidate.x, candidate.y, { ...entityTemplate, ...candidate })) {
                    return candidate;
                }
            }
        }
    }

    return null;
}

function addThreeAllianceQuickBuilding(buildingKey) {
    const template = THREE_ALLIANCE_QUICK_BUILDINGS[buildingKey];
    if (!template) return;
    const center = getViewportCenterGridPosition();
    const entityTemplate = {
        width: template.width,
        height: template.height,
        type: template.type,
        color: template.color,
        name: template.name,
        imageKey: template.imageKey,
        battlefield: THREE_ALLIANCE_BATTLEFIELD_KEY,
        threeAllianceCustom: true,
        allianceId: normalizeAllianceId(activeAllianceId)
    };
    const position = findNearbyValidPosition(center.x, center.y, entityTemplate);
    if (!position) {
        showShortcutToast('当前视野附近没有空位');
        return;
    }

    const entity = {
        ...entityTemplate,
        x: position.x,
        y: position.y
    };
    entities.push(entity);
    bearTraps = entities.filter(item => item.type === 'building');
    setSwordBattlefieldMode(false);
    setSelection([entity], { primaryEntity: entity, pulse: true });
    redraw();
    updateCounters();
    updateCityList();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast(`已新增：${template.name}`);
}

function isThreeAllianceAdjustableEntity(entity) {
    if (!entity || entity.type === 'castle' || entity.type === 'turret' || entity.type === 'city') return false;
    if (entity.battlefield === THREE_ALLIANCE_BATTLEFIELD_KEY) return true;
    return Boolean(getThreeAllianceEntityImageKey(entity) || entity.imageKey?.startsWith?.('three'));
}

function optimizeThreeAllianceBuildings() {
    const targetEntities = entities.filter(isThreeAllianceAdjustableEntity);
    if (!targetEntities.length) {
        showShortcutToast('当前地图没有三盟建筑');
        return;
    }

    let changed = false;
    targetEntities.forEach(entity => {
        const template = getThreeAllianceBuildingTemplateForEntity(entity);
        if (!template) return;

        const centerX = entity.x + (entity.width || 1) / 2;
        const centerY = entity.y + (entity.height || 1) / 2;
        const nextWidth = template.width || entity.width || 1;
        const nextHeight = template.height || entity.height || 1;
        const nextX = Math.round(centerX - nextWidth / 2);
        const nextY = Math.round(centerY - nextHeight / 2);

        if (entity.x !== nextX) { entity.x = nextX; changed = true; }
        if (entity.y !== nextY) { entity.y = nextY; changed = true; }
        if (entity.width !== nextWidth) { entity.width = nextWidth; changed = true; }
        if (entity.height !== nextHeight) { entity.height = nextHeight; changed = true; }
        if (template.name && String(entity.name || '').trim() !== template.name) {
            if (String(entity.name || '').trim() === '成卫兵营' || !String(entity.name || '').trim()) {
                entity.name = template.name;
                changed = true;
            }
        }
        if (template.type && entity.type !== template.type) { entity.type = template.type; changed = true; }
        if (template.color && entity.color !== template.color) { entity.color = template.color; changed = true; }
        if (template.imageKey && entity.imageKey !== template.imageKey) { entity.imageKey = template.imageKey; changed = true; }
        if (entity.battlefield !== THREE_ALLIANCE_BATTLEFIELD_KEY) {
            entity.battlefield = THREE_ALLIANCE_BATTLEFIELD_KEY;
            changed = true;
        }
    });

    if (!changed) {
        showShortcutToast('三盟建筑已经是标准尺寸');
        return;
    }

    normalizeBattlefieldEntityAssets();
    bearTraps = entities.filter(item => item.type === 'building');
    setSelection(targetEntities, { primaryEntity: targetEntities[0], pulse: true });
    redraw();
    updateCounters();
    updateCityList();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast('已对齐三盟建筑尺寸');
}

function removeEditableMapEntities() {
    for (let i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];
        if (!entity || entity.locked || entity.type === 'castle' || entity.type === 'turret') continue;
        entities.splice(i, 1);
    }
    bearTraps.length = 0;
    enemyZones.length = 0;
    clearBattlefieldConnectionLines(THREE_ALLIANCE_BATTLEFIELD_KEY);
    clearSelection();
}

function getThreeAllianceTemplateGroup(templateId) {
    const id = String(templateId || '');
    if (id === 'center' || id.startsWith('ct')) return 'center';
    if (id === 'leftBase' || id.startsWith('l')) return 'earth';
    if (id === 'rightBase' || id.startsWith('r')) return 'storm';
    if (id === 'bottomBase' || id.startsWith('b')) return 'wave';
    return 'self';
}

function getThreeAllianceTemplateAllianceId(templateId) {
    const group = getThreeAllianceTemplateGroup(templateId);
    if (group === 'earth') return 'farm';
    if (group === 'storm') return 'red';
    if (group === 'wave') return 'blue';
    return 'main';
}

function getEntityBounds(entity) {
    return {
        minX: entity.x,
        minY: entity.y,
        maxX: entity.x + (entity.width || 1),
        maxY: entity.y + (entity.height || 1)
    };
}

function getEntitiesBounds(targetEntities) {
    const bounds = targetEntities.map(getEntityBounds);
    return {
        minX: Math.min(...bounds.map(item => item.minX)),
        minY: Math.min(...bounds.map(item => item.minY)),
        maxX: Math.max(...bounds.map(item => item.maxX)),
        maxY: Math.max(...bounds.map(item => item.maxY))
    };
}

function isThreeAllianceCopySourceEntity(entity) {
    if (!entity || entity.locked) return false;
    if (entity.type === 'castle' || entity.type === 'turret') return false;
    return ['flag', 'city', 'building', 'hq', 'node', 'obstacle', 'enemyzone'].includes(entity.type);
}

function isTideTempleEntity(entity) {
    return String(entity?.name || '').trim().includes('潮汐神殿');
}

function getThreeAllianceCenterEntity() {
    return entities.find(isTideTempleEntity) || null;
}

function rotatePointAroundCenter(x, y, centerX, centerY, angleRad, scale) {
    const dx = (x - centerX) * scale;
    const dy = (y - centerY) * scale;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos
    };
}

function cloneEntityForThreeAlliance(entity, group, centerPoint, scale) {
    const rawWidth = Math.max(1, entity.width || 1);
    const rawHeight = Math.max(1, entity.height || 1);
    const width = Math.max(1, Math.round(rawWidth * scale));
    const height = Math.max(1, Math.round(rawHeight * scale));
    const sourceCenterX = entity.x + rawWidth / 2;
    const sourceCenterY = entity.y + rawHeight / 2;
    const rotated = rotatePointAroundCenter(
        sourceCenterX,
        sourceCenterY,
        centerPoint.x,
        centerPoint.y,
        group.angle,
        scale
    );
    const next = {
        ...entity,
        x: Math.round(rotated.x - width / 2),
        y: Math.round(rotated.y - height / 2),
        width,
        height,
        allianceId: group.allianceId,
        threeAllianceGroup: group.id
    };

    if (next.type === 'city') {
        next.id = cityCounterId++;
        next.name = next.name || `城市 ${next.id}`;
    }

    delete next.locked;
    delete next.isEditing;
    return next;
}

function buildGeneratedThreeAllianceConnections(groupedEntities, centerEntity) {
    clearBattlefieldConnectionLines(THREE_ALLIANCE_BATTLEFIELD_KEY);
    if (!centerEntity) return;

    groupedEntities.forEach(groupEntities => {
        if (!groupEntities.length) return;
        const sorted = [...groupEntities].sort((a, b) => {
            const da = Math.hypot(a.x - centerEntity.x, a.y - centerEntity.y);
            const db = Math.hypot(b.x - centerEntity.x, b.y - centerEntity.y);
            return da - db;
        });

        sorted.slice(0, 3).forEach(entity => {
            battlefieldConnectionLines.push({
                battlefield: THREE_ALLIANCE_BATTLEFIELD_KEY,
                from: centerEntity,
                to: entity,
                style: 'dashed'
            });
        });

        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            const candidates = sorted
                .filter((entity, index) => index > i)
                .map(entity => ({
                    entity,
                    distance: Math.hypot(entity.x - current.x, entity.y - current.y)
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 2);

            candidates.forEach(candidate => {
                if (candidate.distance > 13) return;
                battlefieldConnectionLines.push({
                    battlefield: THREE_ALLIANCE_BATTLEFIELD_KEY,
                    from: current,
                    to: candidate.entity,
                    style: 'solid'
                });
            });
        }
    });
}

function shiftEntitiesIntoGrid(targetEntities) {
    if (!targetEntities.length) return;
    const bounds = getEntitiesBounds(targetEntities);
    let shiftX = 0;
    let shiftY = 0;

    if (bounds.minX < -gridCols) shiftX = -gridCols - bounds.minX;
    if (bounds.maxX > gridCols + 1) shiftX = (gridCols + 1) - bounds.maxX;
    if (bounds.minY < -gridRows) shiftY = -gridRows - bounds.minY;
    if (bounds.maxY > gridRows + 1) shiftY = (gridRows + 1) - bounds.maxY;

    if (shiftX || shiftY) {
        targetEntities.forEach(entity => {
            entity.x += shiftX;
            entity.y += shiftY;
        });
    }
}

function copyCurrentLayoutToThreeAlliances() {
    const centerEntity = getThreeAllianceCenterEntity();
    if (!centerEntity) {
        showShortcutToast('请先标记中心：潮汐神殿');
        return;
    }

    const selectedSource = getSelectedEntities().filter(isThreeAllianceCopySourceEntity);
    const sourceEntities = selectedSource.length
        ? selectedSource
        : entities.filter(entity => isThreeAllianceCopySourceEntity(entity) && !entity.threeAllianceGroup);
    const templateEntities = sourceEntities.filter(entity => entity !== centerEntity && !isTideTempleEntity(entity));

    if (!templateEntities.length) {
        showShortcutToast('没有可复制的点位');
        return;
    }

    const sourceBounds = getEntitiesBounds(templateEntities);
    const sourceWidth = Math.max(1, sourceBounds.maxX - sourceBounds.minX);
    const sourceHeight = Math.max(1, sourceBounds.maxY - sourceBounds.minY);
    const centerPoint = {
        x: centerEntity.x + (centerEntity.width || 1) / 2,
        y: centerEntity.y + (centerEntity.height || 1) / 2
    };
    const baseScale = Math.min(0.72, 26 / sourceWidth, 23 / sourceHeight);
    const groups = [
        { id: 'self', angle: 0, allianceId: 'main' },
        { id: 'earth', angle: (Math.PI * 2) / 3, allianceId: 'farm' },
        { id: 'storm', angle: -(Math.PI * 2) / 3, allianceId: 'red' }
    ];

    const sourceSet = new Set(templateEntities);
    for (let i = entities.length - 1; i >= 0; i--) {
        if (sourceSet.has(entities[i]) || entities[i]?.threeAllianceGroup) {
            entities.splice(i, 1);
        }
    }

    const createdEntities = [];
    const groupedEntities = [];
    groups.forEach(group => {
        const groupEntities = templateEntities.map(entity => cloneEntityForThreeAlliance(entity, group, centerPoint, baseScale));
        shiftEntitiesIntoGrid(groupEntities);
        groupEntities.forEach(entity => createdEntities.push(entity));
        groupedEntities.push(groupEntities);
    });

    createdEntities.forEach(entity => entities.push(entity));
    bearTraps = entities.filter(entity => entity.type === 'building');
    enemyZones = entities.filter(entity => entity.type === 'enemyzone');
    buildGeneratedThreeAllianceConnections(groupedEntities, centerEntity);
    setSwordBattlefieldMode(false);
    setSelection(createdEntities, { primaryEntity: createdEntities[0], pulse: true });
    redraw();
    updateCounters();
    updateCityList();
    renderFilteredPowerRankings();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast(`已围绕潮汐神殿生成三盟，缩放 ${Math.round(baseScale * 100)}%`);
}


function isTextInputTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
}

function setEraserCursorVisible(isVisible) {
    if (!eraserCursor) return;
    eraserCursor.classList.toggle('visible', Boolean(isVisible));
}

function rememberPointerPosition(clientX, clientY) {
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
    lastPointerClientX = clientX;
    lastPointerClientY = clientY;
}

function updateEraserCursorPosition(clientX, clientY) {
    if (!eraserCursor || typeof clientX !== 'number' || typeof clientY !== 'number') return;
    eraserCursor.style.left = `${clientX}px`;
    eraserCursor.style.top = `${clientY}px`;
}

function isPlacementTool(toolType = selectedType) {
    return Boolean(toolType && toolType !== 'select' && toolType !== 'move' && toolType !== 'delete');
}

function refreshGhostPreviewForCurrentPointer(toolType = selectedType) {
    if (!isPlacementTool(toolType)) return;
    if (!canvas.matches(':hover')) return;
    if (lastPointerClientX === null || lastPointerClientY === null) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = lastPointerClientX - rect.left;
    const mouseY = lastPointerClientY - rect.top;
    updateGhostPreview(mouseX, mouseY);
}

function refreshEraserCursorForCurrentPointer(toolType = selectedType) {
    if (toolType !== 'delete') {
        setEraserCursorVisible(false);
        return;
    }

    if (!canvas.matches(':hover')) {
        setEraserCursorVisible(false);
        return;
    }

    if (lastPointerClientX === null || lastPointerClientY === null) {
        const rect = canvas.getBoundingClientRect();
        updateEraserCursorPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
        updateEraserCursorPosition(lastPointerClientX, lastPointerClientY);
    }
    setEraserCursorVisible(true);
}

function flushPendingEraseHistory() {
    if (!hasPendingEraseHistory) return;
    pushHistory();
    hasPendingEraseHistory = false;
}

function flushPendingKeyboardMoveHistory() {
    if (keyboardMoveHistoryTimerId === null) return;
    clearTimeout(keyboardMoveHistoryTimerId);
    keyboardMoveHistoryTimerId = null;
    pushHistory();
}

function scheduleKeyboardMoveHistoryPush() {
    if (keyboardMoveHistoryTimerId !== null) {
        clearTimeout(keyboardMoveHistoryTimerId);
    }
    keyboardMoveHistoryTimerId = window.setTimeout(() => {
        keyboardMoveHistoryTimerId = null;
        pushHistory();
    }, KEYBOARD_MOVE_HISTORY_DEBOUNCE_MS);
}

function updateCanvasCursorForTool(toolType = selectedType) {
    canvas.classList.toggle('eraser-cursor-active', toolType === 'delete');

    if (toolType === 'move') {
        canvas.style.cursor = 'move';
    } else if (toolType === 'delete') {
        canvas.style.cursor = 'none';
    } else if (toolType === 'select') {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'crosshair';
    }

    refreshEraserCursorForCurrentPointer(toolType);
}

function showShortcutToast(message, timeoutMs = 950) {
    const toast = document.getElementById('shortcutToast');
    if (!toast || !message) return;

    toast.textContent = message;
    toast.classList.add('visible');

    if (shortcutToastTimerId !== null) {
        clearTimeout(shortcutToastTimerId);
    }
    shortcutToastTimerId = setTimeout(() => {
        toast.classList.remove('visible');
        shortcutToastTimerId = null;
    }, timeoutMs);
}

function normalizeAllianceId(allianceId) {
    return ALLIANCES.some(a => a.id === allianceId) ? allianceId : DEFAULT_ALLIANCE_ID;
}

function getAllianceMeta(allianceId) {
    const normalized = normalizeAllianceId(allianceId);
    return ALLIANCES.find(a => a.id === normalized) || ALLIANCES[0];
}

function getAllianceName(allianceId) {
    return getAllianceMeta(allianceId).name;
}

function getAllianceShort(allianceId) {
    return getAllianceMeta(allianceId).short;
}

function hexToRgba(hexColor, alpha = 1) {
    const hex = String(hexColor || '').trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        return `rgba(111, 127, 79, ${alpha})`;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getAllianceColor(allianceId, alpha = 1) {
    return hexToRgba(getAllianceMeta(allianceId).color, alpha);
}

function getAllianceAreaFill(allianceId, isActive = false) {
    const meta = getAllianceMeta(allianceId);
    return isActive ? meta.areaColor : getAllianceColor(allianceId, INACTIVE_ALLIANCE_AREA_ALPHA);
}

function isAllianceScopedType(type) {
    return type === 'flag' || type === 'city' || type === 'building' || type === 'hq' || type === 'node';
}

function getEntityAllianceId(entity) {
    if (!entity || !isAllianceScopedType(entity.type)) {
        return DEFAULT_ALLIANCE_ID;
    }
    const normalized = normalizeAllianceId(entity.allianceId);
    if (entity.allianceId !== normalized) {
        entity.allianceId = normalized;
    }
    return normalized;
}

function isInInactiveAllianceView(entity) {
    if (!entity || !isAllianceScopedType(entity.type)) return false;
    return getEntityAllianceId(entity) !== normalizeAllianceId(activeAllianceId);
}

function getAllianceTrapCount(allianceId = activeAllianceId) {
    const normalized = normalizeAllianceId(allianceId);
    return bearTraps.filter(trap => getEntityAllianceId(trap) === normalized).length;
}

function getAllianceTrapIndex(trap) {
    if (!trap) return 0;
    const trapAlliance = getEntityAllianceId(trap);
    const trapsInAlliance = bearTraps.filter(t => getEntityAllianceId(t) === trapAlliance);
    return trapsInAlliance.indexOf(trap) + 1;
}

function setActiveAlliance(allianceId) {
    activeAllianceId = normalizeAllianceId(allianceId);
    const activeAlliance = getAllianceMeta(activeAllianceId);

    document.querySelectorAll('[data-alliance]').forEach(button => {
        const isActive = button.dataset.alliance === activeAllianceId;
        const meta = getAllianceMeta(button.dataset.alliance);
        button.style.setProperty('--alliance-color', meta.color || activeAlliance.color || '#6f7f4f');
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    const hintText = `${getAllianceName(activeAllianceId)}捕兽夹：${getAllianceTrapCount(activeAllianceId)}/2`;
    const hintDesktop = document.getElementById('activeAllianceTrapHint');
    const hintMobile = document.getElementById('mobileActiveAllianceTrapHint');
    if (hintDesktop) hintDesktop.textContent = hintText;
    if (hintMobile) hintMobile.textContent = hintText;

    const currentSort = document.getElementById('citySort')?.value || 'id';
    enablePopulateSortOptions(currentSort);
    updateCounters();
    redraw();
    updateCityList();
}


// ==== WAVE COLORS ====
const wavePalette = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#f59e0b', // amber-500
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#84cc16', // lime-500
  '#2dd4bf'  // teal-400
];

// ===== CANVAS MANAGEMENT =====
// Initialize canvas size
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    if (typeof window.__didInitialCenter === 'undefined') {
        panX = canvasWidth / 2;
        panY = canvasHeight / 2;
        window.__didInitialCenter = true;
    }
    
    redraw();
    updateZoomDisplay();
}

// ===== COORDINATE CONVERSION =====
// Convert screen coordinates to diamond grid coordinates
function screenToDiamond(screenX, screenY) {
    const currentGridSize = baseGridSize * zoom;
    const offsetX = screenX - panX;
    const offsetY = screenY - panY;

    // Convert to diamond grid system
    const diamondX = (offsetX + offsetY) / currentGridSize;
    const diamondY = (offsetY - offsetX) / currentGridSize;
    
    return {
        x: Math.floor(diamondX),
        y: Math.floor(diamondY)
    };
}

// Convert diamond grid coordinates to screen coordinates (center of diamond cell)
function diamondToScreen(gridX, gridY, pX, pY, z) {
    const currentGridSize = baseGridSize * z;
    // Add 0.5 to center the objects within the diamond cells
    const centerX = gridX + 0.5;
    const centerY = gridY + 0.5;
    
    const offsetX = (centerX - centerY) * currentGridSize * 0.5;
    const offsetY = (centerX + centerY) * currentGridSize * 0.5;
    
    return {
        x: offsetX + pX,
        y: offsetY + pY
    };
}

// Convert diamond grid coordinates to screen coordinates (corner of diamond cell)
function diamondToScreenCorner(gridX, gridY, pX, pY, z) {
    const currentGridSize = baseGridSize * z;
    const offsetX = (gridX - gridY) * currentGridSize * 0.5;
    const offsetY = (gridX + gridY) * currentGridSize * 0.5;
    
    return {
        x: offsetX + pX,
        y: offsetY + pY
    };
}

// ===== UI UPDATES =====
function updateCounters() {
    const allianceId = normalizeAllianceId(activeAllianceId);
    const flags = entities.filter(entity => entity.type === 'flag' && getEntityAllianceId(entity) === allianceId).length;
    const cities = entities.filter(entity => entity.type === 'city' && getEntityAllianceId(entity) === allianceId).length;
    const buildings = entities.filter(entity => entity.type === 'building' && getEntityAllianceId(entity) === allianceId).length;
    const hqs = entities.filter(entity => entity.type === 'hq' && getEntityAllianceId(entity) === allianceId).length;
    const nodes = entities.filter(entity => entity.type === 'node' && getEntityAllianceId(entity) === allianceId).length;
    const trapText = `${buildings}/2`;

    // Update desktop counters
    flagCounter.textContent = flags;
    cityCounter.textContent = cities;
    buildingCounter.textContent = trapText;
    hqCounter.textContent = hqs;
    nodeCounter.textContent = nodes;

    // Update mobile counters
    document.getElementById('mobileFlagCounter').textContent = flags;
    document.getElementById('mobileCityCounter').textContent = cities;
    document.getElementById('mobileBuildingCounter').textContent = trapText;
    document.getElementById('mobileHqCounter').textContent = hqs;
    document.getElementById('mobileNodeCounter').textContent = nodes;

    const hintText = `${getAllianceName(allianceId)}捕兽夹：${buildings}/2`;
    const hintDesktop = document.getElementById('activeAllianceTrapHint');
    const hintMobile = document.getElementById('mobileActiveAllianceTrapHint');
    if (hintDesktop) hintDesktop.textContent = hintText;
    if (hintMobile) hintMobile.textContent = hintText;
}

// ===== GRID RENDERING =====
function drawDiamondGrid(context, pX, pY, z) {
    const w = context.canvas.width;
    const h = context.canvas.height;
    context.clearRect(0, 0, w, h);
    
    // Create gradient background
    const gradient = context.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#f4e7c8');
    gradient.addColorStop(0.48, '#8fa56a');
    gradient.addColorStop(1, '#43503a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    
    context.save();
    context.strokeStyle = 'rgba(255, 251, 235, 0.34)';
    context.lineWidth = 1;
    
    // Draw diamond grid lines
    for (let x = -gridCols; x <= gridCols; x++) {
        for (let y = -gridRows; y <= gridRows; y++) {
            const screen = diamondToScreenCorner(x, y, pX, pY, z);
            const screen2 = diamondToScreenCorner(x + 1, y, pX, pY, z);
            const screen3 = diamondToScreenCorner(x, y + 1, pX, pY, z);
            
            if (screen.x > -100 && screen.x < w + 100 && 
                screen.y > -100 && screen.y < h + 100) {
                
                // Draw grid cell as diamond
                context.beginPath();
                context.moveTo(screen.x, screen.y);
                context.lineTo(screen2.x, screen2.y);
                context.lineTo(diamondToScreenCorner(x + 1, y + 1, pX, pY, z).x, diamondToScreenCorner(x + 1, y + 1, pX, pY, z).y);
                context.lineTo(screen3.x, screen3.y);
                context.closePath();
                context.stroke();
            }
        }
    }
    
    // Draw center marker
    context.fillStyle = 'rgba(255, 100, 100, 0.8)';
    context.beginPath();
    context.arc(pX, pY, 8 * z, 0, 2 * Math.PI);
    context.fill();
    // If castle mode is enabled, draw the redzone ring and reserved central area
    drawRedZoneArea(context, pX, pY, z);
    drawCastleReservedArea(context, pX, pY, z);
    context.restore();
}

// Draw the redzone ring around the reserved castle area
function drawRedZoneArea(context, pX, pY, z) {
    if (mapMode !== 'castle') return;
    const mid = anchorGridCell();
    context.save();
    context.fillStyle = 'rgba(255, 80, 80, 0.12)';
    context.strokeStyle = 'rgba(255,80,80,0.25)';
    context.lineWidth = Math.max(1, 1 * z);

    const halfReserved = Math.floor(castleReservedSize / 2);
    const outerHalf = halfReserved + castleRedzoneThickness;

    // draw all cells from mid-outerHalf..mid+outerHalf-1, but skip the inner reserved area
    for (let x = mid.x - outerHalf; x <= mid.x + outerHalf - 1; x++) {
        for (let y = mid.y - outerHalf; y <= mid.y + outerHalf - 1; y++) {
            const inInner = (x >= mid.x - halfReserved && x <= mid.x + halfReserved - 1 && y >= mid.y - halfReserved && y <= mid.y + halfReserved - 1);
            if (inInner) continue; // skip reserved area

            const corner = diamondToScreenCorner(x, y, pX, pY, z);
            const p2 = diamondToScreenCorner(x + 1, y, pX, pY, z);
            const p3 = diamondToScreenCorner(x + 1, y + 1, pX, pY, z);
            const p4 = diamondToScreenCorner(x, y + 1, pX, pY, z);
            context.beginPath();
            context.moveTo(corner.x, corner.y);
            context.lineTo(p2.x, p2.y);
            context.lineTo(p3.x, p3.y);
            context.lineTo(p4.x, p4.y);
            context.closePath();
            context.fill();
        }
    }

    context.restore();
}

function buildProtectedAreaSnapshot(sourceEntities = entities, excludedEntity = null) {
    const protectedAreasByAlliance = {};
    ALLIANCES.forEach(alliance => {
        protectedAreasByAlliance[alliance.id] = new Set();
    });

    // Cell ownership by first placed protected source (flag/HQ).
    const claimedCells = new Map();

    sourceEntities.forEach(entity => {
        if (!entity) return;
        if (excludedEntity && entity === excludedEntity) return;
        if (entity.type !== 'flag' && entity.type !== 'hq') return;

        const allianceId = getEntityAllianceId(entity);
        const area = new Set();
        markFlagArea(entity, area, entity.type === 'flag' ? 3 : 6);

        area.forEach(coord => {
            const owner = claimedCells.get(coord);
            if (owner && owner !== allianceId) {
                return;
            }
            if (!owner) {
                claimedCells.set(coord, allianceId);
            }
            protectedAreasByAlliance[allianceId].add(coord);
        });
    });

    return { protectedAreasByAlliance, claimedCells };
}

function getTerritoryPreviewAreaForEntity(entity) {
    if (!entity || (entity.type !== 'flag' && entity.type !== 'hq')) return null;

    const rawArea = new Set();
    markFlagArea(entity, rawArea, entity.type === 'flag' ? 3 : 6);

    const ownAllianceId = getEntityAllianceId(entity);
    const { claimedCells } = buildProtectedAreaSnapshot();
    const effectiveArea = new Set();

    rawArea.forEach(coord => {
        const owner = claimedCells.get(coord);
        if (owner && owner !== ownAllianceId) {
            return;
        }
        effectiveArea.add(coord);
    });

    return effectiveArea;
}

// ===== ENTITY RENDERING =====
function getEntityConnectionScreen(entity, pX, pY, z) {
    if (isEntitySpriteImage(entity)) {
        const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
        const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        const width = maxX - minX;

        return {
            x: (minX + maxX) / 2,
            y: maxY + width * 0.04
        };
    }

    return diamondToScreen(
        entity.x + (entity.width || 1) / 2,
        entity.y + (entity.height || 1) / 2,
        pX,
        pY,
        z
    );
}

function drawBattlefieldConnectionLines(context, pX, pY, z) {
    if (!battlefieldConnectionLines.length) return;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    battlefieldConnectionLines.forEach(line => {
        if (!line?.from || !line?.to || !entities.includes(line.from) || !entities.includes(line.to)) return;
        const start = getEntityConnectionScreen(line.from, pX, pY, z);
        const end = getEntityConnectionScreen(line.to, pX, pY, z);
        const lineColor = getBattlefieldLineColor(line.color);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.strokeStyle = line.style === 'dashed' ? lineColor.dashedStroke : lineColor.stroke;
        context.shadowColor = lineColor.glow;
        context.shadowBlur = Math.max(0, 5 * z);
        context.lineWidth = Math.max(1.25, 2.6 * z);
        context.setLineDash(line.style === 'dashed' ? [Math.max(4, 8 * z), Math.max(3, 7 * z)] : []);
        context.stroke();
    });
    context.restore();
}

function drawMarkedEntityHalos(context, pX, pY, z) {
    const markedEntities = entities.filter(entity => entity?.mainMark);
    if (!markedEntities.length) return;

    const now = performance.now();
    markedEntities.forEach(entity => {
        const center = getEntityConnectionScreen(entity, pX, pY, z);
        const baseRadius = baseGridSize * z * Math.max(entity.width || 1, entity.height || 1, isEntitySpriteImage(entity) ? 2.8 : 1);
        const pulse = (Math.sin(now / 360) + 1) / 2;
        const ringRadius = baseRadius * (0.8 + pulse * 0.28);

        context.save();
        context.globalCompositeOperation = 'screen';
        context.shadowColor = 'rgba(255, 222, 93, 0.75)';
        context.shadowBlur = Math.max(12, 22 * z);
        context.lineWidth = Math.max(2, 3.4 * z);
        context.strokeStyle = `rgba(255, 220, 74, ${0.5 + pulse * 0.28})`;
        context.beginPath();
        context.ellipse(center.x, center.y, ringRadius * 1.15, ringRadius * 0.58, 0, 0, Math.PI * 2);
        context.stroke();

        context.shadowBlur = Math.max(4, 10 * z);
        context.lineWidth = Math.max(1.2, 1.8 * z);
        context.strokeStyle = `rgba(255, 255, 214, ${0.34 + (1 - pulse) * 0.22})`;
        context.beginPath();
        context.ellipse(center.x, center.y, baseRadius * 0.72, baseRadius * 0.36, 0, 0, Math.PI * 2);
        context.stroke();
        context.restore();
    });
}

function drawEntities(context, pX, pY, z) {
    const { protectedAreasByAlliance } = buildProtectedAreaSnapshot();

    ALLIANCES.forEach(alliance => {
        const color = getAllianceAreaFill(alliance.id, alliance.id === normalizeAllianceId(activeAllianceId));
        drawFlagAreas(context, pX, pY, z, protectedAreasByAlliance[alliance.id], color);
    });

    // Draw the territory preview for the building being placed
    drawTerritoryPreview(context, pX, pY, z, territoryPreview);

    drawBattlefieldConnectionLines(context, pX, pY, z);
    drawMarkedEntityHalos(context, pX, pY, z);

    // Draw entities
    entities.forEach(entity => {
        drawEntity(context, pX, pY, z, entity, protectedAreasByAlliance);
        
    });
    
    // Draw ghost preview if applicable
    if (ghostPreview) {
        drawGhostEntity(context, pX, pY, z, ghostPreview);
    }

    // Always draw selection as the top-most layer for better visibility.
    getSelectedEntities().forEach(entity => {
        drawSelectionHighlight(context, pX, pY, z, entity);
    });

    if (isBoxSelecting && selectionBoxStart && selectionBoxCurrent) {
        drawSelectionMarquee(context);
    }
}

function drawEntity(context, pX, pY, z, entity, protectedAreasByAlliance) {
    context.save();
    
    const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
    const currentGridSize = baseGridSize * z;
    const isInactiveAllianceEntity = isInInactiveAllianceView(entity);
    const entityAllianceId = getEntityAllianceId(entity);
    const usesSpriteImage = isEntitySpriteImage(entity);
    
    
    if (entity.battlefield === SWORD_BATTLEFIELD_KEY) {
        context.fillStyle = entity.color || getAllianceColor(entityAllianceId, 0.9);
    } else if (entity.type === 'city') {
        if (isInactiveAllianceEntity) {
            context.fillStyle = getAllianceColor(entityAllianceId, INACTIVE_ALLIANCE_ENTITY_ALPHA);
        } else {
            const teamIndex = cityTeams[entity.id];
            const teamColor = (teamIndex !== undefined && customTeams[teamIndex]) ? customTeams[teamIndex].color : entity.color;
            context.fillStyle = waveMode ? getWaveColorForCity(entity) : teamColor;
        }
    } else {
        context.fillStyle = isInactiveAllianceEntity
            ? getAllianceColor(entityAllianceId, INACTIVE_ALLIANCE_ENTITY_ALPHA)
            : entity.color;
    }

    
    if (!usesSpriteImage) {
        // Draw entity based on its actual size (width x height)
        if (entity.width === 1 && entity.height === 1) {
            // Flag: 1x1 - single diamond cell
            const fillSize = currentGridSize * 0.9;
            context.beginPath();
            context.moveTo(screen.x, screen.y - fillSize * 0.5);
            context.lineTo(screen.x + fillSize * 0.5, screen.y);
            context.lineTo(screen.x, screen.y + fillSize * 0.5);
            context.lineTo(screen.x - fillSize * 0.5, screen.y);
            context.closePath();
            context.fill();
        } else {
            // Draw the filled area using the outer boundary
            const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
            const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
            const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
            const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
            
            context.beginPath();
            context.moveTo(topLeft.x, topLeft.y);
            context.lineTo(topRight.x, topRight.y);
            context.lineTo(bottomRight.x, bottomRight.y);
            context.lineTo(bottomLeft.x, bottomLeft.y);
            context.closePath();
            context.fill();
        }
    }

    drawEntityImage(context, pX, pY, z, entity);
    
    // Draw border around the entire entity

    // For cities outside protected areas, use red border; otherwise use black
    // NOTE: in castle mode we skip this check to avoid showing red warning borders
    const cityAlliance = getEntityAllianceId(entity);
    const cityProtectedAreas = protectedAreasByAlliance?.[cityAlliance] || new Set();
    if (entity.battlefield === SWORD_BATTLEFIELD_KEY) {
        context.strokeStyle = 'rgba(255, 244, 204, 0.95)';
        context.lineWidth = Math.max(1, 2.5 * z);
    } else if (isInactiveAllianceEntity) {
        context.strokeStyle = getAllianceColor(entityAllianceId, INACTIVE_ALLIANCE_STROKE_ALPHA);
        context.lineWidth = Math.max(1, 2 * z);
    } else if (entity.type === 'city' && mapMode !== 'castle') {
        // Flag bonus thresholds: 2/4 cells is the minimum to still receive the alliance bonus.
        const protectedCells = countCityProtectedCells(entity, cityProtectedAreas);
        const totalCells = entity.width * entity.height;
        if (protectedCells < 2) {
            context.strokeStyle = 'rgba(255, 0, 0, 1.0)';
            context.lineWidth = Math.max(2, 4 * z);
        } else if (protectedCells < totalCells) {
            context.strokeStyle = 'rgba(255, 140, 0, 1.0)';
            context.lineWidth = Math.max(2, 4 * z);
        } else {
            context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            context.lineWidth = Math.max(1, 2 * z);
        }
    } else {
        context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        context.lineWidth = Math.max(1, 2 * z);
    }
    
    if (!usesSpriteImage) {
        if (entity.width === 1 && entity.height === 1) {
            // Single cell border
            const fillSize = currentGridSize * 0.9;
            context.beginPath();
            context.moveTo(screen.x, screen.y - fillSize * 0.5);
            context.lineTo(screen.x + fillSize * 0.5, screen.y);
            context.lineTo(screen.x, screen.y + fillSize * 0.5);
            context.lineTo(screen.x - fillSize * 0.5, screen.y);
            context.closePath();
            context.stroke();
        } else {
            // Multi-cell border - draw outline around entire entity using corner coordinates
            const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
            const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
            const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
            const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
            
            context.beginPath();
            context.moveTo(topLeft.x, topLeft.y);
            context.lineTo(topRight.x, topRight.y);
            context.lineTo(bottomRight.x, bottomRight.y);
            context.lineTo(bottomLeft.x, bottomLeft.y);
            context.closePath();
            context.stroke();
        }
    }
    
    // Draw labels in center of entity
    const centerScreen = diamondToScreen(entity.x + entity.width/2 - 0.5, entity.y + entity.height/2 - 0.5, pX, pY, z);
    const detailScreen = usesSpriteImage ? getSpriteEntityLabelScreen(pX, pY, z, entity, centerScreen) : centerScreen;
    if (entity.type === 'flag') {
        drawFlagDetails(context, z, entity, detailScreen);
    } else if (entity.type === 'city') {
        drawCityDetails(context, z, entity, detailScreen);
    } else if (entity.type === 'castle') {
        // draw castle label
        context.fillStyle = 'white';
        const currentGridSize = baseGridSize * z;
        const baseFontSize = Math.max(10, Math.min(24, currentGridSize * 0.25));
        context.font = `${baseFontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(entity.name || '王城', detailScreen.x, detailScreen.y);
    } else if (entity.type === 'turret') {
        context.fillStyle = 'white';
        const currentGridSize = baseGridSize * z;
        const baseFontSize = Math.max(8, Math.min(18, currentGridSize * 0.2));
        context.font = `${baseFontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(entity.name || '炮塔', detailScreen.x, detailScreen.y);
    } else if (entity.type === 'building') {
        drawBearTrapDetails(context, z, entity, detailScreen);
    } else if (entity.type === 'hq') {
        drawHQDetails(context, z, entity, detailScreen);
    } else if (entity.type === 'node') {
        drawNodeDetails(context, z, entity, detailScreen);
    } else if (entity.type === 'obstacle') {
        drawObstacleDetails(context, z, entity, detailScreen);
    } else if (entity.type === 'enemyzone') {
        drawEnemyZoneDetails(context, z, entity, detailScreen);
    }
    
    context.restore();
}

function drawEntityImage(context, pX, pY, z, entity) {
    if (!entity?.imageKey) return false;

    const imageState = getEntityImage(entity.imageKey);
    if (!imageState || imageState.failed || !imageState.loaded) return false;

    const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
    const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
    const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
    const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
    const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

    const width = maxX - minX;
    const height = maxY - minY;
    if (width <= 0 || height <= 0) return false;

    const imageDef = getEntityImageDef(entity) || {};
    const { image } = imageState;

    if (imageDef.mode === 'sprite') {
        const scale = Number.isFinite(imageDef.scale) ? imageDef.scale : 1.65;
        const lift = Number.isFinite(imageDef.lift) ? imageDef.lift : 0.24;
        const spriteWidth = width * scale;
        const spriteHeight = spriteWidth * (image.naturalHeight / image.naturalWidth);
        const centerX = (minX + maxX) / 2;
        const baseY = maxY;
        const drawX = centerX - spriteWidth / 2;
        const drawY = baseY - spriteHeight + height * lift;

        context.save();
        context.globalAlpha = 0.34;
        context.fillStyle = 'rgba(0, 0, 0, 0.48)';
        context.beginPath();
        context.ellipse(centerX, baseY + height * 0.08, width * 0.72, height * 0.28, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();

        context.save();
        context.drawImage(image, drawX, drawY, spriteWidth, spriteHeight);
        context.restore();
        return true;
    }

    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;

    if (sourceRatio > targetRatio) {
        sourceWidth = image.naturalHeight * targetRatio;
        sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
        sourceHeight = image.naturalWidth / targetRatio;
        sourceY = (image.naturalHeight - sourceHeight) / 2;
    }

    context.save();
    traceEntityOutlinePath(context, pX, pY, z, entity);
    context.clip();
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, minX, minY, width, height);
    context.restore();
    return true;
}

function getSpriteEntityLabelScreen(pX, pY, z, entity, fallbackScreen) {
    return fallbackScreen;
}

function drawGhostEntity(context, pX, pY, z, entity) {
    context.save();
    
    const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
    const currentGridSize = baseGridSize * z;

    if (entity.type === 'artpattern') {
        const drawCellPath = (cell) => {
            const cellScreen = diamondToScreen(cell.x, cell.y, pX, pY, z);
            const fillSize = currentGridSize * 0.9;
            context.beginPath();
            context.moveTo(cellScreen.x, cellScreen.y - fillSize * 0.5);
            context.lineTo(cellScreen.x + fillSize * 0.5, cellScreen.y);
            context.lineTo(cellScreen.x, cellScreen.y + fillSize * 0.5);
            context.lineTo(cellScreen.x - fillSize * 0.5, cellScreen.y);
            context.closePath();
        };

        entity.cells.forEach(cell => {
            context.globalAlpha = cell.valid ? 0.55 : 0.18;
            context.fillStyle = cell.valid ? '#8B0000' : '#888888';
            drawCellPath(cell);
            context.fill();
        });

        context.globalAlpha = 0.85;
        context.strokeStyle = '#666666';
        context.lineWidth = Math.max(1, 1.5 * z);
        context.setLineDash([3 * z, 3 * z]);
        entity.cells.forEach(cell => {
            drawCellPath(cell);
            context.stroke();
        });

        context.restore();
        return;
    }
    
    // Helper function to draw the entity path
    const drawEntityPath = () => {
        if (entity.width === 1 && entity.height === 1) {
            // Single cell path
            const fillSize = currentGridSize * 0.9;
            context.beginPath();
            context.moveTo(screen.x, screen.y - fillSize * 0.5);
            context.lineTo(screen.x + fillSize * 0.5, screen.y);
            context.lineTo(screen.x, screen.y + fillSize * 0.5);
            context.lineTo(screen.x - fillSize * 0.5, screen.y);
            context.closePath();
        } else {
            // Multi-cell path
            const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
            const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
            const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
            const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
            
            context.beginPath();
            context.moveTo(topLeft.x, topLeft.y);
            context.lineTo(topRight.x, topRight.y);
            context.lineTo(bottomRight.x, bottomRight.y);
            context.lineTo(bottomLeft.x, bottomLeft.y);
            context.closePath();
        }
    };
    
    // Fill the ghost entity
    context.globalAlpha = 0.5;
    context.fillStyle = '#888888';
    drawEntityPath();
    context.fill();
    
    // Draw dashed border for ghost
    context.globalAlpha = 0.8;
    context.strokeStyle = '#666666';
    context.lineWidth = Math.max(1, 2 * z);
    context.setLineDash([3 * z, 3 * z]);
    drawEntityPath();
    context.stroke();
    
    context.restore();
}

function drawCityDetails(context, z, city, screen) {
    // Text is always black for readability
    context.fillStyle = 'black';
    
    // Scale font size, with minimum and maximum limits
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(6, Math.min(16, currentGridSize * 0.25));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Shift text upward to accommodate multiple bear trap times
    const baseOffset = -currentGridSize * 0.29;
    
    const label = city.name || `城市 ${city.id}`;
    context.fillText(label, screen.x, screen.y + baseOffset);
    
    // Draw march times only if enabled
    if (cityLabelMode === 'march') {
        const marchTimes = calculateMarchTimes(city);

        if (mapMode === 'castle') {
            if (marchTimes.length > 0) {
                const yOffset = baseOffset + currentGridSize * 0.25;
                context.fillText(`${marchTimes[0]}s`, screen.x, screen.y + yOffset);
            }
        } else {
            marchTimes.forEach((time, index) => {
                const yOffset = baseOffset + (index + 1) * currentGridSize * 0.25;
                context.fillText(`BT${index + 1}: ${time}s`, screen.x, screen.y + yOffset);
            });
        }
    }

    // ---- Show city coordinates relative to anchor ----  
    if (cityLabelMode === 'coords') {
        const c = coordForCity(city);
        const fs = Math.max(6, Math.min(14, baseGridSize * z * 0.22));
        context.font = `${fs}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillStyle = 'black';
        context.fillText(`${c.x}:${c.y}`, screen.x, screen.y + fs*0.8);
    }

}

function drawCoordLabelBelow(context, z, entity, screen, mainFontSize) {
    if (cityLabelMode !== 'coords') return;
    const c = coordForCity(entity);
    const fs = Math.max(6, Math.min(14, baseGridSize * z * 0.22));
    context.font = `${fs}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(`${c.x}:${c.y}`, screen.x, screen.y + mainFontSize * 0.55);
}

function drawEntityTextBadge(context, text, x, y, fontSize, { accent = '#f3c04d', compact = false } = {}) {
    const label = String(text || '').trim();
    if (!label) return;

    context.save();
    context.font = `900 ${fontSize}px Arial, "Microsoft YaHei", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const metrics = context.measureText(label);
    const paddingX = Math.max(7, fontSize * 0.56);
    const paddingY = Math.max(4, fontSize * 0.28);
    const width = Math.max(compact ? 42 : 56, metrics.width + paddingX * 2);
    const height = Math.max(18, fontSize + paddingY * 2);
    const radius = Math.min(8, height * 0.38);
    const left = x - width / 2;
    const top = y - height / 2;

    context.shadowColor = 'rgba(0, 0, 0, 0.42)';
    context.shadowBlur = Math.max(4, fontSize * 0.55);
    context.shadowOffsetY = Math.max(1, fontSize * 0.12);

    context.beginPath();
    context.moveTo(left + radius, top);
    context.lineTo(left + width - radius, top);
    context.quadraticCurveTo(left + width, top, left + width, top + radius);
    context.lineTo(left + width, top + height - radius);
    context.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
    context.lineTo(left + radius, top + height);
    context.quadraticCurveTo(left, top + height, left, top + height - radius);
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
    context.closePath();
    context.fillStyle = 'rgba(24, 20, 14, 0.82)';
    context.fill();

    context.shadowColor = 'transparent';
    context.lineWidth = Math.max(1.25, fontSize * 0.12);
    context.strokeStyle = accent;
    context.stroke();

    context.lineWidth = Math.max(2.5, fontSize * 0.22);
    context.strokeStyle = 'rgba(20, 14, 8, 0.95)';
    context.strokeText(label, x, y + 0.5);
    context.fillStyle = '#fff8df';
    context.fillText(label, x, y + 0.5);
    context.restore();
}

function drawBearTrapDetails(context, z, trap, screen) {
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(9, Math.min(20, currentGridSize * 0.31));

    const trapIndex = getAllianceTrapIndex(trap);
    const allianceShort = getAllianceShort(getEntityAllianceId(trap));
    const label = trap.name || `${allianceShort}BT${trapIndex}`;
    const labelOffset = cityLabelMode === 'coords' ? -baseFontSize * 0.55 : 0;
    drawEntityTextBadge(context, label, screen.x, screen.y + labelOffset, baseFontSize, {
        accent: 'rgba(255, 215, 120, 0.96)'
    });

    drawCoordLabelBelow(context, z, trap, screen, baseFontSize);
}

function drawFlagDetails(context, z, flag, screen) {
    const label = String(flag.name || '').trim();
    if (!label) return;

    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(7, Math.min(16, currentGridSize * 0.24));
    drawEntityTextBadge(context, label, screen.x, screen.y, baseFontSize, {
        accent: 'rgba(255, 230, 142, 0.92)',
        compact: true
    });
}

function drawHQDetails(context, z, hq, screen) {
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(9, Math.min(20, currentGridSize * 0.31));

    const labelOffset = cityLabelMode === 'coords' ? -baseFontSize * 0.55 : 0;
    drawEntityTextBadge(context, hq.name || '总部', screen.x, screen.y + labelOffset, baseFontSize, {
        accent: 'rgba(255, 215, 120, 0.96)'
    });

    drawCoordLabelBelow(context, z, hq, screen, baseFontSize);
}

function drawNodeDetails(context, z, node, screen) {
    const currentGridSize = baseGridSize * z;
    const label = node.name || 'NODE';
    const baseFontSize = Math.max(8, Math.min(18, currentGridSize * (node.name ? 0.23 : 0.26)));

    const labelOffset = cityLabelMode === 'coords' ? -baseFontSize * 0.55 : 0;
    drawEntityTextBadge(context, label, screen.x, screen.y + labelOffset, baseFontSize, {
        accent: node.battlefield === SWORD_BATTLEFIELD_KEY ? 'rgba(255, 216, 122, 0.98)' : 'rgba(231, 238, 214, 0.92)',
        compact: !node.name
    });

    drawCoordLabelBelow(context, z, node, screen, baseFontSize);
}

function drawObstacleDetails(context, z, obstacle, screen) {
    const label = String(obstacle.name || '').trim();
    if (!label) return;

    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(7, Math.min(15, currentGridSize * 0.23));
    drawEntityTextBadge(context, label, screen.x, screen.y, baseFontSize, {
        accent: obstacle.battlefield === SWORD_BATTLEFIELD_KEY ? 'rgba(255, 216, 122, 0.98)' : 'rgba(231, 238, 214, 0.92)',
        compact: true
    });
}

function drawEnemyZoneDetails(context, z, zone, screen) {
    context.fillStyle = 'white';
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(10, Math.min(24, currentGridSize * 0.25));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(zone.name || 'ENEMIES STATE', screen.x, screen.y);
}


function traceEntityOutlinePath(context, pX, pY, z, entity) {
    const currentGridSize = baseGridSize * z;

    if (entity.width === 1 && entity.height === 1) {
        const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
        const size = currentGridSize;

        context.beginPath();
        context.moveTo(screen.x, screen.y - size * 0.5);
        context.lineTo(screen.x + size * 0.5, screen.y);
        context.lineTo(screen.x, screen.y + size * 0.5);
        context.lineTo(screen.x - size * 0.5, screen.y);
        context.closePath();
        return;
    }

    const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
    const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
    const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
    const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);

    context.beginPath();
    context.moveTo(topLeft.x, topLeft.y);
    context.lineTo(topRight.x, topRight.y);
    context.lineTo(bottomRight.x, bottomRight.y);
    context.lineTo(bottomLeft.x, bottomLeft.y);
    context.closePath();
}

function drawSelectionHighlight(context, pX, pY, z, entity) {
    const now = performance.now();
    const pulseActive = now < selectionPulseActiveUntil;
    const pulseProgress = pulseActive
        ? 1 - ((selectionPulseActiveUntil - now) / selectionPulseDurationMs)
        : 1;
    const pulseWave = pulseActive
        ? (Math.sin(pulseProgress * Math.PI * 6) + 1) * 0.5
        : 0;

    context.save();

    traceEntityOutlinePath(context, pX, pY, z, entity);

    if (pulseActive) {
        context.save();
        context.strokeStyle = `rgba(255, 255, 255, ${0.3 + pulseWave * 0.4})`;
        context.lineWidth = Math.max(4, (8 + pulseWave * 10) * z);
        context.setLineDash([]);
        context.shadowColor = `rgba(255, 255, 255, ${0.35 + pulseWave * 0.45})`;
        context.shadowBlur = Math.max(10, 24 * z);
        context.stroke();
        context.restore();
    }

    context.strokeStyle = '#ffff00';
    context.lineWidth = Math.max(2, 4 * z);
    context.setLineDash([5 * z, 5 * z]);
    context.stroke();

    context.restore();
}

function drawSelectionMarquee(context) {
    if (!selectionBoxStart || !selectionBoxCurrent) return;

    const x = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
    const y = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
    const width = Math.abs(selectionBoxCurrent.x - selectionBoxStart.x);
    const height = Math.abs(selectionBoxCurrent.y - selectionBoxStart.y);

    context.save();
    context.fillStyle = 'rgba(59, 130, 246, 0.15)';
    context.strokeStyle = 'rgba(59, 130, 246, 0.95)';
    context.lineWidth = 1.5;
    context.setLineDash([6, 4]);
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.restore();
}

function calculateMarchTimes(city) {
    // Castle time at 25% speed bonus
    if (mapMode === 'castle') {
        // Constants for march time calculation, based on IKKEREKI3's python calculation
        const MARCH_TIME_FACTOR_A = 4.2813;
        const MARCH_TIME_FACTOR_B = 6.079;

        const castle = entities.find(e => e.type === 'castle');
        if (!castle) return [];

        // Center of the city and the castle
        const cityCenterX   = city.x   + city.width  / 2 - 0.5;
        const cityCenterY   = city.y   + city.height / 2 - 0.5;
        const castleCenterX = castle.x + castle.width  / 2 - 0.5;
        const castleCenterY = castle.y + castle.height / 2 - 0.5;

        const dx = castleCenterX - cityCenterX;
        const dy = castleCenterY - cityCenterY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        const marchSpeedAt25Marchspeed = Math.round(MARCH_TIME_FACTOR_A * distance + MARCH_TIME_FACTOR_B);

        return [marchSpeedAt25Marchspeed];
    }

    // Beartap times
    const times = [];
    const cityAlliance = getEntityAllianceId(city);
    bearTraps.forEach(trap => {
        if (getEntityAllianceId(trap) !== cityAlliance) return;
        const cityCenterX = city.x + city.width / 2 - 0.5;
        const cityCenterY = city.y + city.height / 2 - 0.5;
        const trapCenterX = trap.x + trap.width / 2 - 0.5;
        const trapCenterY = trap.y + trap.height / 2 - 0.5;

        const distance = Math.sqrt(
            Math.pow(trapCenterX - cityCenterX, 2) +
            Math.pow(trapCenterY - cityCenterY, 2)
        );
        const time = Math.round((distance / 10) * 32.5);
        times.push(time);
    });
    return times;
}


function markFlagArea(entity, areas, radiusSize = 3) {
    let centerX, centerY;
    
    if (entity.width === 1 && entity.height === 1) {
        // For flags (1x1), use the entity position directly
        centerX = entity.x;
        centerY = entity.y;
    } else {
        // For multi-cell entities (HQs), use the center of the entity
        // For a 3x3 entity at (0,0): center should be at (1,1)
        centerX = entity.x + Math.floor(entity.width / 2);
        centerY = entity.y + Math.floor(entity.height / 2);
    }
    
    // For HQs, we want the specified radius OUTSIDE the building
    let effectiveRadius = radiusSize;
    if (entity.type === 'hq') {
        effectiveRadius = radiusSize + Math.floor(entity.width / 2);
    }
    
    // Mark all fields within the effective radius
    for (let x = centerX - effectiveRadius; x <= centerX + effectiveRadius; x++) {
        for (let y = centerY - effectiveRadius; y <= centerY + effectiveRadius; y++) {
            if (x >= -gridCols && x <= gridCols && y >= -gridRows && y <= gridRows) {
                areas.add(`${x},${y}`);
            }
        }
    }
}

// Helper function to count how many of a city's cells fall inside any flag's or HQ's area
function countCityProtectedCells(cityEntity, protectedAreas) {
    let count = 0;
    for (let dx = 0; dx < cityEntity.width; dx++) {
        for (let dy = 0; dy < cityEntity.height; dy++) {
            const gridX = cityEntity.x + dx;
            const gridY = cityEntity.y + dy;
            if (protectedAreas.has(`${gridX},${gridY}`)) {
                count++;
            }
        }
    }
    return count;
}

function drawFlagAreas(context, pX, pY, z, areas, color = 'rgba(173, 216, 230, 0.3)') {
    context.save();
    context.fillStyle = color;
    
    areas.forEach(coord => {
        const [x, y] = coord.split(',').map(Number);
        const screen = diamondToScreen(x, y, pX, pY, z);
        const currentGridSize = baseGridSize * z;
        const fillSize = currentGridSize * 0.9;
        
        context.beginPath();
        context.moveTo(screen.x, screen.y - fillSize * 0.5);
        context.lineTo(screen.x + fillSize * 0.5, screen.y);
        context.lineTo(screen.x, screen.y + fillSize * 0.5);
        context.lineTo(screen.x - fillSize * 0.5, screen.y);
        context.closePath();
        context.fill();
    });
    
    context.restore();
}

function drawTerritoryPreview(context, pX, pY, z, areas) {
    if (!areas) return;
    // Use a distinct color for the preview
    drawFlagAreas(context, pX, pY, z, areas, 'rgba(96, 194, 226, 0.3)');
}

function getRandomColor() {
    let color;
    do {
        const r = Math.floor(Math.random() * 128 + 127);
        const g = Math.floor(Math.random() * 128 + 127);
        const b = Math.floor(Math.random() * 128 + 127); 
        color = `rgb(${r}, ${g}, ${b})`;
    } while (isColorTooDark(color));
    return color;
}

function isColorTooDark(color) {
    const rgb = color.match(/\d+/g).map(Number);
    const brightness = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
    return brightness < 128; 
}

function getWaveRing(city) {
  if (!bearTraps.length) return null;

  // City-Center
  const cx = city.x + city.width  / 2 - 0.5;
  const cy = city.y + city.height / 2 - 0.5;
  const cityAlliance = getEntityAllianceId(city);

  let best = Infinity;
  let hasMatchingTrap = false;

  for (const t of bearTraps) {
    if (getEntityAllianceId(t) !== cityAlliance) continue;
    hasMatchingTrap = true;
    // Trap-Center + "Halfheight/width" in cells
    const tx = t.x + t.width  / 2 - 0.5;
    const ty = t.y + t.height / 2 - 0.5;
    const rx = (t.width  - 1) / 2;
    const ry = (t.height - 1) / 2;

    // (Trap-Center - City-Center) - (Halfheight/width)
    const dxOut = Math.max(Math.abs(cx - tx) - rx, 0);
    const dyOut = Math.max(Math.abs(cy - ty) - ry, 0);

    // All neighbors – including diagonals – are considered part of the same wave
    // => Chebyshev-Distance to rectangle
    const ring = Math.max(Math.ceil(dxOut), Math.ceil(dyOut)) + 1;

    if (ring < best) best = ring;
  }
  if (!hasMatchingTrap) return null;
  return best; // 1 = next to bt, 2 = next row, etc.
}

function getWaveColorForCity(city) {
    const ring = getWaveRing(city);
    if (ring == null) return city.color;
    return wavePalette[ring % wavePalette.length];
}

function clamp1200(n){ return Math.max(0, Math.min(1199, n|0)); }

function parseCoordInput(s){
    if (!s) return null;
    const m = String(s).trim().match(/^(\d{1,4})\s*[:;,]\s*(\d{1,4})$/);
    if (!m) return null;
    return { x: clamp1200(+m[1]), y: clamp1200(+m[2]) };
}
function setCoordAnchor(x, y){
    coordAnchor = { x: clamp1200(x), y: clamp1200(y) };
    redraw();
}

function calibrateCoordAnchorByEntity(entity, worldCoord) {
    if (!entity || !worldCoord) return false;
    const tipX = entity.x + entity.width - 1;
    const tipY = entity.y + entity.height - 1;
    const mid = anchorGridCell();
    const dx = tipX - mid.x;
    const dy = tipY - mid.y;
    setCoordAnchor(worldCoord.x + dy, worldCoord.y + dx);
    return true;
}

// middle of the grid in diamond coords
function anchorGridCell() {
    return { x: 0, y: 0 };
}

// city x/y coords in 0..1199, relative to anchor
function coordForCity(city) {
    const tipX = city.x + city.width - 1;
    const tipY = city.y + city.height - 1;
    const mid = anchorGridCell();
    const dx = tipX - mid.x;
    const dy = tipY - mid.y;

    return {
        x: clamp1200(coordAnchor.x - dy),
        y: clamp1200(coordAnchor.y - dx)
    };
}

function drawAnchorSymbol(context, pX, pY, z) {
    if (cityLabelMode !== 'coords') return;

    const midCell   = anchorGridCell();
    const midCenter = diamondToScreen(midCell.x, midCell.y, pX, pY, z);
    const s  = baseGridSize * z * 0.9;
    const fs = Math.max(14, baseGridSize * z * 0.7);

    context.save();

    context.font = `${fs}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'rgba(255,255,255,0.4)';
    context.fillText("⚓", midCenter.x, midCenter.y);
    context.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    context.lineWidth = Math.max(1, 2 * z);
    context.beginPath();
    context.moveTo(midCenter.x,           midCenter.y - s * 0.5);
    context.lineTo(midCenter.x + s * 0.5, midCenter.y);
    context.lineTo(midCenter.x,           midCenter.y + s * 0.5);
    context.lineTo(midCenter.x - s * 0.5, midCenter.y);
    context.closePath();
    context.stroke();

    context.restore();
}


// ===== ENTITY PLACEMENT =====
function addEntity(event) {
    if (!selectedType || selectedType === 'select' || selectedType === 'move' || selectedType === 'delete') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const gridPos = screenToDiamond(mouseX, mouseY);
    const x = gridPos.x;
    const y = gridPos.y;

    if (isArtPatternTool(selectedType)) {
        let placedAny = false;
        getArtPatternAt(selectedType, x, y).forEach(cellTemplate => {
            if (!isPositionValid(cellTemplate.x, cellTemplate.y, cellTemplate)) return;
            entities.push({ ...cellTemplate, color: '#8B0000', id: null });
            placedAny = true;
        });

        if (placedAny) {
            redraw();
            updateCounters();
            markUnsavedChanges();
            pushHistory();
        }
        return;
    }

    // Obstacle preset: drop N×N individual 1×1 obstacles in one click. Each placed cell
    // remains its own entity so the existing save/load format (which derives obstacle size
    // from type) keeps working unchanged.
    if (selectedType === 'obstacle') {
        const size = Math.max(1, Math.min(4, obstacleSize | 0));
        let placedAny = false;
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                const cellX = x + dx;
                const cellY = y + dy;
                const cellTemplate = { x: cellX, y: cellY, width: 1, height: 1, type: 'obstacle' };
                if (!isPositionValid(cellX, cellY, cellTemplate)) continue;
                entities.push({ ...cellTemplate, color: '#8B0000', id: null });
                placedAny = true;
            }
        }
        if (placedAny) {
            redraw();
            updateCounters();
            markUnsavedChanges();
            pushHistory();
        }
        return;
    }

    let color, width, height, id = null;
    if (selectedType === 'flag') {
        color = 'gray';
        width = 1;
        height = 1;
    } else if (selectedType === 'city') {
        color = getRandomColor();
        width = 2;
        height = 2;
    } else if (selectedType === 'building') {
        if (getAllianceTrapCount(activeAllianceId) >= 2) {
            alert(`${getAllianceName(activeAllianceId)}最多只能放置 2 个捕兽夹。`);
            return;
        }
        color = 'black';
        width = 3;
        height = 3;
    } else if (selectedType === 'hq') {
        color = 'darkgoldenrod';
        width = 3;
        height = 3;
    } else if (selectedType === 'node') {
        color = 'darkgreen';
        width = 3;
        height = 3;
    } else if (selectedType === 'enemyzone') {
        if (mapMode !== 'castle') {
            alert('敌方区域只能在王城模式下放置。');
            return;
        }
        if (enemyZones.length >= 3) {
            alert('最多只能放置 3 个敌方区域。');
            return;
        }
        color = 'black';
        width = 12;
        height = 12;
    }

    const newEntityTemplate = isAllianceScopedType(selectedType)
        ? { x, y, width, height, type: selectedType, allianceId: normalizeAllianceId(activeAllianceId) }
        : { x, y, width, height, type: selectedType };
    if (isPositionValid(x, y, newEntityTemplate)) {
        if (selectedType === 'city') {
            id = cityCounterId;
            cityCounterId++;
        }
        const newEntity = { ...newEntityTemplate, color, id };

        if (selectedType === 'city' && !newEntity.name) {
            newEntity.name = `城市 ${id}`;
        }

        entities.push(newEntity);
        if (selectedType === 'building') {
            bearTraps.push(newEntity);
        } else if (selectedType === 'enemyzone') {
            enemyZones.push(newEntity);
        }
        redraw();
        updateCounters();
        markUnsavedChanges();
        pushHistory();

        if (selectedType === 'city' || selectedType === 'building') {
            updateCityList();
        }
    }
}

// ===== WORLDMAP OBSTACLE LAYER =====

async function loadWorldmapData() {
    if (worldmapPresence || worldmapLoading) return;
    worldmapLoading = true;
    try {
        const resp = await fetch(WORLDMAP_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const entries = await resp.json();
        if (!Array.isArray(entries)) throw new Error('Expected an array of entries');
        const map = new Uint8Array(1200 * 1200);
        for (const { x, y, key } of entries) {
            if (x >= 0 && x < 1200 && y >= 0 && y < 1200) map[y * 1200 + x] = key;
        }
        worldmapPresence = map;
        redraw();
    } catch (e) {
        console.warn('[Worldmap] Failed to load:', e);
    } finally {
        worldmapLoading = false;
    }
}

function drawWorldmapLayer(context, pX, pY, z) {
    if (!worldmapPresence || (!showWorldmap && cityLabelMode !== 'coords')) return;

    const S = baseGridSize * z;
    const fillSize = S * 0.75;
    const hs = fillSize * 0.5;

    // Tight viewport culling via diagonal constraints. diamondToScreen gives:
    //   screen.x = (gx - gy) * S * 0.5 + pX
    //   screen.y = (gx + gy + 1) * S * 0.5 + pY
    // A cell is on-screen when screen.x ∈ [-hs, canvasWidth+hs] and screen.y ∈ [-hs, canvasHeight+hs].
    const diagDiffMin = Math.floor(2 * (-hs - pX) / S);
    const diagDiffMax = Math.ceil(2 * (canvasWidth + hs - pX) / S);
    const diagSumMin  = Math.floor(2 * (-hs - pY) / S) - 1;
    const diagSumMax  = Math.ceil(2 * (canvasHeight + hs - pY) / S) - 1;

    // Axis-aligned bounds derived from diagonal constraints, clamped to worldmap range
    // and to the placement grid (where entities can actually be placed).
    const minGX = Math.max(Math.floor((diagSumMin + diagDiffMin) / 2), coordAnchor.y - 1199, -gridCols);
    const maxGX = Math.min(Math.ceil((diagSumMax + diagDiffMax) / 2),  coordAnchor.y,          gridCols);
    const minGY = Math.max(Math.floor((diagSumMin - diagDiffMax) / 2), coordAnchor.x - 1199, -gridRows);
    const maxGY = Math.min(Math.ceil((diagSumMax - diagDiffMin) / 2),  coordAnchor.x,          gridRows);

    if (minGX > maxGX || minGY > maxGY) return;

    context.save();
    for (let gx = minGX; gx <= maxGX; gx++) {
        // Per-column tight gy bounds eliminate the triangle corners that fall off-screen.
        const gyMin = Math.max(minGY, diagSumMin - gx, gx - diagDiffMax);
        const gyMax = Math.min(maxGY, diagSumMax - gx, gx - diagDiffMin);
        for (let gy = gyMin; gy <= gyMax; gy++) {
            const wx = coordAnchor.x - gy;
            const wy = coordAnchor.y - gx;
            if (wx < 0 || wx >= 1200 || wy < 0 || wy >= 1200) continue;
            const key = worldmapPresence[wy * 1200 + wx];
            if (!key) continue;
            const screen = diamondToScreen(gx, gy, pX, pY, z);
            context.fillStyle = WORLDMAP_KEY_COLORS[key] ?? 'rgba(139, 90, 43, 0.45)';
            context.beginPath();
            context.moveTo(screen.x,      screen.y - hs);
            context.lineTo(screen.x + hs, screen.y);
            context.lineTo(screen.x,      screen.y + hs);
            context.lineTo(screen.x - hs, screen.y);
            context.closePath();
            context.fill();
        }
    }
    context.restore();
}

function redraw() {
    drawDiamondGrid(ctx, panX, panY, zoom);
    drawWorldmapLayer(ctx, panX, panY, zoom);
    drawEntities(ctx, panX, panY, zoom);
    drawPlacedPowerMembers(ctx, panX, panY, zoom);
    drawAnchorSymbol(ctx, panX, panY, zoom);
}

let redrawFrameId = null;
function requestRedraw() {
    if (redrawFrameId !== null) return;
    redrawFrameId = requestAnimationFrame(() => {
        redrawFrameId = null;
        redraw();
    });
}

function hasMarkedEntities() {
    return entities.some(entity => entity?.mainMark);
}

function runMarkedHaloAnimation() {
    if (!hasMarkedEntities()) {
        markedHaloRafId = null;
        return;
    }
    redraw();
    markedHaloRafId = requestAnimationFrame(runMarkedHaloAnimation);
}

function syncMarkedHaloAnimation() {
    if (hasMarkedEntities()) {
        if (markedHaloRafId === null) {
            markedHaloRafId = requestAnimationFrame(runMarkedHaloAnimation);
        }
        return;
    }
    if (markedHaloRafId !== null) {
        cancelAnimationFrame(markedHaloRafId);
        markedHaloRafId = null;
    }
}

function getEntityTypeLabel(entity) {
    return ENTITY_LABELS[entity?.type] || '方块';
}

function getEntityDefaultName(entity) {
    if (!entity) return '';
    if (entity.type === 'flag') return '旗帜';
    if (entity.type === 'city') return `城市 ${entity.id ?? ''}`.trim();
    if (entity.type === 'building') {
        const trapIndex = getAllianceTrapIndex(entity);
        return `${getAllianceShort(getEntityAllianceId(entity))}BT${trapIndex || 1}`;
    }
    if (entity.type === 'hq') return '总部';
    if (entity.type === 'node') return 'NODE';
    if (entity.type === 'obstacle') return '障碍';
    if (entity.type === 'castle') return '王城';
    if (entity.type === 'turret') return '炮塔';
    if (entity.type === 'enemyzone') return 'ENEMIES STATE';
    return '';
}

function canEditEntityLabel(entity) {
    return Boolean(entity && ['flag', 'city', 'building', 'hq', 'node', 'obstacle', 'castle', 'turret', 'enemyzone'].includes(entity.type));
}

function getSelectedEntityForEditor() {
    const selectedNow = getSelectedEntities();
    if (selectedNow.length !== 1) return null;
    const entity = selectedNow[0];
    return canEditEntityLabel(entity) ? entity : null;
}

function updateSelectedEntityEditor() {
    const editor = document.getElementById('selectedEntityEditor');
    const input = document.getElementById('selectedEntityNameInput');
    const meta = document.getElementById('selectedEntityMeta');
    const trapPanel = document.getElementById('trapCalibrationPanel');
    const trapInput = document.getElementById('trapCalibrationInput');
    const markButton = document.getElementById('markSelectedEntityButton');
    const unmarkButton = document.getElementById('unmarkSelectedEntityButton');
    if (!editor || !input || !meta) return;

    const selectedNow = getSelectedEntities();
    const entity = getSelectedEntityForEditor();
    if (!entity) {
        editor.classList.add('hidden');
        input.value = '';
        meta.textContent = selectedNow.length > 1 ? '已多选' : '未选择';
        trapPanel?.classList.add('hidden');
        if (markButton) markButton.disabled = true;
        if (unmarkButton) unmarkButton.disabled = true;
        return;
    }

    editor.classList.remove('hidden');
    input.value = entity.name || getEntityDefaultName(entity);
    meta.textContent = `${getEntityTypeLabel(entity)} · ${entity.x}, ${entity.y}${entity.mainMark ? ' · 已标记' : ''}`;
    if (markButton) markButton.disabled = Boolean(entity.mainMark);
    if (unmarkButton) unmarkButton.disabled = !entity.mainMark;
    const canCalibrateTrap = entity.type === 'building';
    trapPanel?.classList.toggle('hidden', !canCalibrateTrap);
    if (canCalibrateTrap && trapInput) {
        const coord = coordForCity(entity);
        trapInput.value = `${coord.x}:${coord.y}`;
    }
}

function installSelectedEntityEditor() {
    const input = document.getElementById('selectedEntityNameInput');
    const calibrationInput = document.getElementById('trapCalibrationInput');
    const calibrationButton = document.getElementById('trapCalibrationButton');
    const connectButton = document.getElementById('connectSelectedEntitiesButton');
    const disconnectButton = document.getElementById('disconnectSelectedEntitiesButton');
    const markButton = document.getElementById('markSelectedEntityButton');
    const unmarkButton = document.getElementById('unmarkSelectedEntityButton');
    if (input && input.dataset.bound !== 'true') {
        input.dataset.bound = 'true';

        input.addEventListener('input', () => {
            const entity = getSelectedEntityForEditor();
            if (!entity) return;
            entity.name = input.value.trim();
            redraw();
            updateCityList();
            markUnsavedChanges();
        });

        input.addEventListener('change', () => {
            const entity = getSelectedEntityForEditor();
            if (!entity) return;
            entity.name = input.value.trim() || getEntityDefaultName(entity);
            input.value = entity.name;
            redraw();
            updateCityList();
            markUnsavedChanges();
            pushHistory();
        });
    }

    if (connectButton && connectButton.dataset.bound !== 'true') {
        connectButton.dataset.bound = 'true';
        connectButton.addEventListener('click', connectSelectedEntities);
    }

    if (disconnectButton && disconnectButton.dataset.bound !== 'true') {
        disconnectButton.dataset.bound = 'true';
        disconnectButton.addEventListener('click', disconnectSelectedEntities);
    }

    document.querySelectorAll('[data-line-color]').forEach(button => {
        if (button.dataset.bound === 'true') return;
        button.dataset.bound = 'true';
        button.addEventListener('click', () => setSelectedBattlefieldLineColor(button.dataset.lineColor));
    });
    updateConnectionColorPalette();

    const setSelectedEntityMark = (isMarked) => {
        const entity = getSelectedEntityForEditor();
        if (!entity || Boolean(entity.mainMark) === isMarked) return;
        entity.mainMark = isMarked;
        redraw();
        syncMarkedHaloAnimation();
        updateSelectedEntityEditor();
        markUnsavedChanges();
        pushHistory();
        showShortcutToast(isMarked ? '已重点标记建筑' : '已取消重点标记');
    };

    if (markButton && markButton.dataset.bound !== 'true') {
        markButton.dataset.bound = 'true';
        markButton.addEventListener('click', () => setSelectedEntityMark(true));
    }

    if (unmarkButton && unmarkButton.dataset.bound !== 'true') {
        unmarkButton.dataset.bound = 'true';
        unmarkButton.addEventListener('click', () => setSelectedEntityMark(false));
    }

    const applyTrapCalibration = () => {
        const entity = getSelectedEntityForEditor();
        if (!entity || entity.type !== 'building') return;
        const coord = parseCoordInput(calibrationInput?.value || '');
        if (!coord) {
            alert('请输入正确坐标，例如 612:588。');
            return;
        }
        calibrateCoordAnchorByEntity(entity, coord);
        setCityLabelMode('coords');
        updateSelectedEntityEditor();
        updateCityList();
        markUnsavedChanges();
        pushHistory();
        showShortcutToast('捕兽夹坐标已校准');
    };

    if (calibrationButton && calibrationButton.dataset.bound !== 'true') {
        calibrationButton.dataset.bound = 'true';
        calibrationButton.addEventListener('click', applyTrapCalibration);
    }
    if (calibrationInput && calibrationInput.dataset.bound !== 'true') {
        calibrationInput.dataset.bound = 'true';
        calibrationInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyTrapCalibration();
            }
        });
    }
}

function normalizePowerValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const text = String(value ?? '').replace(/[,，\s]/g, '');
    if (!text) return 0;
    const unitMatch = text.match(/^([\d.]+)(亿|万|k|K|m|M)?$/);
    if (!unitMatch) return Number(text) || 0;
    const base = Number(unitMatch[1]) || 0;
    const unit = unitMatch[2];
    if (unit === '亿') return base * 100000000;
    if (unit === '万') return base * 10000;
    if (unit === 'k' || unit === 'K') return base * 1000;
    if (unit === 'm' || unit === 'M') return base * 1000000;
    return base;
}

function parsePowerFilterValue(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const parsed = normalizePowerValue(text);
    return parsed > 0 ? parsed : null;
}

function formatPowerValue(value) {
    const n = normalizePowerValue(value);
    if (n >= 100000000) return `${(n / 100000000).toFixed(n >= 1000000000 ? 1 : 2)}亿`;
    if (n >= 10000) return `${Math.round(n / 10000).toLocaleString('zh-CN')}万`;
    return Math.round(n).toLocaleString('zh-CN');
}

function normalizePowerRankingMember(raw, index) {
    const name = raw?.name ?? raw?.nickname ?? raw?.player ?? raw?.member ?? raw?.名称 ?? raw?.名字 ?? raw?.玩家 ?? `成员 ${index + 1}`;
    const power = normalizePowerValue(raw?.power ?? raw?.battlePower ?? raw?.score ?? raw?.战力 ?? raw?.实力 ?? raw?.积分);
    const rank = Number(raw?.rank ?? raw?.ranking ?? raw?.排名) || index + 1;
    const alliance = raw?.alliance ?? raw?.guild ?? raw?.联盟 ?? raw?.盟 ?? '';
    const role = raw?.role ?? raw?.position ?? raw?.职位 ?? raw?.定位 ?? '';
    return {
        rank,
        name: String(name || `成员 ${index + 1}`).trim(),
        power,
        alliance: String(alliance || '').trim(),
        role: String(role || '').trim()
    };
}

function normalizeMemberKey(name) {
    return String(name || '').trim().toLowerCase();
}

function isAllianceLeader(name) {
    return allianceLeaderNames.has(normalizeMemberKey(name));
}

function loadAllianceLeaders() {
    try {
        const raw = JSON.parse(localStorage.getItem(ALLIANCE_LEADERS_STORAGE_KEY) || '[]');
        const names = Array.isArray(raw) ? raw : [];
        allianceLeaderNames = new Set(names.map(normalizeMemberKey).filter(Boolean));
    } catch {
        allianceLeaderNames = new Set();
    }
}

function isPowerMemberPlaced(memberName) {
    const key = normalizeMemberKey(memberName);
    return placedPowerMembers.some(item => normalizeMemberKey(item.member.name) === key && entities.includes(item.targetEntity));
}

function removePowerMemberPlacement(memberName) {
    const key = normalizeMemberKey(memberName);
    placedPowerMembers
        .filter(item => normalizeMemberKey(item.member.name) === key && item.cityPlacement && item.targetEntity?.powerMemberCity)
        .forEach(item => {
            const index = entities.indexOf(item.targetEntity);
            if (index >= 0) entities.splice(index, 1);
        });
    placedPowerMembers = placedPowerMembers.filter(item => normalizeMemberKey(item.member.name) !== key);
    if (isSwordBattlefieldMode()) saveSwordPlacementsForLegion();
    bearTraps = entities.filter(entity => entity.type === 'building');
    enemyZones = entities.filter(entity => entity.type === 'enemyzone');
    renderFilteredPowerRankings();
    renderSwordTaskPanel();
    updateCounters();
    updateCityList();
    markUnsavedChanges();
    pushHistory();
    redraw();
}

function extractPowerRankingMembers(payload) {
    const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.members)
            ? payload.members
            : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.players)
                    ? payload.players
                    : [];

    return list
        .map((item, index) => normalizePowerRankingMember(item, index))
        .sort((a, b) => (a.rank - b.rank) || (b.power - a.power));
}

function serializePowerRankingMembers(members = powerRankingMembers) {
    return members.map((member, index) => ({
        rank: Number(member.rank) || index + 1,
        name: member.name,
        power: member.power,
        alliance: member.alliance || '',
        role: member.role || ''
    }));
}

function savePowerRankingMembersToStorage(members = powerRankingMembers) {
    localStorage.setItem(POWER_RANKINGS_STORAGE_KEY, JSON.stringify(serializePowerRankingMembers(members)));
}

function loadPowerRankingMembersFromStorage() {
    try {
        const raw = localStorage.getItem(POWER_RANKINGS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const members = extractPowerRankingMembers(parsed);
        return members.length ? members : null;
    } catch (error) {
        console.warn('Failed to load local power rankings', error);
        return null;
    }
}

function setPowerRankingMembers(members, { persist = true, source = '本地成员库' } = {}) {
    powerRankingMembers = extractPowerRankingMembers(members);
    if (persist) savePowerRankingMembersToStorage(powerRankingMembers);
    renderFilteredPowerRankings();
    updateSwordRosterSummary();
    renderSwordRosterMemberList();
    renderSwordTaskPanel();
    const status = document.getElementById('powerRankingStatus');
    if (status && powerRankingMembers.length) {
        status.textContent = `已加载${source}：${powerRankingMembers.length} 人`;
        status.classList.remove('hidden');
        window.setTimeout(() => {
            if (status.textContent.startsWith('已加载')) status.classList.add('hidden');
        }, 1600);
    }
}

function getSwordTasksStorageKey(legionId = activeSwordLegion) {
    return `${SWORD_TASKS_STORAGE_KEY}-${legionId}`;
}

function loadAllianceDataSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem(ALLIANCE_DATA_SETTINGS_STORAGE_KEY) || 'null');
        return settings?.serverId && settings?.allianceId ? settings : null;
    } catch {
        return null;
    }
}

function getAllianceRankingApiBase() {
    if (window.__BENBEN_RANKING_API_BASE__) {
        return String(window.__BENBEN_RANKING_API_BASE__).replace(/\/$/, '');
    }
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return '//localhost:8081/benben-ranking-api';
    }
    return '/benben-ranking-api';
}

function collectRemoteAllianceMembers(payload, allianceId) {
    const targetId = Number(allianceId);
    const members = new Map();
    Object.values(payload?.rankings || {}).forEach(ranking => {
        (ranking?.rows || []).forEach(row => {
            if (row?.entity_type !== 'player' || Number(row.alliance_id) !== targetId || !row.uid) return;
            const uid = String(row.uid);
            const previous = members.get(uid) || {};
            const isPowerRanking = Number(ranking.type) === 3;
            members.set(uid, {
                uid,
                name: String(row.name || previous.name || `玩家 ${uid}`).trim(),
                power: Math.max(Number(previous.power || 0), Number(row.power || 0), isPowerRanking ? Number(row.score || 0) : 0),
                alliance: row.alliance_abbr
                    ? `[${row.alliance_abbr}] ${row.alliance_name || ''}`.trim()
                    : String(row.alliance_name || previous.alliance || '').trim(),
                role: Number(row.town_center_level || previous.townCenterLevel || 0)
                    ? `城镇中心 Lv.${Number(row.town_center_level || previous.townCenterLevel)}`
                    : '',
                townCenterLevel: Math.max(Number(previous.townCenterLevel || 0), Number(row.town_center_level || 0))
            });
        });
    });
    return [...members.values()]
        .sort((a, b) => (b.power - a.power) || a.name.localeCompare(b.name, 'zh-CN'))
        .map((member, index) => ({ ...member, rank: index + 1 }));
}

async function fetchConfiguredAllianceMembers() {
    const settings = loadAllianceDataSettings();
    if (!settings) return null;
    const response = await fetch(`${getAllianceRankingApiBase()}/${Number(settings.serverId)}.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const members = collectRemoteAllianceMembers(payload, settings.allianceId);
    if (!members.length) throw new Error('当前排行榜中没有找到已配置联盟的成员');
    return {
        members,
        source: `${settings.serverId}区 ${settings.allianceAbbr ? `[${settings.allianceAbbr}] ` : ''}${settings.allianceName || '联盟'}`
    };
}

function normalizeSwordTaskPriority(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(999, parsed));
}

function normalizeSwordTask(task, index = 0) {
    return {
        id: String(task?.id || `task-${Date.now()}-${index}`),
        name: String(task?.name || task?.任务名称 || `神剑任务 ${index + 1}`).trim(),
        priority: normalizeSwordTaskPriority(task?.priority ?? task?.优先级 ?? task?.任务优先级 ?? 0),
        members: Array.isArray(task?.members)
            ? Array.from(new Set(task.members.map(name => String(name || '').trim()).filter(Boolean)))
            : []
    };
}

function sortSwordTasksByPriority(tasks) {
    return [...tasks].sort((a, b) => {
        const priorityDiff = normalizeSwordTaskPriority(b.priority) - normalizeSwordTaskPriority(a.priority);
        if (priorityDiff) return priorityDiff;
        return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
    });
}

function getSwordTaskPriorityClass(task) {
    if (task?.system) return 'is-priority-top is-priority-tier-t0';
    const priority = normalizeSwordTaskPriority(task?.priority);
    if (priority >= 5) return 'is-priority-top is-priority-tier-t0';
    if (priority >= 3) return 'is-priority-high is-priority-tier-t1';
    if (priority >= 2) return 'is-priority-high is-priority-tier-t2';
    if (priority > 0) return 'is-priority-medium is-priority-tier-t3';
    return 'is-priority-low is-priority-tier-t4';
}

function getSwordTaskPriorityTier(task) {
    if (task?.system) return 'T0';
    const priority = normalizeSwordTaskPriority(task?.priority);
    if (priority >= 5) return 'T0';
    if (priority >= 3) return 'T1';
    if (priority >= 2) return 'T2';
    if (priority > 0) return 'T3';
    return 'T4';
}

function loadSwordTasks() {
    try {
        const raw = JSON.parse(localStorage.getItem(getSwordTasksStorageKey()) || '[]');
        if (!Array.isArray(raw)) return [];
        return sortSwordTasksByPriority(raw.map(normalizeSwordTask));
    } catch {
        return [];
    }
}

function saveSwordTasks(tasks) {
    localStorage.setItem(getSwordTasksStorageKey(), JSON.stringify(sortSwordTasksByPriority(tasks.map(normalizeSwordTask))));
}

function getSwordTasks() {
    const tasks = loadSwordTasks();
    if (tasks.length) return tasks;
    const defaults = [
        { id: 'task-attack-center', name: '进攻神剑祭坛', priority: 30, members: [] },
        { id: 'task-defend-center', name: '防守神剑祭坛', priority: 20, members: [] },
        { id: 'task-rally-counter', name: '反集结支援', priority: 10, members: [] }
    ];
    saveSwordTasks(defaults);
    return defaults;
}

function getFirstOccupationMembers() {
    return Array.from(new Set(
        getLivePowerMemberPlacements()
            .filter(item => !item.cityPlacement)
            .map(item => item?.member?.name)
            .filter(Boolean)
    ));
}

function getEntityPlacementKey(entity) {
    if (!entity) return '';
    return [entity.type, entity.x, entity.y, entity.width, entity.height, entity.name || ''].join('|');
}

function getSwordPlacementStorageKey(legionId = activeSwordLegion) {
    return `${SWORD_PLACEMENTS_STORAGE_PREFIX}-${legionId}`;
}

function getSwordRosterStorageKey(legionId = activeSwordLegion) {
    return `${SWORD_ROSTER_STORAGE_PREFIX}-${legionId}`;
}

function getSwordRoster(legionId = activeSwordLegion) {
    try {
        const raw = JSON.parse(localStorage.getItem(getSwordRosterStorageKey(legionId)) || '[]');
        return Array.isArray(raw)
            ? Array.from(new Set(raw.map(name => String(name || '').trim()).filter(Boolean)))
            : [];
    } catch {
        return [];
    }
}

function setSwordRoster(names, legionId = activeSwordLegion) {
    const unique = Array.from(new Set(names.map(name => String(name || '').trim()).filter(Boolean)));
    localStorage.setItem(getSwordRosterStorageKey(legionId), JSON.stringify(unique));
    updateSwordRosterSummary();
    renderSwordRosterMemberList();
    renderSwordAssignMemberList();
    renderFilteredPowerRankings();
}

function updateSwordRosterSummary() {
    const count = document.getElementById('swordRosterCount');
    if (count) {
        const legionName = activeSwordLegion === 'legion1' ? '军团1' : '军团2';
        count.textContent = `${legionName} 报名 ${getSwordRoster().length} 人`;
    }
}

function getFilteredRosterMembers() {
    const keyword = String(document.getElementById('swordRosterSearchInput')?.value || '').trim().toLowerCase();
    return powerRankingMembers.filter(member => {
        if (!keyword) return true;
        return String(member.name || '').toLowerCase().includes(keyword);
    });
}

function openSwordRosterModal() {
    const title = document.getElementById('swordRosterTitle');
    const search = document.getElementById('swordRosterSearchInput');
    if (title) title.textContent = `${activeSwordLegion === 'legion1' ? '军团1' : '军团2'}参战人员报名`;
    if (search) search.value = '';
    document.getElementById('swordRosterModal')?.classList.remove('hidden');
    renderSwordRosterMemberList();
    search?.focus();
}

function closeSwordRosterModal() {
    document.getElementById('swordRosterModal')?.classList.add('hidden');
}

function renderSwordRosterMemberList() {
    const list = document.getElementById('swordRosterMemberList');
    if (!list) return;
    list.innerHTML = '';
    const roster = new Set(getSwordRoster());
    const members = getFilteredRosterMembers();
    if (!members.length) {
        const empty = document.createElement('p');
        empty.className = 'sword-task-empty';
        empty.textContent = powerRankingMembers.length ? '没有匹配的成员' : '请先导入联盟成员数据';
        list.appendChild(empty);
        return;
    }
    members.forEach(member => {
        const checked = roster.has(member.name);
        const row = document.createElement('label');
        row.className = 'sword-assign-member';
        row.classList.toggle('is-selected', checked);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.addEventListener('change', () => {
            const next = new Set(getSwordRoster());
            if (checkbox.checked) next.add(member.name);
            else next.delete(member.name);
            setSwordRoster(Array.from(next));
        });
        const body = document.createElement('span');
        body.className = 'sword-assign-member__body';
        const name = document.createElement('strong');
        name.textContent = member.name;
        const meta = document.createElement('em');
        meta.textContent = `${formatPowerValue(member.power)}${member.alliance ? ` · ${member.alliance}` : ''}${member.role ? ` · ${member.role}` : ''}`;
        body.appendChild(name);
        body.appendChild(meta);
        row.appendChild(checkbox);
        row.appendChild(body);
        list.appendChild(row);
    });
}

function selectFilteredSwordRoster() {
    const next = new Set(getSwordRoster());
    getFilteredRosterMembers().forEach(member => next.add(member.name));
    setSwordRoster(Array.from(next));
}

function clearSwordRoster() {
    if (!confirm('确定清空当前军团的报名人员吗？')) return;
    setSwordRoster([]);
}

function saveSwordPlacementsForLegion(legionId = activeSwordLegion) {
    const data = placedPowerMembers
        .filter(item => !item.cityPlacement && item.targetEntity && entities.includes(item.targetEntity))
        .map(item => ({
            member: serializePowerRankingMembers([item.member])[0],
            targetKey: getEntityPlacementKey(item.targetEntity),
            leader: Boolean(item.leader)
        }));
    localStorage.setItem(getSwordPlacementStorageKey(legionId), JSON.stringify(data));
}

function loadSwordPlacementsForLegion(legionId = activeSwordLegion) {
    let saved = [];
    try {
        saved = JSON.parse(localStorage.getItem(getSwordPlacementStorageKey(legionId)) || '[]');
    } catch {
        saved = [];
    }
    const nonSwordPlacements = placedPowerMembers.filter(item => item.cityPlacement);
    const restored = Array.isArray(saved)
        ? saved.map(item => {
            const targetEntity = entities.find(entity => getEntityPlacementKey(entity) === item.targetKey);
            if (!targetEntity) return null;
            const member = normalizePowerRankingMember(item.member || {}, 0);
            return {
                member,
                targetEntity,
                leader: Boolean(item.leader || isAllianceLeader(member.name)),
                placedAt: Date.now()
            };
        }).filter(Boolean)
        : [];
    placedPowerMembers = [...nonSwordPlacements, ...restored];
}

function updateSwordLegionButtons() {
    document.querySelectorAll('[data-sword-legion]').forEach(button => {
        const active = button.dataset.swordLegion === activeSwordLegion;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function switchSwordLegion(legionId) {
    const normalized = legionId === 'legion2' ? 'legion2' : 'legion1';
    if (normalized === activeSwordLegion) return;
    saveSwordPlacementsForLegion(activeSwordLegion);
    activeSwordLegion = normalized;
    localStorage.setItem(SWORD_ACTIVE_LEGION_STORAGE_KEY, activeSwordLegion);
    loadSwordPlacementsForLegion(activeSwordLegion);
    updateSwordLegionButtons();
    updateSwordRosterSummary();
    renderSwordRosterMemberList();
    renderSwordTaskPanel();
    renderFilteredPowerRankings();
    redraw();
    showShortcutToast(activeSwordLegion === 'legion1' ? '已切换：军团1' : '已切换：军团2');
}

function getVisibleSwordTasks() {
    return [
        {
            id: SWORD_FIRST_OCCUPATION_TASK_ID,
            name: '首占任务',
            members: getFirstOccupationMembers(),
            system: true
        },
        ...getSwordTasks()
    ];
}

function setSwordTasks(tasks) {
    saveSwordTasks(tasks);
    renderSwordTaskPanel();
}

function addSwordTask() {
    const input = document.getElementById('newSwordTaskNameInput');
    const name = String(input?.value || '').trim() || `神剑任务 ${getSwordTasks().length + 1}`;
    const tasks = getSwordTasks();
    tasks.push({ id: `task-${Date.now()}`, name, priority: 0, members: [] });
    if (input) input.value = '';
    setSwordTasks(tasks);
}

function updateSwordTaskName(taskId, name) {
    const tasks = getSwordTasks();
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    task.name = String(name || '').trim() || '未命名任务';
    setSwordTasks(tasks);
}

function updateSwordTaskPriority(taskId, priority) {
    const tasks = getSwordTasks();
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    task.priority = normalizeSwordTaskPriority(priority);
    setSwordTasks(tasks);
}

function deleteSwordTask(taskId) {
    setSwordTasks(getSwordTasks().filter(task => task.id !== taskId));
}

function addMemberToSwordTask(taskId, memberName) {
    const name = String(memberName || '').trim();
    if (!name) return;
    const tasks = getSwordTasks();
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    if (!task.members.includes(name)) {
        task.members.push(name);
        setSwordTasks(tasks);
    }
}

function removeMemberFromSwordTask(taskId, memberName) {
    const tasks = getSwordTasks();
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    task.members = task.members.filter(name => name !== memberName);
    setSwordTasks(tasks);
}

let activeSwordAssignTaskId = null;

function getMemberTaskNames(memberName, { excludeTaskId = '' } = {}) {
    const name = String(memberName || '').trim();
    if (!name) return [];
    return getVisibleSwordTasks()
        .filter(task => task.id !== excludeTaskId && task.members.includes(name))
        .map(task => task.name);
}

function openSwordAssignModal(taskId) {
    const task = getSwordTasks().find(item => item.id === taskId);
    if (!task) return;
    activeSwordAssignTaskId = taskId;
    const modal = document.getElementById('swordAssignModal');
    const title = document.getElementById('swordAssignTitle');
    const search = document.getElementById('swordAssignSearchInput');
    if (title) title.textContent = `人员派遣：${task.name}`;
    if (search) search.value = '';
    modal?.classList.remove('hidden');
    renderSwordAssignMemberList();
    search?.focus();
}

function closeSwordAssignModal() {
    activeSwordAssignTaskId = null;
    document.getElementById('swordAssignModal')?.classList.add('hidden');
}

function renderSwordAssignMemberList() {
    const list = document.getElementById('swordAssignMemberList');
    if (!list) return;
    list.innerHTML = '';
    const task = getSwordTasks().find(item => item.id === activeSwordAssignTaskId);
    if (!task) return;
    const keyword = String(document.getElementById('swordAssignSearchInput')?.value || '').trim().toLowerCase();
    const roster = new Set(getSwordRoster());
    const members = powerRankingMembers.filter(member => {
        if (!roster.has(member.name)) return false;
        if (!keyword) return true;
        return String(member.name || '').toLowerCase().includes(keyword);
    });

    if (!members.length) {
        const empty = document.createElement('p');
        empty.className = 'sword-task-empty';
        empty.textContent = getSwordRoster().length ? '没有匹配的报名成员' : '请先点击“参战报名”选择本军团人员';
        list.appendChild(empty);
        return;
    }

    members.forEach(member => {
        const selected = task.members.includes(member.name);
        const row = document.createElement('label');
        row.className = 'sword-assign-member';
        row.classList.toggle('is-selected', selected);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selected;
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                addMemberToSwordTask(task.id, member.name);
            } else {
                removeMemberFromSwordTask(task.id, member.name);
            }
            activeSwordAssignTaskId = task.id;
            renderSwordAssignMemberList();
        });

        const body = document.createElement('span');
        body.className = 'sword-assign-member__body';
        const name = document.createElement('strong');
        name.textContent = member.name;
        const meta = document.createElement('em');
        const otherTasks = getMemberTaskNames(member.name, { excludeTaskId: task.id });
        meta.textContent = otherTasks.length
            ? `已派：${otherTasks.join('、')}`
            : '暂无其他任务';
        body.appendChild(name);
        body.appendChild(meta);

        row.appendChild(checkbox);
        row.appendChild(body);
        list.appendChild(row);
    });
}

function openSwordTaskDrawer() {
    document.getElementById('swordTaskDrawerModal')?.classList.remove('hidden');
    renderSwordTaskDrawer();
}

function closeSwordTaskDrawer() {
    document.getElementById('swordTaskDrawerModal')?.classList.add('hidden');
}

function renderSwordTaskDrawer() {
    const list = document.getElementById('swordTaskDrawerList');
    if (!list) return;
    list.innerHTML = '';
    const tasks = getVisibleSwordTasks();
    const memberTaskMap = new Map();
    tasks.forEach(task => {
        task.members.forEach(memberName => {
            const names = memberTaskMap.get(memberName) || [];
            names.push(task.system ? task.name : `${task.name}（P${normalizeSwordTaskPriority(task.priority)}）`);
            memberTaskMap.set(memberName, names);
        });
    });

    const memberSection = document.createElement('section');
    memberSection.className = 'sword-task-drawer-section sword-task-drawer-section--wide';
    const memberTitle = document.createElement('h3');
    memberTitle.textContent = '成员任务视图';
    memberSection.appendChild(memberTitle);

    if (memberTaskMap.size) {
        const memberGrid = document.createElement('div');
        memberGrid.className = 'sword-member-task-grid';
        Array.from(memberTaskMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
            .forEach(([memberName, taskNames]) => {
                const row = document.createElement('div');
                row.className = 'sword-member-task-row';
                const name = document.createElement('strong');
                name.textContent = memberName;
                const taskText = document.createElement('span');
                taskText.textContent = taskNames.join('、');
                row.appendChild(name);
                row.appendChild(taskText);
                memberGrid.appendChild(row);
            });
        memberSection.appendChild(memberGrid);
    } else {
        const empty = document.createElement('p');
        empty.className = 'sword-task-empty';
        empty.textContent = '暂无成员任务';
        memberSection.appendChild(empty);
    }
    list.appendChild(memberSection);

    const taskSection = document.createElement('section');
    taskSection.className = 'sword-task-drawer-section sword-task-drawer-section--wide';
    const taskTitle = document.createElement('h3');
    taskTitle.textContent = '任务成员视图';
    taskSection.appendChild(taskTitle);
    const taskGrid = document.createElement('div');
    taskGrid.className = 'sword-task-drawer-grid';
    tasks.forEach(task => {
        const card = document.createElement('article');
        card.className = 'sword-task-drawer-card';
        const drawerPriorityClass = getSwordTaskPriorityClass(task);
        if (drawerPriorityClass) card.classList.add(...drawerPriorityClass.split(' '));
        const title = document.createElement('div');
        title.className = 'sword-task-drawer-title';
        const tier = document.createElement('span');
        tier.className = 'sword-task-tier-badge';
        tier.textContent = getSwordTaskPriorityTier(task);
        const name = document.createElement('strong');
        name.textContent = task.system ? `${task.name}（地图拖拽生成）` : task.name;
        const priority = document.createElement('em');
        priority.textContent = task.system ? '默认最高' : `优先级 ${normalizeSwordTaskPriority(task.priority)}`;
        title.appendChild(tier);
        title.appendChild(name);
        title.appendChild(priority);
        const members = document.createElement('div');
        members.className = 'sword-task-members';
        if (task.members.length) {
            task.members.forEach(name => {
                const chip = document.createElement('span');
                chip.className = 'sword-task-member';
                chip.textContent = name;
                members.appendChild(chip);
            });
        } else {
            const empty = document.createElement('p');
            empty.className = 'sword-task-empty';
            empty.textContent = '暂无成员';
            members.appendChild(empty);
        }
        card.appendChild(title);
        card.appendChild(members);
        taskGrid.appendChild(card);
    });
    taskSection.appendChild(taskGrid);
    list.appendChild(taskSection);
}

function buildSwordTaskExportRows() {
    const tasks = getVisibleSwordTasks();
    const taskRows = [];
    const memberTaskMap = new Map();
    const legionName = activeSwordLegion === 'legion1' ? '军团1' : '军团2';
    const rosterRows = getSwordRoster().map(memberName => {
        const member = powerRankingMembers.find(item => item.name === memberName);
        return {
            战场: legionName,
            成员名称: memberName,
            战力: member ? member.power : '',
            联盟: member?.alliance || '',
            职位: member?.role || ''
        };
    });

    tasks.forEach(task => {
        const members = task.members.length ? task.members : [''];
        members.forEach(memberName => {
            taskRows.push({
                战场: legionName,
                任务名称: task.name,
                任务优先级: task.system ? '' : normalizeSwordTaskPriority(task.priority),
                成员名称: memberName,
                任务类型: task.system ? '系统任务' : '普通任务',
                说明: task.system ? '首占任务由地图拖拽自动生成，导入时不会覆盖' : ''
            });
            if (memberName) {
                const names = memberTaskMap.get(memberName) || [];
                names.push(task.name);
                memberTaskMap.set(memberName, names);
            }
        });
    });

    const memberRows = Array.from(memberTaskMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
        .map(([memberName, taskNames]) => ({
            战场: legionName,
            成员名称: memberName,
            参与任务: taskNames.join('、')
        }));

    return { taskRows, memberRows, rosterRows };
}

function exportSwordTaskPlan() {
    const XLSX = window.XLSX;
    const { taskRows, memberRows, rosterRows } = buildSwordTaskExportRows();
    const legionName = activeSwordLegion === 'legion1' ? '军团1' : '军团2';
    if (!XLSX?.utils?.json_to_sheet) {
        downloadTextFile('神剑任务安排.json', JSON.stringify({
            version: 1,
            exportedAt: new Date().toISOString(),
            tasks: getSwordTasks()
        }, null, 2));
        return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rosterRows), '参战报名名单');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(memberRows), '成员任务汇总');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(taskRows), '任务成员安排');
    XLSX.writeFile(workbook, `神剑任务安排-${legionName}.xlsx`);
}

function normalizeImportedSwordTaskRows(rows) {
    const taskMap = new Map();
    rows.forEach(row => {
        const taskName = String(row?.任务名称 ?? row?.task ?? row?.taskName ?? row?.任务 ?? '').trim();
        const memberName = String(row?.成员名称 ?? row?.member ?? row?.memberName ?? row?.成员 ?? row?.name ?? '').trim();
        const taskType = String(row?.任务类型 ?? row?.type ?? '').trim();
        const priority = normalizeSwordTaskPriority(row?.任务优先级 ?? row?.优先级 ?? row?.priority);
        if (!taskName || taskName === '首占任务' || taskType === '系统任务') return;
        if (!taskMap.has(taskName)) {
            taskMap.set(taskName, {
                id: `task-import-${Date.now()}-${taskMap.size}`,
                name: taskName,
                priority,
                members: []
            });
        } else if (priority > normalizeSwordTaskPriority(taskMap.get(taskName).priority)) {
            taskMap.get(taskName).priority = priority;
        }
        if (memberName) {
            const task = taskMap.get(taskName);
            if (!task.members.includes(memberName)) task.members.push(memberName);
        }
    });
    return Array.from(taskMap.values());
}

function parseSwordTaskPlanText(text) {
    const value = String(text || '').trim();
    if (!value) return [];
    if (value.startsWith('{') || value.startsWith('[')) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return normalizeImportedSwordTaskRows(parsed);
        if (Array.isArray(parsed.tasks)) {
            return parsed.tasks
                .filter(task => task?.id !== SWORD_FIRST_OCCUPATION_TASK_ID && task?.name !== '首占任务')
                .map((task, index) => normalizeSwordTask({
                    ...task,
                    id: String(task.id || `task-import-${Date.now()}-${index}`)
                }, index));
        }
    }

    const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const headers = parseDelimitedLine(lines[0]);
    const hasHeader = headers.some(item => ['任务名称', '任务', 'task', 'taskName', '成员名称', '成员', 'member', 'memberName'].includes(item));
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const normalizedHeaders = hasHeader ? headers : ['任务名称', '成员名称'];

    return normalizeImportedSwordTaskRows(dataLines.map(line => {
        const cells = parseDelimitedLine(line);
        const row = {};
        normalizedHeaders.forEach((header, index) => {
            row[header] = cells[index] || '';
        });
        return row;
    }));
}

async function parseSwordTaskPlanFile(file) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = window.XLSX;
        if (!XLSX?.read) throw new Error('Excel 解析库未加载');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const preferredSheet = workbook.SheetNames.includes('任务成员安排')
            ? '任务成员安排'
            : workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[preferredSheet], { defval: '' });
        return normalizeImportedSwordTaskRows(rows);
    }
    return parseSwordTaskPlanText(await file.text());
}

async function importSwordTaskPlanFile(file) {
    const tasks = await parseSwordTaskPlanFile(file);
    if (!tasks.length) {
        window.alert('没有解析到可导入的普通任务安排。首占任务不会从表格导入。');
        return;
    }
    setSwordTasks(tasks);
    showShortcutToast(`已导入任务安排：${tasks.length} 个任务`);
}

function renderSwordTaskPanel() {
    const list = document.getElementById('swordTaskList');
    if (!list) return;
    list.innerHTML = '';

    const tasks = getVisibleSwordTasks();

    tasks.forEach(task => {
        const item = document.createElement('article');
        item.className = 'sword-task-item';
        item.classList.toggle('is-system', Boolean(task.system));
        const priorityClass = getSwordTaskPriorityClass(task);
        if (priorityClass) item.classList.add(...priorityClass.split(' '));

        const titleRow = document.createElement('div');
        titleRow.className = 'sword-task-title-row';

        if (task.system) {
            const systemTitle = document.createElement('div');
            systemTitle.className = 'sword-task-system-title';
            systemTitle.innerHTML = '<strong>首占任务</strong><span>地图拖拽成员自动进入，不可手动编辑</span>';
            titleRow.appendChild(systemTitle);
        } else {
            const nameInput = document.createElement('input');
            nameInput.className = 'sword-task-name';
            nameInput.value = task.name;
            nameInput.maxLength = 24;
            nameInput.addEventListener('change', () => updateSwordTaskName(task.id, nameInput.value));

            const priorityField = document.createElement('label');
            priorityField.className = 'sword-task-priority';
            const priorityText = document.createElement('span');
            priorityText.textContent = '优先级';
            const priorityInput = document.createElement('input');
            priorityInput.type = 'number';
            priorityInput.min = '0';
            priorityInput.max = '999';
            priorityInput.step = '1';
            priorityInput.value = normalizeSwordTaskPriority(task.priority);
            priorityInput.addEventListener('change', () => updateSwordTaskPriority(task.id, priorityInput.value));
            priorityField.appendChild(priorityText);
            priorityField.appendChild(priorityInput);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'sword-task-delete';
            deleteButton.textContent = '删';
            deleteButton.title = '删除任务';
            deleteButton.addEventListener('click', () => deleteSwordTask(task.id));

            titleRow.appendChild(nameInput);
            titleRow.appendChild(priorityField);
            titleRow.appendChild(deleteButton);
        }

        const members = document.createElement('div');
        members.className = 'sword-task-members';
        if (task.members.length) {
            task.members.forEach(memberName => {
                const chip = document.createElement('span');
                chip.className = 'sword-task-member';
                chip.append(document.createTextNode(memberName));
                if (!task.system) {
                    const remove = document.createElement('button');
                    remove.type = 'button';
                    remove.textContent = '×';
                    remove.title = '移除成员';
                    remove.addEventListener('click', () => removeMemberFromSwordTask(task.id, memberName));
                    chip.appendChild(remove);
                }
                members.appendChild(chip);
            });
        } else {
            const empty = document.createElement('p');
            empty.className = 'sword-task-empty';
            empty.textContent = '还没有派出成员';
            members.appendChild(empty);
        }

        item.appendChild(titleRow);
        item.appendChild(members);
        if (!task.system) {
            const assignButton = document.createElement('button');
            assignButton.type = 'button';
            assignButton.className = 'sword-task-assign-button';
            assignButton.textContent = '人员派遣';
            assignButton.addEventListener('click', () => openSwordAssignModal(task.id));
            item.appendChild(assignButton);
        }
        list.appendChild(item);
    });
    renderSwordTaskDrawer();
}

function getPowerRankingEditorText() {
    const rows = serializePowerRankingMembers();
    const header = '排名,名称,战力,联盟,职位';
    const lines = rows.map(member => [
        member.rank,
        member.name,
        member.power,
        member.alliance,
        member.role
    ].map(csvEscape).join(','));
    return [header, ...lines].join('\n');
}

function parseDelimitedLine(line) {
    const values = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"' && quoted && next === '"') {
            current += '"';
            i += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if ((char === ',' || char === '\t') && !quoted) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

function parsePowerRankingText(text) {
    const value = String(text || '').trim();
    if (!value) return [];
    if (value.startsWith('[') || value.startsWith('{')) {
        return extractPowerRankingMembers(JSON.parse(value));
    }

    const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const first = parseDelimitedLine(lines[0]).map(item => item.toLowerCase());
    const hasHeader = first.some(item => ['rank', 'ranking', '排名', 'name', '名称', '名字', 'power', '战力', 'alliance', '联盟', 'role', '职位'].includes(item));
    const headers = hasHeader ? first : ['排名', '名称', '战力', '联盟', '职位'];
    const dataLines = hasHeader ? lines.slice(1) : lines;

    function findIndex(names, fallback) {
        const index = headers.findIndex(header => names.includes(header));
        return index >= 0 ? index : fallback;
    }

    const rankIndex = findIndex(['rank', 'ranking', '排名'], 0);
    const nameIndex = findIndex(['name', 'nickname', 'player', 'member', '名称', '名字', '玩家'], 1);
    const powerIndex = findIndex(['power', 'battlepower', 'score', '战力', '实力', '积分'], 2);
    const allianceIndex = findIndex(['alliance', 'guild', '联盟', '盟'], 3);
    const roleIndex = findIndex(['role', 'position', '职位', '定位'], 4);

    return extractPowerRankingMembers(dataLines.map((line, index) => {
        const cells = parseDelimitedLine(line);
        return {
            rank: cells[rankIndex] || index + 1,
            name: cells[nameIndex],
            power: cells[powerIndex],
            alliance: cells[allianceIndex],
            role: cells[roleIndex]
        };
    }).filter(item => item.name));
}

function downloadTextFile(filename, text, type = 'application/json;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function exportPowerRankingsAsJson() {
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        members: serializePowerRankingMembers()
    };
    downloadTextFile('联盟成员战力榜.json', JSON.stringify(payload, null, 2));
}

function exportPowerRankingsAsExcel() {
    const rows = serializePowerRankingMembers().map(member => ({
        排名: member.rank,
        名称: member.name,
        战力: member.power,
        联盟: member.alliance,
        职位: member.role
    }));
    const XLSX = window.XLSX;
    if (!XLSX?.utils?.json_to_sheet) {
        downloadTextFile('联盟成员战力榜.csv', getPowerRankingEditorText(), 'text/csv;charset=utf-8');
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '成员战力榜');
    XLSX.writeFile(workbook, '联盟成员战力榜.xlsx');
}

async function parsePowerRankingFile(file) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'json') {
        return extractPowerRankingMembers(JSON.parse(await file.text()));
    }
    if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = window.XLSX;
        if (!XLSX?.read) throw new Error('Excel 解析库未加载');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        return extractPowerRankingMembers(rows);
    }
    return parsePowerRankingText(await file.text());
}

function openPowerRankingEditor() {
    const modal = document.getElementById('powerRankingEditorModal');
    const textarea = document.getElementById('powerRankingEditorText');
    if (!modal || !textarea) return;
    textarea.value = getPowerRankingEditorText();
    modal.classList.remove('hidden');
    textarea.focus();
}

function closePowerRankingEditor() {
    document.getElementById('powerRankingEditorModal')?.classList.add('hidden');
}

function savePowerRankingEditor() {
    const textarea = document.getElementById('powerRankingEditorText');
    if (!textarea) return;
    try {
        const members = parsePowerRankingText(textarea.value);
        if (!members.length) {
            window.alert('没有解析到成员数据，请检查格式。');
            return;
        }
        setPowerRankingMembers(members, { persist: true, source: '手动编辑' });
        closePowerRankingEditor();
    } catch (error) {
        console.warn('Failed to parse manual power rankings', error);
        window.alert('解析失败，请检查 JSON 或表格文本格式。');
    }
}

function installSwordTaskPanel() {
    const addButton = document.getElementById('addSwordTaskButton');
    const drawerButton = document.getElementById('openSwordTaskDrawerButton');
    const importButton = document.getElementById('importSwordTaskPlanButton');
    const exportButton = document.getElementById('exportSwordTaskPlanButton');
    const importInput = document.getElementById('swordTaskPlanFileInput');
    const input = document.getElementById('newSwordTaskNameInput');
    const rosterButton = document.getElementById('openSwordRosterButton');
    const rosterModal = document.getElementById('swordRosterModal');
    const rosterCloseButton = document.getElementById('closeSwordRosterModalButton');
    const rosterSearch = document.getElementById('swordRosterSearchInput');
    const selectFilteredRosterButton = document.getElementById('selectFilteredSwordRosterButton');
    const clearRosterButton = document.getElementById('clearSwordRosterButton');
    const assignModal = document.getElementById('swordAssignModal');
    const closeAssignButton = document.getElementById('closeSwordAssignModalButton');
    const assignSearch = document.getElementById('swordAssignSearchInput');
    const drawerModal = document.getElementById('swordTaskDrawerModal');
    const closeDrawerButton = document.getElementById('closeSwordTaskDrawerButton');
    document.querySelectorAll('[data-sword-legion]').forEach(button => {
        if (button.dataset.bound === 'true') return;
        button.dataset.bound = 'true';
        button.addEventListener('click', () => switchSwordLegion(button.dataset.swordLegion));
    });
    if (addButton && addButton.dataset.bound !== 'true') {
        addButton.dataset.bound = 'true';
        addButton.addEventListener('click', addSwordTask);
    }
    if (drawerButton && drawerButton.dataset.bound !== 'true') {
        drawerButton.dataset.bound = 'true';
        drawerButton.addEventListener('click', openSwordTaskDrawer);
    }
    if (exportButton && exportButton.dataset.bound !== 'true') {
        exportButton.dataset.bound = 'true';
        exportButton.addEventListener('click', exportSwordTaskPlan);
    }
    if (importButton && importInput && importButton.dataset.bound !== 'true') {
        importButton.dataset.bound = 'true';
        importButton.addEventListener('click', () => importInput.click());
    }
    if (importInput && importInput.dataset.bound !== 'true') {
        importInput.dataset.bound = 'true';
        importInput.addEventListener('change', async () => {
            const file = importInput.files?.[0];
            importInput.value = '';
            if (!file) return;
            try {
                await importSwordTaskPlanFile(file);
            } catch (error) {
                console.warn('Failed to import sword task plan', error);
                window.alert('导入失败，请确认文件是神剑任务安排 xlsx/json/csv。');
            }
        });
    }
    if (input && input.dataset.bound !== 'true') {
        input.dataset.bound = 'true';
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addSwordTask();
            }
        });
    }
    if (rosterButton && rosterButton.dataset.bound !== 'true') {
        rosterButton.dataset.bound = 'true';
        rosterButton.addEventListener('click', openSwordRosterModal);
    }
    if (rosterCloseButton && rosterCloseButton.dataset.bound !== 'true') {
        rosterCloseButton.dataset.bound = 'true';
        rosterCloseButton.addEventListener('click', closeSwordRosterModal);
    }
    if (rosterSearch && rosterSearch.dataset.bound !== 'true') {
        rosterSearch.dataset.bound = 'true';
        rosterSearch.addEventListener('input', renderSwordRosterMemberList);
    }
    if (selectFilteredRosterButton && selectFilteredRosterButton.dataset.bound !== 'true') {
        selectFilteredRosterButton.dataset.bound = 'true';
        selectFilteredRosterButton.addEventListener('click', selectFilteredSwordRoster);
    }
    if (clearRosterButton && clearRosterButton.dataset.bound !== 'true') {
        clearRosterButton.dataset.bound = 'true';
        clearRosterButton.addEventListener('click', clearSwordRoster);
    }
    if (rosterModal && rosterModal.dataset.bound !== 'true') {
        rosterModal.dataset.bound = 'true';
        rosterModal.addEventListener('click', event => {
            if (event.target === rosterModal) closeSwordRosterModal();
        });
    }
    if (closeAssignButton && closeAssignButton.dataset.bound !== 'true') {
        closeAssignButton.dataset.bound = 'true';
        closeAssignButton.addEventListener('click', closeSwordAssignModal);
    }
    if (assignSearch && assignSearch.dataset.bound !== 'true') {
        assignSearch.dataset.bound = 'true';
        assignSearch.addEventListener('input', renderSwordAssignMemberList);
    }
    if (assignModal && assignModal.dataset.bound !== 'true') {
        assignModal.dataset.bound = 'true';
        assignModal.addEventListener('click', event => {
            if (event.target === assignModal) closeSwordAssignModal();
        });
    }
    if (closeDrawerButton && closeDrawerButton.dataset.bound !== 'true') {
        closeDrawerButton.dataset.bound = 'true';
        closeDrawerButton.addEventListener('click', closeSwordTaskDrawer);
    }
    if (drawerModal && drawerModal.dataset.bound !== 'true') {
        drawerModal.dataset.bound = 'true';
        drawerModal.addEventListener('click', event => {
            if (event.target === drawerModal) closeSwordTaskDrawer();
        });
    }
    renderSwordTaskPanel();
    updateSwordRosterSummary();
}

function getPowerRankingFilterRange() {
    const minInput = document.getElementById('powerRankingMinInput');
    const maxInput = document.getElementById('powerRankingMaxInput');
    let min = parsePowerFilterValue(minInput?.value);
    let max = parsePowerFilterValue(maxInput?.value);

    if (min !== null && max !== null && min > max) {
        [min, max] = [max, min];
    }

    return { min, max };
}

function filterPowerRankingMembers(members) {
    const nameInput = document.getElementById('powerRankingNameInput');
    const keyword = String(nameInput?.value || '').trim().toLowerCase();
    const { min, max } = getPowerRankingFilterRange();
    return members.filter(member => {
        if (keyword && !String(member.name || '').toLowerCase().includes(keyword)) return false;
        if (min !== null && member.power < min) return false;
        if (max !== null && member.power > max) return false;
        return true;
    });
}

function getScopedPowerRankingMembers() {
    if (powerRankingScope !== 'roster') return powerRankingMembers;
    const roster = new Set(getSwordRoster());
    return powerRankingMembers.filter(member => roster.has(member.name));
}

function updatePowerRankingScopeTabs() {
    document.querySelectorAll('[data-power-scope]').forEach(button => {
        const active = button.dataset.powerScope === powerRankingScope;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const rosterTab = document.getElementById('powerRankingRosterTab');
    if (rosterTab) {
        rosterTab.textContent = activeSwordLegion === 'legion1' ? '军团1' : '军团2';
    }
}

function renderFilteredPowerRankings() {
    updatePowerRankingScopeTabs();
    renderPowerRankings(filterPowerRankingMembers(getScopedPowerRankingMembers()));
}

function getPowerMemberFromDragEvent(event) {
    if (draggingPowerMember) return draggingPowerMember;
    try {
        const raw = event.dataTransfer?.getData('application/json');
        if (raw) return normalizePowerRankingMember(JSON.parse(raw), 0);
    } catch {}
    const name = event.dataTransfer?.getData('text/plain');
    if (!name) return null;
    return powerRankingMembers.find(member => member.name === name) || { rank: 0, name, power: 0, alliance: '', role: '' };
}

function isPowerMemberDropTarget(entity) {
    return Boolean(entity && ['city', 'building', 'hq', 'node', 'castle', 'turret', 'enemyzone'].includes(entity.type));
}

function getNearestPowerMemberDropTarget(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    let best = null;
    let bestDistance = Infinity;

    entities.forEach(entity => {
        if (!isPowerMemberDropTarget(entity)) return;
        const center = diamondToScreen(entity.x + entity.width / 2 - 0.5, entity.y + entity.height / 2 - 0.5, panX, panY, zoom);
        const distance = Math.hypot(center.x - screenX, center.y - screenY);
        if (distance < bestDistance) {
            best = { entity, center, distance };
            bestDistance = distance;
        }
    });

    return best && best.distance <= 110 ? best : null;
}

function isSwordBattlefieldMode() {
    return document.getElementById('rightSidebar')?.classList.contains('sword-mode') ||
        entities.some(entity => entity?.battlefield === SWORD_BATTLEFIELD_KEY);
}

function getCityDropPositionNearTrap(trap) {
    if (!trap || trap.type !== 'building') return null;
    const candidates = [];
    const gap = 1;
    const offsets = [
        { x: -2 - gap, y: 0 },
        { x: trap.width + gap, y: 0 },
        { x: 0, y: -2 - gap },
        { x: 0, y: trap.height + gap },
        { x: -2 - gap, y: -2 - gap },
        { x: trap.width + gap, y: -2 - gap },
        { x: -2 - gap, y: trap.height + gap },
        { x: trap.width + gap, y: trap.height + gap }
    ];
    offsets.forEach(offset => {
        candidates.push({
            x: trap.x + offset.x,
            y: trap.y + offset.y
        });
    });
    for (const candidate of candidates) {
        const city = { x: candidate.x, y: candidate.y, width: 2, height: 2, type: 'city' };
        if (isPositionValid(candidate.x, candidate.y, city)) return candidate;
    }
    return null;
}

function getNearestTrapDropTarget(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    let best = null;
    let bestDistance = Infinity;
    entities.forEach(entity => {
        if (entity.type !== 'building') return;
        const center = diamondToScreen(entity.x + entity.width / 2 - 0.5, entity.y + entity.height / 2 - 0.5, panX, panY, zoom);
        const distance = Math.hypot(center.x - screenX, center.y - screenY);
        if (distance < bestDistance) {
            best = entity;
            bestDistance = distance;
        }
    });
    return best && bestDistance <= 130 ? best : null;
}

function createCityFromPowerMember(member, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const grid = screenToDiamond(clientX - rect.left, clientY - rect.top);
    const trap = getNearestTrapDropTarget(clientX, clientY);
    const nearTrapPosition = getCityDropPositionNearTrap(trap);
    const x = nearTrapPosition?.x ?? grid.x;
    const y = nearTrapPosition?.y ?? grid.y;
    const city = {
        x,
        y,
        width: 2,
        height: 2,
        type: 'city',
        color: getRandomColor(),
        id: cityCounterId++,
        name: member.name,
        allianceId: normalizeAllianceId(activeAllianceId),
        powerMemberCity: true
    };

    if (!isPositionValid(city.x, city.y, city)) {
        alert('这个位置不能放置城市，请换个空位再拖放。');
        return null;
    }

    entities.push(city);
    placedPowerMembers = placedPowerMembers.filter(item => normalizeMemberKey(item.member.name) !== normalizeMemberKey(member.name));
    placedPowerMembers.push({
        member,
        targetEntity: city,
        leader: isAllianceLeader(member.name),
        cityPlacement: true,
        placedAt: Date.now()
    });
    setSelection([city], { primaryEntity: city, pulse: true });
    redraw();
    updateCounters();
    updateCityList();
    renderFilteredPowerRankings();
    markUnsavedChanges();
    pushHistory();
    showShortcutToast(`已放置城市：${member.name}`);
    return city;
}

function placePowerMemberOnEntity(member, targetEntity) {
    if (!member || !targetEntity) return;
    const leader = isAllianceLeader(member.name);
    const key = normalizeMemberKey(member.name);
    if (!leader) {
        placedPowerMembers = placedPowerMembers.filter(item => normalizeMemberKey(item.member.name) !== key);
    }
    placedPowerMembers.push({
        member,
        targetEntity,
        leader,
        placedAt: Date.now()
    });
    powerMemberDropPreview = null;
    if (isSwordBattlefieldMode()) saveSwordPlacementsForLegion();
    renderFilteredPowerRankings();
    renderSwordTaskPanel();
    redraw();
}

function getLivePowerMemberPlacements() {
    placedPowerMembers = placedPowerMembers.filter(item => item?.targetEntity && entities.includes(item.targetEntity));
    return placedPowerMembers;
}

function drawPowerMemberLabel(context, x, y, text, { preview = false, leader = false } = {}) {
    context.save();
    const fontSize = preview ? 15 : 13;
    context.font = `900 ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const metrics = context.measureText(text);
    const width = Math.max(58, metrics.width + 22);
    const height = preview ? 30 : 26;
    const radius = 8;
    const left = x - width / 2;
    const top = y - height / 2;

    context.beginPath();
    context.moveTo(left + radius, top);
    context.lineTo(left + width - radius, top);
    context.quadraticCurveTo(left + width, top, left + width, top + radius);
    context.lineTo(left + width, top + height - radius);
    context.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
    context.lineTo(left + radius, top + height);
    context.quadraticCurveTo(left, top + height, left, top + height - radius);
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
    context.closePath();
    context.fillStyle = preview
        ? 'rgba(20, 26, 18, 0.92)'
        : leader
            ? 'rgba(127, 29, 29, 0.95)'
            : 'rgba(35, 45, 28, 0.92)';
    context.fill();
    context.lineWidth = preview ? 2 : 1.5;
    context.strokeStyle = leader ? 'rgba(255, 215, 120, 0.95)' : 'rgba(255, 246, 219, 0.9)';
    context.stroke();
    context.fillStyle = '#fff8df';
    context.fillText(text, x, y + 0.5);
    context.restore();
}

function drawPlacedPowerMembers(context, pX, pY, z) {
    const byTarget = new Map();
    getLivePowerMemberPlacements().forEach(item => {
        if (item.cityPlacement) return;
        const list = byTarget.get(item.targetEntity) || [];
        list.push(item);
        byTarget.set(item.targetEntity, list);
    });

    byTarget.forEach((items, entity) => {
        const center = diamondToScreen(entity.x + entity.width / 2 - 0.5, entity.y + entity.height / 2 - 0.5, pX, pY, z);
        items.forEach((item, index) => {
            drawPowerMemberLabel(context, center.x, center.y - 34 - index * 30, item.member.name, { leader: item.leader });
        });
    });

    if (powerMemberDropPreview?.member && powerMemberDropPreview?.target?.entity) {
        const { entity } = powerMemberDropPreview.target;
        const center = diamondToScreen(entity.x + entity.width / 2 - 0.5, entity.y + entity.height / 2 - 0.5, pX, pY, z);
        drawPowerMemberLabel(context, center.x, center.y - 34, powerMemberDropPreview.member.name, {
            preview: true,
            leader: isAllianceLeader(powerMemberDropPreview.member.name)
        });
    }
}

function renderPowerRankings(members) {
    const list = document.getElementById('powerRankingList');
    const status = document.getElementById('powerRankingStatus');
    const count = document.getElementById('powerRankingCount');
    const total = document.getElementById('powerRankingTotal');
    if (!list || !status || !count || !total) return;

    list.innerHTML = '';
    const totalPower = members.reduce((sum, member) => sum + member.power, 0);
    count.textContent = `${members.length} 人`;
    total.textContent = `总战力 ${formatPowerValue(totalPower)}`;

    if (!members.length) {
        const hasSourceData = powerRankingMembers.length > 0;
        status.textContent = powerRankingScope === 'roster'
            ? (hasSourceData ? '当前军团暂无匹配的参战人员' : '暂无成员数据')
            : (hasSourceData ? '当前筛选暂无成员' : '暂无成员数据');
        status.classList.remove('hidden');
        return;
    }

    status.classList.add('hidden');
    members.forEach(member => {
        const item = document.createElement('li');
        item.className = 'power-ranking-item';
        const leader = isAllianceLeader(member.name);
        const placed = isPowerMemberPlaced(member.name);
        item.classList.toggle('is-leader', leader);
        item.classList.toggle('is-placed', placed && !leader);
        item.draggable = leader || !placed;
        item.dataset.memberName = member.name;

        item.addEventListener('dragstart', event => {
            if (!leader && isPowerMemberPlaced(member.name)) {
                event.preventDefault();
                return;
            }
            draggingPowerMember = member;
            event.dataTransfer?.setData('application/json', JSON.stringify(member));
            event.dataTransfer?.setData('text/plain', member.name);
            if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
        });

        item.addEventListener('dragend', () => {
            draggingPowerMember = null;
            powerMemberDropPreview = null;
            redraw();
        });

        const badge = document.createElement('span');
        badge.className = 'power-ranking-rank';
        badge.textContent = String(member.rank).padStart(2, '0');

        const body = document.createElement('div');
        body.className = 'power-ranking-body';

        const top = document.createElement('div');
        top.className = 'power-ranking-row';
        const name = document.createElement('strong');
        name.textContent = member.name;
        if (leader) {
            const leaderMark = document.createElement('span');
            leaderMark.className = 'power-ranking-leader-mark';
            leaderMark.textContent = '车头';
            name.appendChild(leaderMark);
        }
        const power = document.createElement('em');
        power.textContent = formatPowerValue(member.power);
        top.appendChild(name);
        top.appendChild(power);

        const bottom = document.createElement('div');
        bottom.className = 'power-ranking-tags';
        [member.alliance, member.role].filter(Boolean).forEach(text => {
            const tag = document.createElement('span');
            tag.textContent = text;
            bottom.appendChild(tag);
        });

        body.appendChild(top);
        body.appendChild(bottom);
        item.appendChild(badge);
        item.appendChild(body);
        if (placed) {
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'power-ranking-cancel';
            cancel.textContent = '取消';
            cancel.addEventListener('click', event => {
                event.stopPropagation();
                removePowerMemberPlacement(member.name);
            });
            item.appendChild(cancel);
        }
        list.appendChild(item);
    });
}

async function loadPowerRankings() {
    const status = document.getElementById('powerRankingStatus');
    if (status) {
        status.textContent = '正在读取成员数据...';
        status.classList.remove('hidden');
    }

    try {
        const remote = await fetchConfiguredAllianceMembers();
        if (remote) {
            setPowerRankingMembers(remote.members, { persist: true, source: remote.source });
            return;
        }

        const localMembers = loadPowerRankingMembersFromStorage();
        if (localMembers) {
            setPowerRankingMembers(localMembers, { persist: false, source: '本地成员库' });
            return;
        }

        const response = await fetch(`${POWER_RANKINGS_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        setPowerRankingMembers(payload, { persist: true, source: '默认JSON' });
    } catch (error) {
        console.warn('Failed to load power rankings JSON', error);
        const localMembers = loadPowerRankingMembersFromStorage();
        if (localMembers) {
            setPowerRankingMembers(localMembers, { persist: false, source: '本地缓存（在线更新失败）' });
            if (status) {
                status.textContent = '在线更新失败，已继续使用本地缓存成员';
                status.classList.remove('hidden');
            }
            return;
        }
        powerRankingMembers = [];
        renderPowerRankings([]);
        if (status) {
            status.textContent = '读取失败，请导入 Excel/JSON 或手动编辑成员数据';
            status.classList.remove('hidden');
        }
    }
}

function installPowerRankingPanel() {
    loadAllianceLeaders();
    installSwordTaskPanel();
    const refreshButton = document.getElementById('refreshPowerRankingButton');
    if (refreshButton && refreshButton.dataset.bound !== 'true') {
        refreshButton.dataset.bound = 'true';
        refreshButton.addEventListener('click', loadPowerRankings);
    }
    const importButton = document.getElementById('importPowerRankingButton');
    const editButton = document.getElementById('editPowerRankingButton');
    const exportJsonButton = document.getElementById('exportPowerRankingJsonButton');
    const exportExcelButton = document.getElementById('exportPowerRankingExcelButton');
    const fileInput = document.getElementById('powerRankingFileInput');
    const editorModal = document.getElementById('powerRankingEditorModal');
    const closeEditorButton = document.getElementById('closePowerRankingEditorButton');
    const resetEditorButton = document.getElementById('resetPowerRankingEditorButton');
    const saveEditorButton = document.getElementById('savePowerRankingEditorButton');

    if (importButton && fileInput && importButton.dataset.bound !== 'true') {
        importButton.dataset.bound = 'true';
        importButton.addEventListener('click', () => fileInput.click());
    }
    if (fileInput && fileInput.dataset.bound !== 'true') {
        fileInput.dataset.bound = 'true';
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files?.[0];
            fileInput.value = '';
            if (!file) return;
            try {
                const members = await parsePowerRankingFile(file);
                if (!members.length) {
                    window.alert('没有解析到成员数据，请检查文件内容。');
                    return;
                }
                setPowerRankingMembers(members, { persist: true, source: file.name });
            } catch (error) {
                console.warn('Failed to import power ranking file', error);
                window.alert('导入失败，请确认文件是 Excel、JSON、CSV 或文本格式。');
            }
        });
    }
    if (editButton && editButton.dataset.bound !== 'true') {
        editButton.dataset.bound = 'true';
        editButton.addEventListener('click', openPowerRankingEditor);
    }
    if (exportJsonButton && exportJsonButton.dataset.bound !== 'true') {
        exportJsonButton.dataset.bound = 'true';
        exportJsonButton.addEventListener('click', exportPowerRankingsAsJson);
    }
    if (exportExcelButton && exportExcelButton.dataset.bound !== 'true') {
        exportExcelButton.dataset.bound = 'true';
        exportExcelButton.addEventListener('click', exportPowerRankingsAsExcel);
    }
    if (closeEditorButton && closeEditorButton.dataset.bound !== 'true') {
        closeEditorButton.dataset.bound = 'true';
        closeEditorButton.addEventListener('click', closePowerRankingEditor);
    }
    if (resetEditorButton && resetEditorButton.dataset.bound !== 'true') {
        resetEditorButton.dataset.bound = 'true';
        resetEditorButton.addEventListener('click', () => {
            const textarea = document.getElementById('powerRankingEditorText');
            if (textarea) textarea.value = getPowerRankingEditorText();
        });
    }
    if (saveEditorButton && saveEditorButton.dataset.bound !== 'true') {
        saveEditorButton.dataset.bound = 'true';
        saveEditorButton.addEventListener('click', savePowerRankingEditor);
    }
    if (editorModal && editorModal.dataset.bound !== 'true') {
        editorModal.dataset.bound = 'true';
        editorModal.addEventListener('click', event => {
            if (event.target === editorModal) closePowerRankingEditor();
        });
    }
    const minInput = document.getElementById('powerRankingMinInput');
    const maxInput = document.getElementById('powerRankingMaxInput');
    const nameInput = document.getElementById('powerRankingNameInput');
    document.querySelectorAll('[data-power-scope]').forEach(button => {
        if (button.dataset.bound === 'true') return;
        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
            powerRankingScope = button.dataset.powerScope === 'roster' ? 'roster' : 'all';
            renderFilteredPowerRankings();
        });
    });
    [nameInput, minInput, maxInput].forEach(input => {
        if (!input || input.dataset.bound === 'true') return;
        input.dataset.bound = 'true';
        input.addEventListener('input', renderFilteredPowerRankings);
    });
    const clearButton = document.getElementById('clearPowerRankingFilterButton');
    if (clearButton && clearButton.dataset.bound !== 'true') {
        clearButton.dataset.bound = 'true';
        clearButton.addEventListener('click', () => {
            if (nameInput) nameInput.value = '';
            if (minInput) minInput.value = '';
            if (maxInput) maxInput.value = '';
            renderFilteredPowerRankings();
        });
    }
    loadPowerRankings();
}

window.addEventListener('alliance-leaders-change', () => {
    loadAllianceLeaders();
    renderFilteredPowerRankings();
});

function stopSelectionPulse() {
    selectionPulseActiveUntil = 0;
    if (selectionPulseRafId !== null) {
        cancelAnimationFrame(selectionPulseRafId);
        selectionPulseRafId = null;
    }
}

function startSelectionPulse(durationMs = selectionPulseDurationMs) {
    selectionPulseActiveUntil = performance.now() + durationMs;
    if (selectionPulseRafId !== null) return;

    const animatePulse = (now) => {
        if (!selectedEntity || !entities.includes(selectedEntity) || now >= selectionPulseActiveUntil) {
            selectionPulseRafId = null;
            redraw();
            return;
        }
        redraw();
        selectionPulseRafId = requestAnimationFrame(animatePulse);
    };

    selectionPulseRafId = requestAnimationFrame(animatePulse);
}

function getSelectedEntities() {
    const validSelection = [];
    selectedEntities.forEach(entity => {
        if (entities.includes(entity)) {
            validSelection.push(entity);
        }
    });

    if (validSelection.length !== selectedEntities.size) {
        selectedEntities = new Set(validSelection);
    }

    if (selectedEntity && !selectedEntities.has(selectedEntity)) {
        selectedEntity = validSelection.length ? validSelection[validSelection.length - 1] : null;
    }

    return validSelection;
}

function clearSelection({ stopPulse = true } = {}) {
    selectedEntities.clear();
    selectedEntity = null;
    if (stopPulse) {
        stopSelectionPulse();
    }
    updateSelectedEntityEditor();
}

function setSelection(entitiesToSelect = [], { primaryEntity = null, pulse = false } = {}) {
    const validSelection = entitiesToSelect.filter(entity => entity && entities.includes(entity));
    selectedEntities = new Set(validSelection);

    if (!validSelection.length) {
        selectedEntity = null;
        stopSelectionPulse();
        updateSelectedEntityEditor();
        return;
    }

    if (primaryEntity && selectedEntities.has(primaryEntity)) {
        selectedEntity = primaryEntity;
    } else {
        selectedEntity = validSelection[validSelection.length - 1];
    }

    if (pulse) {
        startSelectionPulse();
    } else {
        stopSelectionPulse();
    }
    updateSelectedEntityEditor();
}

function addToSelection(entity, { makePrimary = true, pulse = false } = {}) {
    if (!entity || !entities.includes(entity)) return;
    const currentSelection = getSelectedEntities();
    if (!selectedEntities.has(entity)) {
        currentSelection.push(entity);
    }
    setSelection(currentSelection, { primaryEntity: makePrimary ? entity : selectedEntity, pulse });
}

function removeFromSelection(entity) {
    if (!entity || !selectedEntities.has(entity)) return;
    const remainingSelection = getSelectedEntities().filter(item => item !== entity);
    const nextPrimary = selectedEntity === entity ? remainingSelection[remainingSelection.length - 1] : selectedEntity;
    setSelection(remainingSelection, { primaryEntity: nextPrimary, pulse: false });
}

function toggleSelection(entity, { pulseOnAdd = true } = {}) {
    if (!entity) return;
    if (selectedEntities.has(entity)) {
        removeFromSelection(entity);
    } else {
        addToSelection(entity, { makePrimary: true, pulse: pulseOnAdd });
    }
}

function getEntityAtGrid(gridX, gridY) {
    for (let i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];
        if (
            gridX >= entity.x &&
            gridX < entity.x + entity.width &&
            gridY >= entity.y &&
            gridY < entity.y + entity.height
        ) {
            return entity;
        }
    }
    return null;
}

function getSelectionBoxRect() {
    if (!selectionBoxStart || !selectionBoxCurrent) return null;

    const x = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
    const y = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
    const width = Math.abs(selectionBoxCurrent.x - selectionBoxStart.x);
    const height = Math.abs(selectionBoxCurrent.y - selectionBoxStart.y);

    return { x, y, width, height };
}

function getEntitiesInSelectionBox(rect) {
    if (!rect) return [];

    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    return entities.filter(entity => {
        const topLeft = diamondToScreenCorner(entity.x, entity.y, panX, panY, zoom);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, panX, panY, zoom);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, panX, panY, zoom);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, panX, panY, zoom);

        const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

        return !(maxX < rect.x || minX > right || maxY < rect.y || minY > bottom);
    });
}

function startBoxSelection(mouseX, mouseY, { additive = false } = {}) {
    isBoxSelecting = true;
    selectionBoxAdditive = additive;
    selectionBoxStart = { x: mouseX, y: mouseY };
    selectionBoxCurrent = { x: mouseX, y: mouseY };
}

function updateBoxSelection(mouseX, mouseY) {
    if (!isBoxSelecting) return;
    selectionBoxCurrent = { x: mouseX, y: mouseY };
}

function resetBoxSelection() {
    isBoxSelecting = false;
    selectionBoxStart = null;
    selectionBoxCurrent = null;
    selectionBoxAdditive = false;
}

function finalizeBoxSelection() {
    if (!isBoxSelecting) return;

    const rect = getSelectionBoxRect();
    const isDragSelection = rect && (rect.width >= selectionBoxMinPixels || rect.height >= selectionBoxMinPixels);

    if (!isDragSelection) {
        if (!selectionBoxAdditive) {
            clearSelection();
        }
        resetBoxSelection();
        redraw();
        return;
    }

    const boxEntities = getEntitiesInSelectionBox(rect);
    if (selectionBoxAdditive) {
        const merged = new Set(getSelectedEntities());
        boxEntities.forEach(entity => merged.add(entity));
        const mergedArray = Array.from(merged);
        setSelection(mergedArray, {
            primaryEntity: boxEntities[boxEntities.length - 1] || selectedEntity,
            pulse: false
        });
    } else {
        setSelection(boxEntities, {
            primaryEntity: boxEntities[boxEntities.length - 1] || null,
            pulse: false
        });
    }

    resetBoxSelection();
    redraw();
}

function selectEntity(event, { additive = false, toggle = false, pulse = false } = {}) {
    if (selectedType !== 'select') return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridPos = screenToDiamond(mouseX, mouseY);
    const clickedEntity = getEntityAtGrid(gridPos.x, gridPos.y);

    if (!clickedEntity) {
        if (!additive && !toggle) {
            clearSelection();
        }
        redraw();
        return null;
    }

    if (toggle || additive) {
        toggleSelection(clickedEntity, { pulseOnAdd: pulse });
    } else {
        setSelection([clickedEntity], { primaryEntity: clickedEntity, pulse });
    }

    redraw();
    return clickedEntity;
}

function eraseEntityAtEvent(event, { deferHistory = false } = {}) {
    if (selectedType !== 'delete') return false;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridPos = screenToDiamond(mouseX, mouseY);
    const clickedEntity = getEntityAtGrid(gridPos.x, gridPos.y);

    if (!clickedEntity || clickedEntity.locked) {
        return false;
    }

    setSelection([clickedEntity], { primaryEntity: clickedEntity, pulse: false });
    return deleteSelectedEntity({ pushHistoryEntry: !deferHistory }) > 0;
}

// ===== INPUT HANDLING =====
// Zoom and pan functionality
function handleWheel(event) {
    event.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * zoomFactor));
    
    // Zoom towards mouse position
    const dx = mouseX - panX;
    const dy = mouseY - panY;
    
    panX = mouseX - dx * (newZoom / zoom);
    panY = mouseY - dy * (newZoom / zoom);
    
    zoom = newZoom;
    gridSize = baseGridSize * zoom;
    
    redraw();
    updateZoomDisplay();
}

// Unified zoom controls
function zoomIn() {
    const newZoom = Math.min(3, zoom * 1.2);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const dx = centerX - panX;
    const dy = centerY - panY;
    
    panX = centerX - dx * (newZoom / zoom);
    panY = centerY - dy * (newZoom / zoom);
    
    zoom = newZoom;
    gridSize = baseGridSize * zoom;
    redraw();
    updateZoomDisplay();
}

function zoomOut() {
    const newZoom = Math.max(0.1, zoom * 0.8);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const dx = centerX - panX;
    const dy = centerY - panY;
    
    panX = centerX - dx * (newZoom / zoom);
    panY = centerY - dy * (newZoom / zoom);
    
    zoom = newZoom;
    gridSize = baseGridSize * zoom;
    redraw();
    updateZoomDisplay();
}

function resetZoom() {
    zoom = 1;
    gridSize = baseGridSize;
    redraw();
    updateZoomDisplay();
}

function centerMap() {
    panX = canvasWidth / 2;
    panY = canvasHeight / 2;
    redraw();
}

function canMoveDraggedSelection(deltaX, deltaY) {
    if (!dragSelectionStart.length) return false;
    const ignoreEntities = new Set(dragSelectionStart.map(item => item.entity));

    return dragSelectionStart.every(item =>
        isPositionValid(item.x + deltaX, item.y + deltaY, item.entity, ignoreEntities)
    );
}

function applyDraggedSelection(deltaX, deltaY) {
    dragSelectionStart.forEach(item => {
        item.entity.x = item.x + deltaX;
        item.entity.y = item.y + deltaY;
    });
}

function getDraggedSelectionDelta() {
    if (!dragSelectionStart.length) return { x: 0, y: 0 };
    const first = dragSelectionStart[0];
    return {
        x: first.entity.x - first.x,
        y: first.entity.y - first.y
    };
}

function tryApplyDraggedSelectionDelta(targetDeltaX, targetDeltaY) {
    if (!dragSelectionStart.length) return false;

    const currentDelta = getDraggedSelectionDelta();
    if (targetDeltaX === currentDelta.x && targetDeltaY === currentDelta.y) {
        return false;
    }

    const fallbackDeltas = [
        { x: targetDeltaX, y: targetDeltaY },
        { x: targetDeltaX, y: currentDelta.y },
        { x: currentDelta.x, y: targetDeltaY }
    ];

    const seen = new Set();
    for (const candidate of fallbackDeltas) {
        const key = `${candidate.x},${candidate.y}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (!canMoveDraggedSelection(candidate.x, candidate.y)) continue;
        applyDraggedSelection(candidate.x, candidate.y);
        return true;
    }

    return false;
}

function beginSelectionDragFromEntity(clickedEntity, gridPos) {
    const movableSelection = getSelectedEntities().filter(entity => !entity.locked);
    if (!movableSelection.length || !movableSelection.includes(clickedEntity)) return;

    isDragging = true;
    dragOffsetX = gridPos.x;
    dragOffsetY = gridPos.y;
    dragSelectionStart = movableSelection.map(entity => ({
        entity,
        x: entity.x,
        y: entity.y
    }));
}

function handleSelectEntityClick(clickedEntity, gridPos, { additiveSelection = false } = {}) {
    if (additiveSelection) {
        toggleSelection(clickedEntity, { pulseOnAdd: false });
        redraw();
        return;
    }

    const selectedNow = getSelectedEntities();
    if (!selectedEntities.has(clickedEntity) || selectedNow.length <= 1) {
        setSelection([clickedEntity], { primaryEntity: clickedEntity, pulse: false });
    } else {
        selectedEntity = clickedEntity;
        stopSelectionPulse();
        updateSelectedEntityEditor();
    }

    beginSelectionDragFromEntity(clickedEntity, gridPos);
    redraw();
}

function handleSelectBlankClick(mouseX, mouseY, { additiveSelection = false } = {}) {
    startBoxSelection(mouseX, mouseY, { additive: additiveSelection });
    if (!additiveSelection) {
        clearSelection();
    }
    redraw();
}

function handleSelectMouseDown(event, mouseX, mouseY) {
    const gridPos = screenToDiamond(mouseX, mouseY);
    const clickedEntity = getEntityAtGrid(gridPos.x, gridPos.y);
    const additiveSelection = event.ctrlKey || event.metaKey;

    hasDragMovement = false;
    dragSelectionStart = [];

    if (clickedEntity) {
        handleSelectEntityClick(clickedEntity, gridPos, { additiveSelection });
    } else {
        handleSelectBlankClick(mouseX, mouseY, { additiveSelection });
    }
}

function handleMouseDown(event) {
    rememberPointerPosition(event.clientX, event.clientY);
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (selectedType === 'delete') {
        updateEraserCursorPosition(event.clientX, event.clientY);
        setEraserCursorVisible(true);
    }
    
    if (event.button === 1) { // Middle mouse button
        isPanning = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        event.preventDefault();
        return;
    }

    if (event.button !== 0) return; // Left mouse button only from here

    if (selectedType === 'select') {
        handleSelectMouseDown(event, mouseX, mouseY);
        return;
    }

    if (selectedType === 'move') {
        isPanning = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        return;
    }

    if (selectedType === 'delete') {
        flushPendingEraseHistory();
        hasPendingEraseHistory = false;
        isErasing = true;
        if (eraseEntityAtEvent(event, { deferHistory: true })) {
            hasPendingEraseHistory = true;
        }
        return;
    }

    addEntity(event);
}

function handleMouseMove(event) {
    rememberPointerPosition(event.clientX, event.clientY);
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (selectedType === 'delete') {
        updateEraserCursorPosition(event.clientX, event.clientY);
        setEraserCursorVisible(true);
    }
    
    if (isPanning) {
        panX += mouseX - lastMouseX;
        panY += mouseY - lastMouseY;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        requestRedraw();
    } else if (isBoxSelecting) {
        updateBoxSelection(mouseX, mouseY);
        requestRedraw();
    } else if (isErasing && selectedType === 'delete') {
        if (eraseEntityAtEvent(event, { deferHistory: true })) {
            hasPendingEraseHistory = true;
        }
    } else if (isDragging && dragSelectionStart.length) {
        const gridPos = screenToDiamond(mouseX, mouseY);
        const deltaX = gridPos.x - dragOffsetX;
        const deltaY = gridPos.y - dragOffsetY;

        if (tryApplyDraggedSelectionDelta(deltaX, deltaY)) {
            hasDragMovement = true;
            requestRedraw();
            markUnsavedChanges();
        }
    } else {
        updateGhostPreview(mouseX, mouseY);
    }
}

function handleMouseUp(event) {
    if (event.button === 1) {
        isPanning = false;
    } else if (event.button === 0) {
        if (isBoxSelecting) {
            finalizeBoxSelection();
            return;
        }

        if (isDragging) {
            isDragging = false;
            dragSelectionStart = [];
            if (hasDragMovement) {
                pushHistory();
            }
            hasDragMovement = false;
        }
        if (selectedType === 'move') {
            isPanning = false;
        }
    }

    // this has to be separate to avoid lost undo entries when click-deleting in Delete mode
    if (isErasing) {
        isErasing = false;
        flushPendingEraseHistory();
    }
}

// Update this function to handle both desktop and mobile toolbars
function handleToolbarClick(e) {
    const button = e.target instanceof Element ? e.target.closest('button') : null;
    if (!button) return;

    // Handle map-mode toggles (e.g. Castle)
    if (button.dataset.mode) {
        setMapMode(button.dataset.mode);
        return;
    }

    if (button.dataset.action === 'sword-battlefield') {
        placeSwordBattlefield();
        return;
    }

    if (button.dataset.action === 'three-alliance-battlefield') {
        placeThreeAllianceBattlefield();
        return;
    }

    if (button.dataset.action === 'copy-three-alliance-layout') {
        placeThreeAllianceBattlefield();
        return;
    }

    if (button.dataset.type === 'delete') {
        if (getSelectedEntities().length) {
            const deletedCount = deleteSelectedEntity();
            showShortcutToast(
                deletedCount > 0
                    ? `已删除 ${deletedCount} 个对象 (E)`
                    : '选中对象不能删除'
            );
        } else {
            setSelectedTool('delete', { showToast: true });
        }
        return;
    }

    if (button.dataset.type) {
        setSelectedTool(button.dataset.type);
    }
}

function setSelectedTool(toolType, { showToast = false } = {}) {
    if (!toolType) return false;

    const knownToolButton = document.querySelector(
        `#toolbar-controls button[data-type="${toolType}"], #toolbar-buildings button[data-type="${toolType}"], #mobile-toolbar-buildings button[data-type="${toolType}"]`
    );
    if (!knownToolButton) return false;

    flushPendingEraseHistory();
    selectedType = toolType;
    clearSelection();
    isErasing = false;
    isDragging = false;
    dragSelectionStart = [];
    hasDragMovement = false;
    resetBoxSelection();
    stopSelectionPulse();

    document.querySelectorAll('#toolbar-controls button[data-type], #toolbar-buildings button[data-type], #mobile-toolbar-buildings button[data-type]').forEach(button => {
        button.classList.remove('bg-yellow-500', 'bg-yellow-600');

        if (button.dataset.type === toolType) {
            button.classList.add('bg-yellow-500');
        } else if (['flag', 'city', 'building', 'node', 'hq', 'obstacle', 'dog', 'capybara'].includes(button.dataset.type)) {
            button.classList.add('bg-blue-500');
        }
    });

    if ((selectedType === 'select' || selectedType === 'move' || selectedType === 'delete') && ghostPreview) {
        ghostPreview = null;
    }
    updateObstacleSizeSelectorVisibility();
    redraw();
    updateCanvasCursorForTool(toolType);
    refreshGhostPreviewForCurrentPointer(toolType);

    if (showToast) {
        const shortcut = TOOL_SHORTCUT_LABELS[toolType];
        const label = TOOL_LABELS[toolType] || toolType;
        showShortcutToast(shortcut ? `${label} (${shortcut})` : label);
    }

    return true;
}

function setObstacleSize(size) {
    const normalized = Math.max(1, Math.min(4, parseInt(size, 10) || 1));
    obstacleSize = normalized;

    document.querySelectorAll('[data-obstacle-size]').forEach(btn => {
        const isActive = parseInt(btn.dataset.obstacleSize, 10) === normalized;
        btn.classList.remove('bg-blue-500', 'text-white', 'shadow-sm', 'bg-transparent', 'text-gray-500', 'hover:text-gray-700');
        if (isActive) {
            btn.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        } else {
            btn.classList.add('bg-transparent', 'text-gray-500', 'hover:text-gray-700');
        }
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (selectedType === 'obstacle') {
        refreshGhostPreviewForCurrentPointer('obstacle');
    }
}

function updateObstacleSizeSelectorVisibility() {
    const visible = selectedType === 'obstacle';
    document.querySelectorAll('.obstacle-size-selector').forEach(el => {
        el.classList.toggle('hidden', !visible);
    });
}

// ===== SET/RENDER GUI BUTTONS =====
function setCityLabelMode(mode = defaultCityLabelMode) {
    // mode: "march", "coords", "none"
    cityLabelMode = mode || defaultCityLabelMode;
    const p1 = document.querySelector('[citySettingsButtons="1"]');
    const m1 = document.querySelector('[citySettingsButtons="m1"]');
    const p3 = document.querySelector('[citySettingsButtons="3"]');
    const m3 = document.querySelector('[citySettingsButtons="m3"]');
    const anchorInputContainer = document.getElementById('anchorInputContainer');

    // Reset all
    [p1, m1, p3, m3].forEach(b => {
        if (b) b.classList.remove('bg-yellow-500', 'bg-indigo-600', 'text-white');
    });

    if (cityLabelMode === "march") {
        [p1, m1].forEach(b => b?.classList.add('bg-yellow-500', 'text-white'));
    }
    if (cityLabelMode === "coords") {
        [p3, m3].forEach(b => b?.classList.add('bg-indigo-600', 'text-white'));
    }

    if (anchorInputContainer) {
        anchorInputContainer.classList.toggle('hidden', cityLabelMode !== "coords");
    }

    if (cityLabelMode === 'coords') loadWorldmapData();

    redraw();
}

function setWaveMode(_waveMode = defaultWaveMode) {
    waveMode = _waveMode || defaultWaveMode;
    
    const d2 = document.querySelector('[citySettingsButtons="2"]');
    const m2 = document.querySelector('[citySettingsButtons="m2"]');
    [d2, m2].forEach(b => {
        if (!b) return;
        b.classList.toggle('bg-yellow-500', waveMode);
        b.classList.toggle('text-white', waveMode);
    });
    redraw();
}

function setShowWorldmap(value) {
    showWorldmap = value;
    document.querySelectorAll('[citySettingsButtons="6"], [citySettingsButtons="m6"]').forEach(b => {
        b.classList.toggle('bg-yellow-500', showWorldmap);
        b.classList.toggle('text-white', showWorldmap);
    });
    if (showWorldmap) loadWorldmapData();
    redraw();
}

// Set the current map mode. Supported modes: 'base', 'castle'
function setMapMode(mode = 'base') {
    mapMode = mode || 'base';

    // Update mode switch visuals (desktop + mobile)
    document.querySelectorAll('[data-mode]').forEach(b => {
        const isActive = b.dataset.mode === mapMode;
        b.classList.remove('bg-transparent', 'text-gray-500', 'hover:text-gray-700', 'bg-blue-500', 'text-white', 'shadow-sm');
        b.classList.add('transition-colors');
        if (isActive) {
            b.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        } else {
            b.classList.add('bg-transparent', 'text-gray-500', 'hover:text-gray-700');
        }
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    updateEnemyZoneButtonVisibility();
    updateTeamControlsVisibility();

    // If entering castle mode, set the coord anchor to 599:599 and ensure entities
    if (mapMode === 'castle') {
        try { setAnchorInput({ x: 599, y: 599 }); } catch (e) { setCoordAnchor(599, 599); }
        ensureCastleEntities();
    } else {
        // leaving castle mode -> remove the locked castle/turret entities
        removeCastleEntities();
    }
    redraw();
    updateCityList();
    window.dispatchEvent(new CustomEvent('layout-mapmode-change', { detail: { mode: mapMode } }));
}

function updateEnemyZoneButtonVisibility() {
    const show = mapMode === 'castle';
    document.querySelectorAll('[data-type="enemyzone"]').forEach(button => {
        button.classList.toggle('hidden', !show);
        button.disabled = !show;
        if (!show) {
            button.setAttribute('aria-hidden', 'true');
            button.setAttribute('tabindex', '-1');
        } else {
            button.removeAttribute('aria-hidden');
            button.removeAttribute('tabindex');
        }
    });

    if (!show && selectedType === 'enemyzone') {
        if (!setSelectedTool('select')) {
            selectedType = 'select';
            updateCanvasCursorForTool('select');
        }
    }
}

function updateTeamControlsVisibility() {
    const showTeams = mapMode === 'castle' || showTeamsInBase;
    const teamSection = document.getElementById('teamManagementSection');
    if (teamSection) {
        teamSection.classList.toggle('hidden', !showTeams);
    }
    const mobileTeamActions = document.getElementById('mobileTeamActions');
    if (mobileTeamActions) {
        mobileTeamActions.classList.toggle('hidden', !showTeams);
    }
    const showToggle = mapMode === 'base';
    document.querySelectorAll('[citySettingsButtons="5"], [citySettingsButtons="m5"]').forEach(btn => {
        btn.classList.toggle('hidden', !showToggle);
        btn.classList.toggle('bg-yellow-500', showTeamsInBase);
        btn.classList.toggle('text-white', showTeamsInBase);
    });
    const current = document.getElementById('citySort')?.value || 'id';
    enablePopulateSortOptions(current);
}

// Draw the reserved castle area around the anchor cell
function drawCastleReservedArea(context, pX, pY, z) {
    if (mapMode !== 'castle') return;

    const mid = anchorGridCell();
    context.save();
    context.fillStyle = 'rgba(200, 50, 50, 0.25)';
    context.strokeStyle = 'rgba(200,50,50,0.6)';
    context.lineWidth = Math.max(1, 2 * z);
    const half = Math.floor(castleReservedSize / 2);
    for (let x = mid.x - half; x <= mid.x + half - 1; x++) {
        for (let y = mid.y - half; y <= mid.y + half - 1; y++) {
            // draw diamond cell
            const corner = diamondToScreenCorner(x, y, pX, pY, z);
            const p2 = diamondToScreenCorner(x + 1, y, pX, pY, z);
            const p3 = diamondToScreenCorner(x + 1, y + 1, pX, pY, z);
            const p4 = diamondToScreenCorner(x, y + 1, pX, pY, z);
            context.beginPath();
            context.moveTo(corner.x, corner.y);
            context.lineTo(p2.x, p2.y);
            context.lineTo(p3.x, p3.y);
            context.lineTo(p4.x, p4.y);
            context.closePath();
            context.fill();
            context.stroke();
        }
    }

    context.restore();
}

// Ensure the central Castle and four Turrets exist (locked) when castle mode is active
function ensureCastleEntities() {
    const mid = anchorGridCell();
    const half = Math.floor(castleReservedSize / 2);
    const startX = mid.x - half;
    const endX = mid.x + half - 1;
    const startY = mid.y - half;
    const endY = mid.y + half - 1;

    // Check if castle already present
    const existingCastle = entities.find(e => e.type === 'castle');
    if (!existingCastle) {
        // Place 8x8 Castle centered in reserved area
        const castleSize = 6;
        const castleHalf = Math.floor(castleSize / 2);
        const castleX = mid.x - castleHalf;
        const castleY = mid.y - castleHalf;
        const castle = {
            x: castleX,
            y: castleY,
            width: castleSize,
            height: castleSize,
            type: 'castle',
            color: '#912900cc',
            name: '王城',
            locked: true
        };
        entities.push(castle);
    }

    // Turrets positions: north, east, south, west — 2x2 adjacent to reserved area
    const turrets = [
        { name: '北炮塔', x: mid.x - 6, y: startY + 0 },
        { name: '东炮塔',  x: endX - 1,  y: mid.y - 6 },
        { name: '南炮塔', x: mid.x + 4, y: endY -1  },
        { name: '西炮塔',  x: startX + 0, y: mid.y + 4 }
    ];

    for (const t of turrets) {
        const exists = entities.find(e => e.type === 'turret' && e.name === t.name);
        if (!exists) {
            entities.push({ x: t.x, y: t.y, width: 2, height: 2, type: 'turret', color: '#882222', name: t.name, locked: true });
        }
    }

    updateCounters();
    redraw();
    pushHistory();
}

function removeCastleEntities() {
    let changed = false;
    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i].type === 'castle' || entities[i].type === 'turret') {
            entities.splice(i, 1);
            changed = true;
        }
    }
    if (changed) {
        updateCounters();
        redraw();
        pushHistory();
    }
}

function setAnchorInput(anchor) {
    if (anchor) {
        setCoordAnchor(anchor.x, anchor.y)
        const anchorInput = document.getElementById('anchorInput');
        if (anchorInput) anchorInput.value = anchor.x + ':' + anchor.y; 
    } 
}

// initialize text field with default
setAnchorInput(coordAnchor);


// ===== EVENT LISTENERS =====

// ========== TEAM MANAGEMENT FUNCTIONS ==========

function openTeamModal() {
    const modal = document.getElementById('teamModal');
    const nameInput = document.getElementById('teamNameInput');
    const colorInput = document.getElementById('teamColorInput');
    const hexInput = document.getElementById('teamColorHex');
    if (!modal || !nameInput || !colorInput || !hexInput) return;

    const defaultName = `队伍 ${customTeams.length + 1}`;
    const defaultColor = '#3B82F6';
    nameInput.value = defaultName;
    colorInput.value = defaultColor;
    hexInput.value = defaultColor;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => nameInput.focus(), 0);
}

function closeTeamModal() {
    const modal = document.getElementById('teamModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function saveTeamFromModal() {
    const nameInput = document.getElementById('teamNameInput');
    const colorInput = document.getElementById('teamColorInput');
    const hexInput = document.getElementById('teamColorHex');
    if (!nameInput || !colorInput || !hexInput) return;

    const name = (nameInput.value || '').trim() || `队伍 ${customTeams.length + 1}`;
    let color = (hexInput.value || '').trim();
    if (!/^#([0-9a-fA-F]{3}){1,2}$/.test(color)) {
        color = colorInput.value || '#3B82F6';
    }

    customTeams.push({ name, color });
    updateTeamsUI();
    markUnsavedChanges();
    closeTeamModal();
}

function createNewTeam() {
    openTeamModal();
}

function deleteTeam(index) {
    if (confirm(`确定删除 ${customTeams[index].name} 吗？`)) {
        // Remove team assignments for this team
        Object.keys(cityTeams).forEach(cityId => {
            if (cityTeams[cityId] === index) {
                delete cityTeams[cityId];
            } else if (cityTeams[cityId] > index) {
                cityTeams[cityId]--; // Shift down indices
            }
        });

        customTeams.splice(index, 1);
        updateTeamsUI();
        redraw();
        markUnsavedChanges();
    }
}

function assignCityToTeam(city, teamIndex) {
    if (city && city.id !== undefined) {
        if (teamIndex === -1) {
            delete cityTeams[city.id];
        } else {
            cityTeams[city.id] = teamIndex;
        }
        updateCityList();
        redraw();
        markUnsavedChanges();
    }
}

function updateTeamsUI() {
    const container = document.getElementById('teamsContainer');
    if (!container) return;

    container.innerHTML = '';

    customTeams.forEach((team, index) => {
        const teamEl = document.createElement('div');
        teamEl.className = 'flex items-center justify-between p-2 bg-gray-50 rounded mb-2';
        const teamInfo = document.createElement('div');
        teamInfo.className = 'flex items-center gap-2';

        const colorBox = document.createElement('div');
        colorBox.className = 'w-4 h-4 rounded';
        const safeColor = typeof team.color === 'string' && /^#([0-9a-fA-F]{3}){1,2}$/.test(team.color)
            ? team.color
            : '#9ca3af';
        colorBox.style.backgroundColor = safeColor;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-sm font-medium';
        nameSpan.textContent = team.name || '队伍';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'text-red-500 hover:text-red-700 text-xs';
        deleteButton.textContent = '✕';
        deleteButton.addEventListener('click', () => deleteTeam(index));

        teamInfo.appendChild(colorBox);
        teamInfo.appendChild(nameSpan);
        teamEl.appendChild(teamInfo);
        teamEl.appendChild(deleteButton);
        container.appendChild(teamEl);
    });
}

function installThreeAllianceQuickBuilder() {
    document.querySelectorAll('[data-three-alliance-add]').forEach(button => {
        button.addEventListener('click', () => addThreeAllianceQuickBuilding(button.dataset.threeAllianceAdd));
    });
    document.querySelector('[data-three-alliance-optimize]')?.addEventListener('click', optimizeThreeAllianceBuildings);
}

// Call this on load
window.addEventListener('DOMContentLoaded', () => {
    initializeDefaultTeams();
    updateTeamsUI();
    installSelectedEntityEditor();
    installThreeAllianceQuickBuilder();
    updateSelectedEntityEditor();
    installPowerRankingPanel();
});

window.addEventListener('alliance-members-change', event => {
    const members = event?.detail?.members;
    if (Array.isArray(members) && members.length) {
        setPowerRankingMembers(members, { persist: true, source: '联盟设置' });
    } else {
        loadPowerRankings();
    }
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('mouseup', handleMouseUp);

canvas.addEventListener('wheel', handleWheel);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('dragover', (event) => {
    const member = getPowerMemberFromDragEvent(event);
    if (!member) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    if (isSwordBattlefieldMode()) {
        const target = getNearestPowerMemberDropTarget(event.clientX, event.clientY);
        powerMemberDropPreview = target ? { member, target } : null;
    } else {
        const trap = getNearestTrapDropTarget(event.clientX, event.clientY);
        powerMemberDropPreview = trap ? { member, target: { entity: trap } } : null;
    }
    requestRedraw();
});
canvas.addEventListener('dragleave', () => {
    powerMemberDropPreview = null;
    requestRedraw();
});
canvas.addEventListener('drop', (event) => {
    const member = getPowerMemberFromDragEvent(event);
    if (!member) return;
    event.preventDefault();
    if (isSwordBattlefieldMode()) {
        const target = getNearestPowerMemberDropTarget(event.clientX, event.clientY);
        if (!target) {
            powerMemberDropPreview = null;
            redraw();
            showShortcutToast('请拖到建筑方块附近');
            return;
        }
        placePowerMemberOnEntity(member, target.entity);
        showShortcutToast(`已放置：${member.name}`);
        return;
    }

    const city = createCityFromPowerMember(member, event.clientX, event.clientY);
    if (!city) {
        powerMemberDropPreview = null;
        redraw();
        return;
    }
    powerMemberDropPreview = null;
    redraw();
});
canvas.addEventListener('mouseenter', (event) => {
    rememberPointerPosition(event.clientX, event.clientY);
    refreshEraserCursorForCurrentPointer(selectedType);
    refreshGhostPreviewForCurrentPointer(selectedType);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mouseleave', () => {
    isErasing = false;
    setEraserCursorVisible(false);
    // Clear ghost preview when mouse leaves canvas
    if (ghostPreview) {
        ghostPreview = null;
        territoryPreview = null;
        redraw();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    loadMapFromQuery();
    enablePopulateSortOptions('id');
    updateCityList();
    updateZoomDisplay();
    setCityLabelMode();
    
    // Set up toolbar click handlers
    document.querySelectorAll('#toolbar-controls button, #toolbar-buildings button').forEach(button => {
        button.addEventListener('click', handleToolbarClick);
    });

    // Set up mobile toolbar click handlers
    document.querySelectorAll('#mobile-toolbar-buildings button').forEach(button => {
        button.addEventListener('click', handleToolbarClick);
    });

    document.querySelectorAll('[data-mode]').forEach(button => {
        button.addEventListener('click', () => setMapMode(button.dataset.mode));
    });
    document.querySelectorAll('[data-alliance]').forEach(button => {
        button.addEventListener('click', () => setActiveAlliance(button.dataset.alliance));
    });
    document.querySelectorAll('[data-obstacle-size]').forEach(button => {
        button.addEventListener('click', () => setObstacleSize(button.dataset.obstacleSize));
    });

    // Initialize mode/alliance switch visuals
    setMapMode(mapMode);
    setActiveAlliance(activeAllianceId);
    setObstacleSize(obstacleSize);
    setSelectedTool(selectedType || 'select');

    // Add zoom control event listeners
    document.getElementById('zoomInBtn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn')?.addEventListener('click', zoomOut);
    document.getElementById('resetZoomBtn')?.addEventListener('click', resetZoom);
    document.getElementById('centerBtn')?.addEventListener('click', centerMap);
    
    // Sync map data between desktop and mobile textareas
    const mapDataInput = document.getElementById('mapData');
    const mobileMapData = document.getElementById('mobileMapData');
    if (mapDataInput && mobileMapData) {
        mapDataInput.addEventListener('input', () => {
            mobileMapData.value = mapDataInput.value;
        });
        mobileMapData.addEventListener('input', () => {
            mapDataInput.value = mobileMapData.value;
        });
    }

    // Event Listener for actions
    document.getElementById('shareButton')?.addEventListener('click', shareMap);
    document.getElementById('mobileShareButton')?.addEventListener('click', shareMap);
    document.getElementById('setAnchorBtn')?.addEventListener('click', handleSetAnchor);
    document.getElementById('createNewTeamBtn')?.addEventListener('click', createNewTeam);
    document.getElementById('createNewTeamBtnMobile')?.addEventListener('click', createNewTeam);
    document.getElementById('saveAsCSVButton')?.addEventListener('click', () => exportPlayerNamesCSV({ onlyNamed: false }));

    // Team modal wiring
    const teamModal = document.getElementById('teamModal');
    const teamModalClose = document.getElementById('teamModalClose');
    const teamModalCancel = document.getElementById('teamModalCancel');
    const teamModalSave = document.getElementById('teamModalSave');
    const teamNameInput = document.getElementById('teamNameInput');
    const teamColorInput = document.getElementById('teamColorInput');
    const teamColorHex = document.getElementById('teamColorHex');

    teamModalClose?.addEventListener('click', closeTeamModal);
    teamModalCancel?.addEventListener('click', closeTeamModal);
    teamModalSave?.addEventListener('click', saveTeamFromModal);
    teamModal?.addEventListener('click', (e) => {
        if (e.target === teamModal) closeTeamModal();
    });

    teamColorInput?.addEventListener('input', () => {
        if (teamColorHex) teamColorHex.value = teamColorInput.value;
    });
    teamColorHex?.addEventListener('input', () => {
        const val = teamColorHex.value.trim();
        if (/^#([0-9a-fA-F]{3}){1,2}$/.test(val) && teamColorInput) {
            teamColorInput.value = val;
        }
    });
    teamNameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTeamFromModal();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeTeamModal();
        }
    });
    teamColorHex?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTeamFromModal();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeTeamModal();
        }
    });

    // QOL - Set anchor on Enter key in input field
    document.getElementById('anchorInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
            e.preventDefault();
            handleSetAnchor();
        }
    });
    
    // Copy short url (desktop)
    document.getElementById('copyShortUrlButton')?.addEventListener('click', () => {
        const out = document.getElementById('shortUrlOutput');
        if (out && out.value) {
            navigator.clipboard?.writeText(out.value).then(() => {
                const msg = document.getElementById('copyMessage');
                if (msg) { msg.classList.remove('hidden'); setTimeout(()=>msg.classList.add('hidden'),2000); }
            }).catch(()=>{ /* ignore */ });
        }
    });
    
    // Copy short url (mobile) - if mobile elements exist
    document.getElementById('mobileCopyShortUrlButton')?.addEventListener('click', () => {
        const out = document.getElementById('mobileShortUrlOutput');
        if (out && out.value) {
            navigator.clipboard?.writeText(out.value).then(() => {
                const msg = document.getElementById('mobileCopyMessage') || document.getElementById('copyMessage');
                if (msg) { msg.classList.remove('hidden'); setTimeout(()=>msg.classList.add('hidden'),2000); }
            }).catch(()=>{ /* ignore */ });
        }
    });
    
    // Add action button event listeners for both desktop and mobile
    ['', 'mobile'].forEach(prefix => {
        const p = prefix ? prefix + '-' : '';
        document.getElementById(`${prefix}loadButton`)?.addEventListener('click', () => {
            const dataInput = document.getElementById(`${prefix}mapData`);
            if (dataInput && dataInput.value) {
                loadMap();
            } else {
                const altDataInput = document.getElementById(dataInput.id === 'mapData' ? 'mobileMapData' : 'mapData');
                if (altDataInput && altDataInput.value) {
                    loadMap();
                } else {
                    alert('请先输入地图代码。');
                }
            }
        });
        
        document.getElementById(`${prefix}saveButton`)?.addEventListener('click', saveMap);
        document.getElementById(`${prefix}shareButton`)?.addEventListener('click', shareMap);
        document.getElementById(`${prefix}downloadButton`)?.addEventListener('click', downloadCanvasAsPNG);
    });
    
    // Clear the entire map but preserve locked entities (e.g., castle/turrets)
    clearButton.addEventListener('click', () => {
        if (confirm('确定要清空整张地图吗？')) {
            // Keep entities that are locked (locked: true) and remove the rest
            const lockedEntities = entities.filter(e => e && e.locked);
            entities.length = 0;
            for (const e of lockedEntities) entities.push(e);

            // Clear bear traps, enemy zones and reset city counter and selection
            bearTraps.length = 0;
            enemyZones.length = 0;
            rebuildBattlefieldConnectionLinesFromEntities();
            cityCounterId = 1;
            clearSelection();

            redraw();
            updateCounters();
            updateCityList();
            renderFilteredPowerRankings();
            markUnsavedChanges();
            pushHistory();
        }
    });

    function handleSetAnchor() {
        const input = document.getElementById('anchorInput');
        if (!input) return;
        const val = input.value;
        const pt = parseCoordInput(val);
        if (pt) {
            setCoordAnchor(pt.x, pt.y);
        } else {
            alert('格式无效，或坐标超出 0..1199 范围。');
        }
        }

    const csvInput = document.getElementById('playersCsvInput');
    if (csvInput){
    csvInput.addEventListener('change', async (e)=>{
        const file = e.target.files?.[0];
        if (!file) return;

        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);

        // UTF-8 decode, remove BOM
        let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

        // mojibake -> Windows-1252/Latin-1 fallback
        const looksBroken = /Ã.|Â.|�/.test(text);
        if (looksBroken) {
        try {
            text = new TextDecoder('windows-1252').decode(bytes);
        } catch {
            // naive Latin-1 Fallback
            text = String.fromCharCode(...bytes);
            }
        }
        
        importPlayerNamesCSV(text);
        csvInput.value = '';
        });
    }
    
    // Add handlers for city settings buttons (P1 = clock toggle)
    document.querySelectorAll('[citySettingsButtons]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = btn.getAttribute('citySettingsButtons') || '';

            // P1: Toggle Marchtimes
            if (key.endsWith('1')) {
                setCityLabelMode(cityLabelMode === "march" ? "none" : "march");
            }

            // P2: Wavemode
            if (key.endsWith('2')) {
                setWaveMode(!waveMode);
            }

            // P3: Show Coords
            if (key.endsWith('3')) {
                setCityLabelMode(cityLabelMode === "coords" ? "none" : "coords");
            }

            // P4: Load CSV
            if (key.endsWith('4')) {
                document.getElementById('playersCsvInput')?.click();
            }
            // P5: Show teams in base
            if (key.endsWith('5')) {
                if (mapMode !== 'base') return;
                showTeamsInBase = !showTeamsInBase;
                updateTeamControlsVisibility();
                updateCityList();
            }

            // P6: Toggle worldmap obstacle layer
            if (key.endsWith('6')) {
                setShowWorldmap(!showWorldmap);
            }
        });
    });
});

function preventActionOnEmptyMap(actionText) {
    if (entities.length === 0) {
        alert(`地图还是空的，请先添加一些建筑再${actionText}。`);
        return true; // Action should be prevented
    }
    return false;
}

function replaceBrowserUrlSafely(urlLike) {
    try {
        window.history.replaceState(null, '', urlLike);
        return true;
    } catch (error) {
        console.warn('Skipping URL update (likely too long):', error);
        return false;
    }
}

// Update saveMap function to sync both textareas
function saveMap() {
    if (preventActionOnEmptyMap("保存方案")) return;

    try {
        const mapName = document.getElementById('mapNameInput').value;
        const compressedMap = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
        const mapDataInput = document.getElementById('mapData');
        const mobileMapData = document.getElementById('mobileMapData');
        
        if (mapDataInput) mapDataInput.value = compressedMap;
        if (mobileMapData) mobileMapData.value = compressedMap;
        
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('mapData', compressedMap);
        replaceBrowserUrlSafely(newUrl);
        const persistResult = window.__layoutPlannerPersistMap?.({
            name: mapName || '默认地图',
            code: compressedMap
        });
        if (persistResult && typeof persistResult.catch === 'function') {
            persistResult.catch((error) => {
                if (error?.name === 'AbortError') return;
                console.error('保存方案文件失败:', error);
                alert('保存方案文件失败，请使用“生成代码”复制地图代码备份。');
            });
        }
        markChangesSaved();
    } catch (e) {
        console.error('保存地图失败:', e);
    }
}

// Update shareMap function to support mobile copy message
function shareMap() {
    if (preventActionOnEmptyMap("sharing")) return;
    try {
        const mapName = document.getElementById('mapNameInput').value;
        const compressedMap = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
        const mapDataInput = document.getElementById('mapData');
        const mobileMapData = document.getElementById('mobileMapData');
        
        if (mapDataInput) mapDataInput.value = compressedMap;
        if (mobileMapData) mobileMapData.value = compressedMap;
        
        const longUrl = getShareableUrl(entities, mapName);
        replaceBrowserUrlSafely(longUrl);

        navigator.clipboard.writeText(longUrl)
            .then(() => {
                const copyMessage = document.getElementById('copyMessage');
                const mobileCopyMessage = document.getElementById('mobileCopyMessage');
                
                [copyMessage, mobileCopyMessage].forEach(msg => {
                    if (msg) {
                        msg.classList.remove('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 2000);
                    }
                });
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
        markChangesSaved();
    } catch (e) {
        console.error('Error sharing map:', e);
    }
}

// Short URL feature: encapsulated in async IIFE to avoid race conditions and keep config/vars scoped
    const SHORT_URL_GENERATING_TEXT = 'Generating...';

    (async () => {
    	const shortUrlButton = document.getElementById('shortUrlButton');
    	const mobileShortUrlButton = document.getElementById('mobileShortUrlButton');
    	const copyShortUrlButton = document.getElementById('copyShortUrlButton');
    	const mobileCopyShortUrlButton = document.getElementById('mobileCopyShortUrlButton');
    	const shortUrlContainer = document.getElementById('shortUrlContainer');
    	const mobileShortUrlContainer = document.getElementById('mobileShortUrlContainer');
    	const shortUrlOutput = document.getElementById('shortUrlOutput');
    	const mobileShortUrlOutput = document.getElementById('mobileShortUrlOutput');
    	const shortUrlError = document.getElementById('shortUrlError');
    	const mobileShortUrlError = document.getElementById('mobileShortUrlError');

	    	// simple default shortener endpoint (returns plain text)
	    	const config = {
	    		tinyurlApi: 'https://tinyurl.com/api-create.php',
	    		tinyurlManual: 'https://tinyurl.com/app/'
	    	};

	    	async function doShorten(longUrl) {
    		// show both containers (desktop + mobile) and reset fields
    		if (shortUrlContainer) shortUrlContainer.classList.remove('hidden');
    		if (mobileShortUrlContainer) mobileShortUrlContainer.classList.remove('hidden');
    		if (shortUrlOutput) shortUrlOutput.value = SHORT_URL_GENERATING_TEXT;
    		if (mobileShortUrlOutput) mobileShortUrlOutput.value = SHORT_URL_GENERATING_TEXT;
    		if (shortUrlError) shortUrlError.textContent = '';
    		if (mobileShortUrlError) mobileShortUrlError.textContent = '';

    		// disable while working
    		if (shortUrlButton) shortUrlButton.disabled = true;
    		if (mobileShortUrlButton) mobileShortUrlButton.disabled = true;

	    		try {
	    			const controller = new AbortController();
	    			const timeout = setTimeout(() => controller.abort(), 10000);
                    const body = new URLSearchParams({ url: longUrl }).toString();
	    			const resp = await fetch(config.tinyurlApi, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                        },
                        body,
                        signal: controller.signal
                    });
	    			clearTimeout(timeout);
	    			if (!resp.ok) throw new Error(`Shortener API error ${resp.status}`);
    			let text = await resp.text();

    			// some endpoints might return JSON - try parse
    			try {
    				const j = JSON.parse(text);
    				if (j && (j.shortUrl || j.result || (j.data && j.data.tiny_url))) {
    					text = j.shortUrl || j.result || j.data.tiny_url;
    				}
    			} catch (_) {}

	    			// set both outputs
	    			if (shortUrlOutput) shortUrlOutput.value = text;
	    			if (mobileShortUrlOutput) mobileShortUrlOutput.value = text;
	    			markChangesSaved();
                    return text;
	    		} catch (err) {
	    			console.warn('Short URL failed', err);
	    			if (shortUrlOutput) shortUrlOutput.value = '';
	    			if (mobileShortUrlOutput) mobileShortUrlOutput.value = '';

    			// show manual fallback links
    			if (shortUrlError) {
    				shortUrlError.textContent = '短链接生成失败。';
    				const a = document.createElement('a');
	    				a.href = `${config.tinyurlManual}?url=${encodeURIComponent(longUrl)}`;
    				a.target = '_blank';
    				a.rel = 'noopener noreferrer';
    				a.textContent = '手动尝试';
    				a.className = 'underline text-blue-600';
    				shortUrlError.appendChild(a);
    			}
    			if (mobileShortUrlError) {
    				mobileShortUrlError.textContent = '短链接生成失败。';
    				const a = document.createElement('a');
	    				a.href = `${config.tinyurlManual}?url=${encodeURIComponent(longUrl)}`;
    				a.target = '_blank';
    				a.rel = 'noopener noreferrer';
    				a.textContent = '手动尝试';
	    				a.className = 'underline text-blue-600';
	    				mobileShortUrlError.appendChild(a);
	    			}
                    return null;
	    		} finally {
	    			if (shortUrlButton) shortUrlButton.disabled = false;
	    			if (mobileShortUrlButton) mobileShortUrlButton.disabled = false;
	    		}
	    	}

    	// helper: show copy success for desktop + mobile
    	function showCopySuccess() {
    		// visual feedback on output field
    		if (shortUrlOutput) {
    			shortUrlOutput.classList.add('bg-green-100');
    			setTimeout(() => shortUrlOutput.classList.remove('bg-green-100'), 1000);
    		}
    		// show copy message(s)
    		const desktopMsg = document.getElementById('copyMessage');
    		const mobileMsg = document.getElementById('mobileCopyMessage');
    		[desktopMsg, mobileMsg].forEach(msg => {
    			if (msg) {
    				msg.classList.remove('hidden');
    				setTimeout(() => msg.classList.add('hidden'), 2000);
    			}
    		});
    	}

    	// robust copy helper with execCommand fallback
	    	async function tryCopyText(text) {
    		if (!text) return false;
    		// try Clipboard API
    		if (navigator.clipboard && navigator.clipboard.writeText) {
    			try {
    				await navigator.clipboard.writeText(text);
    				return true;
    			} catch (e) {
    				// continue to fallback
    			}
    		}
    		// fallback: textarea + execCommand
    		try {
    			const ta = document.createElement('textarea');
    			ta.value = text;
    			ta.style.position = 'fixed';
    			ta.style.left = '-9999px';
    			document.body.appendChild(ta);
    			ta.select();
    			const ok = document.execCommand('copy');
    			document.body.removeChild(ta);
    			return !!ok;
	    		} catch (e) {
	    			return false;
	    		}
	    	}

    	// bind desktop shortener button (unchanged)
    	if (shortUrlButton) {
    		shortUrlButton.addEventListener('click', async () => {
                if (preventActionOnEmptyMap("generating a short URL")) return;
    			const mapName = document.getElementById('mapNameInput')?.value || '';
                const compressed = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
                if (document.getElementById('mapData')) document.getElementById('mapData').value = compressed;
                const longUrl = getShareableUrl(entities, mapName);
    			await doShorten(longUrl);
    		});
    	}

    	// bind mobile shortener button (unchanged)
    	if (mobileShortUrlButton) {
    		mobileShortUrlButton.addEventListener('click', async () => {
                if (preventActionOnEmptyMap("generating a short URL")) return;
    			const mapName = document.getElementById('mapNameInput')?.value || '';
                const compressed = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
                if (document.getElementById('mobileMapData')) document.getElementById('mobileMapData').value = compressed;
                const longUrl = getShareableUrl(entities, mapName);
    			await doShorten(longUrl);
    		});
    	}

    	if (copyShortUrlButton && shortUrlOutput) {
    		copyShortUrlButton.addEventListener('click', async () => {
    			const text = shortUrlOutput.value || '';
    			const ok = await tryCopyText(text);
    			if (ok) {
    				showCopySuccess();
    				if (shortUrlError) shortUrlError.textContent = '';
    			} else {
    				if (shortUrlError) shortUrlError.textContent = '无法复制链接。';
    			}
    		});
    	}

    	if (mobileCopyShortUrlButton && mobileShortUrlOutput) {
    		mobileCopyShortUrlButton.addEventListener('click', async () => {
    			const text = mobileShortUrlOutput.value || '';
    			const ok = await tryCopyText(text);
    			if (ok) {
    				const msg = document.getElementById('mobileCopyMessage') || document.getElementById('copyMessage');
    				if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 2000); }
    				if (mobileShortUrlError) mobileShortUrlError.textContent = '';
    			} else {
    				if (mobileShortUrlError) mobileShortUrlError.textContent = '无法复制链接。';
    			}
    		});
    	}
    })();

// ===== MOBILE/TOUCH CONTROLS =====
function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoomLevel');
    const zoomPercentage = Math.round(zoom * 100) + '%';
    
    if (zoomLevel) {
        zoomLevel.textContent = zoomPercentage;
    }
}

function updateGhostPreview(mouseX, mouseY) {
    territoryPreview = null;

    if (selectedType && selectedType !== 'select' && selectedType !== 'move' && selectedType !== 'delete') {
        const gridPos = screenToDiamond(mouseX, mouseY);
        const x = gridPos.x;
        const y = gridPos.y;

        let width, height;
        if (selectedType === 'flag') {
            width = 1;
            height = 1;
        } else if (isArtPatternTool(selectedType)) {
            const cells = getArtPatternAt(selectedType, x, y).map(cell => ({
                ...cell,
                valid: isPositionValid(cell.x, cell.y, cell)
            }));
            ghostPreview = cells.some(cell => cell.valid)
                ? { x, y, width: 1, height: 1, type: 'artpattern', cells }
                : null;
            requestRedraw();
            return;
        } else if (selectedType === 'obstacle') {
            width = Math.max(1, Math.min(4, obstacleSize | 0));
            height = width;
        } else if (selectedType === 'enemyzone') {
            width = 12;
            height = 12;
        } else if (selectedType === 'city') {
            width = 2;
            height = 2;
        } else if (selectedType === 'building' || selectedType === 'hq' || selectedType === 'node') {
            width = 3;
            height = 3;
        }

        const tempEntity = isAllianceScopedType(selectedType)
            ? { x, y, width, height, type: selectedType, allianceId: normalizeAllianceId(activeAllianceId) }
            : { x, y, width, height, type: selectedType };

        let validPosition;
        if (selectedType === 'obstacle') {
            // Each cell is placed individually; show preview if at least one cell fits.
            validPosition = false;
            for (let dx = 0; dx < width && !validPosition; dx++) {
                for (let dy = 0; dy < height && !validPosition; dy++) {
                    if (isPositionValid(x + dx, y + dy, { x: x + dx, y: y + dy, width: 1, height: 1, type: 'obstacle' })) {
                        validPosition = true;
                    }
                }
            }
        } else {
            validPosition = isPositionValid(x, y, tempEntity);
        }

        if (validPosition) {
            ghostPreview = { ...tempEntity };

            // If the selected building is a flag or HQ, calculate its territory for preview
            if (selectedType === 'flag' || selectedType === 'hq') {
                territoryPreview = getTerritoryPreviewAreaForEntity(ghostPreview);
            }
        } else {
            ghostPreview = null;
        }
        
        requestRedraw();
    }
}

function isProtectedSourceInsideForeignProtectedArea(newX, newY, entity) {
    if (!entity || (entity.type !== 'flag' && entity.type !== 'hq')) return false;

    const ownAllianceId = getEntityAllianceId(entity);
    const { claimedCells } = buildProtectedAreaSnapshot(entities, entity);
    const width = entity.width || 1;
    const height = entity.height || 1;

    for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
            const owner = claimedCells.get(`${newX + dx},${newY + dy}`);
            if (owner && owner !== ownAllianceId) {
                return true;
            }
        }
    }
    return false;
}

function isPositionValid(newX, newY, entity, ignoreEntities = null) {
    if (newX < -gridCols || newX + entity.width > gridCols + 1 || 
        newY < -gridRows || newY + entity.height > gridRows + 1) {
        return false;
    }

    // In castle mode, disallow placing/moving ANY part of an entity inside the reserved center
    if (mapMode === 'castle') {
        const mid = anchorGridCell();
        const half = Math.floor(castleReservedSize / 2);
        const startX = mid.x - half;
        const endX = mid.x + half - 1;
        const startY = mid.y - half;
        const endY = mid.y + half - 1;
        for (let dx = 0; dx < entity.width; dx++) {
            for (let dy = 0; dy < entity.height; dy++) {
                const cx = newX + dx;
                const cy = newY + dy;
                if (cx >= startX && cx <= endX && cy >= startY && cy <= endY) return false;
            }
        }
        // Also enforce redzone rules: building allowed, but flags are forbidden inside the redzone ring
        const outerHalf = half + castleRedzoneThickness;
        const redStartX = mid.x - outerHalf;
        const redEndX = mid.x + outerHalf - 1;
        const redStartY = mid.y - outerHalf;
        const redEndY = mid.y + outerHalf - 1;
        // For flags, disallow placement anywhere inside redzone (but building/city allowed)
        if (entity.type === 'flag') {
            for (let dx = 0; dx < entity.width; dx++) {
                for (let dy = 0; dy < entity.height; dy++) {
                    const cx = newX + dx;
                    const cy = newY + dy;
                    // If inside outer box but not in inner reserved (i.e., within ring), forbid
                    const inOuter = (cx >= redStartX && cx <= redEndX && cy >= redStartY && cy <= redEndY);
                    const inInner = (cx >= startX && cx <= endX && cy >= startY && cy <= endY);
                    if (inOuter && !inInner) return false;
                }
            }
        }
        // Disallow HQs, similiar to flags
        if (entity.type === 'hq') {
            const HQRadius = 6;
            const centerX = newX + Math.floor(entity.width / 2);
            const centerY = newY + Math.floor(entity.height / 2);
            const effectiveRadius = HQRadius + Math.floor(entity.width / 2);

            for (let cx = centerX - effectiveRadius; cx <= centerX + effectiveRadius; cx++) {
                for (let cy = centerY - effectiveRadius; cy <= centerY + effectiveRadius; cy++) {
                    // If cell is inside the inner reserved area -> forbid
                    const inInner = (cx >= startX && cx <= endX && cy >= startY && cy <= endY);
                    if (inInner) return false;

                    // If cell is inside the outer redzone ring (outer box but not inner) -> forbid
                    const inOuter = (cx >= redStartX && cx <= redEndX && cy >= redStartY && cy <= redEndY);
                    if (inOuter && !inInner) return false;
                }
            }
        }
    }

    // Flags/HQs cannot be placed inside the protected area of another alliance.
    if (isProtectedSourceInsideForeignProtectedArea(newX, newY, entity)) {
        return false;
    }
    
    // Block placement on worldmap terrain when the worldmap layer is visible.
    if (worldmapPresence && (showWorldmap || cityLabelMode === 'coords')) {
        for (let dx = 0; dx < entity.width; dx++) {
            for (let dy = 0; dy < entity.height; dy++) {
                const wx = coordAnchor.x - (newY + dy);
                const wy = coordAnchor.y - (newX + dx);
                const wmKey = wx >= 0 && wx < 1200 && wy >= 0 && wy < 1200 ? worldmapPresence[wy * 1200 + wx] : 0;
                if (wmKey) {
                    if (wmKey !== 5 && wmKey !== 6) return false;
                    if (wmKey === 5 && entity.type !== 'city') return false;
                }
            }
        }
    }

    for (let other of entities) {
        if (other !== entity) {
            if (ignoreEntities && ignoreEntities.has(other)) continue;
            const hasOverlap =
                newX < other.x + other.width &&
                newX + entity.width > other.x &&
                newY < other.y + other.height &&
                newY + entity.height > other.y;

            if (hasOverlap) {
                return false;
            }
        }
    }
    return true;
}

function canInlineEditEntityName(entity) {
    return Boolean(entity && entity.type === 'city' && !entity.locked);
}

function handleInlineEntityNameEditKey(event, key, entity) {
    if (!canInlineEditEntityName(entity)) return false;
    if (event.altKey || event.ctrlKey || event.metaKey) return false;

    if (key === 'Enter') {
        event.preventDefault();
        entity.isEditing = false;
        redraw();
        updateCityList();
        updateSelectedEntityEditor();
        return true;
    }

    if (key === 'Backspace') {
        event.preventDefault();
        entity.name = entity.name ? entity.name.slice(0, -1) : '';
        entity.isEditing = true;
        redraw();
        updateCityList();
        updateSelectedEntityEditor();
        markUnsavedChanges();
        return true;
    }

    if (key.length === 1) {
        event.preventDefault();
        if (!entity.isEditing) {
            entity.name = '';
        }
        entity.isEditing = true;
        entity.name += key;
        redraw();
        updateCityList();
        updateSelectedEntityEditor();
        markUnsavedChanges();
        return true;
    }

    return false;
}

function handleKeyDown(event) {
    const key = event.key || '';
    const normalizedKey = key.toLowerCase();
    const isTyping = isTextInputTarget(event.target);
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);

    if (!isArrowKey) {
        flushPendingKeyboardMoveHistory();
    }

    // Global Undo/Redo: Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z
    try {
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const modKey = isMac ? event.metaKey : event.ctrlKey;
        if (!isTyping && modKey && normalizedKey === 'z') {
            event.preventDefault();
            if (event.shiftKey) redo(); else undo();
            return;
        }
        if (!isTyping && modKey && normalizedKey === 'y') {
            event.preventDefault();
            redo();
            return;
        }
    } catch (e) {
        console.error('Error in undo/redo keyboard shortcut handler:', e);
    }

    if (isTyping) return;

    const selectedNow = getSelectedEntities();
    const singleSelection = selectedNow.length === 1;

    if (singleSelection && (!selectedEntity || !selectedEntities.has(selectedEntity))) {
        selectedEntity = selectedNow[selectedNow.length - 1];
        updateSelectedEntityEditor();
    }

    if (key === 'Escape' || key === 'Enter' && selectedNow.length) {
        event.preventDefault();
        selectedNow.forEach(entity => {
            if (entity && entity.type === 'city') {
                entity.isEditing = false;
            }
        });
        clearSelection();
        isDragging = false;
        dragSelectionStart = [];
        hasDragMovement = false;
        resetBoxSelection();
        redraw();
        return;
    }

    // Inline rename has priority over plain shortcuts when a single editable entity is selected.
    if (singleSelection && handleInlineEntityNameEditKey(event, key, selectedEntity)) {
        return;
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        if (normalizedKey === 'm') {
            event.preventDefault();
            const nextMode = mapMode === 'castle' ? 'base' : 'castle';
            setMapMode(nextMode);
            showShortcutToast(`模式：${nextMode === 'castle' ? '王城' : '基地'} (M)`);
            return;
        }

        if (normalizedKey === 'a') {
            event.preventDefault();
            const currentAllianceIndex = ALLIANCES.findIndex(a => a.id === normalizeAllianceId(activeAllianceId));
            const nextAlliance = ALLIANCES[(currentAllianceIndex + 1) % ALLIANCES.length]?.id || DEFAULT_ALLIANCE_ID;
            setActiveAlliance(nextAlliance);
            showShortcutToast(`联盟：${getAllianceName(nextAlliance)} (A)`);
            return;
        }

        if (normalizedKey === 'e') {
            event.preventDefault();
            if (getSelectedEntities().length) {
                const deletedCount = deleteSelectedEntity();
                showShortcutToast(
                    deletedCount > 0
                        ? `已删除 ${deletedCount} 个对象 (E)`
                        : '选中对象不能删除'
                );
            } else {
                setSelectedTool('delete', { showToast: true });
            }
            return;
        }

        const shortcutTool = TOOL_SHORTCUT_KEY_MAP[normalizedKey];
        if (shortcutTool) {
            event.preventDefault();
            if (shortcutTool === 'enemyzone' && mapMode !== 'castle') {
                showShortcutToast('敌方区域只能在王城模式使用');
                return;
            }
            if (shortcutTool === 'obstacle' && selectedType === 'obstacle') {
                const nextSize = (obstacleSize % 4) + 1;
                setObstacleSize(nextSize);
                showShortcutToast(`障碍 ${nextSize}×${nextSize} (${TOOL_SHORTCUT_LABELS.obstacle})`);
                return;
            }
            setSelectedTool(shortcutTool, { showToast: true });
            return;
        }
    }

    if (!selectedNow.length) return;

    if (!selectedEntity || !selectedEntities.has(selectedEntity)) {
        selectedEntity = selectedNow[selectedNow.length - 1];
        updateSelectedEntityEditor();
    }

    if (isArrowKey) {
        event.preventDefault();
    }

    if (key === 'Delete') {
        deleteSelectedEntity();
        return;
    }

    let deltaX = 0;
    let deltaY = 0;
    if (key === 'ArrowUp') {
        deltaY = -1;
    } else if (key === 'ArrowDown') {
        deltaY = 1;
    } else if (key === 'ArrowLeft') {
        deltaX = -1;
    } else if (key === 'ArrowRight') {
        deltaX = 1;
    }

    if (deltaX === 0 && deltaY === 0) return;

    const movableSelection = selectedNow.filter(entity => !entity.locked);
    if (!movableSelection.length) return;
    const ignoreEntities = new Set(movableSelection);
    const canMove = movableSelection.every(entity =>
        isPositionValid(entity.x + deltaX, entity.y + deltaY, entity, ignoreEntities)
    );

    if (canMove) {
        movableSelection.forEach(entity => {
            entity.x += deltaX;
            entity.y += deltaY;
        });
        redraw();
        markUnsavedChanges();
        scheduleKeyboardMoveHistoryPush();
    }
}

function deleteSelectedEntity({ pushHistoryEntry = true } = {}) {
    const selectedNow = getSelectedEntities();
    if (!selectedNow.length) return 0;

    const deletable = selectedNow.filter(entity => !entity.locked);
    if (!deletable.length) return 0;

    let removedCities = false;
    deletable.forEach(entity => {
        const index = entities.indexOf(entity);
        if (index === -1) return;

        if (entity.type === 'city') {
            removedCities = true;
        } else if (entity.type === 'building') {
            bearTraps = bearTraps.filter(trap => trap !== entity);
        } else if (entity.type === 'enemyzone') {
            enemyZones = enemyZones.filter(zone => zone !== entity);
        }

        entities.splice(index, 1);
    });

    rebuildBattlefieldConnectionLinesFromEntities();

    if (removedCities) {
        renumberCities();
    }

    clearSelection();
    redraw();
    updateCounters();
    updateCityList();
    renderFilteredPowerRankings();
    markUnsavedChanges();
    if (pushHistoryEntry) {
        pushHistory();
    }
    return deletable.length;
}

function updateCityList() {
    const allianceId = normalizeAllianceId(activeAllianceId);
    const visibleCities = entities.filter(e => e.type === 'city' && getEntityAllianceId(e) === allianceId);

    // Get march times for visible cities
    visibleCities.forEach(city => {
        city.marchTimes = calculateMarchTimes(city);
    });

    const cityList = document.getElementById('cityList');
    const mobileCityList = document.getElementById('mobileCityList');
    const sortSelect = document.getElementById('citySort');
    const mobileSortSelect = document.getElementById('mobileCitySort');

    if (!cityList || !sortSelect || !mobileCityList || !mobileSortSelect) return;

    // Sync sort options between desktop and mobile by cloning option nodes
    while (mobileSortSelect.firstChild) mobileSortSelect.removeChild(mobileSortSelect.firstChild);
    Array.from(sortSelect.options).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        mobileSortSelect.appendChild(newOpt);
    });
    mobileSortSelect.value = sortSelect.value;

    let sortBy = sortSelect.value;
    if (mapMode !== 'castle' && sortBy === 'team') {
        sortBy = 'id';
    }

    cityList.innerHTML = '';
    mobileCityList.innerHTML = '';

    const cities = visibleCities;
    const btIndex = sortBy === 'bt1' ? 0 : sortBy === 'bt2' ? 1 : null;

    // Separate prioritized
    const prioritized = btIndex !== null
        ? cities.filter(c => c.priorities && c.priorities[`bt${btIndex + 1}`])
        : [];
    const others = btIndex !== null
        ? cities.filter(c => !(c.priorities && c.priorities[`bt${btIndex + 1}`]))
        : cities;

    // Comparator for sorting
    const comparator = (a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || `城市 ${a.id}`)
                    .toLowerCase()
                    .localeCompare((b.name || `城市 ${b.id}`).toLowerCase());
            case 'team': {
                const teamA = cityTeams[a.id] !== undefined ? cityTeams[a.id] : Infinity;
                const teamB = cityTeams[b.id] !== undefined ? cityTeams[b.id] : Infinity;
                if (teamA === teamB) {
                    return (a.name || `城市 ${a.id}`)
                        .toLowerCase()
                        .localeCompare((b.name || `城市 ${b.id}`).toLowerCase());
                }
                return teamA - teamB;
            }
            case 'bt1':
                return evaluateBTTime(a, 0) - evaluateBTTime(b, 0);
            case 'bt2':
                return evaluateBTTime(a, 1) - evaluateBTTime(b, 1);
            case 'both':
                return evaluateCombinedTime(a) - evaluateCombinedTime(b);
            default:
                return (a.id || 0) - (b.id || 0);
        }
    };

    prioritized.sort(comparator);
    others.sort(comparator);

    const selectCityFromList = (city) => {
        setSelection([city], { primaryEntity: city, pulse: true });
        redraw();
    };

    const buildCityItem = (city) => {
        const li = document.createElement('li');
        li.className = 'flex items-center space-x-2 mb-2';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = city.name || `城市 ${city.id}`;
        input.placeholder = `城市 ${city.id}`;
        input.className = 'border p-1 rounded touch-input';
        input.style.width = '15ch';
        const handleCityNameClick = () => selectCityFromList(city);
        input.addEventListener('click', handleCityNameClick);
        input.addEventListener('change', () => {
            city.name = input.value;
            redraw();
            markUnsavedChanges();
            updateCityList();
        });
        li.appendChild(input);

        if (mapMode === 'castle' || showTeamsInBase) {
            const teamSelect = document.createElement('select');
            teamSelect.className = 'text-xs border rounded px-2 py-1';
            teamSelect.style.minWidth = '80px';

            const noTeamOption = document.createElement('option');
            noTeamOption.value = '-1';
            noTeamOption.textContent = '无队伍';
            teamSelect.appendChild(noTeamOption);

            customTeams.forEach((team, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = team.name;
                option.style.color = team.color;
                teamSelect.appendChild(option);
            });

            teamSelect.value = cityTeams[city.id] !== undefined ? cityTeams[city.id] : '-1';
            teamSelect.addEventListener('change', () => {
                const teamIndex = parseInt(teamSelect.value);
                assignCityToTeam(city, teamIndex);
            });

            li.appendChild(teamSelect);
        }

        city.marchTimes.forEach((time, i) => {
            const key = `bt${i + 1}`;
            const isPriority = city.priorities && city.priorities[key];
            const bubble = document.createElement('span');
            const labelPrefix = mapMode === 'castle'
                ? '王城'
                : `${getAllianceShort(getEntityAllianceId(city))}BT${i + 1}`;
            bubble.textContent = `${labelPrefix}: ${time}s`;
            bubble.className = `bt-bubble inline-flex items-center justify-center px-2 py-1 text-xs leading-none rounded cursor-pointer min-w-[70px] ${
                isPriority ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`;
            bubble.addEventListener('click', () => {
                city.priorities = city.priorities || {};
                city.priorities[key] = !city.priorities[key];
                if (city.priorities[key]) {
                        const candidates = entities.filter(e =>
                            e.type === 'city' &&
                            getEntityAllianceId(e) === getEntityAllianceId(city) &&
                            !(e.priorities && e.priorities[key])
                        );
                    if (candidates.length) {
                        let bestCity = candidates[0];
                        let bestTime = sortBy === 'both'
                            ? evaluateCombinedTime(bestCity)
                            : evaluateBTTime(bestCity, i);
                        candidates.forEach(c => {
                            const t = sortBy === 'both'
                                ? evaluateCombinedTime(c)
                                : evaluateBTTime(c, i);
                            if (t < bestTime) {
                                bestTime = t;
                                bestCity = c;
                            }
                        });
                        [city.x, bestCity.x] = [bestCity.x, city.x];
                        [city.y, bestCity.y] = [bestCity.y, city.y];
                    }
                }
                redraw();
                updateCityList();
                markUnsavedChanges();
            });
            li.appendChild(bubble);
        });

        return li;
    };

    // Render prioritized cities first, then others for both lists
    [...prioritized, ...others].forEach(city => {
        cityList.appendChild(buildCityItem(city));
        mobileCityList.appendChild(buildCityItem(city));
    });
}

function renumberCities() {
    let newId = 1;
    entities
        .filter(entity => entity.type === 'city')
        .forEach(city => {
            city.id = newId;
            if (!city.name || /^(City|城市) \d+$/i.test(city.name)) {
                city.name = `城市 ${newId}`;
            }
            newId++;
        });
    cityCounterId = newId;
}

// ===== DATA PERSISTENCE =====

// Helper
function needsUtf8(str) {
    if (str.length > 254) return true;
    for (const ch of str) {
        if (ch.codePointAt(0) > 0xFF) return true;
    }
    return false;
}

// Checks if we can read bitCount bits from bitstr starting at offset
function canReadBits(bitstr, offset, bitCount) {
    return offset + bitCount <= bitstr.length;
}

  // Reads a 32-bit unsigned integer
function readUInt(bitstr, offset, len) {
    if (!canReadBits(bitstr, offset, len)) return { ok: false };
    const value = parseInt(bitstr.slice(offset, offset + len), 2);
    return { ok: true, value, next: offset + len };
}

// Reads byteCount bytes from offset and returns them as a Uint8Array
function readBytesFromBitString(bitstr, offset, byteCount) {
    const bitsNeeded = byteCount * 8;
    if (!canReadBits(bitstr, offset, bitsNeeded)) return { ok: false };
    const bytes = new Uint8Array(byteCount);
    for (let k = 0; k < byteCount; k++) {
        const start = offset + k * 8;
        bytes[k] = parseInt(bitstr.slice(start, start + 8), 2);
    }
    return { ok: true, bytes, next: offset + bitsNeeded };
}

const _utf8Decoder = new TextDecoder("utf-8"); // reuse for efficiency

function bytesToBitString(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(2).padStart(8, "0");
    return s;
}

function readBitsAsInt(bits, offset, len) {
    if (offset + len > bits.length) return null;
    return parseInt(bits.slice(offset, offset + len), 2);
}

// Compression and decompression functions
function compressMap(entities) {
    let bitString = "";

    entities.forEach(entity => {
        // skip castle and turret entities (will be generated due mode switch)
        if (entity.type === 'castle' || entity.type === 'turret') {
            return;
        }

        const type = entity.type === "flag" ? "000" :
                    entity.type === "city" ? "001" : 
                    entity.type === "building" ? "010" : 
                    entity.type === "node" ? "011" : 
                    entity.type === "hq" ? "101" : 
                    entity.type === "enemyzone" ? "110" :
                    "100"; // obstacle

        const storageX = entity.x + gridCols;
        const storageY = entity.y + gridRows;
        const x = storageX.toString(2).padStart(10, "0");
        const y = storageY.toString(2).padStart(10, "0");

        bitString += type + x + y;

        if (entity.type === "city") {
            const name = entity.name || `城市 ${entity.id}}`;

        if (needsUtf8(name)) {
            // New mode: marker 255 (11111111), then 16-bit byte length, then UTF-8 bytes
            const utf8 = new TextEncoder().encode(name);
            bitString += "11111111"; // 255
            bitString += utf8.length.toString(2).padStart(16, "0");
            bitString += bytesToBitString(utf8);
        } else {
            // Legacy compatible: 1 byte per character
            const len = Math.min(name.length, 254); // if > 254, you'd choose UTF-8 above
            bitString += len.toString(2).padStart(8, "0");
            for (let i = 0; i < len; i++) {
            const code = name.charCodeAt(i) & 0xFF;
            bitString += code.toString(2).padStart(8, "0");
            }
        }
        }
    });

    if (bitString.length % 8 !== 0) {
        bitString += "0".repeat(8 - (bitString.length % 8));
    }

    const binaryArray = bitString.match(/.{1,8}/g).map(byte => parseInt(byte, 2));
    return btoa(String.fromCharCode(...binaryArray));
}


function decompressMap(base64) {
    const binaryString = atob(base64)
      .split("")
      .map(char => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

    // Auto-detect format: try to determine if this is legacy (22-bit) or new (23-bit) format
    const isLegacyFormat = detectLegacyFormat(binaryString);
    
    if (isLegacyFormat) {
        return decompressLegacy(binaryString);
    } else {
        return decompressNew(binaryString);
    }
}

function detectLegacyFormat(binaryString) {
    // Check if the data length is more consistent with 22-bit chunks vs 23-bit chunks
    const totalBits = binaryString.length;
    
    // Estimate how many entities we'd have with each format
    let entities22 = 0;
    let entities23 = 0;
    let i = 0;
    
    // Try parsing as 22-bit chunks (legacy format)
    while (i + 22 <= totalBits) {
        const typeBits = binaryString.slice(i, i + 2);
        i += 2;
        i += 20; // x,y

        if (typeBits === "01") { // city legacy
        if (i + 8 > totalBits) break;
        const nameLen = parseInt(binaryString.slice(i, i + 8), 2);
        i += 8 + nameLen * 8;
        if (i > totalBits) break;
        }
        entities22++;
    }
    
    // Reset and try parsing as 23-bit chunks (new format)
    i = 0;
    while (i + 23 <= totalBits) {
        const typeBits = binaryString.slice(i, i + 3);
        i += 3;
        i += 20; // x,y

        if (typeBits === "001") { // city new
        if (i + 8 > totalBits) break;
        const lenByte = parseInt(binaryString.slice(i, i + 8), 2);
        i += 8;

        if (lenByte === 255) {
            if (i + 16 > totalBits) break;
            const byteLen = parseInt(binaryString.slice(i, i + 16), 2);
            i += 16 + byteLen * 8;
        } else {
            i += lenByte * 8;
        }
        if (i > totalBits) break;
        }
        entities23++;
    }
    
    // If we found more valid entities with 22-bit parsing, it's probably legacy
    return entities22 > entities23;
}

function decompressLegacy(binaryString) {
    const entities = [];
    let i = 0;

    while (i + 22 <= binaryString.length) {
        const typeBits = binaryString.slice(i, i + 2);
        i += 2;
        const xBits = binaryString.slice(i, i + 10);
        i += 10;
        const yBits = binaryString.slice(i, i + 10);
        i += 10;

        const type = typeBits === "00" ? "flag" :
                     typeBits === "01" ? "city" : 
                     typeBits === "10" ? "building" : "node";
        
        // Convert from old coordinate system (0-24) to new centered system (-12 to +12)
        const oldX = parseInt(xBits, 2);
        const oldY = parseInt(yBits, 2);
        const x = oldX - 12; // Center the old 0-24 range to -12 to +12
        const y = oldY - 12;

        let entity = { x, y, type };

        if (type === "flag") {
            entity.width = 1;
            entity.height = 1;
            entity.color = "gray";
        } else if (type === "city") {
            entity.width = 2;
            entity.height = 2;
            entity.color = getRandomColor();

            if (i + 8 > binaryString.length) break;
            const nameLengthBits = binaryString.slice(i, i + 8);
            i += 8;
            const nameLength = parseInt(nameLengthBits, 2);

            let name = "";
            for (let j = 0; j < nameLength; j++) {
                if (i + 8 > binaryString.length) break;
                const charBits = binaryString.slice(i, i + 8);
                i += 8;
                name += String.fromCharCode(parseInt(charBits, 2));
            }
            entity.name = name;
        } else if (type === "building") {
            entity.width = 3;
            entity.height = 3;
            entity.color = "black";
        } else if (type === "node") {
            entity.width = 3;
            entity.height = 3;
            entity.color = "darkgreen";
        }

        entities.push(entity);
    }

    return entities;
}

function decompressNew(binaryString) {
    const entities = [];
    let i = 0;

    while (i + 23 <= binaryString.length) {
        const typeBits = binaryString.slice(i, i + 3);
        i += 3;

        const xBits = binaryString.slice(i, i + 10);
        i += 10;

        const yBits = binaryString.slice(i, i + 10);
        i += 10;

        const type =
        typeBits === "000" ? "flag" :
        typeBits === "001" ? "city" :
        typeBits === "010" ? "building" :
        typeBits === "011" ? "node" :
        typeBits === "101" ? "hq" :
        typeBits === "110" ? "enemyzone" :
        "obstacle";

        const storageX = parseInt(xBits, 2);
        const storageY = parseInt(yBits, 2);
        const x = storageX - gridCols;
        const y = storageY - gridRows;

        const entity = { x, y, type };

        if (type === "flag") {
        entity.width = 1;
        entity.height = 1;
        entity.color = "gray";
        } else if (type === "city") {
        entity.width = 2;
        entity.height = 2;
        entity.color = getRandomColor();

        // read length byte (legacy length or 255 marker)
        const lenByteRes = readUInt(binaryString, i, 8);
        if (!lenByteRes.ok) break;
        const lenByte = lenByteRes.value;
        i = lenByteRes.next;

        if (lenByte === 255) {
            // UTF-8 name: 16-bit byte length + bytes
            const len16Res = readUInt(binaryString, i, 16);
            if (!len16Res.ok) break;
            const byteLen = len16Res.value;
            i = len16Res.next;

            const bytesRes = readBytesFromBitString(binaryString, i, byteLen);
            if (!bytesRes.ok) break;
            i = bytesRes.next;

            entity.name = _utf8Decoder.decode(bytesRes.bytes);
        } else {
            // Legacy name: lenByte latin-1 bytes
            const bytesRes = readBytesFromBitString(binaryString, i, lenByte);
            if (!bytesRes.ok) break;
            i = bytesRes.next;

            const arr = bytesRes.bytes;
            let name = "";
            for (let k = 0; k < arr.length; k++) {
            name += String.fromCharCode(arr[k]);
            }
            entity.name = name;
        }
        } else if (type === "building") {
        entity.width = 3;
        entity.height = 3;
        entity.color = "black";
        } else if (type === "hq") {
        entity.width = 3;
        entity.height = 3;
        entity.color = "darkgoldenrod";
        } else if (type === "node") {
        entity.width = 3;
        entity.height = 3;
        entity.color = "darkgreen";
        } else if (type === "enemyzone") {
        entity.width = 12;
        entity.height = 12;
        entity.color = "black";
        } else if (type === "obstacle") {
        entity.width = 1;
        entity.height = 1;
        entity.color = "#8B0000";
        }

        entities.push(entity);
    }

  return entities;
}

// ===== ENTITY ENCODING (7-bit coordinates, 17 bits/entity) =====
// Used by the lp1/lp2 packet format.
// gridCols/gridRows = 60, so storageX/Y range = 0-120, fits in 7 bits (max 127).
const ENTITY_COORD_BITS = 7;

function compressMapV3Bytes(entities) {
    let bitString = "";

    entities.forEach(entity => {
        if (entity.type === 'castle' || entity.type === 'turret') return;

        const type = entity.type === "flag"      ? "000" :
                     entity.type === "city"      ? "001" :
                     entity.type === "building"  ? "010" :
                     entity.type === "node"      ? "011" :
                     entity.type === "hq"        ? "101" :
                     entity.type === "enemyzone" ? "110" :
                                                   "100"; // obstacle

        const storageX = entity.x + gridCols;
        const storageY = entity.y + gridRows;
        bitString += type
            + storageX.toString(2).padStart(ENTITY_COORD_BITS, "0")
            + storageY.toString(2).padStart(ENTITY_COORD_BITS, "0");

        if (entity.type === "city") {
            const name = entity.name || `城市 ${entity.id}`;
            if (needsUtf8(name)) {
                const utf8 = new TextEncoder().encode(name);
                bitString += "11111111"; // marker 255
                bitString += utf8.length.toString(2).padStart(16, "0");
                bitString += bytesToBitString(utf8);
            } else {
                const len = Math.min(name.length, 254);
                bitString += len.toString(2).padStart(8, "0");
                for (let i = 0; i < len; i++) {
                    bitString += (name.charCodeAt(i) & 0xFF).toString(2).padStart(8, "0");
                }
            }
        }
    });

    if (bitString.length % 8 !== 0) {
        bitString += "0".repeat(8 - (bitString.length % 8));
    }

    const bytes = (bitString.match(/.{1,8}/g) || []).map(b => parseInt(b, 2));
    return new Uint8Array(bytes);
}

function decompressMapV2Bytes(bytes) {
    let bitString = "";
    for (let i = 0; i < bytes.length; i++) {
        bitString += bytes[i].toString(2).padStart(8, "0");
    }

    const entities = [];
    let i = 0;

    const entityBaseBits = 3 + ENTITY_COORD_BITS * 2;
    while (i + entityBaseBits <= bitString.length) {
        const typeBits = bitString.slice(i, i + 3);
        i += 3;
        const storageX = parseInt(bitString.slice(i, i + ENTITY_COORD_BITS), 2);
        i += ENTITY_COORD_BITS;
        const storageY = parseInt(bitString.slice(i, i + ENTITY_COORD_BITS), 2);
        i += ENTITY_COORD_BITS;

        const type = typeBits === "000" ? "flag"      :
                     typeBits === "001" ? "city"      :
                     typeBits === "010" ? "building"  :
                     typeBits === "011" ? "node"      :
                     typeBits === "101" ? "hq"        :
                     typeBits === "110" ? "enemyzone" :
                                         "obstacle";

        const entity = {
            x: storageX - gridCols,
            y: storageY - gridRows,
            type
        };

        if (type === "flag") {
            entity.width = 1; entity.height = 1; entity.color = "gray";
        } else if (type === "city") {
            entity.width = 2; entity.height = 2; entity.color = getRandomColor();

            const lenByteRes = readUInt(bitString, i, 8);
            if (!lenByteRes.ok) break;
            const lenByte = lenByteRes.value;
            i = lenByteRes.next;

            if (lenByte === 255) {
                const len16Res = readUInt(bitString, i, 16);
                if (!len16Res.ok) break;
                i = len16Res.next;
                const bytesRes = readBytesFromBitString(bitString, i, len16Res.value);
                if (!bytesRes.ok) break;
                i = bytesRes.next;
                entity.name = _utf8Decoder.decode(bytesRes.bytes);
            } else {
                const bytesRes = readBytesFromBitString(bitString, i, lenByte);
                if (!bytesRes.ok) break;
                i = bytesRes.next;
                let name = "";
                for (let k = 0; k < bytesRes.bytes.length; k++) {
                    name += String.fromCharCode(bytesRes.bytes[k]);
                }
                entity.name = name;
            }
        } else if (type === "building") {
            entity.width = 3; entity.height = 3; entity.color = "black";
        } else if (type === "hq") {
            entity.width = 3; entity.height = 3; entity.color = "darkgoldenrod";
        } else if (type === "node") {
            entity.width = 3; entity.height = 3; entity.color = "darkgreen";
        } else if (type === "enemyzone") {
            entity.width = 12; entity.height = 12; entity.color = "black";
        } else if (type === "obstacle") {
            entity.width = 1; entity.height = 1; entity.color = "#8B0000";
        }

        entities.push(entity);
    }

    return entities;
}

function sanitizeMapName(name) {
    return name.replace(/[^a-zA-Z0-9 \-_]/g, '').substring(0, 30);
}

function base64UrlEncodeUtf8(text) {
    const bytes = new TextEncoder().encode(String(text));
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlDecodeUtf8(value) {
    const normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = normalized + (padding ? '='.repeat(4 - padding) : '');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
    const normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = normalized + (padding ? '='.repeat(4 - padding) : '');
    return base64ToBytes(padded);
}


function getFflateApi() {
    const api = (typeof window !== 'undefined' && window.fflate) ? window.fflate : null;
    if (!api) return null;
    if (typeof api.deflateSync !== 'function') return null;
    if (typeof api.inflateSync !== 'function') return null;
    return api;
}

function buildUnifiedMapMeta(mapName, anchor, _waveMode, _cityLabelMode, _mapMode, serializableEntities) {
    const meta = {};
    const sanitizedName = sanitizeMapName(mapName || '');
    if (sanitizedName) meta.n = sanitizedName;

    if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
        meta.a = [clamp1200(anchor.x), clamp1200(anchor.y)];
    }

    if (_waveMode) meta.w = 1;                                    // omit if false (default)
    if (_cityLabelMode !== defaultCityLabelMode) meta.m = _cityLabelMode; // omit if "march"
    if (_mapMode === 'castle') meta.o = 'c';                     // omit if 'base' (default)

    const teamsPayload = getOptionalTeamsPayloadForMapCode();
    if (teamsPayload) {
        meta.t = teamsPayload;
    }

    const alliancesPayload = getOptionalAlliancesPayloadForMapCode(serializableEntities);
    if (alliancesPayload) {
        meta.l = alliancesPayload;
    }

    const entityExtrasPayload = serializeEntityExtrasForMapCode(serializableEntities);
    if (entityExtrasPayload) {
        meta.e = entityExtrasPayload;
    }

    const connectionPayload = serializeBattlefieldConnectionsForMapCode(serializableEntities);
    if (connectionPayload !== null) {
        meta.c = connectionPayload;
    }

    return meta;
}

function buildUnifiedMapPacket(serializableEntities, mapName, anchor, _waveMode, _cityLabelMode, _mapMode) {
    const entityBytes = compressMapV3Bytes(serializableEntities);
    const metaPayload = buildUnifiedMapMeta(
        mapName,
        anchor,
        _waveMode,
        _cityLabelMode,
        _mapMode,
        serializableEntities
    );
    const metaBytes = new TextEncoder().encode(JSON.stringify(metaPayload));

    // Header: 2 bytes big-endian uint16 = entity data length (up to 65535 bytes)
    if (entityBytes.length > 0xFFFF) {
        throw new Error(`Map entity data too large to encode: ${entityBytes.length} bytes (max 65535)`);
    }
    const packet = new Uint8Array(2 + entityBytes.length + metaBytes.length);
    packet[0] = (entityBytes.length >> 8) & 0xFF;
    packet[1] = entityBytes.length & 0xFF;
    packet.set(entityBytes, 2);
    packet.set(metaBytes, 2 + entityBytes.length);

    return packet;
}

function decodeUnifiedMapPacket(packet) {
    if (!(packet instanceof Uint8Array) || packet.length < 2) {
        return null;
    }

    const entityLen = (packet[0] << 8) | packet[1];
    if (2 + entityLen > packet.length) return null;

    const entityBytes = packet.slice(2, 2 + entityLen);
    const metaBytes = packet.slice(2 + entityLen);
    const entitiesDecoded = decompressMapV2Bytes(entityBytes);

    let meta = {};
    try {
        meta = JSON.parse(new TextDecoder().decode(metaBytes));
    } catch (e) {
        console.warn('Failed to parse unified map metadata payload', e);
    }

    const out = {
        entities: Array.isArray(entitiesDecoded) ? entitiesDecoded : [],
        mapName: '',
        anchor: null,
        waveMode: defaultWaveMode,
        cityLabelMode: defaultCityLabelMode,
        mapMode: 'base',
        teams: null,
        alliances: null,
        battlefieldConnections: null
    };

    if (typeof meta.n === 'string') {
        out.mapName = meta.n;
    }

    if (Array.isArray(meta.a) && meta.a.length >= 2) {
        out.anchor = parseCoordInput(`${meta.a[0]}:${meta.a[1]}`);
    }

    if (meta.w !== undefined) {
        out.waveMode = String(meta.w) === '1' || meta.w === true;
    }

    if (typeof meta.m === 'string') {
        const mode = meta.m.trim().toLowerCase();
        if (['march', 'coords', 'none'].includes(mode)) {
            out.cityLabelMode = mode;
        }
    }

    if (typeof meta.o === 'string') {
        out.mapMode = meta.o === 'c' ? 'castle' : 'base';
    }

    const normalizedTeams = deserializeTeamsFromMapCode(meta.t ?? meta.teams);
    if (normalizedTeams) {
        out.teams = normalizedTeams;
    }

    const normalizedAlliances = deserializeAlliancesFromMapCode(meta.l ?? meta.alliances);
    if (normalizedAlliances) {
        out.alliances = normalizedAlliances;
    }

    applyEntityExtrasFromMapCode(out.entities, meta.e ?? meta.entityExtras);
    if (Array.isArray(meta.c)) {
        out.battlefieldConnections = meta.c;
    }

    return out;
}

function compressMapUnifiedPayload(serializableEntities, mapName, anchor, _waveMode, _cityLabelMode, _mapMode) {
    try {
        const packet = buildUnifiedMapPacket(
            serializableEntities,
            mapName,
            anchor,
            _waveMode,
            _cityLabelMode,
            _mapMode
        );

        const lp1Payload = 'lp1:' + bytesToBase64Url(packet);
        const fflateApi = getFflateApi();
        if (!fflateApi) {
            return lp1Payload;
        }

        try {
            const compressed = fflateApi.deflateSync(packet, { level: 9 });
            if (!(compressed instanceof Uint8Array) || compressed.length === 0) {
                return lp1Payload;
            }
            const lp2Payload = 'lp2:' + bytesToBase64Url(compressed);
            return lp2Payload.length < lp1Payload.length ? lp2Payload : lp1Payload;
        } catch (compressionError) {
            console.warn('Failed to compress unified map payload with deflate; using lp1 payload.', compressionError);
            return lp1Payload;
        }
    } catch (e) {
        console.warn('Failed to build unified map payload; falling back to segmented code.', e);
        return null;
    }
}

function decompressMapUnifiedPayload(combinedString) {
    if (typeof combinedString !== 'string') {
        return null;
    }

    try {
        if (combinedString.startsWith('lp1:')) {
            const packet = base64UrlToBytes(combinedString.slice(4));
            return decodeUnifiedMapPacket(packet);
        }
        if (combinedString.startsWith('lp2:')) {
            const fflateApi = getFflateApi();
            if (!fflateApi) {
                console.warn('Cannot decode lp2 payload because compression support is unavailable.');
                return null;
            }
            const compressed = base64UrlToBytes(combinedString.slice(4));
            const packet = fflateApi.inflateSync(compressed);
            return decodeUnifiedMapPacket(packet);
        }
        return null;
    } catch (e) {
        console.warn('Failed to decode unified map payload', e);
        return null;
    }
}

function encodeCompactJsonForMapCode(payload) {
    try {
        return base64UrlEncodeUtf8(JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to encode compact map payload', e);
        return '';
    }
}

function decodeCompactJsonFromMapCode(value) {
    try {
        const raw = base64UrlDecodeUtf8(value);
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to decode compact map payload', e);
        return null;
    }
}

const DEFAULT_MAP_CODE_TEAM_LIST = DEFAULT_TEAMS.map(team => [
    normalizeTeamNameForMapCodeComparison(team.name),
    normalizeTeamColorForMapCodeComparison(team.color)
]);

function normalizeTeamColorForMapCodeComparison(color) {
    const raw = String(color || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!raw) return '#3b82f6';
    if (raw === '#3b82f6' || raw === 'rgb(59,130,246)' || raw === 'rgba(59,130,246,1)') return '#3b82f6';
    if (raw === '#ef4444' || raw === 'rgb(239,68,68)' || raw === 'rgba(239,68,68,1)') return '#ef4444';
    return raw;
}

function normalizeTeamNameForMapCodeComparison(name) {
    return typeof name === 'string' ? name.trim() : '队伍';
}

function hasTeamAssignmentsForMapCode() {
    return Object.entries(cityTeams).some(([cityId, teamIndex]) => {
        const parsedCityId = Number.parseInt(cityId, 10);
        const parsedTeamIndex = Number.parseInt(teamIndex, 10);
        return Number.isFinite(parsedCityId) && Number.isFinite(parsedTeamIndex) && parsedTeamIndex >= 0;
    });
}

function hasNonDefaultTeamListForMapCode() {
    if (!Array.isArray(customTeams) || customTeams.length === 0) {
        // Empty team list falls back to defaults on load, so we can omit it.
        return false;
    }

    const normalizedCurrent = customTeams.map(team => [
        normalizeTeamNameForMapCodeComparison(team?.name),
        normalizeTeamColorForMapCodeComparison(team?.color)
    ]);

    if (normalizedCurrent.length !== DEFAULT_MAP_CODE_TEAM_LIST.length) {
        return true;
    }

    for (let i = 0; i < normalizedCurrent.length; i++) {
        if (normalizedCurrent[i][0] !== DEFAULT_MAP_CODE_TEAM_LIST[i][0]) return true;
        if (normalizedCurrent[i][1] !== DEFAULT_MAP_CODE_TEAM_LIST[i][1]) return true;
    }

    return false;
}

function shouldPersistTeamsForMapCode() {
    return hasTeamAssignmentsForMapCode() || hasNonDefaultTeamListForMapCode();
}

function serializeTeamsForMapCode() {
    const compactAssignments = Object.entries(cityTeams)
        .map(([cityId, teamIndex]) => [Number.parseInt(cityId, 10), Number(teamIndex)])
        .filter(([cityId, teamIndex]) => Number.isFinite(cityId) && Number.isFinite(teamIndex))
        .sort((a, b) => a[0] - b[0]);

    return {
        a: compactAssignments,
        l: customTeams.map(team => [
            typeof team?.name === 'string' ? team.name : '队伍',
            typeof team?.color === 'string' ? team.color : '#3B82F6'
        ])
    };
}

function deserializeTeamsFromMapCode(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const rawAssignmentsPayload = payload.assignments ?? payload.a;
    const rawAssignments = {};
    if (Array.isArray(rawAssignmentsPayload)) {
        rawAssignmentsPayload.forEach(item => {
            if (!Array.isArray(item) || item.length < 2) return;
            const cityId = Number.parseInt(item[0], 10);
            const teamIndex = Number.parseInt(item[1], 10);
            if (!Number.isFinite(cityId) || !Number.isFinite(teamIndex)) return;
            rawAssignments[String(cityId)] = teamIndex;
        });
    } else if (rawAssignmentsPayload && typeof rawAssignmentsPayload === 'object') {
        Object.entries(rawAssignmentsPayload).forEach(([key, value]) => {
            const cityId = Number.parseInt(key, 10);
            const teamIndex = Number.parseInt(value, 10);
            if (!Number.isFinite(cityId) || !Number.isFinite(teamIndex)) return;
            rawAssignments[String(cityId)] = teamIndex;
        });
    }

    const rawList = Array.isArray(payload.list)
        ? payload.list
        : (Array.isArray(payload.l) ? payload.l : []);

    const normalizedList = rawList.map(item => {
        if (Array.isArray(item)) {
            return {
                name: typeof item[0] === 'string' ? item[0] : '队伍',
                color: typeof item[1] === 'string' ? item[1] : '#3B82F6'
            };
        }
        if (item && typeof item === 'object') {
            return {
                name: typeof item.name === 'string' ? item.name : '队伍',
                color: typeof item.color === 'string' ? item.color : '#3B82F6'
            };
        }
        return { name: '队伍', color: '#3B82F6' };
    });

    return {
        assignments: rawAssignments,
        list: normalizedList
    };
}

function getOptionalTeamsPayloadForMapCode() {
    if (!shouldPersistTeamsForMapCode()) return null;
    return serializeTeamsForMapCode();
}

function encodeAllianceTokenToBits(token) {
    if (token === 'm') return 1;
    if (token === 'f') return 2;
    return 0;
}

function decodeAllianceBitsToToken(bits) {
    if (bits === 1) return 'm';
    if (bits === 2) return 'f';
    return 'n';
}

function packAllianceTokenString(tokenString) {
    if (typeof tokenString !== 'string') return { p: '', c: 0 };
    const count = tokenString.length;
    if (count === 0) return { p: '', c: 0 };

    const bytes = new Uint8Array(Math.ceil(count / 4));
    for (let i = 0; i < count; i++) {
        const code = encodeAllianceTokenToBits(tokenString[i]);
        const byteIndex = Math.floor(i / 4);
        const shift = (3 - (i % 4)) * 2;
        bytes[byteIndex] |= code << shift;
    }

    return { p: bytesToBase64Url(bytes), c: count };
}

function unpackAllianceTokenString(packedBase64, count) {
    const safeCount = Number.parseInt(count, 10);
    if (!Number.isFinite(safeCount) || safeCount <= 0) return [];
    if (typeof packedBase64 !== 'string' || packedBase64.length === 0) return [];

    try {
        const bytes = base64UrlToBytes(packedBase64);
        const requiredBytes = Math.ceil(safeCount / 4);
        if (bytes.length < requiredBytes) return [];

        const tokens = new Array(safeCount);
        for (let i = 0; i < safeCount; i++) {
            const byteIndex = Math.floor(i / 4);
            const shift = (3 - (i % 4)) * 2;
            const code = (bytes[byteIndex] >> shift) & 0b11;
            tokens[i] = decodeAllianceBitsToToken(code);
        }
        return tokens;
    } catch (e) {
        console.warn('Failed to unpack compact alliance list', e);
        return [];
    }
}

function serializeAlliancesForMapCode(serializableEntities) {
    const activeToken = normalizeAllianceId(activeAllianceId) === 'farm' ? 'f' : 'm';
    const listTokens = serializableEntities.map(entity => {
        if (!isAllianceScopedType(entity.type)) return 'n';
        return normalizeAllianceId(getEntityAllianceId(entity)) === 'farm' ? 'f' : 'm';
    }).join('');

    const packed = packAllianceTokenString(listTokens);
    return { a: activeToken, p: packed.p, c: packed.c };
}

function shouldPersistAlliancesForMapCode(serializableEntities) {
    if (normalizeAllianceId(activeAllianceId) !== DEFAULT_ALLIANCE_ID) {
        return true;
    }

    return serializableEntities.some(entity => (
        isAllianceScopedType(entity.type) &&
        normalizeAllianceId(getEntityAllianceId(entity)) !== DEFAULT_ALLIANCE_ID
    ));
}

function getOptionalAlliancesPayloadForMapCode(serializableEntities) {
    if (!shouldPersistAlliancesForMapCode(serializableEntities)) return null;
    return serializeAlliancesForMapCode(serializableEntities);
}

function serializeBattlefieldConnectionsForMapCode(serializableEntities) {
    if (!Array.isArray(serializableEntities)) return null;
    const hasBattlefieldEntities = serializableEntities.some(entity => typeof entity?.battlefield === 'string' && entity.battlefield);
    if (!battlefieldConnectionLines.length) return hasBattlefieldEntities ? [] : null;
    const entityIndex = new Map();
    serializableEntities.forEach((entity, index) => entityIndex.set(entity, index));

    const payload = [];
    battlefieldConnectionLines.forEach(line => {
        const fromIndex = entityIndex.get(line.from);
        const toIndex = entityIndex.get(line.to);
        if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
        payload.push({
            f: fromIndex,
            t: toIndex,
            ...(line.battlefield ? { b: line.battlefield } : {}),
            ...(line.style && line.style !== 'solid' ? { s: line.style } : {}),
            ...(line.color && normalizeBattlefieldLineColor(line.color) !== 'blue' ? { k: normalizeBattlefieldLineColor(line.color) } : {})
        });
    });

    return payload.length ? payload : (hasBattlefieldEntities ? [] : null);
}

function applyBattlefieldConnectionsFromMapCode(targetEntities, payload) {
    if (!Array.isArray(targetEntities) || !Array.isArray(payload)) return false;
    if (payload.length === 0) {
        battlefieldConnectionLines = [];
        return true;
    }
    const nextLines = [];
    payload.forEach(item => {
        if (!item || !Number.isInteger(item.f) || !Number.isInteger(item.t)) return;
        const from = targetEntities[item.f];
        const to = targetEntities[item.t];
        if (!from || !to || from === to) return;
        nextLines.push({
            battlefield: typeof item.b === 'string' ? item.b : THREE_ALLIANCE_BATTLEFIELD_KEY,
            from,
            to,
            style: item.s === 'dashed' ? 'dashed' : 'solid',
            color: normalizeBattlefieldLineColor(item.k || item.color),
            custom: true
        });
    });
    if (!nextLines.length) return false;
    battlefieldConnectionLines = nextLines;
    return true;
}

function serializeEntityExtrasForMapCode(serializableEntities) {
    const extras = [];
    serializableEntities.forEach((entity, index) => {
        if (!entity || entity.type === 'city') return;
        const item = {};
        if (typeof entity.name === 'string' && entity.name.trim()) item.n = entity.name.trim();
        if (typeof entity.color === 'string' && entity.color.trim()) item.c = entity.color.trim();
        if (typeof entity.battlefield === 'string' && entity.battlefield.trim()) item.b = entity.battlefield.trim();
        if (typeof entity.imageKey === 'string' && entity.imageKey.trim()) item.img = entity.imageKey.trim();
        if (typeof entity.templateId === 'string' && entity.templateId.trim()) item.tid = entity.templateId.trim();
        if (typeof entity.threeAllianceGroup === 'string' && entity.threeAllianceGroup.trim()) item.g3 = entity.threeAllianceGroup.trim();
        if (Number.isFinite(entity.width)) item.w = Math.max(1, Math.min(31, Math.round(entity.width)));
        if (Number.isFinite(entity.height)) item.h = Math.max(1, Math.min(31, Math.round(entity.height)));
        if (entity.mainMark) item.mk = 1;
        if (Object.keys(item).length) {
            item.i = index;
            extras.push(item);
        }
    });
    return extras.length ? extras : null;
}

function applyEntityExtrasFromMapCode(targetEntities, payload) {
    if (!Array.isArray(targetEntities) || !Array.isArray(payload)) return;
    payload.forEach(item => {
        if (!item || !Number.isInteger(item.i)) return;
        const entity = targetEntities[item.i];
        if (!entity || entity.type === 'city') return;
        if (typeof item.n === 'string') entity.name = item.n;
        if (typeof item.c === 'string') entity.color = item.c;
        if (typeof item.b === 'string') entity.battlefield = item.b;
        if (typeof item.img === 'string') entity.imageKey = item.img;
        if (typeof item.tid === 'string') entity.templateId = item.tid;
        if (typeof item.g3 === 'string') entity.threeAllianceGroup = item.g3;
        if (Number.isFinite(item.w)) entity.width = Math.max(1, Math.min(31, Math.round(item.w)));
        if (Number.isFinite(item.h)) entity.height = Math.max(1, Math.min(31, Math.round(item.h)));
        entity.mainMark = item.mk === 1 || item.mk === true;
    });
}

function normalizeAllianceToken(value) {
    if (value === null || value === undefined) return null;
    if (value === 'n' || value === 'x') return null;
    if (value === 'f' || value === 'farm') return 'farm';
    if (value === 'm' || value === 'main') return 'main';
    return null;
}

function deserializeAlliancesFromMapCode(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const rawActive = payload.active ?? payload.a;
    const active = normalizeAllianceToken(rawActive) || DEFAULT_ALLIANCE_ID;

    let rawList = [];
    if (typeof payload.p === 'string' && payload.p.length > 0) {
        rawList = unpackAllianceTokenString(payload.p, payload.c);
    } else if (Array.isArray(payload.list)) {
        rawList = payload.list;
    } else if (Array.isArray(payload.l)) {
        rawList = payload.l;
    } else if (typeof payload.l === 'string') {
        rawList = Array.from(payload.l);
    }

    const list = rawList.map(item => normalizeAllianceToken(item));
    return { active, list };
}

function getSerializableEntitiesForMapCode(sourceEntities = entities) {
    return sourceEntities.filter(entity => entity.type !== 'castle' && entity.type !== 'turret');
}

function compressMapWithName(entities, mapName, anchor = coordAnchor, _waveMode = waveMode, _cityLabelMode = cityLabelMode, _mapMode = mapMode) {
    const serializableEntities = getSerializableEntitiesForMapCode(entities);
    const unifiedPayload = compressMapUnifiedPayload(
        serializableEntities,
        mapName,
        anchor,
        _waveMode,
        _cityLabelMode,
        _mapMode
    );
    if (unifiedPayload) {
        return unifiedPayload;
    }

    let base64String = compressMap(serializableEntities);
    const parts = [base64String];

    if (mapName && mapName.trim() !== '') {
        parts.push("n=" + sanitizeMapName(mapName));
    }

    if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
        parts.push("a=" + clamp1200(anchor.x) + ":" + clamp1200(anchor.y));
    }

    parts.push("w=" + (_waveMode ? "1" : "0"));
    parts.push("m=" + _cityLabelMode);
    parts.push("mode=" + (_mapMode === 'castle' ? 'c' : 'b')); // 'b' = base, 'c' = castle

    const teamsPayload = getOptionalTeamsPayloadForMapCode();
    if (teamsPayload) {
        const teamsCompact = encodeCompactJsonForMapCode(teamsPayload);
        if (teamsCompact) {
            parts.push("teams2=" + teamsCompact);
        } else {
            parts.push("teams=" + encodeURIComponent(JSON.stringify({ assignments: cityTeams, list: customTeams })));
        }
    }

    const alliancesPayload = getOptionalAlliancesPayloadForMapCode(serializableEntities);
    if (alliancesPayload) {
        const alliancesCompact = encodeCompactJsonForMapCode(alliancesPayload);
        if (alliancesCompact) {
            parts.push("alli2=" + alliancesCompact);
        } else {
            parts.push("alli=" + encodeURIComponent(JSON.stringify({
                active: normalizeAllianceId(activeAllianceId),
                list: serializableEntities.map(entity => isAllianceScopedType(entity.type) ? getEntityAllianceId(entity) : null)
            })));
        }
    }

    return parts.join("||");
}


function decompressMapWithName(combinedString) {
    // Returns: { entities, mapName?, anchor?, waveMode?, cityLabelMode?, teams?, alliances? }
    const out = { entities: [], mapName: "", anchor: null, waveMode: null, cityLabelMode: null, teams: null, alliances: null };

    if (!combinedString || typeof combinedString !== 'string') {
        return out;
    }

    const unified = decompressMapUnifiedPayload(combinedString);
    if (unified) {
        if (unified.mapName) {
            const mapNameInput = document.getElementById('mapNameInput');
            if (mapNameInput) mapNameInput.value = unified.mapName;
        }
        return unified;
    }

    const parts = combinedString.split("||");
    const base64String = parts.shift();

    for (const seg of parts) {
        if (seg.startsWith("n=")) {
            out.mapName = seg.slice(2);
        } else if (seg.startsWith("a=")) {
        	const s = seg.slice(2)
        	out.anchor = parseCoordInput(s)
        } else if (seg.startsWith("w=")) {
            out.waveMode = seg.slice(2) === '1';
        } else if (seg.startsWith("m=")) {
            let mode = seg.slice(2).trim().toLowerCase();
            if (!['march', 'coords', 'none'].includes(mode)) {
                mode = defaultCityLabelMode;
            }
            out.cityLabelMode = mode;
        } else if (seg.startsWith("mode=")) {
            out.mapMode = seg.slice(5).trim().toLowerCase();
        } else if (seg.startsWith("teams2=")) {
            const decoded = decodeCompactJsonFromMapCode(seg.slice(7));
            const normalizedTeams = deserializeTeamsFromMapCode(decoded);
            if (normalizedTeams) {
                out.teams = normalizedTeams;
            }
        } else if (seg.startsWith("teams=")) {
            try {
                const raw = decodeURIComponent(seg.slice(6));
                const parsed = JSON.parse(raw);
                const normalizedTeams = deserializeTeamsFromMapCode(parsed);
                if (normalizedTeams) {
                    out.teams = normalizedTeams;
                }
            } catch (e) {
                console.warn('Failed to parse teams data from map code', e);
            }
        } else if (seg.startsWith("alli2=")) {
            const decoded = decodeCompactJsonFromMapCode(seg.slice(6));
            const normalizedAlliances = deserializeAlliancesFromMapCode(decoded);
            if (normalizedAlliances) {
                out.alliances = normalizedAlliances;
            }
        } else if (seg.startsWith("alli=")) {
            try {
                const raw = decodeURIComponent(seg.slice(5));
                const parsed = JSON.parse(raw);
                const normalizedAlliances = deserializeAlliancesFromMapCode(parsed);
                if (normalizedAlliances) {
                    out.alliances = normalizedAlliances;
                }
            } catch (e) {
                console.warn('Failed to parse alliances data from map code', e);
            }
        } else {
            // Legacy support: if no prefix, treat as name
            if (!out.mapName) out.mapName = seg;
        }
    }
    
    out.entities = decompressMap(base64String);

    if (out.mapName) {
        const mapNameInput = document.getElementById('mapNameInput');
        if (mapNameInput) mapNameInput.value = out.mapName;
    }

    if (out.mapMode) {
        // normalize
        out.mapMode = out.mapMode === 'c' ? 'castle' : 'base';
    }

    return out;
}


// Pure helper to generate a shareable URL with provided map data and name
function getShareableUrl(entitiesArg, mapNameArg) {
    const compressedMap = compressMapWithName(entitiesArg, mapNameArg, coordAnchor, waveMode, cityLabelMode, mapMode);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mapData', compressedMap);
    return newUrl.toString();
}

function loadMap() {
    try {
        const compressedMap = mapData.value;
        const loaded = decompressMapWithName(compressedMap);
        const loadedEntities = Array.isArray(loaded) ? loaded : loaded.entities || [];
        const loadedAllianceData = !Array.isArray(loaded) && loaded.alliances && typeof loaded.alliances === 'object'
            ? loaded.alliances
            : null;
        const allianceList = Array.isArray(loadedAllianceData?.list) ? loadedAllianceData.list : [];
        const activeFromMap = normalizeAllianceId(loadedAllianceData?.active);

        entities.length = 0;
        bearTraps.length = 0;
        enemyZones.length = 0;

        loadedEntities.forEach((entity, index) => {
            if (isAllianceScopedType(entity.type)) {
                const fromList = allianceList[index];
                entity.allianceId = normalizeAllianceId(
                    typeof fromList === 'string' ? fromList : entity.allianceId
                );
            }
            entities.push(entity);
            if (entity.type === "building") {
                bearTraps.push(entity);
            } else if (entity.type === "enemyzone") {
                enemyZones.push(entity);
            }
        });

        if (!Array.isArray(loaded)) {
            setAnchorInput(loaded.anchor);
            setWaveMode(loaded.waveMode);
            setCityLabelMode(loaded.cityLabelMode);
            setMapMode(loaded.mapMode || 'castle'); // 'base' as default if no mapmode was saved

            // Restore teams if present; otherwise reset to defaults for legacy map codes
            if (loaded.teams && typeof loaded.teams === 'object') {
                const list = Array.isArray(loaded.teams.list) ? loaded.teams.list : [];
                const assignments = (loaded.teams.assignments && typeof loaded.teams.assignments === 'object')
                    ? loaded.teams.assignments
                    : {};
                customTeams = list.map(t => ({
                    name: typeof t.name === 'string' ? t.name : '队伍',
                    color: typeof t.color === 'string' ? t.color : '#3B82F6'
                }));
                if (customTeams.length === 0) {
                    initializeDefaultTeams();
                }
                cityTeams = assignments;
            } else {
                customTeams = [];
                initializeDefaultTeams();
                cityTeams = {};
            }
            updateTeamsUI();
            activeAllianceId = activeFromMap;
        } else {
            activeAllianceId = DEFAULT_ALLIANCE_ID;
        }

        let cityId = 1;
        entities.forEach(entity => {
            if (entity.type === "city") {
                entity.id = cityId;
                if (!entity.name) {
                    entity.name = `城市 ${cityId}`;
                }
                cityId++;
            }
        });
        cityCounterId = cityId;

        normalizeBattlefieldEntityAssets();
        setActiveAlliance(activeAllianceId);
        if (!applyBattlefieldConnectionsFromMapCode(entities, !Array.isArray(loaded) ? loaded.battlefieldConnections : null)) {
            rebuildBattlefieldConnectionLinesFromEntities();
        }
        setSwordBattlefieldMode(entities.some(entity => entity?.battlefield === SWORD_BATTLEFIELD_KEY));
        syncMarkedHaloAnimation();
        markChangesSaved();
    } catch (e) {
        alert('地图加载失败，请检查代码格式。');
        console.error(e);
    }
}


function loadMapFromQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    const mapDataParam = urlParams.get('mapData');
    if (mapDataParam) {
        mapData.value = mapDataParam;
        loadMap();
    }
}

function downloadCanvasAsPNG() {
    // High-resolution export (4x)
    const scale = 2;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    tempCanvas.width = originalWidth * scale;
    tempCanvas.height = originalHeight * scale;

    const scaledPanX = panX * scale;
    const scaledPanY = panY * scale;
    const scaledZoom = zoom * scale;

    drawDiamondGrid(tempCtx, scaledPanX, scaledPanY, scaledZoom);
    drawEntities(tempCtx, scaledPanX, scaledPanY, scaledZoom);
    drawAnchorSymbol(tempCtx, scaledPanX, scaledPanY, scaledZoom);

    tempCanvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const mapName = document.getElementById('mapNameInput')?.value || 'layout';
        link.download = `${mapName}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}


function markUnsavedChanges() {
    hasUnsavedChanges = true;
    updatePageTitle();
}

function markChangesSaved() {
    hasUnsavedChanges = false;
    try {
        // Record a snapshot representing the saved state
        lastSavedSnapshot = (typeof snapshotState === 'function') ? snapshotState() : null;
    } catch (e) {
        console.error('Failed to create saved state snapshot:', e);
        lastSavedSnapshot = null;
    }
    updatePageTitle();
}

function updatePageTitle() {
    const baseTitle = '奔奔王国布局规划';
    document.title = hasUnsavedChanges ? `${baseTitle} - 未保存` : baseTitle;
}

// ===== CITY MANAGEMENT =====
// Populate sort selector dynamically
function enablePopulateSortOptions(selected) {
    const sortSelect = document.getElementById('citySort');
    const mobileSort = document.getElementById('mobileCitySort');
    const selects = [sortSelect, mobileSort].filter(Boolean);
    if (!selects.length) return;

    selects.forEach(sel => {
        sel.innerHTML = '';
        sel.appendChild(new Option('编号', 'id'));
        sel.appendChild(new Option('名称', 'name'));
        if (mapMode === 'castle' || showTeamsInBase) {
            sel.appendChild(new Option('队伍', 'team'));
        }
    });
    
    // Check presence of BT1/BT2
    const allianceId = normalizeAllianceId(activeAllianceId);
    const cities = entities.filter(e => e.type === 'city' && getEntityAllianceId(e) === allianceId);
    const anyBT1 = cities.some(c => calculateMarchTimes(c).length >= 1);
    const anyBT2 = cities.some(c => calculateMarchTimes(c).length >= 2);
    
    selects.forEach(sel => {
        if (anyBT1) sel.appendChild(new Option('BT1 时间', 'bt1'));
        if (anyBT2) sel.appendChild(new Option('BT2 时间', 'bt2'));
        if (anyBT1 && anyBT2) sel.appendChild(new Option('BT1+BT2 合计', 'both'));

        if (selected && Array.from(sel.options).some(o => o.value === selected)) {
            sel.value = selected;
        } else {
            sel.value = 'id';
        }
        sel.onchange = updateCityList;
    });
}

// Helper function to evaluate BT time for a city
function evaluateBTTime(city, btIndex) {
    const times = city.marchTimes || calculateMarchTimes(city);
    return times[btIndex] || Infinity;
}

// Helper function to evaluate combined BT1+BT2 time
function evaluateCombinedTime(city) {
    const times = city.marchTimes || calculateMarchTimes(city);
    const bt1 = times[0] || 0;
    const bt2 = times[1] || 0;
    return bt1 + bt2;
}

// Map name validation
document.getElementById("mapNameInput").addEventListener("input", function() {
    const value = this.value;
    const disallowedRegex = /[^a-zA-Z0-9 \-_]/;
    const hintElement = document.getElementById("mapNameHint");
    if (disallowedRegex.test(value)) {
         hintElement.textContent = "检测到无效字符！仅支持字母、数字、空格、短横线和下划线。";
         hintElement.style.display = "block";
    } else {
         hintElement.textContent = "";
         hintElement.style.display = "none";
    }
});

window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
        const message = 'You have unsaved changes. Do you really want to leave?';
        e.preventDefault();
        return message;
    }
});

// ======= UTILS – Player import/export =======
// This works for city names and their coordinates. 
// With a few changes we could export the entire building list

// is "City 1/2/3 ..."?
function isDefaultCityName(name){
    return /^(city|城市)\s*\d+$/i.test(String(name||'').trim());
}

// number conversion
function num(v){ const n = +v; return Number.isFinite(n) ? n : null; }

// split CSV into fields (handles quoted commas)
function splitCsvLine(line){
    const out = [];
    let cur = '', inQ = false;
    for (let i=0; i<line.length; i++){
        const ch = line[i];
        if (ch === '"'){
        if (inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = !inQ;
        } else if (ch === ',' && !inQ){
        out.push(cur); cur = '';
        } else {
        cur += ch;
        }
    }
    out.push(cur);
    return out;
}

function csvEscape(value) {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
}

function parseAllianceIdFromCsv(value, fallbackAllianceId = activeAllianceId) {
    const fallback = normalizeAllianceId(fallbackAllianceId);
    const needle = String(value ?? '').trim().toLowerCase();
    if (!needle) return fallback;

    const match = ALLIANCES.find(alliance =>
        alliance.id.toLowerCase() === needle ||
        alliance.name.toLowerCase() === needle ||
        alliance.short.toLowerCase() === needle
    );
    return match ? match.id : fallback;
}

function findTeamIndexByName(teamName) {
    const needle = String(teamName ?? '').trim().toLowerCase();
    if (!needle) return -1;
    return customTeams.findIndex(team => String(team?.name ?? '').trim().toLowerCase() === needle);
}

function getImportTeamColor(index) {
    const palette = [
        '#3B82F6', '#10B981', '#EF4444', '#F59E0B',
        '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ];
    return palette[index % palette.length];
}

function ensureTeamIndexByName(teamName) {
    const normalizedName = String(teamName ?? '').trim();
    if (!normalizedName) return -1;

    const existing = findTeamIndexByName(normalizedName);
    if (existing !== -1) return existing;

    customTeams.push({ name: normalizedName, color: getImportTeamColor(customTeams.length) });
    return customTeams.length - 1;
}

// find a free spot in the grid for a new entity of given size
// spiral search from anchorGridCell or 0,0
// respects isPositionValid if defined
function findFreeGridSpot(width=2, height=2){
    const start = anchorGridCell ? anchorGridCell() : { x:0, y:0 };
    const maxR = Math.max(gridCols||50, gridRows||50);
    for (let r=0; r<=maxR; r++){
        for (let dx=-r; dx<=r; dx++){
        for (let dy=-r; dy<=r; dy++){
            if (Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue;
            const x = start.x + dx, y = start.y + dy;
            const candidate = { x, y, width, height };
            if (typeof isPositionValid !== 'function' || isPositionValid(x,y,candidate)) {
            return { x, y };
            }
        }
        }
    }
    return start;
}

// Game world coord -> grid top-left coord
// width,height = e.g. 2x2 for cities
function worldCoordToGrid(world, width=2, height=2){
  const mid = anchorGridCell ? anchorGridCell() : {x:0, y:0};
  const wx = clamp1200 ? clamp1200(world.x) : world.x|0;
  const wy = clamp1200 ? clamp1200(world.y) : world.y|0;

  // reverse of coordForCity function
  const tipX = mid.x + (coordAnchor.y - wy);
  const tipY = mid.y + (coordAnchor.x - wx);

  return { x: tipX - (width - 1), y: tipY - (height - 1) };
}

// Import: name[,x,y,alliance,team] where all but "name" are optional
// 1) Existing "City N" cities are RENAMED only.
// 2) Only when no default cities remain, new 2x2 cities are created.
// 3) Provided x,y are by default used ONLY for new cities.
//    -> with option { moveDefault城市：true } you can also move existing default cities,
//       I used this for for testing, might not be the best idea for normal use 
function importPlayerNamesCSV(text, { moveDefaultCities = false } = {}){
  const lines = String(text).split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return;
  const fallbackAllianceId = normalizeAllianceId(activeAllianceId);

  const headers = splitCsvLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
  const idx = k => headers.indexOf(k);

  const iName = idx('name');
  const iX    = idx('x');
  const iY    = idx('y');
  const iAlliance = idx('alliance');
  const iTeam = idx('team');
  const hasAllianceColumn = iAlliance !== -1;
  const hasTeamColumn = iTeam !== -1;

  if (iName === -1) {
    alert('CSV 至少需要包含一个 name 列。');
    return;
  }

  // load CSV
  const rows = [];
  for (let i = 1; i < lines.length; i++){
    const cols = splitCsvLine(lines[i]);
    const name = (cols[iName] || '').trim();
    if (!name) continue;
    const x = (iX !== -1) ? num(cols[iX]) : null;
    const y = (iY !== -1) ? num(cols[iY]) : null;
    const allianceId = hasAllianceColumn
      ? parseAllianceIdFromCsv(cols[iAlliance], fallbackAllianceId)
      : fallbackAllianceId;
    const teamName = hasTeamColumn ? (cols[iTeam] || '').trim() : null;
    rows.push({ name, x, y, allianceId, teamName });
  }
  if (!rows.length) return;

  const defaultCitiesByAlliance = {};
  const alliancesToPrepare = hasAllianceColumn ? ALLIANCES.map(a => a.id) : [fallbackAllianceId];
  alliancesToPrepare.forEach(allianceId => {
    defaultCitiesByAlliance[allianceId] = entities
      .filter(e => e.type === 'city' && getEntityAllianceId(e) === allianceId && isDefaultCityName(e.name))
      .sort((a,b) => (a.id||0) - (b.id||0));
  });

  const assignImportedTeam = (city, teamName) => {
    if (!hasTeamColumn || !city || city.id === undefined) return;
    const teamIndex = ensureTeamIndexByName(teamName);
    if (teamIndex === -1) {
      delete cityTeams[city.id];
      return;
    }
    cityTeams[city.id] = teamIndex;
  };

  const teamCountBeforeImport = customTeams.length;

  // 1) First consume default cities per alliance, then create new ones.
  for (let r = 0; r < rows.length; r++){
    const rec = rows[r];
    const defaultCities = defaultCitiesByAlliance[rec.allianceId] || [];
    const existingCity = defaultCities.shift();

    if (existingCity) {
      existingCity.name = rec.name;

      // only move if explicitly allowed
      if (moveDefaultCities && Number.isFinite(rec.x) && Number.isFinite(rec.y)) {
        const width = existingCity.width || 2, height = existingCity.height || 2;
        const g = worldCoordToGrid({ x: rec.x, y: rec.y }, width, height);
        const ok = (typeof isPositionValid !== 'function') ||
                   isPositionValid(g.x, g.y, { x:g.x, y:g.y, width, height });
        if (ok) { existingCity.x = g.x; existingCity.y = g.y; }
      }

      assignImportedTeam(existingCity, rec.teamName);
      continue;
    }

    const width = 2, height = 2;

    // Get target position (x,y only for new cities)
    let gx, gy;
    if (Number.isFinite(rec.x) && Number.isFinite(rec.y)) {
      const g = worldCoordToGrid({ x: rec.x, y: rec.y }, width, height);
      if (typeof isPositionValid !== 'function' || isPositionValid(g.x, g.y, { x:g.x, y:g.y, width, height })) {
        gx = g.x; gy = g.y;
      }
    }
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
      const spot = findFreeGridSpot(width, height);
      gx = spot.x; gy = spot.y;
    }

    const city = {
      type: 'city',
      id: (typeof cityCounterId !== 'undefined' ? cityCounterId++ : undefined),
      name: rec.name,
      x: gx, y: gy,
      width, height,
      allianceId: rec.allianceId,
      color: (typeof getRandomColor === 'function' ? getRandomColor() : 'rgb(200,200,200)')
    };
    entities.push(city);
    assignImportedTeam(city, rec.teamName);
  }

  if (hasTeamColumn && customTeams.length !== teamCountBeforeImport) {
    updateTeamsUI();
  }

  try { redraw(); } catch(e) { console.error("Redraw failed:", e); }  
  try { updateCounters(); } catch(e) { console.error("Update counters failed:", e); }  
  try { updateCityList(); } catch(e) { console.error("Update city list failed:", e); }  
  try { markUnsavedChanges(); } catch(e) { console.error("Marking unsaved changes failed:", e); } 
}


/* =========================
   EXPORT: name,x,y,alliance,team
   - x,y = coordForCity(city)
   - includes all cities (both alliances)
   - onlyNamed=true -> skips "City N" - only used for testing
========================= */
function exportPlayerNamesCSV({ onlyNamed = false } = {}) {
  if (preventActionOnEmptyMap("导出 CSV")) return;
  const rows = ['name,x,y,alliance,team'];

  const allianceOrder = ALLIANCES.reduce((acc, a, idx) => {
    acc[a.id] = idx;
    return acc;
  }, {});

  const cities = entities
    .filter(e => e.type === 'city')
    .sort((a, b) => {
      const aa = allianceOrder[getEntityAllianceId(a)] ?? 999;
      const ab = allianceOrder[getEntityAllianceId(b)] ?? 999;
      if (aa !== ab) return aa - ab;
      return (a.id || 0) - (b.id || 0);
    });

  for (const c of cities) {
    const rawName = (c.name && c.name.trim()) ? c.name.trim() : `城市 ${c.id ?? ''}`.trim();
    if (onlyNamed && isDefaultCityName(rawName)) continue;

    const world = coordForCity(c);
    const allianceName = getAllianceName(getEntityAllianceId(c));
    const teamIdx = cityTeams[c.id];
    const teamName = (teamIdx !== undefined && customTeams[teamIdx]?.name)
      ? customTeams[teamIdx].name
      : '';

    rows.push([
      csvEscape(rawName),
      world.x,
      world.y,
      csvEscape(allianceName),
      csvEscape(teamName)
    ].join(','));
  }

  const csv = rows.join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  const mapName = document.getElementById('mapNameInput').value.trim();
  a.download = mapName ? `${sanitizeMapName(mapName)}.csv` : '布局.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ======= Enhanced Mobile Touch (pinch-zoom + one-finger pan) =======
(function () {
    let touchMode = null; // 'pan' | 'pinch' | null
    let t0 = null;
    let t1 = null;
    let startPanX = 0;
    let startPanY = 0;
    let startZoom = 1;
    let startDist = 0;
    let startCenterX = 0;
    let startCenterY = 0;
    let longPressTimer = null;
    const LONG_PRESS_MS = 450;
    const SELECT_TWO_FINGER_PAN_THRESHOLD = 0.2;

    function getTouches(e) {
        const rect = canvas.getBoundingClientRect();
        return Array.from(e.touches).map(t => ({
            x: t.clientX - rect.left,
            y: t.clientY - rect.top
        }));
    }

    function dist(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }

    function mid(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function clearLongPress() {
        if (!longPressTimer) return;
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    function resetTouchState() {
        clearLongPress();
        touchMode = null;
        t0 = null;
        t1 = null;
    }

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touches = getTouches(e);

        if (touches.length === 1) {
            t0 = touches[0];
            touchMode = 'pan';
            startPanX = panX;
            startPanY = panY;
            hasDragMovement = false;
            dragSelectionStart = [];

            // Long-press deletes current selection on mobile.
            clearLongPress();
            longPressTimer = setTimeout(() => {
                if (getSelectedEntities().length) {
                    deleteSelectedEntity();
                }
            }, LONG_PRESS_MS);

            if (selectedType === 'select') {
                const gridPos = screenToDiamond(t0.x, t0.y);
                const touchedEntity = getEntityAtGrid(gridPos.x, gridPos.y);

                if (touchedEntity) {
                    const selectedNow = getSelectedEntities();
                    if (!selectedEntities.has(touchedEntity) || selectedNow.length <= 1) {
                        setSelection([touchedEntity], { primaryEntity: touchedEntity, pulse: false });
                    } else {
                        selectedEntity = touchedEntity;
                        stopSelectionPulse();
                        updateSelectedEntityEditor();
                    }

                    const movableSelection = getSelectedEntities().filter(entity => !entity.locked);
                    if (movableSelection.length && movableSelection.includes(touchedEntity)) {
                        isDragging = true;
                        dragOffsetX = gridPos.x;
                        dragOffsetY = gridPos.y;
                        dragSelectionStart = movableSelection.map(entity => ({
                            entity,
                            x: entity.x,
                            y: entity.y
                        }));
                    }
                } else {
                    clearSelection();
                    isDragging = false;
                    dragSelectionStart = [];
                }
                redraw();
            }
            return;
        }

        if (touches.length >= 2) {
            t0 = touches[0];
            t1 = touches[1];
            touchMode = 'pinch';
            startZoom = zoom;
            startDist = dist(t0, t1);
            const startCenter = mid(t0, t1);
            startCenterX = startCenter.x;
            startCenterY = startCenter.y;
            startPanX = panX;
            startPanY = panY;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touches = getTouches(e);

        if (touchMode === 'pan' && touches.length === 1 && t0) {
            clearLongPress();
            const cur = touches[0];

            if (isDragging && dragSelectionStart.length) {
                const gridPos = screenToDiamond(cur.x, cur.y);
                const deltaX = gridPos.x - dragOffsetX;
                const deltaY = gridPos.y - dragOffsetY;

                if (tryApplyDraggedSelectionDelta(deltaX, deltaY)) {
                    hasDragMovement = true;
                    redraw();
                    markUnsavedChanges();
                }
            } else if (selectedType === 'move') {
                panX = startPanX + (cur.x - t0.x);
                panY = startPanY + (cur.y - t0.y);
                redraw();
            } else if (isPlacementTool(selectedType)) {
                updateGhostPreview(cur.x, cur.y);
                redraw();
            }
            return;
        }

        if (touchMode === 'pinch' && touches.length >= 2) {
            const a = touches[0];
            const b = touches[1];
            const center = mid(a, b);
            const currDist = dist(a, b);
            const factor = currDist / (startDist || 1);
            const pinchDelta = Math.abs(factor - 1);

            // In Pan mode, a two-finger gesture always translates the map.
            if (selectedType === 'move') {
                panX = startPanX + (center.x - startCenterX);
                panY = startPanY + (center.y - startCenterY);
                redraw();
                return;
            }

            // In Select and placement modes, a two-finger swipe (without pinch) pans the map.
            // Pinch is still available if the distance change is large enough.
            if ((selectedType === 'select' || isPlacementTool(selectedType)) && pinchDelta < SELECT_TWO_FINGER_PAN_THRESHOLD) {
                panX = startPanX + (center.x - startCenterX);
                panY = startPanY + (center.y - startCenterY);
                redraw();
                return;
            }

            const newZoom = Math.max(0.1, Math.min(3, startZoom * factor));

            // Zoom around the pinch midpoint.
            const dx = center.x - panX;
            const dy = center.y - panY;
            panX = center.x - dx * (newZoom / zoom);
            panY = center.y - dy * (newZoom / zoom);
            zoom = newZoom;
            gridSize = baseGridSize * zoom;
            redraw();
            updateZoomDisplay();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touches = getTouches(e);
        const didEntityDrag = isDragging && hasDragMovement;

        if (isDragging) {
            isDragging = false;
            dragSelectionStart = [];
            if (hasDragMovement) {
                pushHistory();
            }
            hasDragMovement = false;
        }

        if (touchMode === 'pan' && (!touches || touches.length === 0) && t0) {
            // Treat as tap if movement was very small.
            const dx = e.changedTouches[0].clientX - (canvas.getBoundingClientRect().left + t0.x);
            const dy = e.changedTouches[0].clientY - (canvas.getBoundingClientRect().top + t0.y);
            const moved = Math.hypot(dx, dy);
            if (moved < 8 && !didEntityDrag) {
                const rect = canvas.getBoundingClientRect();
                const x = e.changedTouches[0].clientX - rect.left;
                const y = e.changedTouches[0].clientY - rect.top;
                handleCanvasClick(x, y, { fromTouch: true });
            }
        }

        resetTouchState();
    }, { passive: false });

    canvas.addEventListener('touchcancel', () => {
        resetTouchState();
    }, { passive: true });

    // Centralized handler for canvas tap/click logic (used by touch).
    function handleCanvasClick(x, y, opts = {}) {
        const rect = canvas.getBoundingClientRect();
        const event = { clientX: x + rect.left, clientY: y + rect.top };

        if (selectedType === 'select') {
            selectEntity(event);
        } else if (selectedType === 'delete') {
            eraseEntityAtEvent(event);
        } else {
            addEntity(event);
        }

        if (opts.fromTouch) {
            ghostPreview = null;
            redraw();
        }
    }

    // Prevent page bounce/scroll while interacting with canvas.
    document.addEventListener('touchmove', (e) => {
        if (e.target === canvas) e.preventDefault();
    }, { passive: false });
})();

// Fallback guard to prevent browser double-tap zoom on non-interactive surfaces.
(function () {
    let lastTouchEndTs = 0;
    const DOUBLE_TAP_GUARD_MS = 320;

    function shouldBypassDoubleTapGuard(target) {
        if (!(target instanceof Element)) return false;
        if (isTextInputTarget(target)) return true;
        return Boolean(target.closest('button, a, label, summary, [role="button"], [role="tab"], [data-allow-double-tap]'));
    }

    document.addEventListener('touchend', (e) => {
        if (e.touches.length > 0 || e.changedTouches.length !== 1) return;
        if (shouldBypassDoubleTapGuard(e.target)) {
            lastTouchEndTs = 0;
            return;
        }

        const now = Date.now();
        if (now - lastTouchEndTs < DOUBLE_TAP_GUARD_MS) {
            e.preventDefault();
        }
        lastTouchEndTs = now;
    }, { passive: false });
})();


/*__MOBILE_BOTTOM_SHEET__*/
(function(){
    const panels = document.querySelectorAll('.mobile-panel');
    panels.forEach(panel => {
        let startY=0, curY=0, isDragging=false;
        panel.addEventListener('touchstart', (e)=>{
            startY = e.touches[0].clientY;
            isDragging = true;
        }, {passive:true});
        panel.addEventListener('touchmove', (e)=>{
            if(!isDragging) return;
            curY = e.touches[0].clientY;
            const delta = Math.max(0, curY - startY);
            panel.style.transform = `translateY(${delta}px)`;
        }, {passive:true});
        panel.addEventListener('touchend', ()=>{
            if(!isDragging) return;
            const delta = Math.max(0, curY - startY);
            const shouldClose = delta > 100;
            panel.style.transform = '';
            if (shouldClose){
                panel.classList.remove('active');
                setTimeout(()=>{ panel.style.display='none'; }, 300);
            }
            isDragging=false;
        });
    });

    // Mirror desktop action buttons into mobile where needed
    const mirrors = [
        ['downloadButton','mobileDownloadButton'],
        ['saveButton','mobileSaveButton'],
        ['saveAsCSVButton','mobileSaveAsCSVButton'],
        ['shareButton','mobileShareButton'],
        ['shortUrlButton','mobileShortUrlButton'],
        ['loadButton','mobileLoadButton'],
    ];
    mirrors.forEach(([deskId, mobId])=>{
        const d = document.getElementById(deskId);
        const m = document.getElementById(mobId);
        if (d && m){
            m.addEventListener('click', ()=> d.click());
        }
    });

    // Keep code textarea in sync
    const deskTA = document.getElementById('mapData');
    const mobTA = document.getElementById('mobileMapData');
    if (deskTA && mobTA){
        const sync = (src, dst)=>{
            src.addEventListener('input', ()=> { dst.value = src.value; });
        };
        sync(deskTA, mobTA); sync(mobTA, deskTA);
    }

    // Sync city sort dropdowns
    const deskSort = document.getElementById('citySort');
    const mobSort = document.getElementById('mobileCitySort');
    if (deskSort && mobSort){
        const reflect = (src, dst)=> src.addEventListener('change', ()=>{ dst.value = src.value; dst.dispatchEvent(new Event('change')); });
        reflect(deskSort, mobSort); reflect(mobSort, deskSort);
    }
})();


// ===== HISTORY (UNDO/REDO) =====
// Snapshot-based history 
const HISTORY_LIMIT = 200;
let history = [];
let historyIndex = -1; // points to current state in history
// Snapshot of the last saved state (stringified snapshot); used to determine "unsaved" status
let lastSavedSnapshot = null;

function snapshotState() {
    // create a deep copy of entities
    // Prefer structuredClone when available (handles more types and is faster)
    const entitiesCopy = (typeof structuredClone === 'function')
        ? structuredClone(entities)
        : entities.map(e => JSON.parse(JSON.stringify(e)));
    const connectionCopy = serializeBattlefieldConnectionsForMapCode(entities) || [];
    return JSON.stringify({ entities: entitiesCopy, cityCounterId, battlefieldConnections: connectionCopy });
}

function applySnapshot(snapshot) {
    try {
        const state = JSON.parse(snapshot);
        // Replace entities array contents
        entities.length = 0;
        state.entities.forEach(e => entities.push(e));
        // Reconstruct derived arrays
        bearTraps = entities.filter(e => e.type === 'building');
        if (!applyBattlefieldConnectionsFromMapCode(entities, state.battlefieldConnections)) {
            rebuildBattlefieldConnectionLinesFromEntities();
        }
        cityCounterId = state.cityCounterId || 1;
        clearSelection();
        redraw();
        syncMarkedHaloAnimation();
        updateCounters();
        updateCityList();
        // Update unsaved-state: compare current state to last saved snapshot when available
        try {
            const currentSnapshot = snapshotState();
            if (lastSavedSnapshot === null) {
                // If we don't have a saved snapshot, don't modify existing hasUnsavedChanges
            } else {
                hasUnsavedChanges = (currentSnapshot !== lastSavedSnapshot);
                updatePageTitle();
            }
        } catch (err) {
            // If snapshotting fails, leave hasUnsavedChanges unchanged but log for debugging
            console.error('Error comparing snapshots in applySnapshot:', err);
        }
    } catch (err) {
        console.error('Failed to apply snapshot:', err);
    }
}

// Wire up Undo/Redo buttons and create an initial history snapshot once DOM is ready.
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('undoButton')?.addEventListener('click', () => undo());
    document.getElementById('redoButton')?.addEventListener('click', () => redo());
    updateUndoRedoButtons();
    // Push initial snapshot (reflects any pre-loaded map)
    try { pushHistory(); } catch (e) { console.error('Failed to create initial history snapshot:', e); }
});

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoButton');
    const redoBtn = document.getElementById('redoButton');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1 || history.length === 0;
}

function pushHistory() {
    try {
        const snap = snapshotState();
        // If we've undone some steps and then make a new change, drop forward history
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        history.push(snap);
        if (history.length > HISTORY_LIMIT) {
            history.shift();
        }
        historyIndex = history.length - 1;
        updateUndoRedoButtons();
    } catch (err) {
        console.error('pushHistory error', err);
    }
}

function undo() {
    flushPendingEraseHistory();
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    applySnapshot(history[historyIndex]);
    updateUndoRedoButtons();
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    applySnapshot(history[historyIndex]);
    updateUndoRedoButtons();
}

// ===== APPLICATION INITIALIZATION =====
// Initialize the application
resizeCanvas();
redraw();

