# Applications

- web: Vite entry point for the shared React research workspace.
- desktop: Electron main/preload; loads web's renderer and adds narrow host APIs.
- cli: reserved direction for a future Go/Cobra host utility, when needed.

Shared UI belongs in packages/ui. Domain contracts belong in packages/core.
Platform capabilities belong in packages/platform. Applications only compose
these pieces; they must not fork the research interface.
