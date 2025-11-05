````markdown
# PLDG Dashboard (Protocol Labs Dev Guild Dashboard)

A real-time analytics dashboard for tracking developer engagement, technical progress, and contribution metrics across the **Protocol Labs Developer Guild (PLDG)** program — now enhanced with **Py-libp2p**, **Storacha MCP**, **ElizaOS Plugin**, and **Builder Insights** integration.

🌐 **Deployment Link:** [https://pldg-dashboard-theta.vercel.app/](https://pldg-dashboard-theta.vercel.app/)

---

## 🌍 Overview

The **PLDG Dashboard** provides transparent, data-driven insights into the health and growth of the **Filecoin**, **Libp2p**, and broader **Protocol Labs Network (PLN)** ecosystems.  
It aggregates data from GitHub, Airtable, on-chain sources, and decentralized storage — offering real-time visualization of developer activity, engagement, and contribution trends.

Developed by **C4GT (Code for GovTech)** contributors, this voluntary open-source initiative fosters collaborative learning, transparency, and coordination across the Filecoin and Protocol Labs communities.

---

## ✨ Features

* 📊 **Real-time engagement metrics visualization**
* 🤝 **Collaboration tracking** via Py-libp2p (universal connectivity dapp)
* 📈 **Technical progress monitoring** and milestone analytics
* 🏆 **Top performer and team analytics**
* 🤖 **AI-powered insights** with ElizaOS Plugin (LLM summarization + agent queries)
* 📑 **Executive summary reports** in Markdown & agent-readable formats
* 🔄 **GitHub integration** for issue, PR, and commit analytics
* 🧠 **Builder Insights Engine** combining on-chain + off-chain developer data
* 🗃️ **Storacha MCP integration** for decentralized storage & persistence
* 🔌 **ElizaOS plugin compatibility** for agent-level dashboard querying

---

## 🧰 Tech Stack

* **Framework:** Next.js 14 (App Router)  
* **Language:** TypeScript  
* **Styling:** Tailwind CSS + shadcn/ui  
* **Charts:** Recharts  
* **Data Processing:** Lodash  
* **Validation:** Zod  
* **AI / Agents:**
  * ElizaOS Plugin API (Agent Integration Layer)
  * Custom LLM Summarization via OpenAI / Ollama
* **API Integration:**
  * Airtable API — Engagement Data
  * GitHub GraphQL + Octokit REST — Repository Insights
  * Storacha MCP — Decentralized Storage
  * Py-libp2p — Peer-based telemetry & messaging layer

---

## ⚙️ Getting Started

Clone the repository:

```bash
git clone https://github.com/protocollabs/pldg-dashboard
cd pldg-dashboard
````

Install dependencies:

```bash
npm install
```

Set up environment variables:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 📂 Project Structure

```bash
src/
├── app/                  # Next.js App Router
├── components/           # UI and dashboard components
│   ├── dashboard/        # Dashboard-specific components
│   └── ui/               # Reusable UI elements
├── lib/
│   ├── utils.ts          # Utilities
│   ├── validation.ts     # Zod schemas
│   ├── ai.ts             # AI summarization logic
│   ├── builder.ts        # Builder Insights logic
│   ├── storacha.ts       # Storacha MCP integration
│   └── eliza.ts          # ElizaOS Plugin interface
├── types/                # TypeScript type definitions
└── public/
    └── data/             # Static assets or CSV mock data
```

---

## 🔄 Data Flow

### 1. **Data Sources**

* **Airtable**: Weekly engagement survey results
* **GitHub**: Issues, PRs, and commits
* **Storacha MCP**: Immutable snapshot storage for reports and metrics
* **ElizaOS Plugin**: Agent query and insight layer
* **Internal APIs**: Builder profiles + on-chain metadata

### 2. **Processing Pipeline**

* Schema validation using **Zod**
* Weighted metrics and engagement scoring
* LLM-based summarization for weekly updates
* Builder profile generation from activity patterns

### 3. **Real-Time Updates**

* Refresh intervals for metrics
* Retry logic for rate-limited APIs
* ElizaOS agent hooks for dashboard queries

---

## 🤝 Contributing

1. Fork this repository
2. Create a new feature branch
3. Submit a pull request

Interested in integrating your tool or MCP-backed service (e.g., ElizaOS, Storacha, or Py-libp2p)?
Join the **`#pldg-devs`** channel on Slack or open an issue in GitHub.

---

## 🪪 License

**MIT License**

---

## ⚠️ Known Limitations

1. **Historical Data**

   * Relies on Storacha MCP for persistence; versioning is manual
   * GitHub API resets metrics on refresh without Storacha backup

2. **AI Insights**

   * Summarization quality depends on data density
   * ElizaOS agents require tuned prompts for optimal responses

3. **Real-Time Constraints**

   * Airtable and GitHub APIs are rate-limited
   * Anonymous commits yield limited insight fidelity

---

## 🗺️ Roadmap

### ✅ Phase 1 (MVP Complete)

* Real-time dashboard
* GitHub + Airtable integration
* Core analytics & AI summarization
* Storacha test integration

### 🚧 Phase 2 (In Progress)

* Builder Insights Engine (on-chain + GitHub-linked)
* Persistent Storacha MCP snapshots
* ElizaOS Plugin for agent-based querying
* Weekly digest report generation

### 🚀 Phase 3 (Planned)

* Per-team custom insights
* Token-gated dashboards (bounty and contributor access)
* AI-human feedback loops
* Integration with decentralized compute (Bacalhau, Lilypad)

---

## 🌐 Ecosystem Context

The **PLDG Dashboard** is a **Developer Tooling / Ecosystem Infrastructure** project under
**Filecoin RetroPGF for Builders: Supporting Open Source Coordination Through PLDG**.

It contributes to improving **transparency**, **impact measurement**, and **talent recognition** across the **Protocol Labs Network** — spanning **Filecoin**, **IPFS**, **Libp2p**, **Fil-Oz**, **Fil-B**, and **Storacha** communities.

---

## 📎 Reference Links & Resources

* 🧾 [**Filecoin RetroPGF Application**](https://github.com/filecoin-project/community/discussions/744#discussioncomment-14603907)
* 💻 [**PLDG Dashboard Live**](https://pldg-dashboard-theta.vercel.app/)
* 💾 [**PLDG Dashboard GitHub Repository**](https://github.com/protocollabs/pldg-dashboard)
* 🌐 [**PLDG Dashboard (v2) Cohort-2 & 1 Website**](https://pldg-dashboard-theta.vercel.app/)
* 🎥 [**Screencast: Saving PLDG Cohort Data to Filecoin & Storacha**](#)
* 🌍 [**PLDG Dashboard (v1) Website**](#)
* 📦 [**IPFS Storage Link of Cohort Data**](#)
* 🧱 [**FIL RetroPGF for Builders: Supporting Open Source Coordination Through PLDG**](#)
* 💬 [**Collaborate and meet us on Discord**](#)
* 🗓️ **Community Participation at PL EngRes “The Gathering”**

  * August 2025 · May 2025 · April 2025 · February 2025 · December 2024
* 🧵 [**X (Twitter) Thread — PLDG Dashboard × Filecoin × Storacha × IPFS Progress**](https://x.com/UserApps/status/1975217388754002221)

---

## 🌟 Impact Summary

Since **November 2024**, the PLDG Dashboard has:

* Enhanced visibility and engagement across the **Filecoin developer ecosystem**
* Combined on-chain, GitHub, and AI-summarized metrics for ecosystem health
* Empowered contributors with transparent self-reflection and progress tracking
* Provided actionable insights for ecosystem stewards and program leads

Over time, it aims to serve as the **open-source intelligence layer** for developer coordination and recognition across the **Protocol Labs Network**.

---

> *“Building the open-source intelligence layer for the Protocol Labs Network — by builders, for builders.”* 💡


