export const EVENT_TYPES = [
  {
    id: "intro-call",
    title: "Intro Call",
    description: "A quick introduction and overview call to discuss scope and see how i can help you achieve your goals.",
    duration: 20, // minutes
    color: "#18181b", // Charcoal/Dark Gray
  },
  {
    id: "deep-dive",
    title: "Deep Dive",
    description: "A longer working session to tackle complex problems together.",
    duration: 45,
    color: "#71717a", // Cool Gray
  },
];

export type EventType = typeof EVENT_TYPES[number];
