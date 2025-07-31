// app/page.tsx
import Link from 'next/link';
import { Heart, Calendar, Users, Target } from 'lucide-react';

const Header = () => (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-gray-800">NutriShiksha</div>
        <div className="flex items-center gap-4">
          <Link href="/book-consultation" className="text-gray-600 hover:text-gray-800">
            Book Consultation
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-800">
            Login
          </Link>
          <Link href="/login" className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
);

export default function LandingPage() {
  return (
      <div className="bg-white text-gray-800">
        <Header />
        <main>
          {/* Hero Section */}
          <section className="text-center py-20 sm:py-32 bg-gray-50">
            <div className="container mx-auto px-6">
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-4">
                Transform Your Health with Expert Nutrition Guidance
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Get personalized nutrition plans from certified experts.
                Start with a free consultation to find your perfect nutritionist match.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    href="/book-consultation"
                    className="bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Calendar size={20} />
                  Book Free Consultation
                </Link>
                <Link
                    href="/login"
                    className="bg-white text-gray-800 border-2 border-gray-800 font-bold py-4 px-8 rounded-lg text-lg hover:bg-gray-50 transition-colors"
                >
                  Client Login
                </Link>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                ✓ No credit card required &nbsp; ✓ 30-minute free consultation
              </p>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <h2 className="text-3xl font-bold text-center mb-12">How NutriShiksha Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600">1</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Book Consultation</h3>
                  <p className="text-gray-600">
                    Schedule a free 30-minute call with our health coach to discuss your goals
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600">2</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Get Matched</h3>
                  <p className="text-gray-600">
                    We&apos;ll match you with the perfect nutritionist based on your needs
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600">3</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Start Your Journey</h3>
                  <p className="text-gray-600">
                    Receive personalized nutrition plans and ongoing support
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
              <h2 className="text-3xl font-bold text-center mb-12">Why Choose NutriShiksha?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="text-center p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-800 text-white mx-auto mb-6">
                    <Users size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Expert Nutritionists</h3>
                  <p className="text-gray-600">
                    Certified professionals specialized in various health conditions
                  </p>
                </div>
                <div className="text-center p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-800 text-white mx-auto mb-6">
                    <Target size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Personalized Plans</h3>
                  <p className="text-gray-600">
                    Customized nutrition guidance based on your unique needs
                  </p>
                </div>
                <div className="text-center p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-800 text-white mx-auto mb-6">
                    <Heart size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Ongoing Support</h3>
                  <p className="text-gray-600">
                    Regular check-ins and adjustments to ensure your success
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-blue-600 text-white">
            <div className="container mx-auto px-6 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Transform Your Health?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Start with a free consultation today
              </p>
              <Link
                  href="/book-consultation"
                  className="bg-white text-blue-600 font-bold py-4 px-8 rounded-lg text-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
              >
                <Calendar size={20} />
                Book Your Free Consultation
              </Link>
            </div>
          </section>
        </main>
      </div>
  );
}