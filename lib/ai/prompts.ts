
export const RESUME_EXTRACTION_PROMPT = `Extract structured resume information from the supplied resume text.

Use only information explicitly present in the text. Do not guess, infer, or invent facts. Use null for missing text values and empty arrays for missing lists. Keep dates and wording faithful to the source. Put concise, source-based resume achievements or responsibilities in bullets. Only include projects that appear in a projects section of the resume. Never turn work experience into a project. If the resume has no projects section, return an empty projects array. For each project, fill in its name, a one-line description, the technologies mentioned for that project in techStack, and its bullets. The skills field must be a flat list of individual skills. Split category lines such as "Languages: Python, C++, JavaScript" into ["Python", "C++", "JavaScript"]. Never include category labels such as "Languages:", "Frontend:", or "Tools & Technologies:". Experience is only for jobs and internships at a company or organization. Personal, academic, or freelance projects belong in projects, not experience. Never invent a role, company, or date that is not in the text.`;

export const JOB_EXTRACTION_PROMPT = `Extract structured job requirements from the supplied job description.

Use only information explicitly present in the description. Do not guess, infer, or invent facts. Use null for missing text values, null for yearsOfExperience if no required number of years is stated, and empty arrays for missing lists. Put every specific required skill, technology, programming language, framework, database, tool, and concept mentioned in mustHaveSkills as separate items (for example React, Node.js, MongoDB, REST APIs, and Git). When the description presents alternatives such as "MongoDB or PostgreSQL" or "React/Vue", put only the first alternative in mustHaveSkills and put the others in niceToHaveSkills. Do not use vague items such as "AI" or "web development" when the description mentions more specific skills. Put preferred, optional, bonus, or nice-to-have items in niceToHaveSkills, also as individual skills. Each responsibility must be a short, complete phrase taken from the description, not a single word.`;

export const RESUME_SUGGESTIONS_PROMPT = `You are a resume coach writing directly to the candidate using "you" and "your". Give up to 5 specific suggestions to make your resume fit this job better.

NEVER tell the candidate to add a skill, certification, job, or years of experience they do not already have. For missing skills, suggest learning the skill or building a small project with it, clearly worded as something to do, not something to write on the resume.

Never invent numbers, percentages, metrics, or results, and never change numbers already in the resume. When suggesting that you add a metric, use a placeholder such as "[X%]" or "[number]" and tell the candidate to fill in their real figure. Never claim a technology was used in a project unless the resume says so for that specific project. Always refer to projects by their name, never by number.

Prefer suggestions that rewrite or highlight what is ALREADY in the resume: mention matched skills more clearly, move the most relevant project first, add numbers or results to existing bullets only when provided in the resume, and use the job's wording for skills the candidate has. Refer to real project names from the resume.

Only suggest rewording or reordering text that is already in the resume. Example bullets must use only technologies listed for that project.

Never mention JSON, fields, null, empty sections, or "the candidate". Return a suggestions array of objects with a short title and actionable detail.`;

export const BULLET_REWRITE_PROMPT = `Rewrite each resume project bullet to better match the job.

Keep the same meaning and facts. Use only technologies listed for that project. Never add numbers, results, or tools that are not in the original bullet. Use "[X%]" if a metric would help. Keep each bullet under 25 words. Start with a strong action verb. Give one short sentence for each reason.`;
