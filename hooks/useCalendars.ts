"use client";
import { useState, useEffect } from "react";

type Calendar = {
    id: string;
    summary: string;
    primary: boolean;
};

export function useCalendars() {
    const [calendars, setCalendars] = useState<Calendar[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCalendars() {
            try {
                const res = await fetch("/api/calendar");
                if (!res.ok) throw new Error("Failed to fetch calendars");
                const data = await res.json();
                setCalendars(data);
            } catch (e) {
                console.error("Error fetching calendars:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchCalendars();
    }, []);

    const primaryCalendar = calendars.find((c) => c.primary) ?? null;

    return { calendars, primaryCalendar, loading };
}
