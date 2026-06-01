const weights = {
  industries: 25,
  skillsTopics: 25,
  languages: 15,
  availability: 15,
  style: 10,
  personalityGoals: 10
};

function overlap(a = [], b = []) {
  const set = new Set(a.map((item) => item.toLowerCase()));
  return b.filter((item) => set.has(item.toLowerCase()));
}

function ratio(a = [], b = []) {
  const longest = Math.max(a.length, b.length, 1);
  return overlap(a, b).length / longest;
}

export function calculateCompatibility(learnerProfile, mentorProfile) {
  const industryMatches = overlap(learnerProfile.industries, mentorProfile.industries);
  const skillTopicMatches = overlap(
    [...(learnerProfile.skills || []), ...(learnerProfile.topics || [])],
    [...(mentorProfile.skills || []), ...(mentorProfile.topics || [])]
  );
  const languageMatches = overlap(learnerProfile.languages, mentorProfile.languages);
  const availabilityMatches = overlap(learnerProfile.availability, mentorProfile.availability);
  const styleMatch = learnerProfile.mentorshipStyle === mentorProfile.mentorshipStyle ? 1 : 0;
  const personalityGoalScore = ratio(
    [...(learnerProfile.personality || []), ...(learnerProfile.goals || [])],
    [...(mentorProfile.personality || []), ...(mentorProfile.goals || [])]
  );

  const score = Math.round(
    ratio(learnerProfile.industries, mentorProfile.industries) * weights.industries +
    ratio([...(learnerProfile.skills || []), ...(learnerProfile.topics || [])], [...(mentorProfile.skills || []), ...(mentorProfile.topics || [])]) * weights.skillsTopics +
    ratio(learnerProfile.languages, mentorProfile.languages) * weights.languages +
    ratio(learnerProfile.availability, mentorProfile.availability) * weights.availability +
    styleMatch * weights.style +
    personalityGoalScore * weights.personalityGoals
  );

  const reasons = [
    ...industryMatches.slice(0, 2),
    ...languageMatches.slice(0, 1),
    ...availabilityMatches.slice(0, 1),
    ...skillTopicMatches.slice(0, 2)
  ];
  const explanation = reasons.length
    ? `${score}% match because both selected ${reasons.join(', ')}.`
    : `${score}% match based on complementary goals and mentorship preferences.`;

  return { score: Math.min(100, Math.max(0, score)), explanation };
}
