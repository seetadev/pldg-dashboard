# PLDG Dashboard Architecture

## System Overview

```mermaid
graph TD
    subgraph "Data Sources"
        A[Airtable API] --> P[Data Processing]
        G[GitHub GraphQL API] --> P
        O[Octokit REST API] --> P
    end

    subgraph "Backend Processing"
        P --> V[Validation Layer]
        V --> T[Data Transformation]
        T --> C[Data Combination]
    end

    subgraph "Frontend Components"
        C --> E[Executive Summary]
        C --> M[Metrics Dashboard]
        C --> I[AI Insights]
    end

    subgraph "Real-time Updates"
        U[Update Triggers] --> A
        U --> G
        U --> O
    end
```

## Data Sources

- Airtable: Weekly engagement surveys
- GitHub: Issue tracking and project data

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client
    participant API Routes
    participant Data Processing
    participant External APIs

    Client->>API Routes: Request Dashboard Data
    API Routes->>External APIs: Fetch Airtable Data
    API Routes->>External APIs: Fetch GitHub Data
    External APIs-->>API Routes: Raw Data
    API Routes->>Data Processing: Process & Combine Data
    Data Processing-->>Client: Processed Metrics & Insights
```

## Key Design Decisions

1. **API Integration**

   - GraphQL for efficient GitHub project data
   - REST for repository-level GitHub data
   - Airtable API for engagement metrics

2. **Data Processing**

   - Type-safe data transformation
   - Zod schema validation
   - Lodash for data manipulation

3. **Real-time Updates**
   - Configurable refresh intervals
   - Error handling with retries
   - Optimistic UI updates
