import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight
} from "lucide-react";
import { loginUser, signupUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Please enter your name.");
          setIsSubmitting(false);
          return;
        }
        await signupUser(name.trim(), email.trim(), password);
        showToast("Account created successfully. Logging you in...", "success");
      }

      const response = await loginUser(email.trim(), password);
      login(response.user, response.accessToken);
      showToast(`Welcome back, ${response.user.name || "Student"}.`, "success");
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        {/* Left Hero Side */}
        <div className="auth-hero-side">
          <div className="auth-hero-brand">
            <div className="auth-hero-brand-mark">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="auth-hero-title">StudyPilot</div>
          </div>

          <div className="auth-hero-body">
            <h1 className="auth-hero-headline">
              Study assistant for your course materials.
            </h1>
            <p className="auth-hero-subtext">
              Upload your documents, generate concise summaries, active-recall flashcards, and self-assessment quizzes.
            </p>
          </div>

          <div style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.65)" }}>
            StudyPilot workspace
          </div>
        </div>

        {/* Right Form Side */}
        <div className="auth-form-side">
          <div className="auth-form-header">
            <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
            <p>
              {mode === "login"
                ? "Enter your credentials to access your subjects."
                : "Create an account to start organizing your study documents."}
            </p>
          </div>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="error-callout" style={{ marginBottom: "1.25rem" }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "signup" && (
              <div className="input-group">
                <label className="input-label" htmlFor="auth-name">
                  Full Name
                </label>
                <div className="input-field-wrap">
                  <UserIcon className="input-field-icon w-4 h-4" />
                  <input
                    id="auth-name"
                    type="text"
                    className="input-field has-icon"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="auth-email">
                Email Address
              </label>
              <div className="input-field-wrap">
                <Mail className="input-field-icon w-4 h-4" />
                <input
                  id="auth-email"
                  type="email"
                  className="input-field has-icon"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="auth-password">
                Password
              </label>
              <div className="input-field-wrap">
                <Lock className="input-field-icon w-4 h-4" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  className="input-field has-icon"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="primary-button"
              style={{ marginTop: "0.5rem" }}
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? "Please wait..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
