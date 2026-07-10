import '@testing-library/jest-dom/vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });
}

vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal();
  const originalRender = actual.render;
  return {
    ...actual,
    render: (ui, options = {}) => {
      const client = options.queryClient ?? createTestQueryClient();
      const UserWrapper = options.wrapper ?? React.Fragment;
      return originalRender(ui, {
        ...options,
        wrapper: ({ children }) =>
          React.createElement(
            QueryClientProvider,
            { client },
            React.createElement(UserWrapper, null, children)
          ),
      });
    },
  };
});
