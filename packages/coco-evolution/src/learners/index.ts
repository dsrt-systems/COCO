export * from './base.js';
export * from './router-learner.js';
export * from './prompt-learner.js';
export * from './agent-learner.js';
export * from './model-registry-learner.js';
export * from './corpus-learner.js';
export * from './verification-learner.js';

import type { Learner } from './base.js';
import { RouterLearner } from './router-learner.js';
import { PromptLearner } from './prompt-learner.js';
import { AgentLearner } from './agent-learner.js';
import { ModelRegistryLearner } from './model-registry-learner.js';
import { CorpusLearner } from './corpus-learner.js';
import { VerificationLearner } from './verification-learner.js';

/** All production learners in analysis order */
export function createAllLearners(): Learner[] {
  return [
    new RouterLearner(),
    new PromptLearner(),
    new AgentLearner(),
    new ModelRegistryLearner(),
    new CorpusLearner(),
    new VerificationLearner(),
  ];
}
