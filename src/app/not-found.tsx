export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] dark:bg-[#0B1437]">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-navy dark:text-white mb-4">404</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">Page not found</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#E41E26] px-6 py-3 font-bold text-white hover:bg-[#C21820] transition"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
