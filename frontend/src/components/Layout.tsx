import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOut, BookOpen, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ToastContainer } from "./ToastContainer";

export function AppLayout() {
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return "SP";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <Link to="/" className="brand-mark" title="StudyPilot Home">
            <BookOpen className="w-4 h-4 text-white" />
          </Link>
          <div className="brand-info">
            <div className="brand-name">StudyPilot</div>
          </div>
        </div>

        <nav className="topnav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
        </nav>

        <div className="user-menu">
          <div className="user-pill" title={user?.email || "Logged in"}>
            <div className="user-avatar">{getInitials(user?.name)}</div>
            <span className="user-name">{user?.name || "Student"}</span>
          </div>
          <button
            type="button"
            className="icon-button logout-btn"
            onClick={logout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  );
}
