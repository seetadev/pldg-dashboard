import { EngagementData } from "@/types/dashboard";

export default function normalizeEngagementData(record: Record<string, any>): EngagementData {
    const normalized: EngagementData = {
      Name: record['Name'] || record['﻿Name'] || '',
      'Github Username': record['Github Username'] || '',
      'Program Week': record['Program Week'] || '',
      'Engagement Tracking': record['Engagement Tracking'] || '',
      'Engagement Participation ': record['Engagement Participation '] || record['Engagement Participation'] || '',
      'Which session(s) did you find most informative or impactful, and why?':
        record['Which session(s) did you find most informative or impactful, and why?'] || '',
      'Tech Partner Collaboration?': record['Tech Partner Collaboration?'] || '',
      'Which Tech Partner': record['Which Tech Partner'] || '',
      'Describe your work with the tech partner': record['Describe your work with the tech partner'] || '',
      'Did you work on an issue, PR, or project this week?': record['Did you work on an issue, PR, or project this week?'] || '',
      'How many issues, PRs, or projects this week?': record['How many issues, PRs, or projects this week?'] || '',
      'Issue Title 1': record['Issue Title 1'] || '',
      'Issue Link 1': record['Issue Link 1'] || '',
      'Issue Description 1': record['Issue Description 1'] || '',
      'Issue Title 2': record['Issue Title 2'] || '',
      'Issue Link 2': record['Issue Link 2'] || '',
      'Issue Description 2': record['Issue Description 2'] || '',
      'Issue Title 3': record['Issue Title 3'] || '',
      'Issue Link 3': record['Issue Link 3'] || '',
      'Issue Description 3': record['Issue Description 3'] || '',
      'Issue 4+': record['Issue 4+'] || '',
      'How likely are you to recommend the PLDG to others?': record['How likely are you to recommend the PLDG to others?'] || '',
      'PLDG Feedback': record['PLDG Feedback'] || '',
      'Email Address': record['Email Address'] || '',
    };
  
    // Clean all keys/values
    for (const key in normalized) {
      const value = normalized[key];
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      }
    }
  
    return normalized;
  }