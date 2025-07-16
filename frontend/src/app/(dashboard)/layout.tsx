// src/app/(dashboard)/layout.tsx

import { ReactNode } from 'react';

export default function DashboardLayout({
                                            children,
                                        }: {
    children: ReactNode;
}) {
    // You can wrap this in your dashboard sidebar/nav later
    return <>{children}</>;
}
