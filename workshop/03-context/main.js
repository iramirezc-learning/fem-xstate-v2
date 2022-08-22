// @ts-no-check
import "../style.css";
import { createMachine, assign, interpret, send } from "xstate";
import elements from "../utils/elements";
import { raise } from "xstate/lib/actions";
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
    // Add initial context here for:
    // title, artist, duration, elapsed, likeStatus, volume
    title: "",
    artist: "",
    duration: 0,
    elapsed: 0,
    likeStatus: "unliked",
    volume: 0,
  },
  states: {
    loading: {
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
    VOLUME: {
      actions: "assignVolume",
    },
    "AUDIO.TIME": {
      actions: "assignTime",
    },
  },
}).withConfig({
  actions: {
    assignSongData: assign({
      // Assign the `title`, `artist`, and `duration` from the event.
      // Assume the event looks like this:
      // {
      //   type: 'LOADED',
      //   data: {
      //     title: 'Some title',
      //     artist: 'Some artist',
      //     duration: 123
      //   }
      // }
      // Also, reset the `elapsed` and `likeStatus` values.
      title: (_, evt) => evt.data.title,
      artist: (_, evt) => evt.data.artist,
      duration: (_, evt) => evt.data.duration,
      elapsed: 0,
      likeStatus: "unliked",
    }),
    likeSong: assign({
      // Assign the `likeStatus` to "liked"
      likeStatus: "liked",
    }),
    unlikeSong: assign({
      // Assign the `likeStatus` to 'unliked',
      likeStatus: "unliked",
    }),
    dislikeSong: assign({
      // Assign the `likeStatus` to 'disliked',
      likeStatus: "disliked",
    }),
    assignVolume: assign({
      // Assign the `volume` to the `level` from the event.
      // Assume the event looks like this:
      // {
      //   type: 'VOLUME',
      //   level: 5
      // }
      volume: (ctx, evt) => {
        console.log("Assigning volume...");

        if (ctx.volume < 10) {
          return ctx.volume + evt.level;
        }

        console.log("MAX volume!");

        return ctx.volume;
      },
    }),
    assignTime: assign((ctx, evt) => {
      // Assign the `elapsed` value to the `currentTime` from the event.
      // Assume the event looks like this:
      // {
      //   type: 'AUDIO.TIME',
      //   currentTime: 10
      // }
      console.log("Assigning time...");

      let elapsed = ctx.elapsed;

      if (elapsed + evt.currentTime <= ctx.duration) {
        elapsed += evt.currentTime;
      } else {
        // NOTE: There should be a better way to do this.
        console.log("Song is over!");

        // Again, this is now working, how to "raise" events inside actions?
        // raise("SKIP");

        service.send({ type: "SKIP" });

        return;
      }

      return {
        elapsed,
      };
    }),
    skipSong: () => {
      console.log("Skipping song...");

      if (songs.length) {
        setTimeout(
          () =>
            service.send({
              type: "LOADED",
              data: songs.pop(),
            }),
          1000
        );
      } else {
        console.log("No more songs!");
      }
    },
    playAudio: () => {
      console.log("Playing audio...");

      intervalId = setInterval(() => {
        // TODO: how to read from context when rasing an event?
        // TODO: why raise does not work in this case?
        service.send({ type: "AUDIO.TIME", currentTime: 1 });
      }, 1000);
    },
    pauseAudio: () => {
      console.log("Pausing audio...");

      clearInterval(intervalId);
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
  const likeStatus = elements.elLikeButton.dataset.likeStatus;

  if ("unliked" === likeStatus) {
    service.send({ type: "LIKE" });
  } else if ("liked" === likeStatus) {
    service.send({ type: "UNLIKE" });
  }
});
elements.elDislikeButton.addEventListener("click", () => {
  service.send({ type: "DISLIKE" });
});
elements.elVolumeButton.addEventListener("click", () => {
  service.send({ type: "VOLUME", level: 2 });
});

service.subscribe((state) => {
  console.log("event->", state.event);
  console.log("actions->", state.actions);
  console.log("context->", state.context);

  const { context } = state;

  elements.elLoadingButton.hidden = !state.matches("loading");
  elements.elPlayButton.hidden = !state.can({ type: "PLAY" });
  elements.elPauseButton.hidden = !state.can({ type: "PAUSE" });
  elements.elVolumeButton.dataset.level =
    context.volume === 0
      ? "zero"
      : context.volume <= 2
      ? "low"
      : context.volume >= 6
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

setTimeout(
  () =>
    service.send({
      type: "LOADED",
      data: songs.pop(),
    }),
  1500
);
