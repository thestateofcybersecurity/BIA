/**
 * Move an organization between plans, and show what each has used.
 *
 * There is no billing yet, so this is the upgrade path: run it against the
 * production database when someone pays. Stripe can later write the same
 * column without anything else changing.
 *
 *   npx tsx scripts/set-plan.ts                      # list every org
 *   npx tsx scripts/set-plan.ts <org-id> team        # set a plan
 *
 * Requires DATABASE_URL in the environment (it is not in .env.local; pull it
 * from Vercel or paste it inline for the one command).
 */

import { neon } from '@neondatabase/serverless';
import { PLANS, monthStart, type Plan } from '../src/lib/domain/plans';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = neon(url);

async function list() {
  const since = monthStart().toISOString();
  const rows = (await sql`
    SELECT o.id, o.name, o.plan, o.primary_domain,
           COALESCE(SUM(u.input_tokens + u.output_tokens)
             FILTER (WHERE u.at >= ${since}), 0) AS tokens,
           COUNT(u.*) FILTER (WHERE u.feature = 'exercise') AS exercises
    FROM organizations o
    LEFT JOIN ai_usage u ON u.org_id = o.id
    GROUP BY o.id, o.name, o.plan, o.primary_domain
    ORDER BY o.name
  `) as {
    id: string;
    name: string;
    plan: string;
    primary_domain: string | null;
    tokens: string;
    exercises: string;
  }[];

  if (rows.length === 0) {
    console.log('No organizations.');
    return;
  }
  console.log(
    ['ORG ID', 'PLAN', 'TOKENS (MONTH)', 'AI TTX', 'DOMAIN', 'NAME'].join('  ')
  );
  for (const r of rows) {
    const limits = PLANS[(r.plan as Plan) in PLANS ? (r.plan as Plan) : 'free'];
    const tokens = `${Number(r.tokens).toLocaleString()}${
      limits.monthlyTokens == null ? '' : ` / ${limits.monthlyTokens.toLocaleString()}`
    }`;
    const ttx = `${r.exercises}${
      limits.aiExercisesTotal == null ? '' : ` / ${limits.aiExercisesTotal}`
    }`;
    console.log(
      [
        r.id.padEnd(14),
        r.plan.padEnd(9),
        tokens.padEnd(18),
        ttx.padEnd(7),
        (r.primary_domain ?? '-').padEnd(28),
        r.name,
      ].join('  ')
    );
  }
}

async function setPlan(orgId: string, plan: string) {
  if (!(plan in PLANS)) {
    console.error(`Unknown plan "${plan}". Valid: ${Object.keys(PLANS).join(', ')}`);
    process.exit(1);
  }
  const updated = (await sql`
    UPDATE organizations SET plan = ${plan} WHERE id = ${orgId}
    RETURNING id, name, plan
  `) as { id: string; name: string; plan: string }[];
  if (updated.length === 0) {
    console.error(`No organization with id "${orgId}".`);
    process.exit(1);
  }
  console.log(`${updated[0].name} (${updated[0].id}) is now on the ${updated[0].plan} plan.`);
}

async function main() {
  const [orgId, plan] = process.argv.slice(2);
  if (!orgId) await list();
  else if (!plan) {
    console.error('Usage: npx tsx scripts/set-plan.ts <org-id> <plan>');
    process.exit(1);
  } else await setPlan(orgId, plan);
}

main();
