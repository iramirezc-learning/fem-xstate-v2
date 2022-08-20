// @ts-check
import "../style.css";
import { createMachine, assign, interpret, send } from "xstate";
import elements from "../utils/elements";

import { inspect } from "@xstate/inspect";

// inspect({
//   iframe: false,
//   url: 'https://stately.ai/viz?inspect',
// });

const playerMachine = createMachine({
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
});

const service = interpret(playerMachine, { devTools: true }).start();

elements.elPlayButton?.addEventListener("click", () => {
  service.send({ type: "PLAY" });
});
elements.elPauseButton?.addEventListener("click", () => {
  service.send({ type: "PAUSE" });
});

service.subscribe((state) => {
  console.log(state);
  // @ts-ignore
  elements.elLoadingButton.hidden = !state.matches("loading");
  // @ts-ignore
  elements.elPlayButton.hidden = !state.can({ type: "PLAY" });
  // @ts-ignore
  elements.elPauseButton.hidden = !state.can({ type: "PAUSE" });
});

service.send({ type: "LOADED" });
