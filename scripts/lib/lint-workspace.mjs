// The workspace linter ships inside the learn skill (starter/tools/) so that check.mjs can run it
// from any install, including skills.sh installs that copy only the skill folder. This module
// re-exports it for repository tooling (validate.mjs, evaluations, tests).
export * from '../../skills/learn/starter/tools/lint-workspace.mjs';
