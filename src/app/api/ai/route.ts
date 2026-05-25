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
        content: `You are analyzing the Protocol Labs Developer Guild (PLDG) engagement data.

        Context:
        - PLDG is a program designed to drive open source contributors into Filecoin ecosystems
        - We track engagement through weekly surveys and GitHub contributions
        - Tech partners include Fil-Oz, Libp2p, IPFS, and others

        Data:
        ${JSON.stringify(data, null, 2)}

        Respond ONLY with a valid JSON object in exactly this shape, no markdown, no extra text:
        {
          "riskFactors": ["risk 1", "risk 2"],
          "strategicRecommendations": ["recommendation 1", "recommendation 2"],
          "successStories": ["story 1", "story 2"]
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
      throw new Error('Claude returned non-JSON response');
    }

    return NextResponse.json({ insights, success: true });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights', success: false },
      { status: 500 }
    );
  }
}