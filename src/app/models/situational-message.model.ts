/**
 * Situational message level for the task detail hero section.
 * Derived from last action (done | lapsed | skipped) and achievement rate (last 10 resolved cycles).
 */
export type SituationalMessageLevel =
  | 'not_started'
  | 'first_completion'
  | 'strong_streak'
  | 'good_progress'
  | 'steady'
  | 'recent_miss'
  | 'recovery_after_miss'
  | 'skipped_recent'
  | 'mixed'
  | 'low_achievement';

/** Display message per level. Tone: encouraging, non-shaming (Atomic Habits aligned). */
export const SITUATIONAL_MESSAGES: Record<SituationalMessageLevel, string> = {
  not_started: "It's never too late — you can start today.",
  first_completion: "Great start! One step at a time.",
  strong_streak: "You're on a roll. Keep it up!",
  good_progress: "Doing great. Consistency builds habits.",
  steady: "You're showing up. That's what counts.",
  recent_miss: "No judgment. The next one is your chance.",
  recovery_after_miss: "Welcome back. Ready when you are.",
  skipped_recent: "You chose to skip — that's okay. Next occurrence is ahead.",
  mixed: "Some ups, some skips. Focus on the next one.",
  low_achievement: "Small steps count. What's one thing you can do today?",
};
