// components/TimezoneDisplay.tsx
import { format } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { Globe } from 'lucide-react';

interface TimezoneDisplayProps {
    professionalTimezone?: string;
    clientTimezone?: string;
}

export function TimezoneDisplay({ professionalTimezone = 'UTC', clientTimezone }: TimezoneDisplayProps) {
    const userTimezone = clientTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();

    if (professionalTimezone === userTimezone) {
        return null; // Don't show if timezones match
    }

    const profTime = toZonedTime(now, professionalTimezone);

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-blue-800">
                <Globe size={16} />
                <span className="font-medium">Timezone Information</span>
            </div>
            <div className="mt-2 space-y-1 text-blue-700">
                <p>Professional's timezone: {professionalTimezone} ({formatTz(profTime, 'h:mm a zzz', { timeZone: professionalTimezone })})</p>
                <p>Your timezone: {userTimezone} ({format(now, 'h:mm a')})</p>
            </div>
        </div>
    );
}

