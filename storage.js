/* =========================================================================
   AUSTIN BLOCK COMPANY INTERNAL OPERATIONS APP
   storage.js

   PURPOSE
   This file is the ONLY place in the app that talks to localStorage.
   Every other file reads/writes data through the functions defined here.

   FUTURE MIGRATION NOTE (per System Architecture & M365 Integration tab):
   Austin Block's long-term plan is Microsoft Entra ID + SharePoint Lists +
   SharePoint Document Libraries via Microsoft Graph. This file is written
   so a future developer can replace the internals of each function below
   (e.g., swap localStorage.getItem for a Graph API call) WITHOUT changing
   any calling code in data.js, calculations.js, ui.js, or app.js. Every
   function here returns plain JavaScript objects/arrays, never DOM nodes
   or localStorage-specific structures, so the rest of the app never knows
   or cares where the data actually lives.
   ========================================================================= */

(function (global) {
  "use strict";

  // -----------------------------------------------------------------------
  // Storage keys. Prefixed to avoid collisions with any other app on the
  // same origin (relevant when testing multiple prototypes on localhost).
  // -----------------------------------------------------------------------
  var STORAGE_PREFIX = "abcOpsApp.";
  var SCHEMA_VERSION = 1;

  var KEYS = {
    SCHEMA_VERSION: STORAGE_PREFIX + "schemaVersion",
    SEEDED_FLAG: STORAGE_PREFIX + "seeded",
    USERS: STORAGE_PREFIX + "users",
    ACTIVE_USER_ID: STORAGE_PREFIX + "activeUserId",
    PREFERENCES: STORAGE_PREFIX + "preferences", // keyed by userId -> { appearanceMode }
    OPPORTUNITIES: STORAGE_PREFIX + "opportunities",
    ACTIVITIES: STORAGE_PREFIX + "activities", // opportunity + project activity history
    FILES: STORAGE_PREFIX + "files", // file placeholder records
    ESTIMATES: STORAGE_PREFIX + "estimates",
    PRICE_CATALOG: STORAGE_PREFIX + "priceCatalog",
    COST_CATEGORIES: STORAGE_PREFIX + "costCategories",
    PROFIT_GOALS: STORAGE_PREFIX + "profitGoals",
    PROJECTS: STORAGE_PREFIX + "projects",
    EXPENSES: STORAGE_PREFIX + "expenses",
    SUBCONTRACTOR_COSTS: STORAGE_PREFIX + "subcontractorCosts",
    LABOR_ENTRIES: STORAGE_PREFIX + "laborEntries",
    CHANGE_ORDERS: STORAGE_PREFIX + "changeOrders",
    INVOICES: STORAGE_PREFIX + "invoices",
    PAYMENTS: STORAGE_PREFIX + "payments",
    FOLLOW_UPS: STORAGE_PREFIX + "followUps",
    OPEN_DECISIONS: STORAGE_PREFIX + "openDecisions",
    AUDIT_LOG: STORAGE_PREFIX + "auditLog",
    CONTROLLED_LISTS: STORAGE_PREFIX + "controlledLists",
    ID_COUNTERS: STORAGE_PREFIX + "idCounters"
  };

  // -----------------------------------------------------------------------
  // Low-level safe read/write helpers
  // -----------------------------------------------------------------------

  function isStorageAvailable() {
    try {
      var testKey = STORAGE_PREFIX + "__test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  var STORAGE_OK = isStorageAvailable();
  var memoryFallback = {}; // used only if localStorage is unavailable (private browsing edge cases)

  function rawGet(key) {
    if (!STORAGE_OK) {
      return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : null;
    }
    return window.localStorage.getItem(key);
  }

  function rawSet(key, value) {
    if (!STORAGE_OK) {
      memoryFallback[key] = value;
      return;
    }
    window.localStorage.setItem(key, value);
  }

  function rawRemove(key) {
    if (!STORAGE_OK) {
      delete memoryFallback[key];
      return;
    }
    window.localStorage.removeItem(key);
  }

  /**
   * Read a JSON-serialized collection from storage.
   * Returns fallbackValue (default: []) if nothing is stored or parsing fails.
   */
  function readJSON(key, fallbackValue) {
    var fallback = fallbackValue === undefined ? [] : fallbackValue;
    var raw = rawGet(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[storage] Failed to parse JSON for key:", key, e);
      return fallback;
    }
  }

  /**
   * Write a JSON-serializable value to storage.
   */
  function writeJSON(key, value) {
    try {
      rawSet(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("[storage] Failed to write key:", key, e);
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Generic collection accessors (each "collection" is an array of records
  // with a stable `id` field). These are the primary API surface used by
  // data.js. Keeping this generic keeps the file short and consistent.
  // -----------------------------------------------------------------------

  function getCollection(key) {
    return readJSON(key, []);
  }

  function setCollection(key, arrayValue) {
    return writeJSON(key, Array.isArray(arrayValue) ? arrayValue : []);
  }

  function getRecordById(key, id) {
    var list = getCollection(key);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function upsertRecord(key, record) {
    if (!record || !record.id) {
      throw new Error("[storage] upsertRecord requires a record with an id.");
    }
    var list = getCollection(key);
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === record.id) {
        list[i] = record;
        found = true;
        break;
      }
    }
    if (!found) list.push(record);
    setCollection(key, list);
    return record;
  }

  function deleteRecord(key, id) {
    var list = getCollection(key);
    var filtered = list.filter(function (r) { return r.id !== id; });
    setCollection(key, filtered);
    return filtered.length !== list.length;
  }

  // -----------------------------------------------------------------------
  // Stable ID generation.
  // Uses a persisted counter per entity prefix so IDs are short, readable,
   // and stable across sessions (e.g., OPP-0001, EST-0002-R1).
  // -----------------------------------------------------------------------

  function nextSequence(counterName) {
    var counters = readJSON(KEYS.ID_COUNTERS, {});
    var current = counters[counterName] || 0;
    current += 1;
    counters[counterName] = current;
    writeJSON(KEYS.ID_COUNTERS, counters);
    return current;
  }

  function generateId(prefix, counterName) {
    var seq = nextSequence(counterName || prefix);
    var padded = String(seq).padStart(4, "0");
    return prefix + "-" + padded;
  }

  /**
   * Generates a lightweight unique token for records that need uniqueness
   * but not a human-friendly sequence (e.g., audit log rows, file rows).
   */
  function generateToken() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  // -----------------------------------------------------------------------
  // Audit log helper. Any module can call this to append an immutable
  // audit trail entry. Used to satisfy FIN-011 (Financial Audit History)
  // and the general "preserve history" requirements throughout the
  // workbook (estimate revisions, expense status changes, overrides, etc.)
  // -----------------------------------------------------------------------

  function appendAuditEntry(entry) {
    var log = getCollection(KEYS.AUDIT_LOG);
    var record = Object.assign({
      id: generateToken(),
      timestamp: new Date().toISOString()
    }, entry);
    log.push(record);
    setCollection(KEYS.AUDIT_LOG, log);
    return record;
  }

  function getAuditLog(filterFn) {
    var log = getCollection(KEYS.AUDIT_LOG);
    return typeof filterFn === "function" ? log.filter(filterFn) : log;
  }

  // -----------------------------------------------------------------------
  // Export / Import of the entire prototype dataset as JSON.
  // Required by the build spec: "Include export/import of the local
  // prototype dataset as JSON."
  // -----------------------------------------------------------------------

  function exportAllData() {
    var payload = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: {} };
    Object.keys(KEYS).forEach(function (name) {
      if (name === "SCHEMA_VERSION") return;
      var key = KEYS[name];
      var raw = rawGet(key);
      if (raw !== null && raw !== undefined) {
        try {
          payload.data[name] = JSON.parse(raw);
        } catch (e) {
          payload.data[name] = null;
        }
      }
    });
    return payload;
  }

  /**
   * Imports a previously exported dataset. Overwrites existing prototype
   * data entirely (this is a prototype-only data layer, so we keep the
   * behavior simple and explicit rather than attempting a merge).
   */
  function importAllData(payload) {
    if (!payload || typeof payload !== "object" || !payload.data) {
      throw new Error("Invalid import file: missing 'data' object.");
    }
    Object.keys(payload.data).forEach(function (name) {
      var key = KEYS[name];
      if (!key) return; // ignore unknown keys defensively
      writeJSON(key, payload.data[name]);
    });
    return true;
  }

  /**
   * Wipes every key this app owns. Used by "Reset Demo Data" (after
   * reseeding) and is also useful for a clean uninstall/testing reset.
   */
  function clearAllData() {
    Object.keys(KEYS).forEach(function (name) {
      rawRemove(KEYS[name]);
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  global.AbcStorage = {
    KEYS: KEYS,
    SCHEMA_VERSION: SCHEMA_VERSION,

    // generic collection access
    getCollection: getCollection,
    setCollection: setCollection,
    getRecordById: getRecordById,
    upsertRecord: upsertRecord,
    deleteRecord: deleteRecord,

    // raw JSON helpers (used for non-array structures like preferences)
    readJSON: readJSON,
    writeJSON: writeJSON,

    // id generation
    generateId: generateId,
    generateToken: generateToken,

    // audit log
    appendAuditEntry: appendAuditEntry,
    getAuditLog: getAuditLog,

    // import/export/reset
    exportAllData: exportAllData,
    importAllData: importAllData,
    clearAllData: clearAllData,

    // capability flag (useful for showing a warning banner if storage is unavailable)
    isStorageAvailable: STORAGE_OK
  };

})(window);
