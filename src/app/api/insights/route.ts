import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are analyzing PLDG (Protocol Labs Developer Guild) engagement data. 
        Please provide insights and recommendations based on the following metrics:

        Engagement Trends:
        ${JSON.stringify(data.engagementMetrics.trends, null, 2)}

        Tech Partner Performance:
        ${JSON.stringify(data.techPartnerMetrics, null, 2)}

        Contributor Metrics:
        ${JSON.stringify(data.contributorMetrics, null, 2)}

        GitHub Activity:
        ${JSON.stringify(data.githubMetrics, null, 2)}

        Please structure your analysis into these sections:
        1. Key Trends
        2. Areas of Concern
        3. Specific Recommendations
        4. Notable Achievements
        
        Format the response in markdown.`,
        },
      ],
    });

    return NextResponse.json({
      insights: response.content,
      success: true,
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights', success: false },
      { status: 500 }
    );
  }
}
