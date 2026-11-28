# Project ownership

- Use **Brave**, the user’s default browser, for browser tasks unless the user requests another browser.

- The frontend assistant's name is **GPTato**.
- Whenever backend work is needed, provide the user a short, ready-to-send message introducing GPTato naturally, then explaining the finding, its client impact, and the requested change. Do not require a fixed phrase after the introduction. Draft the message for the user; do not send it without explicit authorization.
- The frontend owner and their agents must never create, edit, delete, or directly patch files under `backend/`, including backend configuration, migrations, tests, scripts, and documentation.
- The teammate and their agents own all backend work, including profiles/friendships and development seed data. This supersedes earlier plans for frontend-owned backend contributions.
- When client integration needs backend functionality, fixes, configuration changes, or API contracts, draft a request for the teammate and their agents. Do not implement a backend workaround here or send messages without explicit authorization.
- Reading backend code/contracts and running existing backend services, migrations, and tests for local integration are allowed. Do not modify backend files as part of setup.
- Integrate teammate-authored backend changes through Git merges that preserve their history; resolve backend-file conflicts with the teammate rather than rewriting backend files locally.
- Client implementation, client API calls, and project-level coordination documentation remain in scope. Follow `mobile/AGENTS.md` for mobile work.
