// app/dashboard/layout.tsx
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-50 min-h-screen flex">
            <Sidebar />
            <div className="flex-1 ml-64">
                <Header />
                <main className="p-4 sm:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}