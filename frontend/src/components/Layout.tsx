import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <Link to="/" className="brand-mark">
            SP
          </Link>
          <div>
            <div className="brand-name">StudyPilot</div>
          </div>
        </div>

        <nav className="topnav" aria-label="Main navigation">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
        </nav>

        <div className="user-menu">
          <div className="user-pill">{user?.name ?? "Student"}</div>
          <button type="button" className="secondary-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
