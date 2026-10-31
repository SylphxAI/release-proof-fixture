# Release verification sample

A dependency-free Node.js service for checking source, configuration and release recovery.

Run `npm run test:fast` for the HTTP behavior and `npm run test:full` for the complete source checks. Set `PROOF_CONFIGURATION` and `PROOF_SECRET`, then run `npm start`. `/healthz` returns the source version, configuration marker and a SHA-256 digest of the sample secret.
