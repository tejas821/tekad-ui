# TEKAD — Licensing, IP and Dependency Research Prompt

## Objective

Perform a pre-launch intellectual-property and licensing research pass for TEKAD.

This is NOT legal advice.

The output must identify questions that require a qualified IP/trademark attorney.

## TEKAD assumptions

Project name:
TEKAD

Intended model:
Open-source Angular UI ecosystem.

Current intended software license:
Apache License 2.0, subject to professional review.

Founder-led initially, community contributions later.

Commercial offerings may exist in the future, but the open-source foundation is intended to remain available.

## 1. SOFTWARE LICENSE RESEARCH

Research Apache-2.0:

- permissions
- conditions
- patent grant
- copyright notice requirements
- NOTICE considerations
- redistribution
- modification
- sublicensing
- compatibility
- contributor implications
- downstream commercial use

Compare against:

- MIT
- BSD-2-Clause
- BSD-3-Clause
- MPL-2.0
- LGPL where relevant
- GPL/AGPL where relevant

Explain why Apache-2.0 may or may not fit TEKAD.

Do not give a definitive legal conclusion.

## 2. DEPENDENCY LICENSE AUDIT

Create a matrix:

| Dependency | Version | License | Runtime/Core/Optional | Commercial Use | Attribution | NOTICE | Copyleft Risk | Patent Concern | Recommendation |
| ---------- | ------- | ------- | --------------------- | -------------- | ----------- | ------ | ------------- | -------------- | -------------- |

Investigate all proposed core dependencies.

Special attention:

- Angular
- Angular CDK
- RxJS
- Chart.js
- D3
- icon systems
- date libraries
- rich-text integrations
- masking libraries
- accessibility utilities

Do not assume a library's license from a blog post.

Verify the exact package/version where possible.

## 3. COMPETITOR LICENSE RESEARCH

Research current licenses for:

- Angular Material/CDK
- Taiga UI
- PrimeNG
- NG-ZORRO
- NG Bootstrap
- other material reference libraries

Separate:

- open-source package license
- commercial/LTS offering
- premium components
- documentation/assets licenses
- trademark rights

PrimeNG licensing must be researched from its current official licensing information, not historical articles.

## 4. CLEAN-ROOM / COPYRIGHT RISK

Define practical engineering rules for TEKAD developers.

TEKAD may study:

- standards
- public documentation
- public behavior
- public architectural concepts
- public package structures

TEKAD must not copy:

- source code
- implementation
- documentation wording
- distinctive examples
- proprietary assets
- logos
- branding
- distinctive protected material

Create:

`CLEAN_ROOM_ENGINEERING_POLICY.md`

Include:

- research rules
- source recording
- independent API design
- independent implementation
- code provenance
- third-party code review
- contributor expectations

## 5. API / SOFTWARE COPYRIGHT RISK

Research, at a high level, the distinction between:

- general concepts
- functionality
- API names
- source code
- documentation
- creative expression
- trademarks

Do not make jurisdiction-specific legal claims without qualified sources.

Flag attorney-review questions.

## 6. TRADEMARK RESEARCH

Research:

TEKAD

Potential use:

- software library
- Angular ecosystem
- npm packages
- developer tooling
- documentation website
- commercial software/services
- educational content

Investigate:

- Indian trademark databases
- USPTO
- EUIPO
- WIPO/global references
- software/open-source naming conflicts
- GitHub
- npm
- domains

Do not conclude that TEKAD is legally available.

Classify:

LOWER APPARENT CONFLICT
POTENTIAL CONFLICT
HIGHER CONFLICT
ATTORNEY SEARCH REQUIRED

## 7. BRAND ARCHITECTURE

Research whether package naming should use:

@tekad/...
@tekad-ui/...
or another namespace.

Investigate:

- npm availability
- GitHub organization availability
- trademark implications
- future commercial product architecture
- scope ownership

## 8. CONTRIBUTOR IP

Research:

- DCO
- CLA
- copyright assignment
- contributor license grants
- employer contribution concerns
- third-party contributions

Recommend the simplest appropriate launch model.

Do not make the founder surrender unnecessary rights.

## 9. SECURITY / LICENSE AUTOMATION

Recommend automated checks for:

- license detection
- dependency vulnerabilities
- dependency changes
- package provenance
- SBOM
- release artifacts

## 10. REQUIRED OUTPUT

Create:

01-license-report.md
02-dependency-license-matrix.md
03-clean-room-engineering-policy.md
04-trademark-preliminary-research.md
05-contributor-ip-policy.md
06-legal-risk-register.md
07-attorney-question-list.md
08-launch-legal-checklist.md

Every conclusion must distinguish:

FACT
RESEARCH INTERPRETATION
LEGAL QUESTION

## FINAL WARNING

Do not tell the founder:

"TEKAD is legally safe."

Instead state:

"Based on the research reviewed, these risks appear lower/higher, but formal trademark and IP clearance should be obtained before commercial launch or registration."
