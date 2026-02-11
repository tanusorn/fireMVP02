// Authentication API - Using Supabase
import { supabase } from "@/integrations/supabase/client";
import { AuthResponse, LoginRequest, RegisterRequest, User } from "@/types/api";

// OperationCenter is now a string (fetched from operation_centers table)
export type OperationCenter = string;

// Login with Supabase
export async function login(request: LoginRequest): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: request.email,
    password: request.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Login failed");
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  const user: User = {
    id: data.user.id,
    email: data.user.email || "",
    name: profile?.name || "User",
    department: profile?.operation_center || "",
    role: "officer",
    created_at: data.user.created_at,
  };

  return {
    user,
    token: data.session?.access_token || "",
  };
}

// Register with Supabase
export async function register(
  request: RegisterRequest & { operation_center?: OperationCenter }
): Promise<{ success: boolean; message: string }> {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email: request.email,
    password: request.password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        name: request.name,
        operation_center: request.operation_center || "",
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      throw new Error("This email is already registered. Please login instead.");
    }
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Registration failed");
  }

  return {
    success: true,
    message: "Registration successful! You can now login.",
  };
}

// Logout
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

// Get current user from session
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return null;
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  return {
    id: session.user.id,
    email: session.user.email || "",
    name: profile?.name || "User",
    department: profile?.operation_center || "",
    role: "officer",
    created_at: session.user.created_at,
  };
}

// Store auth data (not needed with Supabase, keeping for compatibility)
export function storeAuthData(response: AuthResponse): void {
  // Supabase handles session storage automatically
}
