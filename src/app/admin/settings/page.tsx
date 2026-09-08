import { getSettings } from '@/lib/settings';
import { SettingsForm } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const values = await getSettings();
  return (
    <div>
      <h2 className="text-lg font-semibold">Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Stored in the database, so they survive a restart and can be changed without a deploy.
      </p>
      <div className="mt-6">
        <SettingsForm values={values} />
      </div>
    </div>
  );
}
