import "../style.css";

// Create a state machine transition function either using:
// - a switch statement (or nested switch statements)
const initialState = { value: "loading" };

function transition(state = initialState, event) {
  switch (state.value) {
    case "loading":
      if (event.type === "LOADED") {
        return { ...state, value: "playing" };
      }
      break;
    case "playing":
      if (event.type === "PAUSE") {
        return { ...state, value: "paused" };
      }
      break;
    case "paused":
      if (event.type === "PLAY") {
        return { ...state, value: "playing" };
      }
      break;
    default:
      throw new Error(`Event "${state.value}" not recognized.`);
  }

  return state;
}

window.transition = transition;

// - or an object (transition lookup table)
const machine = {
  initial: "loading",
  states: {
    loading: {
      on: {
        LOADED: "playing",
      },
    },
    playing: {
      on: {
        PAUSE: "paused",
      },
    },
    paused: {
      on: {
        PLAY: "playing",
      },
    },
  },
};

function machineTransition(state = initialState, event) {
  const nextState = machine.states[state.value]?.on[event.type];

  if (!nextState) {
    return state;
  }

  return { ...state, value: nextState };
}

window.machineTransition = machineTransition;

// Also, come up with a simple way to "interpret" it, and
// make it an object that you can `.send(...)` events to.
let appState = { value: machine.initial };

const service = {
  send: function (event) {
    appState = machineTransition(appState, event);
    return appState;
  },
};

window.service = service;
