
type FeedbackEntry = {
    Address: string;
    Week: string;
    Feedback: string;
  };
  
  
interface Props {
    data: any;
  }

export default function PartnerFeedbackMatrix({ data }: Props) {

    const grouped = data.reduce((acc: Record<string, FeedbackEntry[]>, entry: FeedbackEntry) => {
        const { Address, Feedback, Week } = entry;
        if (!acc[Address]) {
            acc[Address] = [];
        }
        acc[Address].push({ Address, Week, Feedback });
        return acc;
    }, {});

    console.log('Grouped Feedback Data:', grouped);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Partner Feedback Matrix</h2>
      {Object.entries(grouped).map(([contributor, feedbacks]) => (
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
    </div>
  );
}
