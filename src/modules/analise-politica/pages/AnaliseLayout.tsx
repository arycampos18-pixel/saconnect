import { Outlet } from "react-router-dom";

export default function AnaliseLayout() {
  return (
    <div className="space-y-4">
      <Outlet />
    </div>
  );
}