# Contributing

Thanks for your interest in Family Meal Planner.

This repository is being shared as an unmaintained MVP. It exists so other
people can learn from it, fork it, and build on it, but it is not under active
development.

## Before you contribute

Please read the following expectations carefully:

- there is no active roadmap
- pull requests may not be reviewed or merged
- bug reports may not receive a response
- this repository is best treated as a starting point for forks

If you want to take the project further, the most practical path is usually to
fork it and continue development in your own repository.

## Security issues

Please do not open public issues for security vulnerabilities.

Instead, follow the instructions in [SECURITY.md](SECURITY.md).

## Commercial use

This repository is not open for unrestricted commercial use.

Clayton Smith retains all commercial rights. If you want to use this project or
any derivative work for a commercial purpose, you must obtain prior written
permission from Clayton Smith as described in the repository license.

## If you still want to open a pull request

You are welcome to open a pull request, especially for:

- documentation fixes
- portability improvements
- bug fixes that are small and easy to review
- clarifications that help future forks

Please keep changes focused and clearly explained.

## Development notes

- runtime data belongs in `saved-data/` and should not be committed
- environment-specific secrets belong in `.env` or the mounted runtime data
  directory, not in source control
- the app is intentionally filesystem-first and does not use a traditional
  database

## No maintenance guarantee

By contributing, you understand that your contribution may remain unanswered,
unmerged, or unused indefinitely.
