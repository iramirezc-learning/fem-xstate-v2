// @ts-check
import "../style.css";
import { createMachine, assign, interpret } from "xstate";
import { raise } from "xstate/lib/actions";
import elements from "../utils/elements";
import { formatTime } from "../utils/formatTime";

let intervalId;

const songs = [
  {
    title: "Father Ocean",
    artist: "Monolink",
    duration: 5, // 357, // 5:57
  },
  {
    title: "Gravity",
    artist: "Boris Brejcha",
    duration: 5, // 216, // 3:36
  },
  {
    title: "Dreamers",
    artist: "Space Motion",
    duration: 5, // 404, // 6:44
  },
];

const playerMachine = createMachine({
  initial: "loading",
  context: {
    title: "",
    artist: "",
    duration: 0,
    elapsed: 0,
    likeStatus: "unliked", // 'liked' | 'unliked' | 'disliked'
    volume: 5,
  },
  states: {
    loading: {
      tags: ["loading"],
      on: {
        LOADED: {
          actions: "assignSongData",
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
      entry: "playAudio",
      exit: "pauseAudio",
      on: {
        PAUSE: { target: "paused" },
      },
      // Add an eventless transition here that always goes to 'paused'
      // when `elapsed` value is >= the `duration` value
      always: {
        cond: "isSongFinished",
        target: "paused",
      },
    },
  },
  on: {
    SKIP: {
      actions: "skipSong",
      target: "loading",
    },
    LIKE: {
      actions: "likeSong",
    },
    UNLIKE: {
      actions: "unlikeSong",
    },
    DISLIKE: {
      actions: ["dislikeSong", raise("SKIP")],
    },
    "LIKE.TOGGLE": [
      // Add two possible transitions here:
      // One that raises UNLIKE if the `likeStatus` is 'liked',
      // and one that raises LIKE if it's 'unliked'.
      { cond: (ctx) => ctx.likeStatus === "liked", actions: [raise("UNLIKE")] },
      { cond: (ctx) => ctx.likeStatus === "unliked", actions: [raise("LIKE")] },
    ],
    VOLUME: {
      // Make sure the volume can only be assigned if the level is
      // within range (between 0 and 10)
      cond: "isVolumeValid",
      actions: "assignVolume",
    },
    "AUDIO.TIME": {
      actions: "assignTime",
    },
  },
}).withConfig({
  actions: {
    assignSongData: assign({
      title: (_, e) => e.data.title,
      artist: (_, e) => e.data.artist,
      duration: (_, e) => e.data.duration,
      elapsed: 0,
      likeStatus: "unliked",
    }),
    likeSong: assign({
      likeStatus: "liked",
    }),
    unlikeSong: assign({
      likeStatus: "unliked",
    }),
    dislikeSong: assign({
      likeStatus: "disliked",
    }),
    assignVolume: assign({
      volume: (_, e) => e.level,
    }),
    assignTime: assign({
      elapsed: (_, e) => e.currentTime,
    }),
    skipSong: () => {
      console.log("Skipping song...");

      if (songs.length) {
        setTimeout(() => {
          service.send({
            type: "LOADED",
            data: songs.shift(),
          });
        }, 1000);
      }
    },
    playAudio: (ctx) => {
      console.log("Playing audio...");

      let elapsed = ctx.elapsed;

      intervalId = setInterval(() => {
        service.send({ type: "AUDIO.TIME", currentTime: ++elapsed });
      }, 1000);
    },
    pauseAudio: () => {
      clearInterval(intervalId);
    },
  },
  guards: {
    // Add the guard implementations here, if you'd like
    isSongFinished: (ctx) => ctx.elapsed >= ctx.duration,
    isVolumeValid: (_, event) => {
      console.log("isValidVolume...");
      return 0 <= event.level && event.level <= 10;
    },
  },
});

const service = interpret(playerMachine).start();
window.service = service;

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
  service.send({ type: "LIKE.TOGGLE" });
});
elements.elDislikeButton.addEventListener("click", () => {
  service.send({ type: "DISLIKE" });
});

service.subscribe((state) => {
  console.log("event->", state.event);
  console.log("actions->", state.actions);
  console.log("context->", state.context);

  const { context } = state;

  elements.elLoadingButton.hidden = !state.hasTag("loading");
  elements.elPlayButton.hidden = !state.can({ type: "PLAY" });
  elements.elPauseButton.hidden = !state.can({ type: "PAUSE" });
  elements.elVolumeButton.dataset.level =
    context.volume === 0
      ? "zero"
      : context.volume <= 2
      ? "low"
      : context.volume >= 8
      ? "high"
      : undefined;

  elements.elScrubberInput.setAttribute("max", context.duration);
  elements.elScrubberInput.value = context.elapsed;
  elements.elElapsedOutput.innerHTML = formatTime(
    context.elapsed - context.duration
  );

  elements.elLikeButton.dataset.likeStatus = context.likeStatus;
  elements.elArtist.innerHTML = context.artist;
  elements.elTitle.innerHTML = context.title;
});

service.send({
  type: "LOADED",
  data: songs.shift(),
});
