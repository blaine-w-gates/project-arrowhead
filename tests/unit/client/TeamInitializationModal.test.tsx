import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { TeamInitializationModal } from '../../../client/src/components/TeamInitializationModal';

// --- Auth and routing mocks ---

const mockRefreshProfile = vi.fn();

const mockAuthState: any = {
  user: null,
  session: null,
  profile: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  refreshProfile: mockRefreshProfile,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  // Only the hook we need for this component
  useLocation: () => ['', mockSetLocation],
}));

describe.skip('TeamInitializationModal', () => {
  beforeEach(() => {
    mockAuthState.user = null;
    mockAuthState.session = null;
    mockAuthState.profile = null;
    mockAuthState.loading = false;
    mockRefreshProfile.mockReset();
    mockSetLocation.mockReset();
    (global as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when user already has profile (TI-01)', () => {
    mockAuthState.session = {
      access_token: 'token-123',
      user: { id: 'user-1' },
    } as any;
    mockAuthState.profile = {
      id: 'member-1',
      teamId: 'team-1',
      role: 'Account Owner',
      name: 'Existing Owner',
      email: 'owner@example.com',
      isVirtual: false,
    };

    render(<TeamInitializationModal />);

    expect(screen.queryByText("Welcome! Let's Get Started")).toBeNull();
  });

  it('renders when session exists and profile is null (TI-02)', () => {
    mockAuthState.session = {
      access_token: 'token-123',
      user: { id: 'user-1' },
    } as any;
    mockAuthState.profile = null;

    render(<TeamInitializationModal />);

    expect(screen.getByText("Welcome! Let's Get Started")).toBeInTheDocument();
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
  });

  it('validates required fields before calling API (TI-03)', async () => {
    const fetchMock = vi.fn();
    (global as any).fetch = fetchMock;

    mockAuthState.session = {
      access_token: 'token-123',
      user: { id: 'user-1' },
    } as any;
    mockAuthState.profile = null;

    render(<TeamInitializationModal />);

    const submitButton = screen.getByRole('button', { name: /get started/i });

    // Submit with both fields empty -> name required
    fireEvent.click(submitButton);

    expect(await screen.findByText('Your name is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    // Fill name but leave team name empty -> team name required
    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Owner Name' },
    });

    fireEvent.click(submitButton);

    expect(await screen.findByText('Team name is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits successfully, refreshes profile and navigates (TI-04)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Team initialized successfully' }),
    });
    (global as any).fetch = fetchMock;

    mockAuthState.session = {
      access_token: 'token-123',
      user: { id: 'user-1' },
    } as any;
    mockAuthState.profile = null;

    render(<TeamInitializationModal />);

    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Owner Name' },
    });
    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'My Team' },
    });

    const submitButton = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toBe('/api/auth/initialize-team');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer token-123');

    const body = JSON.parse(options.body as string);
    expect(body).toEqual({
      userName: 'Owner Name',
      teamName: 'My Team',
    });

    await waitFor(() => {
      expect(mockRefreshProfile).toHaveBeenCalled();
      expect(mockSetLocation).toHaveBeenCalledWith('/dashboard/projects');
    });
  });

  it('surfaces backend error and re-enables button (TI-05)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to initialize team' }),
    });
    (global as any).fetch = fetchMock;

    mockAuthState.session = {
      access_token: 'token-123',
      user: { id: 'user-1' },
    } as any;
    mockAuthState.profile = null;

    render(<TeamInitializationModal />);

    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Owner Name' },
    });
    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'My Team' },
    });

    const submitButton = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(submitButton);

    // While submitting, button should be disabled
    expect(submitButton).toBeDisabled();

    // Error from backend should be shown
    expect(
      await screen.findByText('Failed to initialize team')
    ).toBeInTheDocument();

    // After error, button should be re-enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // refreshProfile should not be called on failure
    expect(mockRefreshProfile).not.toHaveBeenCalled();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });
});
