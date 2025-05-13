'use client';

import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { FeedbackEntry } from '@/types/dashboard';

interface Props {
    data: FeedbackEntry[];
}

export default function PartnerFeedbackMatrix({ data }: Props) {
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 2;

    // Group feedback by address
    const grouped = data.reduce((acc: Record<string, FeedbackEntry[]>, entry: FeedbackEntry) => {
        const { Address, Week, Feedback } = entry;
        if (!acc[Address]) {
            acc[Address] = [];
        }
        acc[Address].push({ Address, Week, Feedback });
        return acc;
    }, {});

    // Filter by search query
    const filteredEntries = Object.entries(grouped).filter(([address]) =>
        address.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
    const paginatedEntries = filteredEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <Card>
            <div className='p-4'>
                <h2 className="text-xl font-semibold mb-4">Partner Feedback Matrix</h2>

                <input
                    type="text"
                    placeholder="Search by address"
                    className="mb-4 border p-2 w-full rounded"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                    }}
                />

                {paginatedEntries.map(([contributor, feedbacks]) => (
                    <div key={contributor} className="mb-6 border rounded p-4 bg-white shadow-sm">
                        <h3 className="text-lg font-bold mb-2">{contributor}</h3>
                        <ul className="space-y-2 list-disc pl-6">
                            {feedbacks.map((f, i) => (
                                <li key={i}>
                                    <strong>{f.Week}:</strong> {f.Feedback}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed hover:bg-slate-100"
                        >
                            Prev
                        </button>
                        <span className="px-4 py-1 font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border rounded disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed hover:bg-slate-100"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
}
