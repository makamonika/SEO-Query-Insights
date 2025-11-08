<test_plan>
## 1. Introduction and Test Objectives

### 1.1. Introduction

This document outlines the testing strategy for the "SEO Query Insights Dashboard," an internal tool designed for SEO specialists. The application facilitates the analysis of Google Search Console data through visualization, filtering, and query grouping, including features assisted by Artificial Intelligence (AI) for semantic clustering.

As the project is currently in the Minimum Viable Product (MVP) development phase, this test plan focuses on ensuring the quality, stability, and feature completeness of the MVP release.

### 1.2. Test Objectives

The primary objectives of the testing process are:
*   **Functionality Verification:** To ensure all core features of the MVP operate according to the project specifications.
*   **Quality and Stability Assurance:** To identify, document, and track defects to ensure the application is reliable and robust.
*   **Performance Evaluation:** To verify that the application meets the defined non-functional requirements for performance and responsiveness.
*   **Security Validation:** To ensure authentication and authorization mechanisms are working correctly to protect data access.
*   **Usability Assessment:** To confirm the user interface is intuitive and user-friendly for its target non-technical audience.
*   **Data Integrity Assurance:** To verify that data is correctly imported, processed, stored, and aggregated throughout the application.

---

## 2. Scope of Testing

### 2.1. In-Scope Features

Testing will cover all functionalities defined within the project's MVP scope:

*   **User Authentication:**
    *   Login and Logout functionality.
    *   New user registration.
    *   Password recovery process.
    *   Protection of routes and API endpoints from unauthorized access.
*   **Data Import:**
    *   Manual, one-click data import from the internal API.
    *   Error handling for failed import processes.
    *   Global update of the data status and last import timestamp for all users.
*   **Query Performance Dashboard:**
    *   Visualization of metrics (Impressions, Clicks, CTR, Average Position).
    *   Search, filtering (by opportunity status), and sorting functionalities.
    *   Pagination and handling of large datasets (up to 10,000 queries).
*   **Manual Query Grouping:**
    *   Creating, editing, and deleting user-private query groups.
    *   Adding and removing queries from groups.
    *   Correct calculation and display of aggregated metrics for groups.
*   **AI-Assisted Clustering:**
    *   Generation of semantic query clusters.
    *   UI for reviewing, accepting, editing, and discarding AI suggestions.
    *   Correct creation of groups based on accepted clusters.
*   **Opportunity Detection:**
    *   Automatic flagging of queries meeting the defined criteria (Impressions > 1,000, CTR < 1%, Position 5-15).

### 2.2. Out-of-Scope Features

The following features, defined as out of scope for the MVP, will not be tested in this phase:

*   Automatic, scheduled daily data imports.
*   Historical trend analysis or time-based visualizations.
*   Detailed AI-generated content optimization suggestions.
*   Notifications, report exports, or performance alerts.
*   Role-Based Access Control (RBAC).

---

## 3. Types of Testing

The following testing types will be conducted throughout the project lifecycle:

*   **Unit Tests:**
    *   **Objective:** To verify the correctness of individual functions, React components, and custom hooks in isolation.
    *   **Scope:** Utility functions in `src/lib/`, logic within custom hooks in `src/hooks/`, and UI components in `src/components/`.
    *   **Tools:** Vitest, React Testing Library.

*   **Integration Tests:**
    *   **Objective:** To test the interaction between different components and between the frontend and the API backend.
    *   **Scope:** Form submissions to API endpoints, interaction between parent/child components (e.g., `QueriesToolbar` with `QueriesTable`), integration with Supabase (mocked or on a dedicated test database).
    *   **Tools:** Vitest, React Testing Library, Supertest (for API).

*   **End-to-End (E2E) Tests:**
    *   **Objective:** To simulate complete user workflows in a real browser environment to validate business logic from start to finish.
    *   **Scope:** Full user journeys, such as "Register -> Login -> Import Data -> Create a Group -> Add Queries -> Logout".
    *   **Tools:** Playwright or Cypress.

*   **API Tests:**
    *   **Objective:** To directly validate the API endpoints in `src/pages/api/` for business logic, error handling, input validation, and authorization.
    *   **Scope:** All endpoints for auth, queries, groups, and data import.
    *   **Tools:** Postman, automated tests using Vitest/Supertest.

*   **Performance Tests:**
    *   **Objective:** To verify the application meets its non-functional performance requirements.
    *   **Scope:**
        *   Dashboard load time with 10,000 queries (< 2 seconds).
        *   UI response time for user actions like sorting/filtering (< 500 ms).
        *   Data import duration for a 40-60MB file (< 1 minute).
    *   **Tools:** k6, Playwright (performance tracing).

