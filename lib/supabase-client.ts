/**
 * lib/supabase-client.ts
 * 
 * Supabase Database & Project Cloud Storage Client
 * Allows users and admins to backup video projects, saved drafts, and credentials to Supabase Cloud.
 */

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window === "undefined") {
    return { supabaseUrl: "", supabaseAnonKey: "", isConfigured: false };
  }

  const supabaseUrl = localStorage.getItem("fahi_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = localStorage.getItem("fahi_supabase_anon_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey)
  };
}

export async function saveProjectToCloud(projectData: Record<string, unknown>): Promise<{ success: boolean; id?: string; error?: string }> {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    // If Supabase credentials are not added, save to local IndexedDB/localStorage fallback
    try {
      localStorage.setItem("fahi_cloud_project_draft", JSON.stringify(projectData));
      return { success: true, id: "local_draft" };
    } catch (e) {
      return { success: false, error: "Local storage limit reached." };
    }
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/video_projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        project_data: projectData,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Error: ${errText}`);
    }

    const data = await response.json();
    return { success: true, id: data[0]?.id || "cloud_project" };
  } catch (err: any) {
    console.warn("Supabase Cloud Sync Warning:", err.message);
    // Fallback to local draft
    localStorage.setItem("fahi_cloud_project_draft", JSON.stringify(projectData));
    return { success: true, id: "local_draft_fallback" };
  }
}

export async function loadProjectFromCloud(): Promise<Record<string, unknown> | null> {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    const localDraft = localStorage.getItem("fahi_cloud_project_draft");
    return localDraft ? JSON.parse(localDraft) : null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/video_projects?select=*&order=updated_at.desc&limit=1`, {
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`
      }
    });

    if (!response.ok) throw new Error("Failed to fetch cloud project.");
    const data = await response.json();
    if (data && data.length > 0) {
      return data[0].project_data;
    }
  } catch (err) {
    console.warn("Cloud load failed, falling back to local:", err);
  }

  const localDraft = localStorage.getItem("fahi_cloud_project_draft");
  return localDraft ? JSON.parse(localDraft) : null;
}
