import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type ApiItem = Record<string, unknown>;
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: ApiItem[] };
type Props = {
  title: string;
  description: string;
  endpoint: string;
  responseKey: string;
  emptyMessage: string;
};

function isApiItem(value: unknown): value is ApiItem {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null) return 'None';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value) ?? '';
}

export function CapabilityCard({ title, description, endpoint, responseKey, emptyMessage }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    getJson<Record<string, unknown>>(endpoint)
      .then((response) => {
        const values = response[responseKey];
        if (!Array.isArray(values)) {
          throw new Error(`Invalid ${title.toLowerCase()} response`);
        }
        const items = values.map((value) => {
          if (!isApiItem(value)) throw new Error(`Invalid ${title.toLowerCase()} response`);
          return value;
        });
        if (!cancelled) setState({ status: 'success', items });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, responseKey, title]);

  return <section className="card h-100" aria-busy={state.status === 'loading'}>
    <div className="card-body">
      <h2 className="h4">{title}</h2>
      <p>{description}</p>
      {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
      {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}: {state.message}</p>}
      {state.status === 'success' && state.items.length === 0 && <p>{emptyMessage}</p>}
      {state.status === 'success' && state.items.length > 0 && <ul className="list-group list-group-flush">
        {state.items.map((item, index) => <li className="list-group-item" key={index}>
          <dl className="mb-0">
            {Object.entries(item).map(([label, value]) => <div key={label}>
              <dt className="d-inline">{label}: </dt><dd className="d-inline">{formatValue(value)}</dd>
            </div>)}
          </dl>
        </li>)}
      </ul>}
    </div>
  </section>;
}
