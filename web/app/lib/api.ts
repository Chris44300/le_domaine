const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ListItem = {
  id: string;
  label: string;
  done?: boolean;
  meta?: Record<string, unknown>;
};

export type Block =
  | { kind: "text"; title?: string; body: string }
  | { kind: "list"; items: ListItem[] }
  | { kind: "error"; message: string };

export type ApiResponse = { status: "ok" | "error"; blocks: Block[] };

export async function callApi(path: string, body: unknown): Promise<ApiResponse> {
  try {
    const reponse = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await reponse.json();
  } catch {
    return {
      status: "error",
      blocks: [
        {
          kind: "error",
          message: `Impossible de joindre l'API (${API_URL}). Le serveur local tourne-t-il ?`,
        },
      ],
    };
  }
}

export function firstErrorMessage(response: ApiResponse): string | null {
  if (response.status !== "error") return null;
  const bloc = response.blocks[0];
  return bloc && bloc.kind === "error" ? bloc.message : "Erreur inconnue.";
}
