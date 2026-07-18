import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">XAI Calling</h1>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-foreground hover:text-primary"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            AI-Powered Outbound Calling
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Configure your AI agent, upload contacts, and launch automated
            calling campaigns. Sales, appointment booking, surveys — powered by
            xAI Grok Voice.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-lg font-medium hover:opacity-90"
            >
              Start Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-border text-foreground rounded-lg text-lg font-medium hover:bg-muted"
            >
              Log in
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Custom AI Agents
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure your AI's personality, script, and voice. Support for
                multiple voices and custom tool actions.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Campaign Management
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload contact lists, schedule campaigns, control concurrency
                and pacing. Pause, resume, or cancel anytime.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Real-time Analytics
              </h3>
              <p className="text-sm text-muted-foreground">
                Track call outcomes, view transcripts, measure conversion rates.
                Full visibility into every conversation.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
