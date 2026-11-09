# Guided study progress storage

## Current implementation

The Human Atlas is a static browser application with no authentication service, application backend, or student database. Guided study progress is therefore persisted in the browser's `localStorage`, not associated with a verified person or account.

Storage keys are versioned and separated by reference body:

- `human-atlas:study-progress:v1:male`
- `human-atlas:study-progress:v1:female`

Each record contains the schema version, reference body, completed guided-study concept keys, mastered assessment concept keys, and an ISO timestamp for the last write.

## Behavior and limits

- Progress is restored when the same browser opens the atlas again.
- Male and female reference progress is kept separately.
- The page shows a saved/unavailable indicator.
- Clearing browser data, using private browsing, changing browser, or changing device can remove or make this progress unavailable.
- The current record is not cloud-backed, not synchronized, and must not be described as a student profile or account history.
- The data is educational progress only; it contains no identity or sensitive personal information.

## Future account synchronization

A real student profile requires an explicit authentication provider and a server-side persistence layer with authorization rules. Before implementing that, choose the identity provider, storage service, retention policy, and whether a student can export or delete their own progress. Do not place service secrets in the static client bundle.
