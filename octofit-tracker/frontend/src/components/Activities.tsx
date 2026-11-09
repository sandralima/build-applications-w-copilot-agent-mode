import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

const loadActivities = () =>
  getJson<{ activities: unknown[] }>('/api/activities').then(({ activities }) => activities);

export default function Activities() {
  return <CapabilityCard title="Activities" description="Track student activity minutes and points." loadItems={loadActivities} emptyMessage="No activities yet." />;
}
