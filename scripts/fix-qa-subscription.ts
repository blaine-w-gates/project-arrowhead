import { supabaseAdmin } from '../server/auth/supabase';

async function main() {
  const teamName = 'QA Test Team';

  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id, name, subscription_status, trial_ends_at')
    .eq('name', teamName)
    .maybeSingle();

  if (teamError) {
    console.error('Error fetching team:', teamError.message || teamError);
    process.exit(1);
  }

  if (!team) {
    console.error('CRITICAL: QA Test Team not found. Re-seeding required.');
    process.exit(1);
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime());
  trialEnd.setFullYear(trialEnd.getFullYear() + 5);
  const trialEndsAt = trialEnd.toISOString();

  const { data: updatedTeams, error: updateError } = await supabaseAdmin
    .from('teams')
    .update({
      subscription_status: 'active',
      trial_ends_at: trialEndsAt,
    })
    .eq('id', (team as { id: string }).id)
    .select('id, name, subscription_status, trial_ends_at');

  if (updateError) {
    console.error('Error updating team:', updateError.message || updateError);
    process.exit(1);
  }

  if (!updatedTeams || updatedTeams.length === 0) {
    console.error(`No team rows updated for team_id ${(team as { id: string }).id}`);
    process.exit(1);
  }

  const updatedTeam = updatedTeams[0] as { subscription_status: string; trial_ends_at: string };
  console.log(
    `QA Test Team subscription renewed. Status=${updatedTeam.subscription_status}, trial_ends_at=${updatedTeam.trial_ends_at}.`
  );
}

main().catch((err) => {
  console.error('Unexpected error in fix-qa-subscription script:', err);
  process.exit(1);
});
