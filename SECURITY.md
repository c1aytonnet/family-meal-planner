# Security Policy

## Project status

Family Meal Planner is an unmaintained MVP shared publicly for reference and
personal, non-commercial use under the repository license.

There is no active maintenance schedule, no guaranteed response time, and no
commitment to provide patches, updates, or supported releases.

## Supported versions

No versions are currently supported with security updates.

If you choose to fork or deploy this project, you are responsible for your own
security review, dependency maintenance, infrastructure hardening, and patch
management.

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues.

If you believe you have found a security vulnerability in this repository,
contact Clayton Smith privately and include:

- a short description of the issue
- the affected file, feature, or workflow
- reproduction steps or proof of concept, if available
- the potential impact

Because this repository is not actively maintained, you may not receive a fix
or response. However, private reporting is still preferred over public
disclosure through the issue tracker.

## Known security limitations

This MVP includes design tradeoffs that may be unacceptable for production
deployments, including but not limited to:

- no built-in authentication or authorization layer
- filesystem-based secret storage
- server-side AI integrations that depend on third-party providers
- a portable single-household architecture optimized for simplicity over
  enterprise-grade hardening

Anyone adopting this codebase should perform an independent security review
before public or commercial deployment.
