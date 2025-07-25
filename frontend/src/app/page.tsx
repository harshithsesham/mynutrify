// app/page.tsx
import Link from 'next/link';
import { Zap, Heart, Shield } from 'lucide-react';

// A simple header component for the landing page
const Header = () => (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-gray-800">Nutrify</div>
        <div>
          <Link href="/login" className="text-gray-600 hover:text-gray-800 mr-4">Login</Link>
          <Link href="/login" className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
);

// The main landing page component
export default function LandingPage() {
  return (
      <div className="bg-white text-gray-800">
        <Header />
        <main>
          {/* Hero Section */}
          <section className="text-center py-20 sm:py-32 bg-gray-50">
            <div className="container mx-auto px-6">
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-4">
                Your Perfect Coach is Just a Few Steps Away
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Find the ideal coach for your health goals & interests. Get personalized plans and guidance to transform your life.
              </p>
              <Link href="/login" className="bg-gray-800 text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-gray-700 transition-colors">
                Get Started
              </Link>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="text-center p-8 border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-800 text-white mx-auto mb-6">
                    <Zap size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Fitness & Nutrition</h3>
                  <p className="text-gray-600">Unlock your dream body with the right diet & workouts.</p>
                </div>
                <div className="text-center p-8 border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-800 text-white mx-auto mb-6">
                    <Heart size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Online Personal Training</h3>
                  <p className="text-gray-600">Get 1-on-1 guidance from certified experts, anytime, anywhere.</p>
                </div>
                <div className="text-center p-8 border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-800 text-white mx-auto mb-6">
                    <Shield size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Injury Rehabilitation</h3>
                  <p className="text-gray-600">Recover safely and effectively with specialized guidance.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
  );
}