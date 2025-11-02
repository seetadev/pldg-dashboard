# PLDG Dashboard (Protocol Labs Dev Guild Dashboard)

A real-time analytics dashboard for tracking developer engagement, technical progress, and contribution metrics across the PLDG (Protocol Labs Developer Guild) program — now enhanced with **Py-libp2p**, **Storacha MCP**, **ElizaOS Plugin**, and **Builder Insights** integration.

## Features

* 📊 Real-time engagement metrics visualization
* 🤝 Tech partner collaboration tracking and communication using Py-libp2p, universal connectivity dapp
* 📈 Technical progress monitoring
* 🏆 Top performer analytics
* 🤖 AI-powered insights generation (via ElizaOS Plugin)
* 📑 Executive summary reporting
* 🔄 GitHub integration for issue tracking
* 🧠 Builder-centric insights from on-chain activity + off-chain dev logs
* 🗃️ Storacha MCP integration for decentralized, persistent storage
* 🔌 ElizaOS plugin compatibility for agent-queriable dashboards

---

## Tech Stack

* **Framework**: Next.js 14 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS + shadcn/ui
* **Charts**: Recharts
* **Data Processing**: Lodash
* **Validation**: Zod
* **AI/Agents**:

  * ElizaOS Plugin API (Agent integration layer)
  * Custom LLM summarization via OpenAI or Ollama
* **API Integration**:

  * Airtable API (Engagement Data)
  * GitHub GraphQL API (Issue Tracking)
  * Octokit REST API (Repository Data)
  * Storacha MCP (Storage & Agent Queries)

---

## Getting Started

Clone the repository:

```bash
git clone https://github.com/protocollabs/pldg-dashboard
cd pldg-dashboard
```

Install dependencies:

```bash
npm install
```

Set up environment variables:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

---

## Project Structure

```bash
src/
├── app/                  # Next.js app router
├── components/           # React components
│   ├── dashboard/        # Dashboard-specific components
│   └── ui/               # Reusable UI components
├── lib/                  
│   ├── utils.ts          # General utilities
│   ├── validation.ts     # Zod schemas
│   ├── ai.ts             # AI and summarization logic
│   ├── builder.ts        # Builder insights logic
│   ├── storacha.ts       # Storacha MCP integration helpers
│   └── eliza.ts          # ElizaOS Plugin interface
├── types/                # TypeScript type definitions
└── public/               
    └── data/             # Static assets or CSV mock data
```

---

## Data Flow

1. **Data Sources**:

   * Airtable: Weekly engagement surveys
   * GitHub: Issues and commits
   * Storacha MCP: Immutable storage for snapshots, metrics, and reports
   * ElizaOS Plugin: Agent interaction layer for querying dashboard data
   * Internal builder APIs: On-chain + GitHub-linked activity metadata

2. **Processing Pipeline**:

   * Data fetching and schema validation (Zod)
   * Metrics calculation and role-weighted insights
   * LLM-based summarization for weekly updates
   * Builder profile generation from commit patterns and repo metadata

3. **Real-time Updates**:

   * Refresh intervals per section
   * Retry logic and fallbacks for rate-limited APIs
   * Eliza agent hooks for dashboard-level queries

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

Want to build a custom integration with ElizaOS or another MCP-backed tool? Join the `#pldg-devs` Slack channel or open an issue in GitHub.

---

## License

MIT License

---

## Known Limitations

1. **Historical Data**:

   * Reliant on Storacha MCP for persistence; snapshots must be versioned manually
   * GitHub API resets state on refresh if not backed up to Storacha

2. **AI Insights**:

   * Summary quality depends on input density
   * ElizaOS agents require tuned prompts for meaningful interaction

3. **Real-time Constraints**:

   * Airtable and GitHub APIs still rate-limited
   * Builders with anonymous commit histories have reduced insight fidelity

---

## Roadmap

### ✅ Phase 1 (MVP Complete)

* Real-time dashboard
* GitHub + Airtable integration
* Core analytics
* Basic AI summarization
* Storacha test storage integration

### 🚧 Phase 2 (In Progress)

* Builder Insights engine (with on-chain + GitHub-linked activity)
* Persistent snapshots via Storacha MCP
* Agent querying via ElizaOS Plugin
* Weekly digest reports in Markdown + agent-readable formats

### 🚀 Phase 3 (Planned)

* Custom insight generation per builder team
* Token-gated dashboards (for bounties or access-restricted data)
* Feedback loops between agents and human reviewers
* Integration with decentralized compute (e.g., Bacalhau or Lilypad)


