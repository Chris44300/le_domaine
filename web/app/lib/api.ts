const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ListItem = {
  id: string;
  label: string;
  done?: boolean;
  meta?: Record<string, unknown>;
};

export type Block =
  | {
      kind: "text";
      title?: string;
      body: string;
      warning?: string;
      fenetre_debut?: number;
      fenetre_fin?: number;
      total_lignes?: number;
      ligne_troncature?: number;
      sections?: ListItem[];
      page?: number;
      total_pages?: number;
    }
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

function buildFileUrl(endpoint: "download" | "preview", nomFichier: string, dossier: string | null): string {
  const params = new URLSearchParams({ nom_fichier: nomFichier });
  if (dossier) params.set("dossier", dossier);
  return `${API_URL}/documents/${endpoint}?${params.toString()}`;
}

export function buildDownloadUrl(nomFichier: string, dossier: string | null): string {
  return buildFileUrl("download", nomFichier, dossier);
}

export function buildPreviewUrl(nomFichier: string, dossier: string | null): string {
  return buildFileUrl("preview", nomFichier, dossier);
}

export type FichierCible = { nomFichier: string; dossier: string | null };

// Un seul telechargement (un blob, un clic) plutot qu'un clic par fichier
// - Chrome bloque silencieusement les telechargements automatiques
// successifs sans permission explicite, ce qui empechait la selection
// multiple de fonctionner. Retourne un message d'erreur (string) ou null
// si le telechargement a demarre.
export async function downloadZip(fichiers: FichierCible[]): Promise<string | null> {
  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/documents/zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fichiers: fichiers.map((f) => ({ nom_fichier: f.nomFichier, dossier: f.dossier })),
      }),
    });
  } catch {
    return `Impossible de joindre l'API (${API_URL}). Le serveur local tourne-t-il ?`;
  }

  if (!reponse.ok) {
    try {
      const corps = await reponse.json();
      return corps.detail ?? `Erreur ${reponse.status} lors de la création du zip.`;
    } catch {
      return `Erreur ${reponse.status} lors de la création du zip.`;
    }
  }

  const blob = await reponse.blob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "documents.zip";
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
  return null;
}
