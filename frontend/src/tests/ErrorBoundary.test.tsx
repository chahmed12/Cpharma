import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

describe('ErrorBoundary Component', () => {
    it('renders children without error', () => {
        render(
            <ErrorBoundary>
                <div data-testid="child">Safe Content</div>
            </ErrorBoundary>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders fallback when an error is thrown', () => {
        const ThrowError = () => {
            throw new Error('Test Error');
        };

        // Suppress console.error inside the test environment for the thrown error
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText(/Oups, une erreur inattendue/i)).toBeInTheDocument();
        spy.mockRestore();
    });
});
