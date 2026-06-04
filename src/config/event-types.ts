export const EVENT_TYPES = [
  {
    id: "intro-call",
    title: "Intro Call",
    description: "A quick introduction and overview to see if we're a good fit.",
    duration: 30, // minutes
    color: "#4F46E5", // Indigo
  },
  {
    id: "deep-dive",
    title: "Deep Dive",
    description: "A longer working session to tackle complex problems together.",
    duration: 60,
    color: "#0F766E", // Teal
  },
];

export type EventType = typeof EVENT_TYPES[number];
