"use client";
/* eslint-disable @next/next/no-img-element -- private signed Supabase image URLs are intentionally rendered without the public optimizer */

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity, Beef, ChevronRight, CircleDollarSign, ClipboardList,
  Copy, DatabaseBackup, FileDown, FileText, Gauge, HeartPulse, Home, ImagePlus, LogOut, MailPlus, Menu,
  PackagePlus, Pencil, Search, ShieldCheck, Smartphone, UserCheck, UserX, Users, WalletCards, Weight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { downloadAnimalReport, downloadFarmReport } from "@/lib/client/pdf-report";

type View = "dashboard" | "animals" | "reports" | "team";

type Animal = {
  id: string;
  tagNumber: string;
  name: string | null;
  species: "Cow" | "Buffalo" | "Goat" | "Camel";
  breed: string | null;
  sex: "Female" | "Male";
  status: "Active" | "Sold" | "Deceased";
  dateOfBirth: string | null;
  color: string | null;
  location: string | null;
  sellerName: string | null;
  sellerPhone: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  purchaseWeightKg: number | null;
  currentWeightKg: number | null;
  recordSource: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type WeightRecord = { id: string; weightKg: number; measuredAt: string; notes: string | null };
type HealthRecord = { id: string; category: string; title: string; eventDate: string; veterinarian: string | null; cost: number | null; nextDueDate: string | null; notes: string | null };
type ExpenseRecord = { id: string; category: string; amount: number; expenseDate: string; notes: string | null };
type SaleRecord = { id: string; saleDate: string; salePrice: number; saleWeightKg: number | null; buyerName: string | null; buyerPhone: string | null; notes: string | null };
type Attachment = { id: string; fileName: string; category: string; fileUrl: string };
type AnimalDetail = { animal: Animal; weights: WeightRecord[]; health: HealthRecord[]; expenses: ExpenseRecord[]; sales: SaleRecord[]; attachments: Attachment[] };
type TeamUser = { id: string; email: string; displayName: string; role: "owner" | "staff"; active: boolean; lastSeenAt: string; createdAt: string };
type AppUser = TeamUser;
type StaffInvitation = { id: string; email: string; displayName: string | null; active: boolean; createdAt: string; updatedAt: string; expiresAt: string; acceptedAt: string | null };

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const today = () => new Date().toISOString().slice(0, 10);
const formatPKR = (value: number | null | undefined) => value == null ? "—" : `Rs ${Math.round(value).toLocaleString("en-PK")}`;
const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : "—";
const shortName = (value: string) => value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";

export function LivestockDashboard({ identity }: { identity: { displayName: string; email: string; role: "owner" | "staff" } }) {
  const [view, setView] = useState<View>("dashboard");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState("All");
  const [status, setStatus] = useState("All");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AnimalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  async function loadAnimals() {
    try {
      const response = await fetch("/api/animals", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Records could not be loaded.");
      setAnimals(data.animals);
      setUser(data.user);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTeam() {
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Team could not be loaded.");
      setTeam(data.team);
      setInvitations(data.invitations || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Team could not be loaded.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAnimals(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (view !== "team") return;
    const timer = window.setTimeout(() => { void loadTeam(); }, 0);
    return () => window.clearTimeout(timer);
  }, [view]);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const filteredAnimals = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return animals.filter((animal) => {
      const matchesQuery = !needle || [animal.tagNumber, animal.name, animal.breed, animal.sellerName, animal.location]
        .some((value) => value?.toLowerCase().includes(needle));
      return matchesQuery && (species === "All" || animal.species === species) && (status === "All" || animal.status === status);
    });
  }, [animals, query, species, status]);

  const summary = useMemo(() => ({
    total: animals.length,
    active: animals.filter((animal) => animal.status === "Active").length,
    cows: animals.filter((animal) => animal.species === "Cow" && animal.status === "Active").length,
    buffaloes: animals.filter((animal) => animal.species === "Buffalo" && animal.status === "Active").length,
    goats: animals.filter((animal) => animal.species === "Goat" && animal.status === "Active").length,
    camels: animals.filter((animal) => animal.species === "Camel" && animal.status === "Active").length,
    invested: animals.reduce((sum, animal) => sum + (animal.purchasePrice ?? 0), 0),
  }), [animals]);

  async function openAnimal(id: string) {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/animals/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Animal details could not be loaded.");
      setDetail(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Animal details could not be loaded.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshDetail() {
    if (!detail) return;
    await openAnimal(detail.animal.id);
    await loadAnimals();
  }

  async function installApp() {
    if (!installPrompt) {
      toast.info("On mobile, open browser menu and choose ‘Add to Home Screen’. ");
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  const displayIdentity = user?.displayName ?? identity.displayName;
  const isOwner = (user?.role ?? identity.role) === "owner";
  const viewCopy = {
    dashboard: ["Farm overview", "Your livestock records at a glance"],
    animals: ["Animal records", "Search and open any animal’s complete history"],
    reports: ["Farm reports", "Download complete or filtered livestock records as PDF"],
    team: ["Team access", "Separate identities for you and your staff"],
  } as const;
  const [title, subtitle] = viewCopy[view];

  function downloadReport(records = animals, label?: string) {
    if (records.length === 0) {
      toast.info("Add an animal record before downloading a report.");
      return;
    }
    downloadFarmReport(records, displayIdentity, label);
    toast.success("PDF report downloaded.");
  }

  function downloadBackup() {
    window.location.assign("/api/export");
    toast.success("Secure data backup download started.");
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("dashboard")}>
          <span className="brand-icon"><Beef /></span>
          <span><strong>Livestock</strong><small>Record Manager</small></span>
        </button>
        <nav aria-label="Main navigation">
          <NavButton active={view === "dashboard"} icon={<Home />} label="Overview" onClick={() => setView("dashboard")} />
          <NavButton active={view === "animals"} icon={<Beef />} label="Animals" onClick={() => setView("animals")} />
          <NavButton active={view === "reports"} icon={<ClipboardList />} label="Reports" onClick={() => setView("reports")} />
          <NavButton active={view === "team"} icon={<Users />} label="Team access" onClick={() => setView("team")} />
        </nav>
        <div className="sidebar-spacer" />
        <button className="install-card" onClick={installApp}>
          <Smartphone />
          <span><strong>Install mobile app</strong><small>Add it to your phone home screen</small></span>
        </button>
        <div className="sidebar-user">
          <span className="avatar">{shortName(displayIdentity)}</span>
          <span><strong>{displayIdentity}</strong><small>{user?.role === "owner" ? "Farm owner" : "Staff member"}</small></span>
          <a href="/logout" title="Sign out"><LogOut /></a>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Livestock management</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <button className="mobile-profile" aria-label="Account">{shortName(displayIdentity)}</button>
            {animals.length > 0 && <Button className="report-top-button" variant="outline" onClick={() => downloadReport()}><FileDown /><span>PDF report</span></Button>}
            {isOwner && <AddAnimalDialog onCreated={() => { loadAnimals(); setView("animals"); }} />}
          </div>
        </header>

        {view === "dashboard" && (
          <DashboardView loading={loading} summary={summary} animals={animals.slice(0, 6)} canEdit={isOwner} onOpenAnimal={openAnimal} onAdd={() => document.getElementById("add-animal-trigger")?.click()} onViewAll={() => setView("animals")} onReports={() => setView("reports")} onDownload={() => downloadReport()} />
        )}
        {view === "animals" && (
          <AnimalsView loading={loading} animals={filteredAnimals} canEdit={isOwner} query={query} setQuery={setQuery} species={species} setSpecies={setSpecies} status={status} setStatus={setStatus} onOpenAnimal={openAnimal} onAdd={() => document.getElementById("add-animal-trigger")?.click()} onDownload={() => downloadReport(filteredAnimals, "Filtered livestock records")} />
        )}
        {view === "reports" && <ReportsView loading={loading} animals={animals} summary={summary} canBackup={isOwner} onDownload={() => downloadReport()} onBackup={downloadBackup} onInstall={installApp} />}
        {view === "team" && <TeamView currentUser={user} team={team} invitations={invitations} onRefresh={loadTeam} />}
      </main>

      <nav className={isOwner ? "mobile-nav" : "mobile-nav read-only"} aria-label="Mobile navigation">
        <NavButton active={view === "dashboard"} icon={<Home />} label="Overview" onClick={() => setView("dashboard")} />
        <NavButton active={view === "animals"} icon={<Beef />} label="Animals" onClick={() => setView("animals")} />
        {isOwner && <button className="mobile-add" onClick={() => document.getElementById("add-animal-trigger")?.click()} aria-label="Add animal"><PackagePlus /></button>}
        <NavButton active={view === "reports"} icon={<ClipboardList />} label="Reports" onClick={() => setView("reports")} />
        <NavButton active={view === "team"} icon={<Users />} label="Team" onClick={() => setView("team")} />
      </nav>

      <AnimalDetailSheet open={detailOpen} setOpen={setDetailOpen} detail={detail} loading={detailLoading} canEdit={isOwner} requestedBy={displayIdentity} onRefresh={refreshDetail} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick(): void }) {
  return <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function DashboardView({ loading, summary, animals, canEdit, onOpenAnimal, onAdd, onViewAll, onReports, onDownload }: {
  loading: boolean;
  summary: { total: number; active: number; cows: number; buffaloes: number; goats: number; camels: number; invested: number };
  animals: Animal[];
  canEdit: boolean;
  onOpenAnimal(id: string): void;
  onAdd(): void;
  onViewAll(): void;
  onReports(): void;
  onDownload(): void;
}) {
  return (
    <div className="content-stack">
      <section className="farm-summary-banner">
        <div>
          <p className="eyebrow">Complete farm control</p>
          <h2>Every animal record, ready when you need it.</h2>
          <p>Search livestock, review purchase and weight history, then download a clean farm report for your records.</p>
          <div className="farm-summary-actions">
            <Button onClick={onDownload} disabled={loading || summary.total === 0}><FileDown /> Download PDF</Button>
            <Button variant="outline" onClick={onReports}><ClipboardList /> Open reports</Button>
          </div>
        </div>
        <div className="farm-summary-count"><span>Active livestock</span><strong>{loading ? "—" : summary.active}</strong><small>{summary.cows} cows · {summary.buffaloes} buffaloes · {summary.goats} goats · {summary.camels} camels</small></div>
      </section>
      <section className="stats-grid" aria-label="Livestock summary">
        <StatCard icon={<Beef />} label="Total animals" value={summary.total.toString()} note={`${summary.active} currently active`} tone="green" loading={loading} />
        <StatCard icon={<Activity />} label="Active cows" value={summary.cows.toString()} note="Current farm stock" tone="amber" loading={loading} />
        <StatCard icon={<Gauge />} label="Active buffaloes" value={summary.buffaloes.toString()} note="Current farm stock" tone="clay" loading={loading} />
        <StatCard icon={<Beef />} label="Active goats" value={summary.goats.toString()} note="Current farm stock" tone="green" loading={loading} />
        <StatCard icon={<Beef />} label="Active camels" value={summary.camels.toString()} note="Current farm stock" tone="amber" loading={loading} />
        <StatCard icon={<WalletCards />} label="Purchase value" value={formatPKR(summary.invested)} note="All recorded animals" tone="cream" loading={loading} />
      </section>
      <section className="section-card">
        <div className="section-heading">
          <div><p className="eyebrow">Recently updated</p><h2>Animal records</h2></div>
          {animals.length > 0 && <Button variant="outline" onClick={onViewAll}>View all <ChevronRight /></Button>}
        </div>
        {loading ? <TableSkeleton /> : animals.length ? <AnimalTable animals={animals} onOpen={onOpenAnimal} /> : <EmptyAnimals canEdit={canEdit} onAdd={onAdd} />}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, note, tone, loading }: { icon: ReactNode; label: string; value: string; note: string; tone: string; loading: boolean }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="stat-icon">{icon}</span>
      <div><p>{label}</p>{loading ? <Skeleton className="mt-2 h-8 w-24" /> : <strong>{value}</strong>}<small>{note}</small></div>
    </article>
  );
}

function AnimalsView({ loading, animals, canEdit, query, setQuery, species, setSpecies, status, setStatus, onOpenAnimal, onAdd, onDownload }: {
  loading: boolean; animals: Animal[]; query: string; setQuery(value: string): void;
  canEdit: boolean;
  species: string; setSpecies(value: string): void; status: string; setStatus(value: string): void;
  onOpenAnimal(id: string): void; onAdd(): void; onDownload(): void;
}) {
  return (
    <div className="content-stack">
      <section className="filter-bar">
        <div className="search-box"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tag, name, breed or seller…" aria-label="Search animals" /></div>
        <Select value={species} onValueChange={setSpecies}>
          <SelectTrigger className="filter-select"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="All">All animals</SelectItem><SelectItem value="Cow">Cows</SelectItem><SelectItem value="Buffalo">Buffaloes</SelectItem><SelectItem value="Goat">Goats</SelectItem><SelectItem value="Camel">Camels</SelectItem></SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="filter-select"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="All">All status</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Sold">Sold</SelectItem><SelectItem value="Deceased">Deceased</SelectItem></SelectContent>
        </Select>
        <span className="result-count">{animals.length} records</span>
        <Button className="filter-download" variant="outline" onClick={onDownload} disabled={loading || animals.length === 0}><FileDown /><span>PDF</span></Button>
      </section>
      <section className="section-card animal-directory">
        {loading ? <TableSkeleton /> : animals.length ? <AnimalTable animals={animals} onOpen={onOpenAnimal} /> : query || species !== "All" || status !== "All" ? (
          <div className="empty-state"><Search /><h3>No matching animal</h3><p>Try a different tag, name or filter.</p></div>
        ) : <EmptyAnimals canEdit={canEdit} onAdd={onAdd} />}
      </section>
    </div>
  );
}

function ReportsView({ loading, animals, summary, canBackup, onDownload, onBackup, onInstall }: {
  loading: boolean;
  animals: Animal[];
  summary: { total: number; active: number; cows: number; buffaloes: number; goats: number; camels: number; invested: number };
  canBackup: boolean;
  onDownload(): void;
  onBackup(): void;
  onInstall(): void;
}) {
  const sold = animals.filter((animal) => animal.status === "Sold").length;
  return (
    <div className="content-stack">
      <section className="report-workspace">
        <article className="report-download-card">
          <span className="report-icon"><FileDown /></span>
          <p className="eyebrow">PDF export</p>
          <h2>Complete livestock report</h2>
          <p>Download a ready-to-share PDF containing every animal’s tag, type, status, purchase value, current weight and farm location.</p>
          <div className="report-stat-row">
            <div><span>Total records</span><strong>{loading ? "—" : summary.total}</strong></div>
            <div><span>Active</span><strong>{loading ? "—" : summary.active}</strong></div>
            <div><span>Sold</span><strong>{loading ? "—" : sold}</strong></div>
          </div>
          <Button size="lg" onClick={onDownload} disabled={loading || animals.length === 0}><FileDown /> Download complete PDF</Button>
          <small>The report is created instantly on your device. Your farm data is not sent to another service.</small>
        </article>

        <aside className="report-paper" aria-label="PDF report preview">
          <div className="report-paper-head"><Beef /><span><strong>Livestock Record Manager</strong><small>Complete Farm Report</small></span></div>
          <div className="report-paper-summary"><span>{summary.total} records</span><span>{summary.active} active</span><span>{formatPKR(summary.invested)}</span></div>
          <div className="report-paper-table"><b>TAG</b><b>ANIMAL</b><b>STATUS</b>{animals.slice(0, 5).map((animal) => <span key={animal.id} className="report-paper-row"><i>{animal.tagNumber}</i><i>{animal.name || animal.species}</i><i>{animal.status}</i></span>)}</div>
          <div className="report-paper-footer">Private farm record · PDF preview</div>
        </aside>
      </section>

      <section className="report-help-grid">
        <article><ClipboardList /><div><h3>Filtered reports</h3><p>Open Animals, apply species or status filters, then press PDF to download only those matching records.</p></div></article>
        <article><FileText /><div><h3>Individual animal report</h3><p>Open any animal and press Download PDF for its profile, weight, health, expenses and sale history.</p></div></article>
        {canBackup && <button onClick={onBackup}><DatabaseBackup /><div><h3>Owner data backup</h3><p>Download a structured backup of animals, history, staff and audit records for safekeeping.</p></div><FileDown /></button>}
        <button onClick={onInstall}><Smartphone /><div><h3>Install on mobile</h3><p>Add the record manager to your phone home screen for quicker office access.</p></div><ChevronRight /></button>
      </section>
    </div>
  );
}

function AnimalTable({ animals, onOpen }: { animals: Animal[]; onOpen(id: string): void }) {
  return (
    <>
      <div className="desktop-table">
        <Table>
          <TableHeader><TableRow><TableHead>Animal</TableHead><TableHead>Type</TableHead><TableHead>Purchased</TableHead><TableHead>Current weight</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
          <TableBody>{animals.map((animal) => (
            <TableRow key={animal.id} className="animal-row" tabIndex={0} onClick={() => onOpen(animal.id)} onKeyDown={(event) => { if (event.key === "Enter") onOpen(animal.id); }}>
              <TableCell><div className="animal-cell"><AnimalPhoto animal={animal} /><span><strong>{animal.name || `${animal.species} ${animal.tagNumber}`}</strong><small>Tag {animal.tagNumber} {animal.breed ? `• ${animal.breed}` : ""}</small></span></div></TableCell>
              <TableCell>{animal.species}<small className="cell-sub">{animal.sex}</small></TableCell>
              <TableCell>{formatPKR(animal.purchasePrice)}<small className="cell-sub">{formatDate(animal.purchaseDate)}</small></TableCell>
              <TableCell>{animal.currentWeightKg == null ? "—" : `${animal.currentWeightKg} kg`}<small className="cell-sub">Bought {animal.purchaseWeightKg == null ? "—" : `${animal.purchaseWeightKg} kg`}</small></TableCell>
              <TableCell><StatusBadge status={animal.status} /></TableCell>
              <TableCell><ChevronRight className="row-arrow" /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <div className="animal-card-list">{animals.map((animal) => (
        <button key={animal.id} className="animal-mobile-card" onClick={() => onOpen(animal.id)}>
          <AnimalPhoto animal={animal} />
          <span className="animal-mobile-info"><strong>{animal.name || `${animal.species} ${animal.tagNumber}`}</strong><small>Tag {animal.tagNumber} • {animal.breed || animal.species}</small><span>{animal.currentWeightKg == null ? "Weight not added" : `${animal.currentWeightKg} kg`} · {formatPKR(animal.purchasePrice)}</span></span>
          <StatusBadge status={animal.status} /><ChevronRight />
        </button>
      ))}</div>
    </>
  );
}

function AnimalPhoto({ animal, large = false }: { animal: Pick<Animal, "photoUrl" | "species" | "name" | "tagNumber">; large?: boolean }) {
  return animal.photoUrl ? <img className={large ? "animal-photo large" : "animal-photo"} src={animal.photoUrl} alt={animal.name || `${animal.species} ${animal.tagNumber}`} /> : <span className={large ? "animal-photo placeholder large" : "animal-photo placeholder"}><Beef /></span>;
}

function StatusBadge({ status }: { status: Animal["status"] }) {
  return <Badge variant="outline" className={`status-badge ${status.toLowerCase()}`}>{status}</Badge>;
}

function EmptyAnimals({ canEdit, onAdd }: { canEdit: boolean; onAdd(): void }) {
  return <div className="empty-state"><span className="empty-icon"><Beef /></span><h3>{canEdit ? "Add your first animal" : "No animal records yet"}</h3><p>{canEdit ? "Save its photo, purchase information and starting weight in one profile." : "The farm owner has not added any animals yet."}</p>{canEdit && <Button onClick={onAdd}><PackagePlus /> Add animal</Button>}</div>;
}

function TableSkeleton() {
  return <div className="skeleton-list">{[1, 2, 3, 4].map((item) => <div key={item}><Skeleton className="size-12 rounded-xl" /><span><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></span><Skeleton className="ml-auto h-7 w-20" /></div>)}</div>;
}

function AddAnimalDialog({ onCreated }: { onCreated(): void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/animals", { method: "POST", body: new FormData(event.currentTarget) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Animal could not be saved.");
      toast.success(`Tag ${data.animal.tagNumber} added successfully.`);
      setOpen(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Animal could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button id="add-animal-trigger" size="lg"><PackagePlus /> <span>Add animal</span></Button></DialogTrigger>
      <DialogContent className="add-dialog">
        <DialogHeader><DialogTitle>Add a new animal</DialogTitle><DialogDescription>Create one complete cow, buffalo, goat or camel record. You can add history later.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="animal-form">
          <FormSection title="Identity & photo" icon={<ImagePlus />}>
            <div className="form-grid">
              <Field label="Animal photo" className="full"><Input name="photo" type="file" accept="image/*" /></Field>
              <Field label="Tag / ID number *"><Input name="tagNumber" required placeholder="e.g. BF-024" /></Field>
              <Field label="Animal name"><Input name="name" placeholder="Optional name" /></Field>
              <Field label="Animal type *"><Select name="species" defaultValue="Buffalo"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Buffalo">Buffalo</SelectItem><SelectItem value="Cow">Cow</SelectItem><SelectItem value="Goat">Goat</SelectItem><SelectItem value="Camel">Camel</SelectItem></SelectContent></Select></Field>
              <Field label="Sex *"><Select name="sex" defaultValue="Female"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem></SelectContent></Select></Field>
              <Field label="Breed"><Input name="breed" placeholder="e.g. Nili Ravi" /></Field>
              <Field label="Color / markings"><Input name="color" placeholder="Black, white patch…" /></Field>
              <Field label="Date of birth"><Input name="dateOfBirth" type="date" /></Field>
              <Field label="Farm location"><Input name="location" placeholder="Shed / pen" /></Field>
            </div>
          </FormSection>
          <FormSection title="Purchase record" icon={<CircleDollarSign />}>
            <div className="form-grid">
              <Field label="Purchase date"><Input name="purchaseDate" type="date" defaultValue={today()} /></Field>
              <Field label="Purchase price (PKR)"><Input name="purchasePrice" type="number" min="0" inputMode="numeric" placeholder="250000" /></Field>
              <Field label="Weight when purchased (kg)"><Input name="purchaseWeightKg" type="number" min="0" step="0.1" inputMode="decimal" placeholder="420" /></Field>
              <Field label="Purchased from"><Input name="sellerName" placeholder="Seller name" /></Field>
              <Field label="Seller phone"><Input name="sellerPhone" inputMode="tel" placeholder="03xx xxxxxxx" /></Field>
              <Field label="Old record source"><Select name="recordSource" defaultValue="WhatsApp"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WhatsApp">WhatsApp</SelectItem><SelectItem value="Photo">Photo</SelectItem><SelectItem value="Fresh record">Fresh record</SelectItem></SelectContent></Select></Field>
              <Field label="WhatsApp screenshot / old record" className="full" hint="Image or PDF, maximum 10 MB"><Input name="sourceFile" type="file" accept="image/*,.pdf" /></Field>
              <Field label="Notes" className="full"><Textarea name="notes" placeholder="Identification marks, purchase condition or any other detail…" rows={3} /></Field>
            </div>
          </FormSection>
          <DialogFooter className="sticky-dialog-footer"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save animal record"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAnimalDialog({ animal, onSaved }: { animal: Animal; onSaved(): Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/animals/${animal.id}`, { method: "PATCH", body: new FormData(event.currentTarget) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Animal could not be updated.");
      toast.success(`Tag ${data.animal.tagNumber} updated successfully.`);
      setOpen(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Animal could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="detail-edit-button" variant="outline" size="sm"><Pencil /> Edit animal</Button></DialogTrigger>
    <DialogContent className="add-dialog"><DialogHeader><DialogTitle>Edit animal record</DialogTitle><DialogDescription>Correct profile and purchase information. History entries remain unchanged.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="animal-form">
        <FormSection title="Identity & status" icon={<Pencil />}><div className="form-grid">
          <Field label="Replace photo" className="full" hint="Leave blank to keep the current photo"><Input name="photo" type="file" accept="image/*" /></Field>
          <Field label="Tag / ID number *"><Input name="tagNumber" defaultValue={animal.tagNumber} required /></Field>
          <Field label="Animal name"><Input name="name" defaultValue={animal.name || ""} /></Field>
          <Field label="Animal type *"><Select name="species" defaultValue={animal.species}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Buffalo">Buffalo</SelectItem><SelectItem value="Cow">Cow</SelectItem><SelectItem value="Goat">Goat</SelectItem><SelectItem value="Camel">Camel</SelectItem></SelectContent></Select></Field>
          <Field label="Sex *"><Select name="sex" defaultValue={animal.sex}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem></SelectContent></Select></Field>
          <Field label="Status *"><Select name="status" defaultValue={animal.status}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Sold">Sold</SelectItem><SelectItem value="Deceased">Deceased</SelectItem></SelectContent></Select></Field>
          <Field label="Breed"><Input name="breed" defaultValue={animal.breed || ""} /></Field>
          <Field label="Color / markings"><Input name="color" defaultValue={animal.color || ""} /></Field>
          <Field label="Date of birth"><Input name="dateOfBirth" type="date" defaultValue={animal.dateOfBirth?.slice(0, 10) || ""} /></Field>
          <Field label="Farm location"><Input name="location" defaultValue={animal.location || ""} /></Field>
        </div></FormSection>
        <FormSection title="Purchase information" icon={<CircleDollarSign />}><div className="form-grid">
          <Field label="Purchase date"><Input name="purchaseDate" type="date" defaultValue={animal.purchaseDate?.slice(0, 10) || ""} /></Field>
          <Field label="Purchase price (PKR)"><Input name="purchasePrice" type="number" min="0" defaultValue={animal.purchasePrice ?? ""} /></Field>
          <Field label="Weight when purchased (kg)"><Input name="purchaseWeightKg" type="number" min="0" step="0.1" defaultValue={animal.purchaseWeightKg ?? ""} /></Field>
          <Field label="Purchased from"><Input name="sellerName" defaultValue={animal.sellerName || ""} /></Field>
          <Field label="Seller phone"><Input name="sellerPhone" inputMode="tel" defaultValue={animal.sellerPhone || ""} /></Field>
          <Field label="Record source"><Select name="recordSource" defaultValue={animal.recordSource || "Fresh record"}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WhatsApp">WhatsApp</SelectItem><SelectItem value="Photo">Photo</SelectItem><SelectItem value="Fresh record">Fresh record</SelectItem></SelectContent></Select></Field>
          <Field label="Notes" className="full"><Textarea name="notes" defaultValue={animal.notes || ""} rows={3} /></Field>
        </div></FormSection>
        <DialogFooter className="sticky-dialog-footer"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function FormSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="form-section"><h3>{icon}{title}</h3>{children}</section>;
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return <div className={`field ${className}`}><Label>{label}</Label>{children}{hint && <small>{hint}</small>}</div>;
}

function TeamView({ currentUser, team, invitations, onRefresh }: { currentUser: AppUser | null; team: TeamUser[]; invitations: StaffInvitation[]; onRefresh(): Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState("");
  const isOwner = currentUser?.role === "owner";

  async function inviteStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Staff email could not be approved.");
      setInvitationUrl(data.invitationUrl);
      toast.success("Private staff invitation link created.");
      form.reset();
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Staff email could not be approved.");
    } finally {
      setSaving(false);
    }
  }

  async function copyInvitation() {
    await navigator.clipboard.writeText(invitationUrl);
    toast.success("Invitation link copied. Send it to staff on WhatsApp.");
  }

  async function updateAccess(payload: { userId?: string; invitationId?: string; active: boolean }, message: string) {
    try {
      const response = await fetch("/api/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Access could not be updated.");
      toast.success(message);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Access could not be updated.");
    }
  }

  return (
    <div className="content-stack">
      <section className="team-banner"><span><ShieldCheck /></span><div><h2>Owner-controlled staff access</h2><p>Staff can search animals and view complete records, but only the Owner can add or change data.</p></div></section>
      {isOwner && <section className="section-card invite-card">
        <div className="section-heading"><div><p className="eyebrow">Staff invitation</p><h2>Create a private login link</h2></div><MailPlus /></div>
        <form className="invite-form" onSubmit={inviteStaff}>
          <Field label="Staff name"><Input name="displayName" placeholder="e.g. Farm Supervisor" /></Field>
          <Field label="Staff email *"><Input name="email" type="email" required placeholder="staff@example.com" /></Field>
          <Button type="submit" disabled={saving}><MailPlus /> {saving ? "Creating…" : "Create invitation"}</Button>
        </form>
        <p className="invite-note">A private link valid for 7 days will be created. Send it to the staff member on WhatsApp; no ChatGPT account is required.</p>
        {invitationUrl && <div className="invite-link-box"><span><strong>Private invitation ready</strong><small>{invitationUrl}</small></span><Button type="button" onClick={copyInvitation}><Copy /> Copy link</Button></div>}
      </section>}
      <section className="section-card">
        <div className="section-heading"><div><p className="eyebrow">Approved users</p><h2>Your farm team</h2></div><Badge variant="outline">{team.length || 1} member{team.length === 1 ? "" : "s"}</Badge></div>
        <div className="team-list">{(team.length ? team : currentUser ? [currentUser] : []).map((member) => (
          <div className={`team-member ${member.active ? "" : "inactive"}`} key={member.id}><span className="avatar">{shortName(member.displayName)}</span><span><strong>{member.displayName}</strong><small>{member.email}</small></span><Badge className={member.role === "owner" ? "owner-badge" : "staff-badge"}>{member.role === "owner" ? "Owner" : member.active ? "Staff" : "Disabled"}</Badge><span className="last-seen">Last active {formatDate(member.lastSeenAt)}</span>{isOwner && member.role === "staff" && <Button className="access-toggle" variant="outline" size="sm" onClick={() => updateAccess({ userId: member.id, active: !member.active }, member.active ? "Staff access disabled." : "Staff access restored.")}>{member.active ? <UserX /> : <UserCheck />}{member.active ? "Disable" : "Restore"}</Button>}</div>
        ))}</div>
        {isOwner && invitations.filter((invitation) => invitation.active && !invitation.acceptedAt).length > 0 && <div className="pending-invites"><h3>Waiting for staff signup</h3>{invitations.filter((invitation) => invitation.active && !invitation.acceptedAt).map((invitation) => <div key={invitation.id}><span className="avatar">{shortName(invitation.displayName || invitation.email)}</span><span><strong>{invitation.displayName || "Invited staff"}</strong><small>{invitation.email} · expires {formatDate(invitation.expiresAt)}</small></span><Button variant="outline" size="sm" onClick={() => updateAccess({ invitationId: invitation.id, active: false }, "Invitation cancelled.")}><UserX /> Cancel</Button></div>)}</div>}
      </section>
      <section className="help-card"><Menu /><div><h3>How staff login works</h3><p>Create the invitation, copy its private link and send it by WhatsApp. Staff opens the link in any browser, creates a password, signs in and installs the app. Their screen remains read-only.</p></div></section>
    </div>
  );
}

function AnimalDetailSheet({ open, setOpen, detail, loading, canEdit, requestedBy, onRefresh }: { open: boolean; setOpen(value: boolean): void; detail: AnimalDetail | null; loading: boolean; canEdit: boolean; requestedBy: string; onRefresh(): Promise<void> }) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="animal-sheet">
        {loading || !detail ? <DetailSkeleton /> : <AnimalDetailContent detail={detail} canEdit={canEdit} requestedBy={requestedBy} onRefresh={onRefresh} />}
      </SheetContent>
    </Sheet>
  );
}

function DetailSkeleton() {
  return <div className="detail-skeleton"><Skeleton className="h-52 w-full rounded-none" /><div><Skeleton className="h-7 w-52" /><Skeleton className="mt-3 h-4 w-32" /><Skeleton className="mt-8 h-28 w-full" /><Skeleton className="mt-4 h-48 w-full" /></div></div>;
}

function AnimalDetailContent({ detail, canEdit, requestedBy, onRefresh }: { detail: AnimalDetail; canEdit: boolean; requestedBy: string; onRefresh(): Promise<void> }) {
  const { animal } = detail;
  function downloadReport() {
    downloadAnimalReport(detail, requestedBy);
    toast.success(`Animal ${animal.tagNumber} PDF downloaded.`);
  }
  return (
    <>
      <SheetHeader className="detail-hero">
        <AnimalPhoto animal={animal} large />
        <div className="detail-hero-copy"><div><StatusBadge status={animal.status} /><span className="tag-pill">Tag {animal.tagNumber}</span></div><SheetTitle>{animal.name || `${animal.species} ${animal.tagNumber}`}</SheetTitle><SheetDescription>{[animal.breed, animal.sex, animal.location].filter(Boolean).join(" • ") || animal.species}</SheetDescription><div className="detail-actions"><Button className="detail-pdf-button" variant="outline" size="sm" onClick={downloadReport}><FileDown /> Download PDF</Button>{canEdit && <EditAnimalDialog animal={animal} onSaved={onRefresh} />}</div></div>
      </SheetHeader>
      <div className="detail-body">
        {!canEdit && <div className="read-only-notice"><ShieldCheck /><span><strong>Read-only staff access</strong><small>You can view all records. Only the Owner can add or change information.</small></span></div>}
        <Tabs defaultValue="profile">
          <TabsList variant="line" className="detail-tabs"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="history">Weight & health</TabsTrigger><TabsTrigger value="finance">Expenses & sale</TabsTrigger></TabsList>
          <TabsContent value="profile" className="tab-panel">
            <InfoGrid animal={animal} />
            <DetailSection icon={<FileText />} title="Notes & source">
              <p className="detail-notes">{animal.notes || "No notes added."}</p>
              <dl className="mini-details"><div><dt>Record source</dt><dd>{animal.recordSource || "—"}</dd></div><div><dt>Added by</dt><dd>{animal.createdBy}</dd></div></dl>
              {detail.attachments.length > 0 && <div className="attachments"><h4>Attached records</h4>{detail.attachments.map((file) => <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer"><FileText /> {file.fileName}</a>)}</div>}
            </DetailSection>
          </TabsContent>
          <TabsContent value="history" className="tab-panel">
            {canEdit && <RecordComposer animalId={animal.id} type="weight" title="Add new weight" icon={<Weight />} onSaved={onRefresh} />}
            <TimelineList title="Weight history" empty="No weight records yet." items={detail.weights.map((record) => ({ id: record.id, icon: <Weight />, title: `${record.weightKg} kg`, date: formatDate(record.measuredAt), note: record.notes }))} />
            {canEdit && <RecordComposer animalId={animal.id} type="health" title="Add health record" icon={<HeartPulse />} onSaved={onRefresh} />}
            <TimelineList title="Health & vaccination" empty="No health records yet." items={detail.health.map((record) => ({ id: record.id, icon: <HeartPulse />, title: `${record.category}: ${record.title}`, date: formatDate(record.eventDate), note: [record.veterinarian, record.nextDueDate ? `Next due ${formatDate(record.nextDueDate)}` : null, record.cost ? formatPKR(record.cost) : null].filter(Boolean).join(" • ") || record.notes }))} />
          </TabsContent>
          <TabsContent value="finance" className="tab-panel">
            <FinancialSummary detail={detail} />
            {canEdit && <RecordComposer animalId={animal.id} type="expense" title="Add animal expense" icon={<WalletCards />} onSaved={onRefresh} />}
            <TimelineList title="Expense history" empty="No expenses added yet." items={detail.expenses.map((record) => ({ id: record.id, icon: <CircleDollarSign />, title: `${record.category} — ${formatPKR(record.amount)}`, date: formatDate(record.expenseDate), note: record.notes }))} />
            {canEdit && animal.status !== "Sold" && <RecordComposer animalId={animal.id} type="sale" title="Mark animal as sold" icon={<CircleDollarSign />} onSaved={onRefresh} />}
            {detail.sales.length > 0 && <TimelineList title="Sale record" empty="" items={detail.sales.map((record) => ({ id: record.id, icon: <CircleDollarSign />, title: `Sold for ${formatPKR(record.salePrice)}`, date: formatDate(record.saleDate), note: [record.buyerName, record.saleWeightKg ? `${record.saleWeightKg} kg` : null, record.buyerPhone].filter(Boolean).join(" • ") }))} />}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function InfoGrid({ animal }: { animal: Animal }) {
  const items = [
    ["Animal type", animal.species], ["Breed", animal.breed], ["Sex", animal.sex], ["Date of birth", formatDate(animal.dateOfBirth)],
    ["Color / markings", animal.color], ["Location", animal.location], ["Purchase date", formatDate(animal.purchaseDate)], ["Purchase price", formatPKR(animal.purchasePrice)],
    ["Weight at purchase", animal.purchaseWeightKg == null ? null : `${animal.purchaseWeightKg} kg`], ["Current weight", animal.currentWeightKg == null ? null : `${animal.currentWeightKg} kg`],
    ["Seller", animal.sellerName], ["Seller phone", animal.sellerPhone],
  ];
  return <section className="info-grid">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}</section>;
}

function DetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <section className="detail-section"><h3>{icon}{title}</h3>{children}</section>;
}

function FinancialSummary({ detail }: { detail: AnimalDetail }) {
  const expenses = detail.expenses.reduce((sum, record) => sum + record.amount, 0) + detail.health.reduce((sum, record) => sum + (record.cost || 0), 0);
  const sale = detail.sales.reduce((sum, record) => sum + record.salePrice, 0);
  return <section className="financial-summary"><div><span>Purchase price</span><strong>{formatPKR(detail.animal.purchasePrice)}</strong></div><div><span>Additional expenses</span><strong>{formatPKR(expenses)}</strong></div><div><span>Sale amount</span><strong>{formatPKR(sale)}</strong></div></section>;
}

function TimelineList({ title, empty, items }: { title: string; empty: string; items: { id: string; icon: ReactNode; title: string; date: string; note: string | null | undefined }[] }) {
  return <section className="timeline-section"><h3>{title}</h3>{items.length ? <div className="timeline">{items.map((item) => <article key={item.id}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.date}</small>{item.note && <p>{item.note}</p>}</div></article>)}</div> : <p className="inline-empty">{empty}</p>}</section>;
}

function RecordComposer({ animalId, type, title, icon, onSaved }: { animalId: string; type: "weight" | "health" | "expense" | "sale"; title: string; icon: ReactNode; onSaved(): Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(`/api/animals/${animalId}/records`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, type }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Record could not be saved.");
      toast.success("Record saved successfully.");
      setOpen(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="record-composer"><span>{icon}</span><div><strong>{title}</strong><small>Keep this animal’s profile up to date</small></div><PackagePlus /></button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>The new entry will be added to this animal’s permanent history.</DialogDescription></DialogHeader><form onSubmit={submit} className="record-form">
        {type === "weight" && <><Field label="Weight (kg)"><Input name="weightKg" type="number" min="0" step="0.1" required /></Field><Field label="Measured date"><Input name="measuredAt" type="date" defaultValue={today()} required /></Field><Field label="Notes" className="full"><Textarea name="notes" rows={2} /></Field></>}
        {type === "health" && <><Field label="Record type"><Select name="category" defaultValue="Vaccination"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Vaccination">Vaccination</SelectItem><SelectItem value="Treatment">Treatment</SelectItem><SelectItem value="Checkup">Checkup</SelectItem></SelectContent></Select></Field><Field label="Title"><Input name="title" required placeholder="Vaccine or treatment name" /></Field><Field label="Date"><Input name="eventDate" type="date" defaultValue={today()} required /></Field><Field label="Next due date"><Input name="nextDueDate" type="date" /></Field><Field label="Veterinarian"><Input name="veterinarian" /></Field><Field label="Cost (PKR)"><Input name="cost" type="number" min="0" /></Field><Field label="Notes" className="full"><Textarea name="notes" rows={2} /></Field></>}
        {type === "expense" && <><Field label="Expense category"><Input name="category" required placeholder="Feed, transport, medicine…" /></Field><Field label="Amount (PKR)"><Input name="amount" type="number" min="0" required /></Field><Field label="Expense date"><Input name="expenseDate" type="date" defaultValue={today()} required /></Field><Field label="Notes"><Input name="notes" /></Field></>}
        {type === "sale" && <><Field label="Sale date"><Input name="saleDate" type="date" defaultValue={today()} required /></Field><Field label="Sale price (PKR)"><Input name="salePrice" type="number" min="0" required /></Field><Field label="Sale weight (kg)"><Input name="saleWeightKg" type="number" min="0" step="0.1" /></Field><Field label="Buyer name"><Input name="buyerName" /></Field><Field label="Buyer phone"><Input name="buyerPhone" inputMode="tel" /></Field><Field label="Notes"><Input name="notes" /></Field></>}
        <DialogFooter className="full"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save record"}</Button></DialogFooter>
      </form></DialogContent>
    </Dialog>
  );
}
