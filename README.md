# table-forge

A self-hosted Dungeons & Dragons 5e (2014 rules) companion for an in-person table. It offers:

- A rules browser for spells, monsters, classes and conditions.
- Character sheets that players can use at any time, including between sessions.
- A live shared map with three views: a DM view on the laptop, a TV display view that shows only what the players can see, and player views on phones.

## Status

Early planning. There is no app yet.

## Development prerequisites

- [gitleaks](https://github.com/gitleaks/gitleaks) must be installed (`brew install gitleaks` on macOS). A pre-commit hook scans staged changes for secrets and blocks the commit if gitleaks is missing.
- After cloning, enable the repo's git hooks:

  ```sh
  git config core.hooksPath .githooks
  ```

Never bypass the hook with `--no-verify`.

## Content and licensing

The code is released under the [MIT licence](LICENSE).

Rules data comes from the SRD 5.1 via [Open5e](https://open5e.com). No non-SRD book content is stored in this repo.

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.
