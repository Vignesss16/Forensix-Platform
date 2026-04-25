import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import CaseManagement from "@/components/CaseManagement";

export default function CasePage() {
  const { data } = useInvestigation();

  // We allow viewing Case Management even without a current UFDR data object
  // if (!data) return <Navigate to="/" replace />;


  return (
    <div>
      <CaseManagement />
    </div>
  );
}