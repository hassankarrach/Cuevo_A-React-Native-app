# Mock accounts and room membership

Source: `mobile/src/data/mockAccounts.json`.

Ten accounts: `self` (the current user) and nine other test accounts. Each account has a stable ID, display name, username, bio, city, genres, optional avatar URI, placeholder color, and preview verification flag. Null avatar URIs use colored initials; the current user retains the existing mascot/photo picker.

Room membership references these IDs:

| Room | Initial role | Host | Members |
| --- | --- | --- | --- |
| Kitchen Disco | Host | self | 7 |
| Late Nights | Participant | sara | 6 |
| On Repeat | Visitor | amine | 5 |
| After Hours (private) | Visitor | sara | 3 |

`MockRoomsProvider` holds join/leave changes for the app session. Room participant strips, room header counts, Home card counts and Home avatar stacks read this shared membership. A visitor is absent from the strip until joining. Changes reset on reload. Song suggestions, voting and playback state now live in the shared room provider.

Participant taps use `/profile?userId=<account-id>`. The same ProfileScreen renders mock accounts read-only (no photo editing or save action). Tapping self opens `/profile`, preserving the editable local profile. Unknown IDs show Profile unavailable rather than displaying the current user's information.

Current-user profile changes use ProfileContext and are reflected wherever self is rendered; they do not modify the JSON file. Mock accounts are not authenticated accounts, and preview verification badges are not real verification.

## Latest fixtures — 2026-11-21

Accounts have separate verified and subscriptionActive flags; self and Sara are active subscribers and verified. Badge eligibility is data-driven. These are fixture statuses, not real entitlements.

Private playlist Inner Circle belongs to Sara and has Sara/Omar/Ines as collaborators; self is absent. Our Secret Mix remains self-owned and private. Home intentionally lists both regardless of membership, with locks only on private items.

BillingProvider seeds one masked Visa ending 4242 (12/29). Payment summaries, selection and removal are session-only. No full card number/CVV, payment-provider token or charge is seeded.
