# Beat Buddy — room-header Lottie draft

Status: visual draft for user review, not integrated into the app.

- Creator document: `cuevo-room-beat-buddy`, revision 1.
- Preview/editor: https://creator.lottiefiles.com/?fileId=6cf13cbc-8e48-42a6-b890-fa3cedf6c40c
- Four-second seamless transparent vector loop: charcoal speaker, orange pulsing bass cone, blinking white eyes, bouncing body and alternating tapping arms.
- Intended placement: top-right recessed shelf in RoomHeaderCard.
- Current export is a timeline animation, without an embedded state machine.

dotLottie supports state machines in compatible players. The installed lottie-react-native player exposes pause() and resume(), sufficient to freeze/resume this loop when the host playback state changes. Do not claim the exported draft contains a state machine or replace the Expo player without checking compatibility.

Planned behavior: playing loops, paused freezes current frame, resumed continues, no active track remains still. It must reflect host playback, not local participant audio; playback/backend state is not implemented yet.

Sources: https://docs.lottiefiles.com/en/format/dotlottie/interactivity and installed mobile/node_modules/lottie-react-native types/source.
