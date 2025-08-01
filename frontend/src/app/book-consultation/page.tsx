// app/book-consultation/page.tsx
'use client';

import { useState } from 'react';
import { Calendar, Clock, Phone, Mail, User, Target, CheckCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function BookConsultationPage() {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        age: '',
        gender: '',
        healthGoals: '',
        currentChallenges: '',
        preferredDays: [] as string[],
        preferredTimeSlots: [] as string[],
        additionalInfo: ''
    });

    // Update the handleSubmit function in your book-consultation page
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Debug: Log the form data being sent
        console.log('Submitting form data:', formData);

        try {
            const response = await fetch('/api/consultation-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server response:', errorData);
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Success response:', result);

            if (result.success) {
                setStep(3);
            } else {
                throw new Error(result.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Error submitting request:', error);

            // More specific error messages
            if (error instanceof TypeError && error.message.includes('fetch')) {
                alert('Network error. Please check your internet connection and try again.');
            } else if (error instanceof Error) {
                alert(`Error: ${error.message}`);
            } else {
                alert('Error submitting request. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 3) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Request Submitted Successfully!</h2>
                    <p className="text-gray-600 mb-6">
                        Thank you for your interest in NutriShiksha. Our health coach will contact you within 24 hours to schedule your free consultation.
                    </p>
                    <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• A health coach will review your information</li>
                            <li>• You&apos;ll receive a call/email within 24 hours</li>
                            <li>• Together, you&apos;ll schedule a convenient time</li>
                            <li>• Your 30-minute consultation is completely free</li>
                        </ul>
                    </div>
                    <Link
                        href="/"
                        className="inline-block bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700"
                    >
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
                        <ChevronLeft size={20} />
                        Back to Home
                    </Link>
                    <h1 className="text-4xl font-bold text-gray-800">NutriShiksha</h1>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'
                        }`}>
                            1
                        </div>
                        <div className={`w-24 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'
                        }`}>
                            2
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                        <span className="text-gray-600">Basic Information</span>
                        <span className="text-gray-600">Health & Preferences</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Request Your Free Health Consultation
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Tell us about yourself and we&apos;ll match you with the right health coach
                    </p>

                    <form onSubmit={handleSubmit}>
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <User size={16} className="inline mr-1" />
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Mail size={16} className="inline mr-1" />
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Phone size={16} className="inline mr-1" />
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            placeholder="+91 98765 43210"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Age
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="18"
                                            max="100"
                                            value={formData.age}
                                            onChange={(e) => setFormData({...formData, age: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="25"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Gender
                                        </label>
                                        <select
                                            required
                                            value={formData.gender}
                                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select...</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                            <option value="prefer-not-to-say">Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Next: Health Information
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Target size={16} className="inline mr-1" />
                                        What are your primary health goals?
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={formData.healthGoals}
                                        onChange={(e) => setFormData({...formData, healthGoals: e.target.value})}
                                        placeholder="E.g., Weight loss, manage diabetes, improve energy levels..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current health challenges or conditions
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.currentChallenges}
                                        onChange={(e) => setFormData({...formData, currentChallenges: e.target.value})}
                                        placeholder="E.g., PCOS, thyroid issues, digestive problems..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar size={16} className="inline mr-1" />
                                        Preferred days for consultation (select all that apply)
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                            <label key={day} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    value={day}
                                                    checked={formData.preferredDays.includes(day)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                preferredDays: [...formData.preferredDays, day]
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                preferredDays: formData.preferredDays.filter(d => d !== day)
                                                            });
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                {day}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Clock size={16} className="inline mr-1" />
                                        Preferred time slots (select all that apply)
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: 'morning', label: 'Morning (9 AM - 12 PM)' },
                                            { value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
                                            { value: 'evening', label: 'Evening (4 PM - 7 PM)' },
                                            { value: 'flexible', label: 'Flexible' }
                                        ].map(slot => (
                                            <label key={slot.value} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    value={slot.value}
                                                    checked={formData.preferredTimeSlots.includes(slot.value)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                preferredTimeSlots: [...formData.preferredTimeSlots, slot.value]
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                preferredTimeSlots: formData.preferredTimeSlots.filter(s => s !== slot.value)
                                                            });
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                {slot.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Trust Indicators */}
                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>✓ Free 30-minute consultation</p>
                    <p>✓ No credit card required</p>
                    <p>✓ Personalized health assessment</p>
                </div>
            </div>
        </div>
    );
}