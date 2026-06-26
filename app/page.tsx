import AuthGate from "../components/AuthGate";
import ERPApp from "../components/ERPApp";

export default function Home() {
  return (
    <AuthGate>
      <ERPApp />
    </AuthGate>
  );
}
