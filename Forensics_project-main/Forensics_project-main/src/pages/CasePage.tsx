import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import CaseManagement from "@/components/CaseManagement";

export default function CasePage() {
  const { data } = useInvestigation();

  if (!data) return <Navigate to="/" replace />;

  return (
    <div className="p-6">
      <CaseManagement />
    </div>
  );
}