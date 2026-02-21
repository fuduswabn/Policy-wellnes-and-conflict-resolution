// API Configuration
// These keys are for payment processing and AI services

export const API_KEYS = {
  // Payment/Service Keys
  wc_key: 'wc_sk_live_7Kx9mP2nQrT5vW8yB3cF6hJ4',
  cr_key: 'cr_sk_live_4Lm8nR2pS6tV9wX3yA5bD7eG',
  
  // a0 AI API
  ai_api_url: 'https://api.a0.dev/ai/llm',
};

// AI Content Safety - Topics that require professional help
export const RESTRICTED_TOPICS = {
  suicide: ['suicide', 'kill myself', 'end my life', 'want to die', 'self-harm', 'hurt myself'],
  violence: ['kill', 'murder', 'attack', 'violence', 'harm someone'],
  crime: ['illegal', 'crime', 'steal', 'fraud', 'break the law'],
  inappropriate: ['nude', 'nudity', 'porn', 'sex', 'explicit', 'adult content'],
};

// Check if content contains restricted topics
export function detectRestrictedTopic(text: string): {
  isRestricted: boolean;
  topic: string | null;
  severity: 'critical' | 'high' | 'none';
} {
  const lowerText = text.toLowerCase();
  
  // Check suicide/self-harm (CRITICAL)
  for (const term of RESTRICTED_TOPICS.suicide) {
    if (lowerText.includes(term)) {
      return { isRestricted: true, topic: 'suicide', severity: 'critical' };
    }
  }
  
  // Check violence (CRITICAL)
  for (const term of RESTRICTED_TOPICS.violence) {
    if (lowerText.includes(term)) {
      return { isRestricted: true, topic: 'violence', severity: 'critical' };
    }
  }
  
  // Check inappropriate content (HIGH)
  for (const term of RESTRICTED_TOPICS.inappropriate) {
    if (lowerText.includes(term)) {
      return { isRestricted: true, topic: 'inappropriate', severity: 'high' };
    }
  }
  
  // Check crime (HIGH)
  for (const term of RESTRICTED_TOPICS.crime) {
    if (lowerText.includes(term)) {
      return { isRestricted: true, topic: 'crime', severity: 'high' };
    }
  }
  
  return { isRestricted: false, topic: null, severity: 'none' };
}

// Feature flags based on subscription
export const FEATURES = {
  wellness_chat: ['pro', 'enterprise'],
  conflict_resolution: ['pro', 'enterprise'],
  ai_moderation: ['starter', 'pro', 'enterprise'],
  analytics: ['pro', 'enterprise'],
  api_access: ['enterprise'],
  priority_support: ['pro', 'enterprise'],
};

export function hasFeature(userPlan: string, feature: keyof typeof FEATURES): boolean {
  const plans = FEATURES[feature];
  return plans?.includes(userPlan.toLowerCase()) || false;
}

// AI System Prompts with Safety Guardrails
export const AI_PROMPTS = {
  wellness: `You are a compassionate wellness and mental health support assistant. 

CRITICAL SAFETY RULES - YOU MUST FOLLOW THESE:
1. If someone mentions suicide, self-harm, or wanting to die: IMMEDIATELY tell them to contact emergency services (911/112) or a crisis helpline
2. DO NOT provide advice on: suicide, self-harm, violence, crime, illegal activities, nudity, or explicit content
3. ALWAYS recommend professional help for serious issues
4. You are NOT a replacement for professional therapy or counseling

Provide empathetic, supportive responses. Help employees manage stress, anxiety, work-life balance, and emotional wellbeing. Always be kind, non-judgmental, and encouraging. If someone is in crisis, recommend professional help immediately. Keep responses concise and supportive.`,

  conflict: `You are an expert workplace conflict resolution mediator.

CRITICAL SAFETY RULES - YOU MUST FOLLOW THESE:
1. If violence, threats, or illegal activity is mentioned: IMMEDIATELY tell them to contact HR, security, or law enforcement
2. DO NOT provide advice on: violence, crime, illegal activities, harassment, nudity, or explicit content
3. For serious harassment or discrimination: ALWAYS recommend reporting to HR and legal counsel
4. You are NOT a replacement for legal advice or HR intervention

Help employees navigate difficult workplace situations, interpersonal conflicts, communication issues, and professional disagreements. Provide balanced, diplomatic advice that considers multiple perspectives. Encourage constructive dialogue, active listening, and professional behavior. Suggest practical steps for resolution. Be empathetic but maintain professionalism.`,
};