"use client";

import { useEffect, useState } from "react";

const SKILLS: { skill: string; matched: boolean }[] = [
  { skill: "React", matched: true },
  { skill: "TypeScript", matched: true },
  { skill: "Docker", matched: false },
  { skill: "REST APIs", matched: true },
  { skill: "Node.js", matched: true },
  { skill: "AWS", matched: false },
  { skill: "Git", matched: true },
];

const STEP_MS = 1500;
const PAUSE_STEPS = 3;

/** A looping, decorative example of ResuFit sorting a job's skills against a resume. */
export function MatchDemo() {
  // step = number of skills already sorted; extra steps at the end hold the finished state.
  const [step, setStep] = useState(SKILLS.length);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = window.setTimeout(() => setStep(0), 0);
    const interval = window.setInterval(
      () => setStep((current) => (current >= SKILLS.length + PAUSE_STEPS ? 0 : current + 1)),
      STEP_MS,
    );
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, []);

  const sorted = SKILLS.slice(0, Math.min(step, SKILLS.length));
  const incoming = SKILLS[step];
  const matched = sorted.filter((entry) => entry.matched);
  const toLearn = sorted.filter((entry) => !entry.matched);
  const score = sorted.length ? Math.round((matched.length / sorted.length) * 100) : 0;

  return (
    <div className="w-full max-w-xl rounded-3xl bg-white/90 p-6 shadow-2xl shadow-indigo-200/60 ring-1 ring-stone-200 backdrop-blur">
      <p className="sr-only">
        Example: ResuFit checks each skill a job asks for against your resume and sorts it into
        matched skills or skills to learn.
      </p>
      <div aria-hidden="true">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-green-700">
            <span className="size-2 rounded-full bg-green-500 motion-safe:animate-pulse" />
            Match — live
          </span>
          <span className="truncate text-stone-600">Frontend Developer Intern</span>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-stone-500">
          From the job description
        </p>
        <div className="mt-2 min-h-18 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
          {incoming ? (
            <div key={incoming.skill} className="flex items-center gap-3 motion-safe:animate-rise">
              <span className="size-2.5 rounded-full bg-indigo-500" />
              <div>
                <p className="font-semibold text-stone-900">{incoming.skill}</p>
                <p className="text-xs text-stone-600">Checking your resume…</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="size-2.5 rounded-full bg-green-500" />
              <div>
                <p className="font-semibold text-stone-900">All skills checked</p>
                <p className="text-xs text-stone-600">{score}% match · nothing invented</p>
              </div>
            </div>
          )}
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-stone-200" />
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700 ring-1 ring-indigo-200">
            Honest match ↓
          </span>
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["Matched", matched, "bg-green-500", "bg-green-50 text-green-800 ring-green-200"],
              ["To learn", toLearn, "bg-amber-500", "bg-amber-50 text-amber-900 ring-amber-200"],
            ] as const
          ).map(([title, list, dot, chip]) => (
            <div key={title}>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${dot}`} />
                  {title}
                </span>
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-stone-800">{list.length}</span>
              </div>
              <ul className="mt-3 flex min-h-20 flex-wrap content-start gap-1.5">
                {list.map((entry) => (
                  <li
                    key={entry.skill}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 motion-safe:animate-rise ${chip}`}
                  >
                    {entry.skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs font-medium text-stone-600">
            <span>Overall match</span>
            <span className="text-stone-900">{score}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 transition-[width] duration-700"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
