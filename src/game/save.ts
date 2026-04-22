import { DEFAULT_STATS, SAVE_KEY, migrateSave, type SaveSlot } from "./types";

const SAVE_KEY_BAK = `${SAVE_KEY}_bak`;

export type SaveLoadWarning =
  | { kind: "backup_recovered" }
  | { kind: "corrupt_reset" }
  | null;

let lastSaveLoadWarning: SaveLoadWarning = null;

function parseSlot(raw: string | null): SaveSlot | null {
  if (!raw) return null;
  return migrateSave(JSON.parse(raw));
}

export function consumeSaveLoadWarning(): SaveLoadWarning {
  const warning = lastSaveLoadWarning;
  lastSaveLoadWarning = null;
  return warning;
}

export function loadSave(): SaveSlot | null {
  if (typeof window === "undefined") return null;

  const primaryRaw = localStorage.getItem(SAVE_KEY);
  const backupRaw = localStorage.getItem(SAVE_KEY_BAK);

  if (!primaryRaw && !backupRaw) return null;

  try {
    const primary = parseSlot(primaryRaw);
    if (primary) return primary;
  } catch {
    // fall through to backup
  }

  try {
    const backup = parseSlot(backupRaw);
    if (backup) {
      lastSaveLoadWarning = { kind: "backup_recovered" };
      try {
        if (backupRaw) localStorage.setItem(SAVE_KEY, backupRaw);
      } catch {
        // ignore restore failure
      }
      return backup;
    }
  } catch {
    // fall through to corrupt-reset state
  }

  lastSaveLoadWarning = { kind: "corrupt_reset" };
  try {
    window.dispatchEvent(new CustomEvent("hermetic-save-corrupt"));
  } catch {
    // ignore
  }
  return null;
}

export function writeSave(slot: SaveSlot) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ ...slot, updatedAt: Date.now() });

  try {
    const prevPrimary = localStorage.getItem(SAVE_KEY);
    if (prevPrimary) {
      localStorage.setItem(SAVE_KEY_BAK, prevPrimary);
    } else {
      localStorage.setItem(SAVE_KEY_BAK, payload);
    }
  } catch {
    // ignore backup write failure
  }

  localStorage.setItem(SAVE_KEY, payload);

  try {
    window.dispatchEvent(new CustomEvent("hermetic-saved"));
  } catch {
    // ignore
  }
}

export function clearSave() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(SAVE_KEY_BAK);
}

export function newSave(): SaveSlot {
  return {
    scene: "LastDay",
    act: 0,
    stats: { ...DEFAULT_STATS },
    flags: {},
    fragments: 0,
    verbs: { witness: false, transmute: false },
    shards: [],
    shardFragments: 0,
    seeds: {},
    region: null,
    seedEchoes: {},
    lore: [],
    souls: {},
    soulChoices: {},
    soulsCompleted: 0,
    witnessUses: 0,
    sideQuests: {},
    soulEventLog: [],
    shardInventory: [],
    shardsConsumed: [],
    blackStones: 0,
    whiteStones: 0,
    yellowStones: 0,
    redStones: 0,
    goldStone: false,
    shadesEncountered: {},
    convictions: {},
    weddingType: null,
    act2Inscription: null,
    sorynReleased: false,
    stainsCarried: 0,
    calling: null,
    coherence: 100,
    daimonBond: 0,
    garmentsReleased: {},
    sphereVerbs: {
      witness: true,
      name: false,
      attune: false,
      expose: false,
      stand: false,
      weigh: false,
      release: false,
    },
    relics: [],
    gnosticAccepted: false,
    endingChosen: null,
    plateauSettled: {},
    puzzleState: {},
    venusZone: null,
    sunZone: null,
    sunWitnessHeard: {},
    sunOpsDone: {},
    sunTrialReady: false,
    clarityPoints: 0,
    garmentWeights: { moon: 3, mercury: 3, venus: 3, sun: 3, mars: 3, jupiter: 3, saturn: 3 },
    resonanceProfile: {
      witnessing: 0,
      control: 0,
      possession: 0,
      performance: 0,
      struggle: 0,
      structure: 0,
      surrender: 0,
    },
    memoryLattice: [],
    sopheneNamed: false,
    updatedAt: Date.now(),
  };
}
