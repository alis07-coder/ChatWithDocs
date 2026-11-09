const sections = [
  { title: "Upload", description: "Add documents to a knowledge base." },
  { title: "Search", description: "Find the passages that match a question." },
  { title: "Chat", description: "Ask questions and get answers with sources." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">ChatWithDocs</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Upload documents, search them, and chat with them.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <li
            key={section.title}
            className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h2 className="font-medium">{section.title}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {section.description}
            </p>
            <p className="mt-3 text-xs uppercase tracking-wide text-zinc-400">
              Coming soon
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
