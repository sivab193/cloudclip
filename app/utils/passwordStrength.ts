import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { dictionary as commonDictionary, adjacencyGraphs } from '@zxcvbn-ts/language-common';
import { dictionary as englishDictionary, translations } from '@zxcvbn-ts/language-en';

const estimator = new ZxcvbnFactory({
  dictionary: { ...commonDictionary, ...englishDictionary },
  graphs: adjacencyGraphs,
  translations,
});

export function passwordAssessment(password: string, personalWords: string[] = []) {
  const result = password ? estimator.check(password, personalWords.filter(Boolean)) : null;
  const longEnough = password.length >= 12;
  return {
    score: result?.score ?? 0,
    acceptable: longEnough && (result?.score ?? 0) >= 2,
    hint: !longEnough ? 'Use at least 12 characters; a few unrelated words work well.'
      : result?.feedback.warning || result?.feedback.suggestions?.[0] || 'Long, unique passwords work best.',
  };
}
