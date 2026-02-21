// LLM utility for policy chat and quiz generation using Lovable AI (Gemini Flash)

interface MessageContent {
role: 'user' | 'assistant';
content: string;
}

export async function generatePolicyResponse(
question: string,
policyContext: string
): Promise<string> {
try {
const response = await fetch('https://api.a0.dev/ai/llm', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
messages: [
{
role: 'user',
content: `You are a corporate compliance assistant. Answer this question using ONLY the provided company policy context. If the answer is not in the policy, say you don't have that information.

Policy Context:
${policyContext}

Question: ${question}`,
},
],
}),
});

const data = await response.json();
return data.completion || 'Unable to generate response';
} catch (error) {
console.error('LLM Error:', error);
return 'Error generating response';
}
}

export async function generateQuizQuestions(
policyContent: string,
count: number = 5
): Promise<Array<{
question: string;
options: string[];
correctAnswer: number;
explanation: string;
}>> {
try {
const response = await fetch('https://api.a0.dev/ai/llm', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
messages: [
{
role: 'user',
content: `Generate exactly ${count} multiple-choice questions from this policy. Format as JSON array with fields: question, options (array of 4), correctAnswer (index 0-3), explanation.

Policy:
${policyContent}

Return only valid JSON.`,
},
],
schema: {
type: 'array',
items: {
type: 'object',
properties: {
question: { type: 'string' },
options: { type: 'array', items: { type: 'string' } },
correctAnswer: { type: 'number' },
explanation: { type: 'string' },
},
},
},
}),
});

const data = await response.json();
return data.schema_data || [];
} catch (error) {
console.error('Quiz Generation Error:', error);
return [];
}
}

export async function analyzeComplianceGaps(
employeeScores: Record<string, number>,
policies: string[]
): Promise<string[]> {
// Identify weak areas for targeted training
const gaps: string[] = [];

for (const [policy, score] of Object.entries(employeeScores)) {
if (score < 75) {
gaps.push(policy);
}
}

return gaps;
}
