"use client";

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-4">
          <div className="text-center bg-gray-100 p-8 rounded-2xl shadow-xl max-w-md border border-red-200">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Critical App Error!</h2>
            <p className="text-gray-700 mb-6 text-sm">
              {error.message || "An unexpected error occurred at the root level of the application."}
            </p>
            <button
              onClick={() => reset()}
              className="bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition shadow-sm w-full"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
