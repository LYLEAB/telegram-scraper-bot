import React from 'react';
import { fetchReferenceData } from '../lib/supabase';
import Form from '../components/form';

export const revalidate = 3600;

export default async function Page() {
  let referenceData = null;
  let setupError = null;

  const hasEnvVars = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hasEnvVars) {
    try {
      referenceData = await fetchReferenceData();
    } catch (err) {
      setupError = err instanceof Error ? err.message : 'Failed to query database';
    }
  } else {
    setupError = 'Database environment variables are missing.';
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Pricing & Promotion Tracker</h1>
        <p>Khmer Beverages Operational Market Reporting</p>
      </header>

      {setupError ? (
        <div className="card">
          <div className="alert alert-warning" role="alert">
            💡 <strong>Configuration Required:</strong> {setupError}
          </div>
          <div className="form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <h2 className="section-title" style={{ color: 'var(--color-warning)' }}>
              Supabase Project Connection Details
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              To connect this application to your database instance, configure the following environment variables in your server hosting (Vercel) or create a <code>.env.local</code> file in this folder:
            </p>
            <pre style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '1rem',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.8rem',
              color: '#3B82F6',
              overflowX: 'auto',
              fontFamily: 'monospace',
              lineHeight: '1.4'
            }}>
              SUPABASE_URL=https://your-project-id.supabase.co{"\n"}
              SUPABASE_SERVICE_ROLE_KEY=your-service-role-api-key
            </pre>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1.2rem', lineHeight: '1.5' }}>
              Once variables are configured, redeploy or restart the dev server to enable the operational form.
            </p>
          </div>
        </div>
      ) : (
        referenceData && <Form referenceData={referenceData} />
      )}
    </main>
  );
}
