import { useRole, type Role } from "../context/RoleContext";

const ROLES: Role[] = ["담당자", "마케터", "상급자"];

export function RoleToggle() {
  const { role, setRole } = useRole();
  return (
    <div className="role-toggle">
      {ROLES.map((r) => (
        <button
          key={r}
          className={r === role ? "role-btn active" : "role-btn"}
          onClick={() => setRole(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
