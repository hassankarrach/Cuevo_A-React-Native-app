# Playback decision: host only

Status: agreed with the user on 2026-11-18.

## Chosen behavior

- One host phone plays the room's music, optionally through a connected speaker.
- Joining a room does not start audio on the participant's phone.
- Participants can suggest tracks and vote according to room permissions.
- All clients receive current-track, queue, vote, and playback-state updates from the authoritative backend.
- The room displays Now playing to everyone; playback controls are reserved for the host under the first-version design.
- A future mini-player outside the room can show the active session and return to it; participants do not get a personal audio play/pause control.

## Scope and rationale

The subject describes people gathered at a party/event suggesting and voting on upcoming music. It does not explicitly prescribe the playback device. Host-only playback is our chosen implementation, not a claimed subject requirement.

This avoids synchronizing audio across participant devices and keeps the initial work focused on required voting and playlist collaboration. Remote simultaneous listening, participant audio streaming, and cross-device playback-position synchronization are outside the initial scope.

## Still to decide and verify

- Music provider/SDK, host account requirements, search and playback capabilities, and real-device playback feasibility.
- Host disconnects, app backgrounding, session ending, and whether host ownership can be transferred.
- Skip/pause authorization, vote cutoff, ties, duplicate suggestions, and reliable track-completion/queue advancement.

Playback has not been implemented yet. Existing room and player-like visuals are UI previews.
