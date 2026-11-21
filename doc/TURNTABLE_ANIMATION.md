# Room turntable animation

Export: `mobile/assets/animations/cuevo-room-turntable.json`
Creator document: `cuevo-room-turntable`
Preview: `mobile/assets/animations/cuevo-turntable-preview.gif`

Transparent 480×480 standard Lottie JSON, 30fps, 120 frames / four-second loop. Draft source export retained separately. No embedded state machine, interaction events or timeline markers. Integrated into RoomHeaderCard as a looping preview. The host mock pause/resume controls now drive its pause()/resume() methods and the header status. It remains disconnected from real audio or backend playback state.

## Integration intent

Use the installed lottie-react-native imperative API: play(), pause(), resume(), reset().

- Playing: start the loop.
- Paused: pause at the current frame.
- Resumed: continue from the current frame.
- End of room/no active track: stop and reset to the initial pose; optionally hide the illustration.
- Track completes and queue advances: keep looping if the next track is playing.
- Click/tap: only if deliberately wrapped in an application Pressable; no action is baked into the asset. Participant taps must not control host playback.
- Hover: optional web wrapper behavior; not applicable to ordinary phone touch interaction.

The host/backend playback state should drive the animation. Exporting the asset alone supplies no playback controls or interactions. The app now provides local mock host pause/resume/next controls; real playback state wiring and hover/click wrappers remain unimplemented. This asset has no separate tonearm park/end transition.
