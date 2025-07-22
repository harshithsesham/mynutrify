// app/(dashboard)/layout.tsx
import Sidebar from './components/Sidebar'; // We will create this component next

// This layout component will wrap all pages inside the (dashboard) route group
export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-900 text-white min-h-screen flex">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}