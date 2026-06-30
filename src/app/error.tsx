"use client";

import { useEffect } from 'react';

export default function Error({
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
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-navy p-4">
      <div className="text-center bg-white dark:bg-[#111C44] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 max-w-md">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <button
          onClick={() => reset()}
          className="bg-brand text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition shadow-sm w-full"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
