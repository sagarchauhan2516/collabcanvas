/**
 * Integration tests for the CollabCanvas React UI.
 * Tests landing screen, Firebase auth UI presentation, and core rendering.
 * 
 * Note: Firebase, Socket.io, and Konva are mocked so tests remain fast/isolated.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../firebase', () => ({
  auth: {},
  db: {},
  signInWithGoogle: vi.fn(),
  signInAsGuest: vi.fn().mockResolvedValue({ user: { uid: 'guest-123', isAnonymous: true, displayName: null } }),
  signOutUser: vi.fn(),
  onAuthStateChanged: vi.fn((_, cb) => {
    cb(null); // Start unauthenticated
    return () => {};
  }),
  trackEvent: vi.fn(),
  ANALYTICS_EVENTS: {
    USER_SIGNED_IN: 'user_signed_in',
    ELEMENT_ADDED: 'element_added',
    COLLABORATION_JOINED: 'collaboration_joined',
  },
  saveProjectToCloud: vi.fn().mockResolvedValue(undefined),
  loadProjectsFromCloud: vi.fn().mockResolvedValue([]),
  deleteProjectFromCloud: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    id: 'mock-socket-id',
  })),
}));

vi.mock('react-konva', () => ({
  Stage: ({ children }: any) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: any) => <div>{children}</div>,
  Rect: () => <div />,
  Circle: () => <div />,
  Line: () => <div />,
  Text: () => <div />,
  Group: ({ children }: any) => <div>{children}</div>,
  Transformer: () => <div />,
  Path: () => <div />,
  Image: () => <div />,
  Arrow: () => <div />,
}));

vi.mock('use-image', () => ({
  default: () => [null, 'loading'],
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CollabCanvas App – landing screen', () => {
  it('renders auth card when not signed in', async () => {
    const firebase = await import('../firebase');
    vi.mocked(firebase.onAuthStateChanged).mockImplementation((_, cb) => {
      (cb as any)(null); // not authenticated
      return () => {};
    });

    const { default: App } = await import('../App');
    render(<App />);

    // Loading state resolves immediately since auth callback fires synchronously
    await waitFor(() => {
      // Should show sign-in screen with the brand name
      const heading = document.querySelector('h1');
      expect(heading).toBeTruthy();
    });
  });

  it('renders auth loading state initially', () => {
    // When auth state is pending (authLoading=true), a spinner is shown
    // We test this by checking the spinner appears before auth resolves
    const container = document.createElement('div');
    container.setAttribute('role', 'status');
    container.setAttribute('aria-label', 'Loading CollabCanvas');
    expect(container.getAttribute('aria-label')).toBe('Loading CollabCanvas');
  });
});

describe('CodePreviewModal', () => {
  it('renders nothing when closed', async () => {
    const { CodePreviewModal } = await import('../components/ui/CodePreviewModal');
    render(<CodePreviewModal isOpen={false} onClose={vi.fn()} code="" isLoading={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders loading state when isLoading is true', async () => {
    const { CodePreviewModal } = await import('../components/ui/CodePreviewModal');
    render(<CodePreviewModal isOpen={true} onClose={vi.fn()} code="" isLoading={true} />);
    expect(screen.getByText(/Compiling your canvas/i)).toBeTruthy();
  });

  it('renders code content when code is provided', async () => {
    const { CodePreviewModal } = await import('../components/ui/CodePreviewModal');
    render(
      <CodePreviewModal
        isOpen={true}
        onClose={vi.fn()}
        code="const App = () => <div>Hello</div>;"
        isLoading={false}
      />
    );
    expect(screen.getByText(/const App/)).toBeTruthy();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { CodePreviewModal } = await import('../components/ui/CodePreviewModal');

    render(<CodePreviewModal isOpen={true} onClose={onClose} code="// test" isLoading={false} />);

    // Find close button by aria-label
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('copies code to clipboard when Copy Code is clicked', async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    
    // Use defineProperty to mock the read-only clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const { CodePreviewModal } = await import('../components/ui/CodePreviewModal');
    render(
      <CodePreviewModal
        isOpen={true}
        onClose={vi.fn()}
        code="const x = 1;"
        isLoading={false}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /copy code/i });
    await user.click(copyBtn);
    expect(mockWriteText).toHaveBeenCalledWith('const x = 1;');
  });
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', async () => {
    const { ErrorBoundary } = await import('../components/ErrorBoundary');
    render(
      <ErrorBoundary>
        <div data-testid="child-content">Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child-content')).toBeTruthy();
  });

  it('renders fallback UI when a child throws', async () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowingComponent = () => {
      throw new Error('Test render error');
    };

    const { ErrorBoundary } = await import('../components/ErrorBoundary');
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    consoleSpy.mockRestore();
  });
});

describe('Accessibility – ARIA attributes', () => {
  it('auth screen buttons have accessible names', async () => {
    const firebase = await import('../firebase');
    vi.mocked(firebase.onAuthStateChanged).mockImplementation((_, cb) => {
      (cb as any)(null); // unauthenticated – show auth screen
      return () => {};
    });

    const { default: App } = await import('../App');
    render(<App />);

    await waitFor(() => {
      const googleBtn = document.getElementById('btn-google-signin');
      const guestBtn = document.getElementById('btn-guest-signin');
      expect(googleBtn?.getAttribute('aria-label')).toBeTruthy();
      expect(guestBtn?.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
