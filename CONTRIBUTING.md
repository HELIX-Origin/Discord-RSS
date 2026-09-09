# Contributing Guidelines
Thank you for considering contributing to Discord-RSS! We welcome contributions from the community to help improve the project. Please follow these guidelines to ensure a smooth and productive collaboration.

## Commit Name Standards

When contributing to this project, please follow these commit name standards to maintain a clear and consistent history:

- **Feature**: feat: feature-in-lowercase
- **Bugfix**: fix: bugfix-in-lowercase
- **Documentation**: docs: documentation-update-in-lowercase
- **Chore**: chore: chore-in-lowercase
- **Refactor**: refactor: refactor-in-lowercase
- **Test**: test: test-in-lowercase
- **Build**: build: build-in-lowercase

Examples:

- **Feature**: feat: add-support-for-new-rss-format
- **Bugfix**: fix: correct-feed-url
- **Documentation**: docs: update-configuration-guide
- **Chore**: chore: update-dependencies
- **Refactor**: refactor: improve-feed-parser
- **Test**: test: add-unit-tests-for-feed-parser
- **Build**: build: update-build-scripts

## Comment Standards

When contributing to this project, please follow these comment standards to maintain clear and consistent communication within the codebase:

- **Single-line comments**: Use `//` for single-line comments.
- **Multi-line comments**: Use `/* */` for multi-line comments.
- **TODO comments**: Use `// TODO:` to indicate tasks that need to be completed.
- **FIXME comments**: Use `// FIXME:` to indicate code that needs to be fixed.
- **Explanation comments**: Use comments to explain complex logic or decisions in the code.
- **Deprecated comments**: Use `// DEPRECATED:` to indicate code that is outdated and should not be used. 

## Issues

When contributing to this project, please follow these issue standards to maintain clear and consistent communication within the issue tracker:

- **Bug reports**: Clearly describe the issue, steps to reproduce, and expected behavior.
- **Feature requests**: Provide a detailed description of the requested feature and its potential benefits.
- **Issue titles**: Use concise and descriptive titles for issues.
- **Issue labels**: Apply appropriate labels to categorize issues (e.g., bug, enhancement, question).
- **Issue comments**: Be respectful and constructive when commenting on issues.
- **Closing issues**: Only close issues when they have been resolved or are no longer relevant, and provide a clear explanation when doing so.

## Pull Requests

When contributing to this project, please follow these pull request standards to maintain clear and consistent communication within the pull request process:

- **Pull request titles**: Use concise and descriptive titles for pull requests.
- **Pull request descriptions**: Provide a detailed description of the changes made and their purpose.
- **Pull request labels**: Apply appropriate labels to categorize pull requests (e.g., bugfix, feature, documentation).
- **Reviewing pull requests**: Be respectful and constructive when reviewing pull requests.
- **Merging pull requests**: Only merge pull requests when they have been reviewed and approved, and provide a clear explanation when doing so.
- **Closing pull requests**: Only close pull requests when they have been merged or are no longer relevant, and provide a clear explanation when doing so.

## Development Guide

This guide provides instructions and best practices for setting up the development environment, writing code, and contributing to the project.

### Setting Up the Development Environment


1. **Fork the repository using GitHub CLI**:

   ```bash
   gh repo fork https://github.com/your-username/Discord-RSS.git
   ```

2. **Clone your forked repository**: 

   ```bash
   gh repo clone https://github.com/your-username/Discord-RSS.git
   cd Discord-RSS
   npm install
   ```

### Testing and Debugging

- **Linting**: Run `npm run lint` to check for code style and potential errors.
- **Formatting**: Run `npm run format` to automatically format your code according to the project's style guidelines.
- **Running tests**: Run `npm test` to execute the project's test suite and verify that your changes do not break existing functionality.
- **Building the project**: Run `npm run build` to compile the project and prepare it for deployment.
- **Debugging the project**: Use `npm run debug` to start the project in debug mode and troubleshoot issues effectively.

### Code Review and Collaboration

- **Submit pull requests**: When your changes are ready, submit a pull request to the main repository for review.
- **Respond to feedback**: Address any feedback or requested changes from reviewers promptly and professionally.
- **Participate in discussions**: Engage in discussions on issues and pull requests to contribute to the project's development and decision-making process.

## Important Notes

- **Always pull the latest changes**: Before starting new work, ensure your local branch is up-to-date with the main branch to avoid conflicts.
- **Be mindful of performance**: Consider the performance implications of your changes and strive for efficient solutions.
- **Keep dependencies updated**: Regularly check for updates to project dependencies and apply them as needed.
- **Communicate effectively**: Keep open lines of communication with the project maintainers and other contributors to ensure smooth collaboration.
- **Be patient and respectful**: Understand that maintainers and contributors may have limited time, and always interact with others respectfully and professionally.
- **Provide constructive feedback**: When reviewing code or discussing changes, focus on providing helpful and constructive feedback rather than criticism.
- **Test thoroughly**: Ensure that your changes are thoroughly tested to catch potential issues before they are merged into the main branch.
