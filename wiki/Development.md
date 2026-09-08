# Development Guide

This guide covers the development setup and contribution process for the Discord RSS self-hosted service.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 22.5)
- [Git](https://git-scm.com/) (for cloning the repository)
- [GitHub CLI](https://cli.github.com/) (optional: for improved GitHub interaction from the command line)

## Setup

1. Fork the repository on GitHub.

If GitHub CLI is installed, you can fork the repository using the following command:

```bash
gh repo fork https://github.com/HELIX-Origin/Discord-RSS.git --clone=false
```

2. Clone your fork:

Git (without GitHub CLI):

```bash
git clone https://github.com/yourusername/discord-rss.git
cd discord-rss
```

GitHub CLI (after forking):

```bash
gh repo clone https://github.com/yourusername/discord-rss.git
cd discord-rss
```

3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file based on the example:

```bash
cp .env.example .env
```

5. Start the development server:

```bash
npm run dev
```

## Test Suite

This project contains an extensive test suite to ensure the quality and reliability of the application. It is powered by the Vitest testing framework.
The Vitest testing suite provides a comprehensive set of tools for writing, running, and analyzing tests, including support for unit tests, integration tests, and code coverage analysis. It is used in place of simple linting to provide a more robust and thorough testing process.

To run the tests suite, use the following command:

```bash
npm run test
```
You can also run specific test files or watch for changes using the following commands:

```bash
npm run test -- path/to/test/file
npm run test -- --watch
```

### Test Suite Features

The test suite is powered by the Vitest testing framework and provides the following features:

> [!NOTE]
> The test suite includes smoke tests, linting, code coverage analysis, and full test coverage to ensure the quality and reliability of the application.
> This feature list is currently incomplete and is being built and will be updated as new testing capabilities are added to the suite.

| Feature | Description | Status |
| :--- | :--- | :--- |
| Smoke Test | Quickly verifies that the basic functionality of the application works as expected. | ✅ |
| Linting | Ensures that the code adheres to defined style and quality standards. | ✅ |

### Commands

This is a detailed list of available commands for our testing suite:

> [!NOTE]
> This section is currently incomplete and will be updated as new commands are added to the testing suite.
> We plan to add various commands for use with the testing suite so it has a full and extensive command set.

| Command | Description |
| :--- | :--- |
| `npm run test` | Runs the entire test suite. |
| `npm run test -- path/to/test/file` | Runs a specific test file. |
| `npm run test -- --watch` | Runs the test suite in watch mode, re-running tests on file changes. |

### Pros and Cons of using a Vitest suite

#### Pros
- Provides a comprehensive testing framework for unit, integration, and code coverage tests.
- Ensures higher code quality and reliability compared to simple linting.
- Supports watch mode for continuous testing during development.
- Provides detailed feedback on test failures, helping developers quickly identify and fix issues.
- Integrates well with modern JavaScript and TypeScript development workflows.
- Provides a structured approach to testing, making it easier to maintain and scale the test suite over time.
- Facilitates early detection of bugs and issues, reducing the likelihood of defects reaching production.

#### Cons
- May introduce additional complexity for new developers unfamiliar with Vitest.
- Requires maintenance of test cases alongside application code.
- Can increase development time due to the need for thorough testing.
- May require additional setup and configuration compared to simpler testing tools.
- Requires familiarity with Vitest-specific APIs and conventions.
- May not be suitable for very small projects where the overhead of a full testing framework is unnecessary.

## Contributing

Follow our Contribution Guidelines to ensure a smooth collaboration process.

You can find the Contribution Guidelines [here](https://github.com/HELIX-Origin/Discord-RSS/blob/main/CONTRIBUTING.md).

Please make sure to read and follow these guidelines before submitting any pull requests.

