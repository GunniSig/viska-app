type Action = {
  emoji: string;
  title: string;
  description: string;
  question: string;
};

type QuickActionsProps = {
  onSelect: (question: string) => void;
};

const actions: Action[] = [
  {
    emoji: "📍",
    title: "Þjónusta nálægt mér",
    description: "Finna þjónustu í nágrenninu",
    question: "Hvaða þjónusta er nálægt mér?",
  },
  {
    emoji: "💊",
    title: "Næsta apótek",
    description: "Sjá apótek nálægt þér",
    question: "Hvar er næsta apótek?",
  },
  {
    emoji: "🚌",
    title: "Strætó upplýsingar",
    description: "Leiðir og tímatöflur",
    question: "Getur þú hjálpað mér með Strætó upplýsingar?",
  },
  {
    emoji: "💰",
    title: "Lífeyrir",
    description: "Upplýsingar um lífeyri",
    question: "Getur þú útskýrt lífeyri á einföldu máli?",
  },
  {
    emoji: "📄",
    title: "Réttindi",
    description: "Aðstoð með réttindi",
    question: "Hvaða réttindi gætu átt við mig?",
  },
  {
    emoji: "🏥",
    title: "Heilsa",
    description: "Heilsutengd þjónusta",
    question: "Getur þú hjálpað mér að finna heilbrigðisþjónustu?",
  },
];

export default function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {actions.map((action) => (
        <button
          key={action.title}
          onClick={() => onSelect(action.question)}
          className="
            bg-white
            rounded-2xl
            p-5
            shadow-sm
            border
            border-gray-200
            text-left
            hover:bg-gray-50
            transition
            min-h-[140px]
          "
        >
          <div className="text-4xl mb-3">{action.emoji}</div>

          <h3 className="text-lg font-semibold text-gray-800">
            {action.title}
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            {action.description}
          </p>
        </button>
      ))}
    </div>
  );
}