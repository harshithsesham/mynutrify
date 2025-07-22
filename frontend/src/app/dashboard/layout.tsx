// app/dashboard/layout.tsx
import Sidebar from './components/Sidebar';

// This layout will apply to all pages inside the app/dashboard/ directory
export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-50 min-h-screen flex">
            {/* Sidebar for navigation within the dashboard */}
            <Sidebar />
            {/* Main content area for each page */}
            <main className="flex-1 bg-white ml-64">
                {/* A simple header can be added here later if needed */}
                <div className="p-4 sm:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
