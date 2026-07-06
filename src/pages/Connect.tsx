import { useState } from "react";
import { Copy, Check, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PublicLayout from "@/components/layout/PublicLayout";

const mcpUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

const Connect = () => {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PublicLayout>
      <section className="section-padding">
        <div className="container-custom max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl">Connect an AI Assistant</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Let ChatGPT or Claude answer questions using live Muhazi Dental Clinic information.
              </p>
            </div>
          </div>

          <Card className="p-5 mt-8">
            <p className="text-sm font-medium mb-2">Muhazi Dental Clinic MCP server URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs sm:text-sm bg-muted px-3 py-2 rounded-md break-all font-mono">
                {mcpUrl}
              </code>
              <Button onClick={copyUrl} variant="outline" size="sm" className="shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1.5 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Once connected, your assistant can answer questions about our services, dentists,
              working hours, and current announcements.
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {/* ChatGPT */}
            <Card className="p-6">
              <h2 className="font-heading font-semibold text-xl mb-4">Connect to ChatGPT</h2>
              <ol className="space-y-3 text-sm list-decimal list-inside marker:text-primary marker:font-semibold">
                <li>
                  Open{" "}
                  <a
                    href="https://chatgpt.com/#settings/Connectors/Advanced"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    ChatGPT Connectors settings
                  </a>{" "}
                  and enable <strong>Developer mode</strong> (read the risk notice shown there).
                </li>
                <li>
                  In the chat composer, open the <strong>+</strong> menu and turn on <strong>Developer mode</strong>.
                </li>
                <li>
                  Click <strong>Add sources</strong>, then <strong>Connect more</strong>.
                </li>
                <li>Name the connector "Muhazi Dental" and paste the URL above.</li>
                <li>Ask ChatGPT something like "What services does Muhazi Dental Clinic offer?"</li>
              </ol>
            </Card>

            {/* Claude */}
            <Card className="p-6">
              <h2 className="font-heading font-semibold text-xl mb-4">Connect to Claude</h2>
              <ol className="space-y-3 text-sm list-decimal list-inside marker:text-primary marker:font-semibold">
                <li>
                  Open{" "}
                  <a
                    href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Claude's Add custom connector page
                  </a>
                  .
                </li>
                <li>Name the connector "Muhazi Dental" and paste the URL above.</li>
                <li>
                  Enable the connector from the chat composer, then ask Claude about the clinic.
                </li>
              </ol>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground mt-8 text-center">
            The MCP URL is public — it exposes only the same information available on this website.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Connect;
