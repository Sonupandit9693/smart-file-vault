# Contributing to Abnormal File Vault

Thank you for your interest in contributing to **Abnormal File Vault**! This document provides guidelines to help you get started and make meaningful contributions.

## 🛠️ Tech Stack

This project uses the following technologies:

### Backend
- **Django**: Python web framework for building the backend.
- **Django REST Framework**: For creating APIs.
- **SQLite**: Development database.
- **Gunicorn**: WSGI HTTP Server.
- **WhiteNoise**: Static file serving.

### Frontend
- **React** with **TypeScript**: For building the user interface.
- **TanStack Query (React Query)**: For data fetching and caching.
- **Axios**: For API communication.
- **Tailwind CSS**: For styling.
- **Heroicons**: For UI elements.

### Infrastructure
- **Docker**: For containerized deployment.
- **Shell Scripts**: For automation tasks.

## 💡 How You Can Contribute

We welcome contributions of all kinds, including:
- Reporting bugs and suggesting features.
- Improving documentation (e.g., `README.md`, `CONTRIBUTING.md`).
- Enhancing the frontend or backend code.
- Writing tests to improve coverage.
- Optimizing the Docker setup or deployment process.

## 🛠️ Development Setup

### Fork & Clone the Repository
1. Fork this repository to your GitHub account.
2. Clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/<your-username>/smart-file-vault.git
   cd smart-file-vault
   ```

### Install Dependencies
Follow the instructions in the [README.md](README.md) file to set up the backend and frontend environments.

### Create a Branch
Always create a new branch for your contribution:
```bash
git checkout -b feature/your-feature-name
```

### Make Changes
- Follow the coding standards used in the project.
- Run tests to ensure your changes don’t break existing functionality.

### Commit and Push
1. Stage your changes:
   ```bash
   git add .
   ```
2. Commit with a descriptive message:
   ```bash
   git commit -m "Add feature: your-feature-name"
   ```
3. Push your branch to your forked repository:
   ```bash
   git push origin feature/your-feature-name
   ```

### Open a Pull Request
1. Go to the original repository: [Abnormal File Vault](https://github.com/Sonupandit9693/smart-file-vault).
2. Open the **Pull Requests** tab and click on **New Pull Request**.
3. Select your branch and provide a detailed description of your changes.

## 🧪 Testing Your Changes

This project includes both backend and frontend components. Ensure that you test your changes thoroughly:
- Run backend tests using the Django test suite.
- Run frontend tests to validate React components.
- If you introduce new features, write appropriate unit and integration tests.

## 🌟 Community Guidelines

- Be respectful and considerate to other contributors.
- Follow the project's [Code of Conduct](CODE_OF_CONDUCT.md).
- Include comments in your code where necessary.
- Ensure all contributions align with the project's goals and coding standards.

## 📄 Licensing

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

Feel free to ask if you need help setting up the environment or have questions about the project! 😊
