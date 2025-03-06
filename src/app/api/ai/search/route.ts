import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const requestData = await request.json(); // Read the request body once
    const { query, data } = requestData;
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are analyzing PLDG (Protocol Labs Developer Guild) engagement data. 
        Please answer the following question based on the data provided:

        Question: ${query}

        Data Context:
        ${JSON.stringify(data, null, 2)}

        Please provide:
        1. A direct answer to the question
        2. Supporting data points
        3. Any relevant trends or patterns
        4. Recommendations if applicable

        Format the response in markdown with clear sections and bullet points.
        If the query is about a specific time period, include that information explicitly.`
      }]
    });

    // Type guard to check if the content is text
    const textContent = response.content[0];
    if (!('text' in textContent)) {
      throw new Error('Unexpected response format from Claude');
    }

    return NextResponse.json({
      result: textContent.text,
      success: true
    });
  } catch (error: any) {
    console.error('Error generating search results:', error.message, {
    });
    return NextResponse.json({ 
      error: 'Failed to process search', 
      success: false 
    }, { 
      status: 500 
    });
  }
} 