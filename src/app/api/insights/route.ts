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
      messages: [{
        role: 'user',
        content: `You are analyzing PLDG (Protocol Labs Developer Guild) engagement data.
        Please provide insights based on the following metrics:

        Engagement Trends:
        ${JSON.stringify(data.engagementMetrics.trends, null, 2)}

        Tech Partner Performance:
        ${JSON.stringify(data.techPartnerMetrics, null, 2)}

        Contributor Metrics:
        ${JSON.stringify(data.contributorMetrics, null, 2)}

        GitHub Activity:
        ${JSON.stringify(data.githubMetrics, null, 2)}

        Respond ONLY with a valid JSON object in exactly this shape, no markdown, no extra text:
        {
          "keyTrends": ["trend 1", "trend 2", "trend 3"],
          "areasOfConcern": ["concern 1", "concern 2"],
          "recommendations": ["recommendation 1", "recommendation 2"],
          "achievements": ["achievement 1", "achievement 2"]
        }`
      }]
    });

    const textContent = response.content[0];
    if (!('text' in textContent)) {
      throw new Error('Unexpected response format from Claude');
    }

    let insights;
    try {
      insights = JSON.parse(textContent.text);
    } catch {
      throw new Error('Claude returned non-JSON response for insights');
    }

    return NextResponse.json({ insights, success: true });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights', success: false },
      { status: 500 }
    );
  }
}