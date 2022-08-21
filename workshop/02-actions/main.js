import "../style.css";
import { createMachine, assign, interpret, send } from "xstate";
import { raise } from "xstate/lib/actions";
import elements from "../utils/elements";

const actions = {
  assignSongData: () => console.log("Assigning song data..."),
  playAudio: () => console.log("Playing audio..."),
  pauseAudio: () => console.log("Pausing audio..."),
  skipSong: () => {
    console.log("Skipping the song...");
    setTimeout(() => service.send({ type: "LOADED" }), 3000);
  },
  likeSong: () => console.log("Liking the song..."),
  unlikeSong: () => console.log("Unlike the song..."),
  dislikeSong: () => console.log("Disliking the song..."),
  volume: () => console.log("Setting volume..."),
};

const playerMachine = createMachine({
  initial: "loading",
  states: {
    loading: {
      on: {
        LOADED: {
          // Add an action here to assign the song data
          actions: ["assignSongData"],
          target: "playing",
        },
      },
    },
    paused: {
      on: {
        PLAY: { target: "playing" },
      },
    },
    playing: {
      // When this state is entered, add an action to play the audio
      entry: ["playAudio"],
      // When this state is exited, add an action to pause the audio
      exit: ["pauseAudio"],
      on: {
        PAUSE: { target: "paused" },
      },
    },
  },
  on: {
    SKIP: {
      target: "loading",
      // Add an action to skip the song
      actions: ["skipSong"],
    },
    LIKE: {
      // Add an action to like the song
      actions: ["likeSong"],
    },
    UNLIKE: {
      // Add an action to unlike the song
      actions: ["unlikeSong"],
    },
    DISLIKE: {
      // Add two actions to dislike the song and raise the skip event
      actions: ["dislikeSong", raise({ type: "SKIP" })],
    },
    VOLUME: {
      // Add an action to assign to the volume
      actions: ["volume"],
    },
  },
}).withConfig({
  // Add implementations for the actions here, if you'd like
  // For now you can just console.log something
  actions,
});

elements.elPlayButton.addEventListener("click", () => {
  service.send({ type: "PLAY" });
});
elements.elPauseButton.addEventListener("click", () => {
  service.send({ type: "PAUSE" });
});
elements.elSkipButton.addEventListener("click", () => {
  service.send({ type: "SKIP" });
});
elements.elLikeButton.addEventListener("click", () => {
  const currentStatus = elements.elLikeButton.dataset.likeStatus;

  if (!currentStatus) {
    elements.elLikeButton.dataset.likeStatus = "liked";
    service.send({ type: "LIKE" });
  } else {
    delete elements.elLikeButton.dataset.likeStatus;
    service.send({ type: "UNLIKE" });
  }
});
elements.elDislikeButton.addEventListener("click", () => {
  service.send({ type: "DISLIKE" });
});
elements.elVolumeButton.addEventListener("click", () => {
  service.send({ type: "VOLUME" });
});

const service = interpret(playerMachine).start();

service.subscribe((state) => {
  console.log(state.actions);

  elements.elLoadingButton.hidden = !state.matches("loading");
  elements.elPlayButton.hidden = !state.can({ type: "PLAY" });
  elements.elPauseButton.hidden = !state.can({ type: "PAUSE" });
});

setTimeout(() => service.send("LOADED"), 3000);
