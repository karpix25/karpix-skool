# Lessons

- Lesson quiz success starts at the configured passing score, usually 70%, and retry XP is awarded only for questions first corrected on that attempt.
- Export shared quiz status helpers before importing them across quiz components.
- Keep component prop names aligned between the interface, call sites, and render body.
- Google NotebookLM auth should be designed as an embedded remote-browser/VNC flow when the user expects in-modal authorization, not just a status/polling dialog.
- Never embed Google/NotebookLM pages directly in iframe; only embed a noVNC/browser-shell URL because Google blocks direct framing.
- Omit unused callback parameters instead of naming them when the TypeScript ESLint rules reject unused arguments.
- When extracting nested drag-and-drop logic, preserve parent-container resolution when a parent item is dropped over a child item.
