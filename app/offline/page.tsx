import { Beef, WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return <main className="simple-auth-shell"><section className="auth-card"><span className="signin-mark"><WifiOff /></span><p className="eyebrow">Internet unavailable</p><h2>You are offline</h2><p>For security, private animal records are not stored in the browser cache. Connect to the office internet and try again.</p><Link className="signin-button" href="/"><Beef /> Try again</Link></section></main>;
}
