import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Generating insights...');

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Anthropic API key not found. Ensure ANTHROPIC_API_KEY is set in environment variables.');
      return NextResponse.json({
        error: 'Anthropic API key not found',
        details: 'Ensure ANTHROPIC_API_KEY is set in environment variables.'
      }, { status: 500 });
    }

    const data = await request.json();
    console.log('Request data:', data);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are analyzing PLDG (Protocol Labs Developer Guild) engagement data. 
        Please provide insights and recommendations based on the following metrics:

        Engagement Trends:
        ${JSON.stringify(data.engagementTrends, null, 2)}

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
        
        Format the response in markdown.`
      }]
    });
    console.log('Anthropic API Response:', response);

    // Type guard to check if the content is text
    if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
      console.error('Unexpected response format from Anthropic:', response);
      return NextResponse.json({
        error: 'Unexpected response format from Anthropic',
        details: 'The response from Anthropic did not match the expected format.'
      }, { status: 500 });
    }
    // Ensure that the content is a string before passing it to the UI
    const verifyInsights = response.content[0]?.type === 'text' ? response.content : "No insights available.";

    return NextResponse.json({
      insights: verifyInsights,
      success: true
    });
  } catch (error: any) {
    console.error('Error generating insights:', error.message, {
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ error: 'Failed to generate insights', details: error.message, success: false }, { status: 500 });
  }
} 