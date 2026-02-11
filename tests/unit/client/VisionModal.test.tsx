import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { VisionModal } from '../../../client/src/components/projects/VisionModal';

// --- Auth mock ---
const mockAuthState: any = {
  session: {
    access_token: 'test-token',
    user: { id: 'user-1' },
  },
  user: { id: 'user-1' },
};

vi.mock('../../../client/src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient();

  return render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>
  );
}

describe('VisionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 PRD v5.2 vision questions in edit mode (VM-01)', () => {
    const initialData = {
      q1_purpose: 'Purpose',
      q2_achieve: 'Achieve',
      q3_market: 'Market',
      q4_customers: 'Customers',
      q5_win: 'Win',
    };

    renderWithQueryClient(
      <VisionModal
        open={true}
        onClose={() => {}}
        projectId="proj-1"
        teamId="team-1"
        isNew={false}
        initialData={initialData}
      />
    );

    expect(
      screen.getByText('What is the purpose of the project?')
    ).toBeTruthy();
    expect(
      screen.getByText('What do you hope to achieve?')
    ).toBeTruthy();
    expect(
      screen.getByText('What market are you competing in?')
    ).toBeTruthy();
    expect(
      screen.getByText('What are some important characteristics of your customers?')
    ).toBeTruthy();
    expect(
      screen.getByText('How are you going to win?')
    ).toBeTruthy();
  });
});
