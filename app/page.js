import Link from 'next/link';
import { GraduationCap, Compass, Settings } from 'lucide-react';

export default function Home() {
  return (
    <main className="land">
      <div className="brand"><span className="dot"><GraduationCap size={20} /></span> Craftpath</div>
      <h1>Learn a real craft. Build a business from it.</h1>
      <p>A guided journey through everything you need — the skill, the clients, and the mindset — all from content you control.</p>
      <div className="cards">
        <Link className="card" href="/learn">
          <div className="ic"><Compass size={22} /></div>
          <h3>Start learning</h3>
          <span>Enter the student journey — lessons, glossary, progress, and your growing portfolio.</span>
        </Link>
        <Link className="card" href="/admin">
          <div className="ic"><Settings size={22} /></div>
          <h3>Admin</h3>
          <span>Upload and manage lessons, skills, and the glossary. Content-as-data.</span>
        </Link>
      </div>
      <p className="note">The app is a thin renderer: every lesson is markdown you upload — adding content never touches the code.</p>
    </main>
  );
}
