// pages/api/tabletop-scenario.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import TabletopScenario from '../../models/TabletopScenario';
import { Configuration, OpenAIApi } from 'openai-edge';

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
        const { generateScenario, businessProcesses, impactAnalysis, rtoRpo, maturityScores, teamStructure } = req.body;

        if (generateScenario) {
          const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are an advanced scenario generator focused on Business Continuity and Disaster Recovery (BC/DR). 
                Your task is to create a multi-phase tabletop exercise based on the following inputs:
                1. Business Processes: These are critical operations within the organization, each with dependencies (people, technology, suppliers, etc.) and ownership.
                2. Impact Analysis: This provides an evaluation of how various disruptions affect business processes, including financial impacts, productivity loss, and customer implications.
                3. RTO/RPO Analysis: Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) define the maximum acceptable downtime and data loss for each business process.
                4. Maturity Scores: A reflection of the organization’s preparedness and continuity planning.
                5. Team Structures and Roles: The responsible teams, their roles, and alternate personnel in case of unavailability.`
              },
              {
                role: 'user',
                content: `Generate a multi-phase business continuity tabletop exercise based on the following:
                - Business Processes: ${JSON.stringify(businessProcesses)}
                - Impact Analysis: ${JSON.stringify(impactAnalysis)}
                - RTO/RPO: ${JSON.stringify(rtoRpo)}
                - Maturity Scores: ${JSON.stringify(maturityScores)}
                - Team Structure: ${JSON.stringify(teamStructure)}
                
                Ensure the scenario is divided into phases, each with:
                1. Scenario Setup: Describe the incident and the challenges faced by the organization.
                2. Discussion Questions: Include questions to guide team discussions at each stage.
                3. Expected Actions: Recommend specific actions the team should take to respond to the scenario.
                4. Evaluation and Recommendations: Provide guidance on how well the organization is handling the phase and what could be improved.
                
                Include at least three phases in the scenario, covering incident detection, impact assessment, recovery planning, and long-term recovery. Also, ensure the scenario addresses both recovery timelines (RTO/RPO) and business impact.` 
              }
            ],
            temperature: 0.7,
            max_tokens: 5000
          });

          const responseData = await response.json();
          res.status(201).json({ success: true, data: responseData });
        } else {
          const scenario = new TabletopScenario({
            businessProcesses,
            impactAnalysis,
            rtoRpo,
            maturityScores,
            teamStructure,
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
