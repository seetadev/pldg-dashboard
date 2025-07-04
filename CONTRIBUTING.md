# Contributing to PLDG Dashboard

Thank you for your interest in contributing to the PLDG Dashboard! Our project is dedicated to building a production-grade data visualization system that provides real-time insights on developer engagement, technical progress, and contribution metrics across multiple cohorts.

## Overview

The PLDG Dashboard integrates data from several sources:
- **CSV Files:** Stored under `/public/data/`, separated into cohort-specific directories (e.g., `/cohort-1/` and `/cohort-2/`). These files follow a standard schema for weekly engagement tracking.
- **Airtable:** All detailed contributor engagement data is stored in Airtable, which acts as our persistent source of truth.
- **GitHub Integration:** We pull live data from GitHub by tracking GitHub handles provided in survey submissions and cross-referencing them with Airtable. (This integration is still under active improvement.)

Our overall system architecture is documented in [architecture.md](architecture.md), which outlines:
- The data flow from external sources (Airtable, GitHub GraphQL API, Octokit REST API) through our backend processing pipeline.
- The transformation, validation, and combination of data before it is presented through the frontend components.
- The real-time update mechanisms and error-handling strategies.

## Implementation Details

Our implementation is guided by detailed steps documented in [plan.md](plan.md). Key phases include:

1. **Data Migration and Segmentation:**
   - Moving Cohort 1 data to `/public/data/cohort-1/` and placing Cohort 2 data in `/public/data/cohort-2/`.
   - Updating data loading utilities to dynamically choose the appropriate cohort based on user selection.

2. **Type Updates and Data Processing:**
   - Enhancing TypeScript interfaces to include cohort metadata (e.g., adding a `cohortId` field).
   - Modifying data processing functions in `src/lib/data-processing.ts` to validate, transform, and merge data for multiple cohorts.

3. **User Interface Enhancements:**
   - Building and integrating a `CohortSelector` component that allows users to switch seamlessly between cohorts.
   - Improving loading states, error messages, and caching mechanisms for better performance and user experience.

4. **API Integration and Real-Time Data:**
   - Re-integrating the GitHub API (using either GraphQL or Octokit REST API) to pull live issue and contribution data.
   - Ensuring data from GitHub is accurately combined with Airtable and CSV data for a unified view across cohorts.

## Key Files and Directories

- **`src/lib/data-processing.ts`**  
  Contains functions to parse CSV files and transform raw engagement data into the internal format.

- **`src/lib/system.ts`**  
  Manages API integrations and real-time data fetching, including the logic for cross-referencing GitHub data.

- **`src/types/dashboard.ts`**  
  Houses TypeScript interfaces and models that define the data structures for engagement metrics, issue tracking, and more.

- **`architecture.md`**  
  Provides an in-depth look at our system’s architecture using Mermaid diagrams and sequence diagrams to explain data flow and design decisions.

- **`plan.md`**  
  Outlines the implementation steps for integrating multi-cohort support and enhancing the dashboard.

- **`public/data/`**  
  Contains the CSV files for each cohort. The files follow a schema with key fields such as:
  - **Name**
  - **Github Username**
  - **Email Address**
  - **Program Week**
  - **Engagement Participation**
  - **Tech Partner Collaboration?**
  - **Which Tech Partner**
  - **Issue Titles and Links**
  - **PLDG Feedback**

## Contribution Process

1. **Open an Issue:**  
   Check our [GitHub project board](https://github.com/PL-Dev-Guild/pldg-dashboard/issues) for current and upcoming issues. If you have an idea or bug fix, please open an issue before starting your work.

2. **Create a Feature Branch:**  
   Use the `main` branch as your baseline. For example:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Implement Your Changes:**  
   Follow the guidelines in this file and the implementation steps in [plan.md](plan.md). Make sure to update key files—especially those related to data processing, API integration, and UI components.

4. **Submit a Pull Request:**  
   Open a pull request with a detailed description of your changes. Reference related issues or milestones, and ensure your code adheres to our style guidelines.

5. **Review and Testing:**  
   Your contributions will be reviewed for code quality, performance, and adherence to our modular design. Please include tests for any new features or bug fixes.

## Code Style Guidelines

- **TypeScript:** Use strong typings and avoid `any` where possible.
- **Consistency:** Follow the existing code structure and naming conventions.
- **Documentation:** Ensure your code is well-documented. Update relevant documentation (e.g., README, architecture.md) as necessary.

## Additional Resources

- **README.md:** Provides project setup and build instructions.
- **architecture.md:** Detailed architectural overview of the dashboard.
- **plan.md:** Step-by-step implementation guide for upcoming features.
- **GitHub Project Board:** Track issues and milestones on our [Project Board](https://github.com/PL-Dev-Guild/pldg-dashboard/issues).

## Thank You

Your contributions help us build a more robust and insightful dashboard for the PLDG community. If you have any questions, feel free to reach out on our community channels or open an issue for discussion.

Happy coding!
