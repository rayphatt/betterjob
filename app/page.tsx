import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background-page to-white">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-2xl font-bold text-primary">BetterJob</div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-text-primary mb-4 sm:mb-6 leading-tight px-2">
            You weren't born<br />
            <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">to just clock in.</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-text-secondary mb-3 sm:mb-4 px-4">
            Find the career 10-year-old you would be proud of.
          </p>

          <Link
            href="/onboarding/resume"
            className="inline-block bg-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors shadow-lg hover:shadow-xl min-h-[44px] min-w-[200px] flex items-center justify-center touch-manipulation"
          >
            Find My Path →
          </Link>

          <p className="mt-6 sm:mt-8 text-text-secondary text-xs sm:text-sm px-4">
            Join 10,000+ people who found better careers
          </p>
        </div>
      </section>
    </main>
  );
}

