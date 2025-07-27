import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withMiddleware } from '@/lib/middleware';
import { Logger } from '@/lib/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const logger = Logger.getInstance();

async function handlePOST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  try {
    logger.info('AI insights request started', {
      requestId,
      operation: 'ai_insights_generation',
    });

    const data = await request.json();
    
    logger.info('AI request data received', {
      requestId,
      dataSize: JSON.stringify(data).length,
      hasData: !!data,
    });

    const aiStartTime = Date.now();
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

    const aiDuration = Date.now() - aiStartTime;

    logger.logAIOperation('insights_generation', 'claude-3-5-haiku-20241022', response.usage?.output_tokens, aiDuration, {
      requestId,
      inputTokens: response.usage?.input_tokens,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    });

    // Type guard to check if the content is text
    const textContent = response.content[0];
    if (!('text' in textContent)) {
      throw new Error('Unexpected response format from Claude');
    }

    const totalDuration = Date.now() - startTime;
    logger.info('AI insights generated successfully', {
      requestId,
      duration: totalDuration,
      aiDuration,
      responseLength: textContent.text.length,
    });

    return NextResponse.json({
      insights: textContent.text,
      success: true,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('AI insights generation failed', error as Error, {
      requestId,
      duration,
      operation: 'ai_insights_generation',
    });
    
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

export const POST = withMiddleware(handlePOST);
