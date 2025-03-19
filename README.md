# PLDG Dashboard V0

A real-time analytics dashboard for tracking developer engagement, technical progress, and contribution metrics across the PLDG (Protocol Labs Developer Guild) program.

<img width="1090" alt="Screenshot 2024-11-09 at 10 42 26 AM" src="https://github.com/user-attachments/assets/c2b41770-6fc4-4dd8-94c9-d9ace0ecc385">

## Features

- 📊 Real-time engagement metrics visualization
- 🤝 Tech partner collaboration tracking
- 📈 Technical progress monitoring
- 🏆 Top performer analytics
- 🤖 AI-powered insights generation
- 📑 Executive summary reporting
- 🔄 GitHub integration for issue tracking
- 👥 Multi-cohort support with data segmentation

## Cohort Data Structure

The dashboard now supports multiple cohorts with data segmentation:

### Cohort 1 (Fall 2024)
- Initial PLDG cohort
- Data located in `/public/data/cohort-1/`
- Historical baseline for program metrics

### Cohort 2 (Spring 2025)
- Current active cohort
- Data located in `/public/data/cohort-2/`
- Real-time engagement tracking

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Data Processing**: Lodash
- **Validation**: Zod
- **API Integration**:
  - Airtable API (Engagement Data)
  - GitHub GraphQL API (Issue Tracking)
  - Octokit REST API (Repository Data)

## Getting Started

Clone the repository

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

## Project Structure

```bash
src/
├── app/              # Next.js app router
├── components/       # React components
│   ├── dashboard/   # Dashboard-specific components
│   └── ui/         # Reusable UI components
├── lib/             # Utility functions
│   ├── utils.ts    # General utilities
│   ├── validation.ts # Data validation
│   └── ai.ts       # AI processing
├── types/           # TypeScript type definitions
└── public/          # Static assets
    └── data/       # CSV data files
```

## Data Flow

1. **Data Sources**:
   - Airtable: Weekly engagement surveys
   - GitHub: Issue tracking and project data
   - Cohort-specific CSV data files

2. **Processing Pipeline**:
   - Raw data fetching with cohort segmentation
   - Data validation (Zod schemas)
   - Cohort-specific metric calculations
   - Insight generation per cohort

3. **Real-time Updates**:
   - Automatic refresh intervals
   - On-demand data updates
   - Error handling and retry logic
   - Cohort-specific caching

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License

## Known Limitations

1. **Historical Data**:
   - No persistent storage of historical status changes
   - GitHub status counts reset on page refresh
   - Limited trend analysis capabilities
   - Week-over-week comparisons reset on refresh

2. **Real-time Constraints**:
   - Data freshness limited by API rate limits
   - Snapshot-based metrics without historical context
   - Limited ability to track long-term patterns

3. **Cohort-Specific Limitations**:
   - Limited historical data for trend analysis between cohorts
   - Manual data import required for new cohorts
   - No automated cohort transition handling

## Roadmap

### Phase 1 (Current - MVP)

- ✅ Real-time dashboard with key metrics
- ✅ Airtable and GitHub integration
- ✅ Basic trend visualization
- ✅ AI-powered insights

### Phase 2 (Planned)

1. **Historical Data Storage**
   - Implement database for metric persistence
   - Track status changes over time
   - Enable historical trend analysis
   - Add date-range filtering for all metrics

2. **Enhanced Analytics**
   - Long-term trend analysis
   - Predictive engagement metrics
   - Advanced collaboration patterns
   - Custom reporting periods

3. **Performance Optimization**
   - Implement data caching
   - Optimize API calls
   - Add pagination for large datasets
   - Improve load times

### Phase 3 (Future)

1. **Advanced Features**
   - Custom metric definitions
   - Automated reporting
   - Integration with more data sources
   - Advanced AI analysis
   - Export capabilities for all metrics

2. **User Experience**
   - Customizable dashboards
   - Role-based access control
   - Mobile optimization
   - Real-time notifications

### Phase 4 (Cohort Enhancement)

1. **Automated Cohort Management**
   - Automated data import for new cohorts
   - Cohort transition automation
   - Cross-cohort analytics
   - Cohort comparison tools

2. **Enhanced Cohort Features**
   - Cohort-specific dashboards
   - Customizable metrics per cohort
   - Cohort performance benchmarking
   - Automated cohort reports
