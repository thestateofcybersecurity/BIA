// pages/api/tabletop-scenario.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import TabletopScenario from '../../models/TabletopScenario';
import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export const config = {
  runtime: 'edge',
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        const scenarios = await TabletopScenario.find({ userId: session.user.sub });
        res.status(200).json({ success: true, data: scenarios });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case 'POST':
      try {
        const { generateScenario, ...scenarioData } = req.body;

        if (generateScenario) {
          const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a business continuity expert. Generate a tabletop scenario based on the following inputs.'
              },
              {
                role: 'user',
                content: `Generate a tabletop scenario with the following details: ${JSON.stringify(scenarioData)}`
              }
            ],
            temperature: 0.7,
            max_tokens: 500,
            stream: true,
          });

          const stream = OpenAIStream(response);
          return new StreamingTextResponse(stream);
        } else {
          const scenario = new TabletopScenario({
            ...scenarioData,
            userId: session.user.sub
          });
          await scenario.save();
          res.status(201).json({ success: true, data: scenario });
        }
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, error: 'Method not allowed' });
      break;
  }
}
