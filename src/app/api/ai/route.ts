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
          content: `You are analyzing the Protocol Labs Developer Guild (PLDG) engagement data.
        
        Context:
        - PLDG is a program designed to drive open source contributors into Filecoin ecosystems
        - We track engagement through weekly surveys and GitHub contributions
        - Tech partners include Fil-Oz, Libp2p, IPFS, and others
        
        Data:
        ${JSON.stringify(data, null, 2)}

        Please provide:
        1. Key Performance Indicators
        2. Risk Factors & Areas for Improvement
        3. Strategic Recommendations
        4. Success Stories & Notable Achievements

        Format the response in markdown.`,
        },
      ],
    });

    // Type guard to check if the content is text
    const textContent = response.content[0];
    if (!('text' in textContent)) {
      throw new Error('Unexpected response format from Claude');
    }

    return NextResponse.json({
      insights: textContent.text,
      success: true,
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insights',
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}
