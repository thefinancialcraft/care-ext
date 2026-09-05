"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Eye, EyeOff, ArrowLeft, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "../globals.css";

export default function LoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [urlParam, setUrlParam] = useState("");
  const [urlTime, setUrlTime] = useState<number>(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem("tfc_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const key = params.get("tfc_key") || "";
      const timeParam = params.get("tfc_time") || "";
      const decodedTime = timeParam ? parseInt(atob(timeParam), 10) : 0;
      setUrlParam(key);
      setUrlTime(decodedTime);
    }
  }, []);

  const getDynamicPassword = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yy = String(today.getFullYear()).slice(-2);
    return `TFC${dd}${mm}${yy}1509`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const expectedPassword = getDynamicPassword();

    // 1. Password check
    if (password !== expectedPassword) {
      setError("Incorrect security credentials. Access denied.");
      setLoading(false);
      return;
    }

    // 2. Validity check – run only if a timestamp was supplied (120 seconds window)
    if (urlTime) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - urlTime > 120) {
        setError("Unauthorised access contact admin");
        setLoading(false);
        return;
      }
    }


    try {
      // 3. Create client with custom header for RLS check
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
          global: {
            headers: {
              "x-login-parameter": urlParam,
              "x-login-admin-id": adminId,
              "x-login-timestamp": Math.floor(Date.now() / 1000).toString(),
            },
          },
        }
      );

        // First try user_profiles (if it exists)
        let profileData = null;
        let profileError = null;
        try {
          const { data, error } = await client
            .from("user_profiles")
            .select("user_id, email, user_name, role, employee_id, super_admin")
            .eq("employee_id", adminId.trim())
            .maybeSingle();
          profileData = data;
          profileError = error;
        } catch (e: any) {
          console.error('🔴 Error querying user_profiles:', e);
          // Detailed Supabase error information
          console.log('🔴 Supabase error message:', e.message);
          console.log('🔴 Supabase error details:', e.details);
          console.log('🔴 Supabase error hint:', e.hint);
        }

        // Fallback to employees table if profileData is null


        // Debug logs for credential validation
        console.log('🔍 Debug - URL Param:', urlParam);
        console.log('🔍 Debug - URL Time (decoded):', urlTime);
        console.log('🔍 Debug - Current Time (epoch):', Math.floor(Date.now() / 1000));
        console.log('🔍 Debug - Admin ID entered:', adminId);
        console.log('🔍 Debug - DB response data:', profileData);
        console.log('🔍 Debug - DB error object:', profileError);
        if (profileError || !profileData) {
          setError("Unauthorized access. Credential mismatch or session expired.");
          setLoading(false);
          return;
        }

        // Super admin check (assuming super_admin field exists)
        if (profileData.super_admin !== true) {
          setError("Sorry, you can't access this dashboard.");
          setLoading(false);
          return;
        }

      // Success
      localStorage.setItem("tfc_user_session", JSON.stringify(profileData));
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError("Server connection error. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="login-back-container">
          <Link href="/" className="back-link" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ArrowLeft size={14} /> BACK TO DIRECTORY
          </Link>
        </div>

        <header className="login-header">
          <h2 className="login-subtitle">THE FINANCIAL CRAFT</h2>
          <h1 className="login-title">DASHBOARD LOGIN</h1>
        </header>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error-banner">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="login-success-banner">
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span>AUTHENTICATION SUCCESSFUL! REDIRECTING...</span>
            </div>
          )}

          <div className="login-input-group">
            <label className="login-label">ADMIN ID</label>
            <div className="login-input-wrapper">
              <User className="login-input-icon" size={16} />
              <input
                type="text"
                required
                disabled={loading || success}
                placeholder="Enter your Admin ID..."
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="login-input-field"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-label">PASSWORD</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={loading || success}
                placeholder="Enter your secret key..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input-field"
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || success}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="login-submit-btn"
          >
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              "ACCESS DASHBOARD"
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p>&copy; 2026 The Financial Craft. Authorized access only.</p>
        </footer>
      </div>
    </div>
  );
}
