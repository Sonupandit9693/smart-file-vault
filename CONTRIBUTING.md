# Contributing to Smart File Vault

Thank you for considering contributing to the Smart File Vault project! This document outlines the process for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please treat all community members with respect.

## How to Report Issues

If you encounter bugs or have feature requests, please report them by creating a new issue in our GitHub repository. When reporting issues:

1. Use a clear and descriptive title
2. Provide a detailed description of the issue or feature request
3. Include steps to reproduce the bug (if applicable)
4. Specify the environment (operating system, browser, etc.)
5. Add relevant screenshots or error messages if possible
6. Use issue templates if available

## How to Make Pull Requests

We welcome pull requests! To contribute code:

1. Fork the repository
2. Create a new branch from `main` with a descriptive name (e.g., `fix-login-issue` or `add-search-feature`)
3. Make your changes in this branch
4. Test your changes thoroughly
5. Ensure your code follows our code style guidelines
6. Push your branch to your fork
7. Submit a pull request to our `main` branch
8. Wait for code review and address any feedback

### Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Link any related issues in the PR description
- Update documentation as needed
- Add tests for new features

## Code Style Guidelines

Please follow these guidelines to maintain code quality:

### General Guidelines
- Write clean, readable, and well-documented code
- Follow the existing code style and architecture
- Use meaningful variable and function names
- Keep functions small and focused on a single task

### JavaScript/TypeScript
- Use ES6+ features when appropriate
- Format code with Prettier
- Follow ESLint rules configured in the project
- Use async/await for asynchronous operations

### CSS/SCSS
- Use CSS classes instead of IDs for styling
- Follow a consistent naming convention (e.g., BEM)
- Avoid !important unless absolutely necessary

## Commit Message Format

We follow a structured commit message format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **test**: Adding or modifying tests
- **chore**: Changes to build process or auxiliary tools

### Example
```
feat(auth): implement password reset functionality

- Add reset password API endpoint
- Create email service for sending reset links
- Add reset password form component

Closes #123
```

## Development Setup

1. Clone the repository
2. Install dependencies with `npm install` or `yarn install`
3. Follow the README instructions for local development setup

## Thank You!

Your contributions are what make open source projects great. We appreciate your time and effort!

# Contributing to Smart File Vault

Thank you for your interest in contributing to Smart File Vault! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Making Contributions](#making-contributions)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please be respectful and inclusive in your interactions with others.

## Getting Started

1. Fork the repository
2. Clone your fork locally:
   ```
   git clone https://github.com/YOUR_USERNAME/smart-file-vault.git
   cd smart-file-vault
   ```
3. Add the original repository as an upstream remote:
   ```
   git remote add upstream https://github.com/Sonupandit9693/smart-file-vault.git
   ```
4. Keep your fork up to date:
   ```
   git fetch upstream
   git merge upstream/main
   ```

## Development Setup

### Backend (Django)

1. Set up a Python virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install backend dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```

3. Apply migrations:
   ```
   python manage.py migrate
   ```

4. Run the development server:
   ```
   python manage.py runserver
   ```

### Frontend (React/TypeScript)

1. Install frontend dependencies:
   ```
   cd frontend
   npm install
   # or
   yarn install
   ```

2. Start the development server:
   ```
   npm start
   # or
   yarn start
   ```

## Coding Standards

### Backend (Python)

- Follow PEP 8 for Python code style
- Write docstrings for functions and classes
- Maintain test coverage for new features
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility

### Frontend (TypeScript/React)

- Follow the ESLint and Prettier configurations provided in the project
- Use TypeScript interfaces for props and state
- Follow component architecture in the codebase
- Write functional components with React hooks
- Keep components small and reusable
- Use CSS modules or styled-components for styling

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests after the first line
- Consider using a conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `style:` for formatting changes
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

## Making Contributions

1. Create a new branch for your feature or bugfix:
   ```
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. Implement your changes, following the coding standards above.

3. Add and commit your changes with a descriptive commit message:
   ```
   git add .
   git commit -m "Your descriptive commit message"
   ```

4. Push your branch to your fork:
   ```
   git push origin feature/your-feature-name
   ```

## Pull Request Process

1. Create a pull request from your fork to the main repository.
2. Provide a detailed description of your changes in the PR description.
3. Reference any related issues using the GitHub issue number (e.g., "Fixes #123").
4. Ensure all tests are passing.
5. Wait for code review and address any feedback.
6. Your PR will be merged once it meets all the requirements.

## Reporting Bugs

When reporting bugs, please include:

- A clear and descriptive title
- A detailed description of the bug
- Steps to reproduce the bug
- Expected behavior
- Screenshots if applicable
- Browser/environment information

## Feature Requests

Feature requests should include:

- A clear and descriptive title
- A detailed explanation of the proposed feature
- Any relevant mockups or examples
- Explanation of how this feature would benefit the project

Thank you for contributing to Smart File Vault!

Here's an example of a `CONTRIBUTING.md` file you can create for your repository to guide contributors:

---

# Contributing to Smart File Vault

Thank you for considering contributing to **Smart File Vault**! Your contributions are highly appreciated and help ensure the success of this project.

## 🛠️ How to Contribute

### 1. Fork the Repository
1. Navigate to the repository: [Smart File Vault](https://github.com/Sonupandit9693/smart-file-vault).
2. Click the **Fork** button in the top-right corner to create a copy of the repository in your GitHub account.

### 2. Clone Your Fork
Clone the repository to your local machine:
```bash
git clone https://github.com/<your-username>/smart-file-vault.git
cd smart-file-vault
```

### 3. Create a Branch
Create a feature or bugfix branch:
```bash
git checkout -b feature/your-feature-name
```

### 4. Make Changes
- Follow the coding standards of the project.
- Ensure that your changes are well-tested and documented.
- Keep commits small and meaningful.

### 5. Test Your Changes
Run the project locally and test your changes thoroughly. Ensure that all tests pass and the application works as expected:
- Backend: Run the Django test suite.
- Frontend: Validate React components and functionality.

### 6. Commit and Push
Stage your changes and commit them:
```bash
git add .
git commit -m "Describe your changes"
```
Push your branch to your fork:
```bash
git push origin feature/your-feature-name
```

### 7. Open a Pull Request
1. Navigate to the original repository: [Smart File Vault](https://github.com/Sonupandit9693/smart-file-vault).
2. Click the **Pull Requests** tab and then the **New Pull Request** button.
3. Select your feature branch and provide a clear description of your changes.

## 🌟 Code of Conduct
Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming and respectful community.

## 🧪 Testing Guidelines
- Ensure that all unit tests pass before submitting your PR.
- Write tests for any new features or functionality.

## 📄 Licensing
By contributing to this repository, you agree that your contributions will be licensed under the same license as the project.

---

You can customize this further to match the specifics of your project needs! Let me know if you'd like help with anything else.