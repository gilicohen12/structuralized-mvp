// src/shared.ts

/**
 * ========== WEBSITE → EXTENSION ==========
 */
export type StartSessionMsg = {
  type: "START_SESSION";
  payload: {
    origin: string; // where to redirect back for /report
  };
};

export type GetReportMsg = {
  type: "GET_REPORT";
};

/**
 * ========== BACKGROUND → CONTENT ==========
 */
export type ShowRunningOverlayMsg = {
  type: "SHOW_RUNNING_OVERLAY";
  payload: { endsAt: number };
};

export type ShowDoneOverlayMsg = {
  type: "SHOW_DONE_OVERLAY";
};

/**
 * ========== CONTENT → BACKGROUND ==========
 */
export type SubmitReflectionMsg = {
  type: "SUBMIT_REFLECTION";
  payload: { reflection: string };
};

/**
 * ========== EXTENSION INTERNAL ==========
 */
export type GetStateMsg = { type: "GET_STATE" };

/**
 * Master union
 */
export type Msg =
  | StartSessionMsg
  | GetReportMsg
  | ShowRunningOverlayMsg
  | ShowDoneOverlayMsg
  | SubmitReflectionMsg
  | GetStateMsg;

/**
 * ========== RUNTIME SESSION STATE ==========
 *
 * Now includes runId so:
 * - we can build a report
 * - we can deep link to /report?runId=...
 */
export type SessionState =
  | { status: "idle" }
  | {
      status: "running";
      runId: string;
      startedAt: number;
      endsAt: number;
    }
  | {
      status: "awaiting_reflection";
      runId: string;
      startedAt: number;
      endsAt: number;
    }
  | {
      status: "completed";
      runId: string;
      startedAt: number;
      endsAt: number;
      reflection: string;
    };

export const STORAGE_KEY = "session_state_v1";
export const ALARM_NAME = "block1_end";
