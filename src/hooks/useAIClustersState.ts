import { useReducer, useCallback } from "react";
import type { QueryDto } from "@/types";
import type { AIClusterViewModel } from "./useAIClustersSuggestions";

/**
 * State management hook for AI Clusters
 * Handles all state mutations through a reducer
 */

interface State {
  clusters: AIClusterViewModel[];
  selectedIds: Set<string>;
  isGenerating: boolean;
  isAccepting: boolean;
  liveMessage: string;
}

export type Action =
  | { type: "SET_GENERATING"; payload: boolean }
  | { type: "SET_ACCEPTING"; payload: boolean }
  | { type: "SET_LIVE_MESSAGE"; payload: string }
  | { type: "SET_CLUSTERS"; payload: AIClusterViewModel[] }
  | { type: "TOGGLE_SELECT"; payload: string }
  | { type: "SELECT_ALL" }
  | { type: "CLEAR_SELECTION" }
  | { type: "RENAME_CLUSTER"; payload: { id: string; name: string } }
  | { type: "UPDATE_CLUSTER_QUERIES"; payload: { id: string; queries: QueryDto[] } }
  | { type: "DISCARD_CLUSTER"; payload: string };

const initialState: State = {
  clusters: [],
  selectedIds: new Set(),
  isGenerating: false,
  isAccepting: false,
  liveMessage: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_GENERATING":
      return { ...state, isGenerating: action.payload };

    case "SET_ACCEPTING":
      return { ...state, isAccepting: action.payload };

    case "SET_LIVE_MESSAGE":
      return { ...state, liveMessage: action.payload };

    case "SET_CLUSTERS":
      return { ...state, clusters: action.payload, selectedIds: new Set() };

    case "TOGGLE_SELECT": {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedIds: newSelected };
    }

    case "SELECT_ALL":
      return { ...state, selectedIds: new Set(state.clusters.map((c) => c.id)) };

    case "CLEAR_SELECTION":
      return { ...state, selectedIds: new Set() };

    case "RENAME_CLUSTER":
      return {
        ...state,
        clusters: state.clusters.map((c) =>
          c.id === action.payload.id ? { ...c, name: action.payload.name, isDirty: true } : c
        ),
      };

    case "UPDATE_CLUSTER_QUERIES": {
      return {
        ...state,
        clusters: state.clusters.map((c) => {
          if (c.id === action.payload.id) {
            return {
              ...c,
              queries: action.payload.queries,
              queryCount: action.payload.queries.length,
              isDirty: true,
            };
          }
          return c;
        }),
      };
    }

    case "DISCARD_CLUSTER":
      return {
        ...state,
        clusters: state.clusters.filter((c) => c.id !== action.payload),
        selectedIds: new Set([...state.selectedIds].filter((id) => id !== action.payload)),
      };

    default:
      return state;
  }
}

export interface UseAIClustersStateReturn {
  state: State;
  dispatch: React.Dispatch<Action>;
  // Convenience methods
  setClusters: (clusters: AIClusterViewModel[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  rename: (id: string, name: string) => void;
  updateClusterQueries: (id: string, queries: QueryDto[]) => void;
  discard: (id: string) => void;
}

export function useAIClustersState(): UseAIClustersStateReturn {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setClusters = useCallback((clusters: AIClusterViewModel[]) => {
    dispatch({ type: "SET_CLUSTERS", payload: clusters });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_SELECT", payload: id });
  }, []);

  const selectAll = useCallback(() => {
    dispatch({ type: "SELECT_ALL" });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    dispatch({ type: "RENAME_CLUSTER", payload: { id, name } });
  }, []);

  const updateClusterQueries = useCallback((id: string, queries: QueryDto[]) => {
    dispatch({ type: "UPDATE_CLUSTER_QUERIES", payload: { id, queries } });
  }, []);

  const discard = useCallback((id: string) => {
    dispatch({ type: "DISCARD_CLUSTER", payload: id });
  }, []);

  return {
    state,
    dispatch,
    setClusters,
    toggleSelect,
    selectAll,
    clearSelection,
    rename,
    updateClusterQueries,
    discard,
  };
}
