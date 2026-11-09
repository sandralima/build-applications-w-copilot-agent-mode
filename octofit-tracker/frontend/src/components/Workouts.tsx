import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

const userEmail = 'mona@example.com';
const loadSuggestions = () =>
  getJson<{ suggestions: unknown[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
    .then(({ suggestions }) => suggestions);

export default function Workouts() {
  return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." loadItems={loadSuggestions} emptyMessage="No workout suggestions yet." />;
}
