export const RESUME_EXTRACTION_PROMPT = `Extract structured resume information from the supplied resume text.

Use only information explicitly present in the text. Do not guess, infer, or invent facts. Use null for missing text values and empty arrays for missing lists. Keep dates and wording faithful to the source. Put concise, source-based resume achievements or responsibilities in bullets.`;

export const JOB_EXTRACTION_PROMPT = `Extract structured job requirements from the supplied job description.

Use only information explicitly present in the description. Do not guess, infer, or invent facts. Use null for missing text values, null for yearsOfExperience if no required number of years is stated, and empty arrays for missing lists. Put only explicitly required skills in mustHaveSkills and preferred or optional skills in niceToHaveSkills.`;
