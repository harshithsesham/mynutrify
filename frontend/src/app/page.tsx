// frontend/src/app/page.tsx
import Link from 'next/link';
import { Heart, Calendar, Users, Target, CheckCircle } from 'lucide-react';

// --- Reusable Components for Cleanliness and Style Consistency ---

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

const PrimaryButton = ({ href, children }: ButtonProps) => (
    // Solid Teal button with rounded corners and a slight hover effect for premium feel
    <Link
        href={href}
        className="bg-teal-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:bg-teal-700 transition-all duration-300 transform hover:scale-[1.02] inline-flex items-center justify-center gap-2 text-base w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-teal-500/50"
    >
      {children}
    </Link>
);

const SecondaryButton = ({ href, children }: ButtonProps) => (
    // White button with a subtle gray border for contrast
    <Link
        href={href}
        className="bg-white text-gray-800 border-2 border-gray-200 font-semibold py-3 px-8 rounded-full hover:bg-gray-50 transition-colors duration-300 inline-flex items-center justify-center text-base w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-gray-300/50"
    >
      {children}
    </Link>
);

const Header = () => (
    // Sticky header with backdrop blur for a modern, floating effect
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo in the accent color */}
        <Link href="/" className="text-3xl font-extrabold text-teal-600 tracking-wider">
          NutriShiksha
        </Link>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/book-consultation" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">
            Book Consultation
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">
            Login
          </Link>
          <PrimaryButton href="/signup">
            Sign Up
          </PrimaryButton>
        </div>
        {/* Mobile Menu Placeholder - for a real implementation, you'd add a toggle button here */}
        <div className="md:hidden">
          <button className="text-gray-600 hover:text-teal-600 p-2 rounded-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          </button>
        </div>
      </nav>
    </header>
);

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
    // Elevated card with shadow and hover effect
    <div className="bg-white p-8 rounded-xl shadow-xl transition-shadow duration-300 hover:shadow-2xl border border-gray-100 text-center">
      {/* Teal icon container for prominence */}
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-teal-500 text-white mx-auto mb-6">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
);

interface StepProps {
  step: number;
  title: string;
  description: string;
}

const StepComponent = ({ step, title, description }: StepProps) => (
    // Step indicator with a strong left accent line
    <div className="flex flex-col items-start p-6 bg-white rounded-lg border-l-4 border-teal-500 shadow-md transition-shadow duration-300 hover:shadow-lg h-full">
      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-4 flex-shrink-0">
        <span className="text-lg font-bold text-teal-600">{step}</span>
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
);

// --- Main Landing Page Component ---

export default function LandingPage() {
  return (
      <div className="min-h-screen bg-gray-50 font-sans antialiased">
        <Header />
        <main>
          {/* Hero Section - Asymmetric Layout for Visual Impact */}
          <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-36 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
                {/* Left Content Column */}
                <div className="lg:col-span-7 xl:col-span-6 z-10">
                  <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 text-gray-900">
                    <span className="block">Transform Your Health</span>
                    {/* Accent color for key phrase */}
                    <span className="block text-teal-600">with Expert Guidance</span>
                  </h1>
                  <p className="text-xl text-gray-600 mb-10 max-w-xl">
                    Get personalized nutrition plans and continuous support from certified professionals to achieve your wellness goals.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-start">
                    <PrimaryButton href="/book-consultation">
                      <Calendar size={20} />
                      Book Free Consultation
                    </PrimaryButton>
                    <SecondaryButton href="/login">
                      Client Login
                    </SecondaryButton>
                  </div>
                  {/* Subtle value props */}
                  <p className="text-sm text-gray-500 mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className="flex items-center gap-1"><CheckCircle size={16} className="text-teal-500" /> No credit card required</span>
                    <span className="flex items-center gap-1"><CheckCircle size={16} className="text-teal-500" /> 30-minute free call</span>
                  </p>
                </div>
                {/* Right Visual Column - Image/Illustration Placeholder */}
                <div className="lg:col-span-5 xl:col-span-6 mt-12 lg:mt-0 relative hidden lg:block">
                  {/* Visually engaging, tilted placeholder block */}
                  <div className="aspect-w-16 aspect-h-9 w-full bg-teal-100 rounded-3xl shadow-2xl p-10 transform rotate-3">
                    <div className="w-full h-full bg-teal-50 border-4 border-dashed border-teal-300 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-teal-600">Health & Wellness Illustration</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section - Prominent Value Proposition */}
          <section className="py-20 lg:py-28 bg-gray-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <span className="text-sm font-semibold uppercase text-teal-600 tracking-widest">Our Value</span>
                <h2 className="text-4xl font-bold text-gray-900 mt-2">Why Choose NutriShiksha?</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard
                    icon={<Users size={32} />}
                    title="Expert Nutritionists"
                    description="Access a network of certified health professionals specialized in various dietary and health requirements."
                />
                <FeatureCard
                    icon={<Target size={32} />}
                    title="Personalized Plans"
                    description="Receive customized, flexible nutrition guidance built around your unique lifestyle, goals, and food preferences."
                />
                <FeatureCard
                    icon={<Heart size={32} />}
                    title="Ongoing Support"
                    description="Benefit from regular check-ins, plan adjustments, and direct messaging to ensure you stay on track and succeed."
                />
              </div>
            </div>
          </section>

          {/* How It Works Section - Clean, linear design */}
          <section className="py-20 lg:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <span className="text-sm font-semibold uppercase text-teal-600 tracking-widest">Simple Process</span>
                <h2 className="text-4xl font-bold text-gray-900 mt-2">Your 3-Step Journey</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                <StepComponent
                    step={1}
                    title="Book Your Free Call"
                    description="Schedule a quick 30-minute consultation with our health coach to discuss your goals and expectations."
                />
                <StepComponent
                    step={2}
                    title="Get Matched Instantly"
                    description="We match you with the perfect nutritionist based on your profile and health needs."
                />
                <StepComponent
                    step={3}
                    title="Start Your Transformation"
                    description="Begin working with your dedicated nutritionist and receive your custom plan and continuous guidance."
                />
              </div>
            </div>
          </section>

          {/* Final CTA Section - Bold and Simple */}
          <section className="py-24 bg-teal-600 text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
                Ready for a Healthier Future?
              </h2>
              <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
                It all starts with a no-obligation, free 30-minute chat with an expert.
              </p>
              <PrimaryButton href="/book-consultation">
                <Calendar size={20} />
                Book Your Free Consultation Now
              </PrimaryButton>
            </div>
          </section>
        </main>
        {/* Optional Footer: Minimalist Footer */}
        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} NutriShiksha. All rights reserved.</p>
          </div>
        </footer>
      </div>
  );
}