*   **Security Tests:**
    *   **Objective:** To identify basic security vulnerabilities.
    *   **Scope:** Route protection, input sanitization, session management (HTTP-Only cookies), authorization checks (ensuring users cannot access another user's private groups).

*   **Usability & Accessibility Tests:**
    *   **Objective:** To ensure the application is intuitive for non-technical users and compliant with WCAG standards.
    *   **Scope:** Manual UI/UX review, testing with screen readers.
    *   **Tools:** Axe DevTools.

---

## 4. Test Scenarios for Key Functionalities

The following are high-level test scenarios. Detailed test cases will be developed and managed in a separate test management tool.

<details>
<summary><strong>Authentication</strong></summary>

| ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| AUTH-01 | Successful login with valid credentials | User is authenticated and redirected to the main dashboard (`/queries`). |
| AUTH-02 | Attempt to log in with an incorrect password | An "Invalid email or password" error message is displayed. The user remains on the login page. |
| AUTH-03 | Successful registration of a new user | A user account is created. The user is logged in and redirected to the main dashboard. |
| AUTH-04 | Attempt to register with an existing email address | An error message is displayed indicating the email is already in use. |
| AUTH-05 | Successful logout | The user's session is terminated, and they are redirected to the login page. |
| AUTH-06 | Access a protected page without being logged in | The user is automatically redirected to the login page. |
</details>

<details>
<summary><strong>Data Import and Visualization</strong></summary>

| ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| DATA-01 | Successful data import by clicking the "Import Data" button | Data is imported into the database. The queries table refreshes to show the new data. The last import date and time are updated. |
| DATA-02 | Handle data import failure (e.g., source API is unavailable) | A user-friendly error message is displayed. The application retains the previously imported data state. |
| DATA-03 | Filter queries using the search input | The table dynamically updates to show only queries matching the search term. |
| DATA-04 | Sort queries by the "Impressions" column in descending order | The queries in the table are ordered from the highest number of impressions to the lowest. |
| DATA-05 | Enable the "Opportunities only" filter | The table displays only queries that meet the opportunity criteria. |
</details>

<details>
<summary><strong>Group Management</strong></summary>

| ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| GRP-01 | Create a new group from selected queries | A modal appears to enter the group name. Upon confirmation, the group is created, and the selected queries are assigned to it. A success notification is shown. |
| GRP-02 | Attempt to create a group with a duplicate name | An error is displayed, stating that a group with that name already exists. |
| GRP-03 | Add new queries to an existing group | From the group details view, the user can search for and add new queries. The group's aggregated metrics are updated accordingly. |
| GRP-04 | Remove a query from a group | The query is unlinked from the group. The group's aggregated metrics are updated. |
| GRP-05 | Rename an existing group | The user can edit the group's name. The change is saved and reflected in the groups list. |
| GRP-06 | Delete an entire group | After confirmation, the group is removed from the list. The queries that belonged to it are not deleted from the system. |
</details>

<details>
<summary><strong>AI Clustering</strong></summary>

| ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| AI-01 | Successfully generate AI cluster suggestions | The user is redirected to the suggestions page, where AI-generated clusters are displayed with their metrics and member queries. |
| AI-02 | Handle an error during cluster generation (e.g., OpenRouter API error) | The user is shown an appropriate error message. |
| AI-03 | Edit the name and composition of a suggested cluster | The user can rename a cluster and remove individual queries from it before acceptance. |
| AI-04 | Accept selected cluster suggestions | The chosen clusters (including modified ones) are saved as new, permanent groups with an "AI Generated" tag. The user is redirected to the groups list. |
| AI-05 | Discard (delete) a cluster suggestion | The suggestion is removed from the view and is not saved. |
</details>

---

## 5. Test Environment

*   **Frontend Environment:**
    *   Browsers: Latest stable versions of Chrome and Firefox.
    *   Operating Systems: Windows 11, macOS Sonoma.
*   **Backend Environment:**
    *   Local development instance running via `npm run dev`.
    *   A dedicated staging environment on DigitalOcean, mirroring the production setup.
*   **Database:**
    *   A dedicated, separate Supabase project for testing purposes, populated with anonymized, production-scale test data.
*   **External Dependencies:**
    *   Endpoints for the internal GSC data API and Openrouter.ai will be mocked for unit and integration tests.
    *   Dedicated API keys (with financial limits) will be used on the staging environment for E2E testing.

---

## 6. Testing Tools

| Category | Tool | Application |
| :--- | :--- | :--- |
| **Test Framework** | Vitest | Running unit and integration tests. |
| **UI Testing Library** | React Testing Library | Testing React components without a full browser render. |
| **E2E Testing** | Playwright | Automating user scenarios in a real browser. |
| **API Testing** | Postman / Supertest | Manual and automated testing of API endpoints. |
| **Performance Testing** | k6 | Load generation and performance measurement of the API and application. |
| **Accessibility Testing** | Axe DevTools | Automated scanning for WCAG standard violations. |
| **Test Management** | Jira / Xray (or equivalent) | Documenting test cases, planning test execution, and tracking progress. |
| **Bug Tracking** | Jira (or equivalent) | A centralized system for reporting and tracking defects. |
| **CI/CD** | GitHub Actions | Automatically running test suites on every commit. |

---

## 7. Test Schedule

The testing process will be conducted in parallel with development, following an agile methodology.

| Phase | Duration | Responsible Parties | Description |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Testing** | Continuous, during sprints | Developers, QA | Writing tests for newly developed features and components. Run automatically in CI. |
| **Functional & API Testing** | Upon completion of each major feature | QA | Manual and automated testing of new features on the dev/staging environment. |
| **Regression Testing** | Before each deployment to production | QA | Execution of the full automated E2E test suite to ensure new changes have not broken existing functionality. |
| **Performance Testing** | Before the MVP production release | QA | Execution of load tests against the staging environment. |
| **User Acceptance Testing (UAT)** | At the end of the MVP development phase | SEO Team, QA | Validation of the application by end-users to confirm it meets their requirements and expectations. |

</test_plan>