import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, ArrowLeft, BookOpen, Layers, Shield, Zap, Users, Calendar, MessageSquare, Bell, BarChart3, Heart, AlertTriangle, Search, HelpCircle, ChevronDown, Book } from "lucide-react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const Documentation = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      const addNewPage = () => {
        doc.addPage();
        y = margin;
      };

      const checkPageBreak = (height: number) => {
        if (y + height > pageHeight - margin) {
          addNewPage();
        }
      };

      // Cover Page
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      
      // Decorative gradient effect
      doc.setFillColor(59, 130, 246);
      doc.rect(0, pageHeight * 0.4, pageWidth, 3, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(42);
      doc.setFont("helvetica", "bold");
      doc.text("DONIA", pageWidth / 2, pageHeight * 0.35, { align: "center" });
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "normal");
      doc.text("Documentation Technique", pageWidth / 2, pageHeight * 0.42, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184);
      doc.text("Plateforme Modulaire Medicale, Educative et Sociale", pageWidth / 2, pageHeight * 0.50, { align: "center" });
      
      doc.setFontSize(10);
      doc.text("Version 1.0.0 | Decembre 2024", pageWidth / 2, pageHeight * 0.85, { align: "center" });
      doc.text("Statut: MVP en developpement", pageWidth / 2, pageHeight * 0.88, { align: "center" });

      // Table of Contents
      addNewPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Table des Matieres", margin, y + 10);
      y += 25;
      
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + 60, y);
      y += 15;

      const tocItems = [
        { num: "1", title: "Vue d'ensemble", page: 3 },
        { num: "2", title: "Carte des modules", page: 4 },
        { num: "3", title: "Documentation par module", page: 5 },
        { num: "3.1", title: "Module Auth", page: 5, indent: true },
        { num: "3.2", title: "Module Users", page: 6, indent: true },
        { num: "3.3", title: "Module Medical", page: 7, indent: true },
        { num: "3.4", title: "Module Courses", page: 8, indent: true },
        { num: "3.5", title: "Module Agenda", page: 9, indent: true },
        { num: "3.6", title: "Module Chat", page: 10, indent: true },
        { num: "3.7", title: "Module Notifications", page: 11, indent: true },
        { num: "3.8", title: "Module Analytics", page: 12, indent: true },
        { num: "3.9", title: "Module Social", page: 13, indent: true },
        { num: "3.10", title: "Module SOS", page: 14, indent: true },
        { num: "3.11", title: "Module Search", page: 15, indent: true },
        { num: "4", title: "Diagrammes de flux", page: 16 },
        { num: "5", title: "Securite globale", page: 17 },
        { num: "6", title: "Backlog priorise", page: 18 },
        { num: "7", title: "FAQ", page: 19 },
        { num: "8", title: "Glossaire", page: 20 },
      ];

      doc.setFontSize(11);
      tocItems.forEach((item) => {
        const xOffset = item.indent ? margin + 10 : margin;
        doc.setFont("helvetica", item.indent ? "normal" : "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`${item.num}. ${item.title}`, xOffset, y);
        doc.setTextColor(100, 116, 139);
        doc.text(`${item.page}`, pageWidth - margin, y, { align: "right" });
        y += 8;
      });

      // Section 1: Vue d'ensemble
      addNewPage();
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("1. Vue d'ensemble", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 50, y);
      y += 15;

      doc.setFontSize(14);
      doc.text("1.1 Presentation du projet", margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const presentation = [
        "DONIA est une plateforme web modulaire combinant des fonctionnalites sociales,",
        "educatives, medicales et d'assistance d'urgence. Elle est concue pour etre",
        "evolutive, securisee et conforme aux normes RGPD.",
      ];
      presentation.forEach((line) => {
        doc.text(line, margin, y);
        y += 6;
      });
      y += 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("1.2 Stack Technologique", margin, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Couche", "Technologies"]],
        body: [
          ["Frontend", "React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI"],
          ["Backend", "Supabase (PostgreSQL, Auth, Edge Functions, Realtime)"],
          ["State", "TanStack React Query, React Context"],
          ["Routing", "React Router DOM v6"],
          ["Notifications", "Sonner (toasts)"],
          ["Charts", "Recharts"],
          ["Export", "jsPDF, jspdf-autotable"],
          ["Hebergement", "OVH Cloud (frontend) + Lovable Cloud (backend)"],
        ],
        margin: { left: margin },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("1.3 Architecture des repertoires", margin, y);
      y += 10;

      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      const structure = [
        "DONIA/",
        "├── src/",
        "│   ├── components/     # Composants reutilisables",
        "│   │   ├── layout/     # Layouts (Dashboard, Sidebar)",
        "│   │   ├── medical/    # Module medical",
        "│   │   ├── sos/        # Module SOS",
        "│   │   └── ui/         # Composants Shadcn/UI",
        "│   ├── hooks/          # Hooks personnalises",
        "│   ├── integrations/   # Supabase client & types",
        "│   ├── pages/          # Pages de l'application",
        "│   └── lib/            # Utilitaires",
        "├── supabase/           # Migrations SQL",
        "└── docs/               # Documentation",
      ];
      structure.forEach((line) => {
        doc.text(line, margin, y);
        y += 5;
      });

      // Section 2: Carte des modules
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("2. Carte des Modules", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 50, y);
      y += 15;

      autoTable(doc, {
        startY: y,
        head: [["Module", "Pages", "Tables DB", "Statut"]],
        body: [
          ["Auth", "/auth", "profiles, user_roles", "Implemente"],
          ["Dashboard", "/dashboard", "-", "Implemente"],
          ["Users", "/dashboard/users", "profiles, user_roles", "Implemente"],
          ["Medical", "/dashboard/medical", "patients, medical_records, appointments", "Implemente"],
          ["Education", "/dashboard/education", "courses", "UI statique"],
          ["Courses", "/dashboard/courses", "courses, lessons, quizzes...", "Implemente"],
          ["Agenda", "/dashboard/agenda", "events", "Implemente"],
          ["Chat", "/dashboard/chat", "conversations, messages...", "Implemente"],
          ["Notifications", "/dashboard/notifications", "notifications", "Implemente"],
          ["Analytics", "/dashboard/analytics", "-", "Implemente"],
          ["Social", "/dashboard/social", "social_posts, social_likes...", "Implemente"],
          ["SOS", "/dashboard/sos", "sos_alerts, sos_comments...", "Implemente"],
          ["Search", "Cmd+K", "Multi-tables", "Implemente"],
        ],
        margin: { left: margin },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { fontStyle: "bold" },
          3: { halign: "center" },
        },
      });

      // Section 3: Documentation modules (sample)
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("3. Documentation par Module", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 60, y);
      y += 20;

      // Module Auth
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin, y, contentWidth, 60, 3, 3, "F");
      y += 10;
      
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text("3.1 Module Auth (Authentification)", margin + 5, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const authDesc = [
        "Gestion complete de l'authentification utilisateur avec creation automatique",
        "de profil et attribution de role par defaut.",
        "",
        "Fonctionnalites: Login, Signup, Logout, Gestion des sessions JWT",
        "Tables: auth.users (Supabase), profiles, user_roles",
        "Securite: RLS active, fonction has_role() pour verification permissions",
      ];
      authDesc.forEach((line) => {
        doc.text(line, margin + 5, y);
        y += 5;
      });
      y += 15;

      // Module Medical
      checkPageBreak(70);
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(margin, y, contentWidth, 65, 3, 3, "F");
      y += 10;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(146, 64, 14);
      doc.text("3.3 Module Medical", margin + 5, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const medicalDesc = [
        "Gestion complete des dossiers patients, rendez-vous et historique medical.",
        "Accessible aux medical_staff et admin.",
        "",
        "Tables: patients, medical_records, appointments",
        "Champs patient: nom, prenom, date naissance, groupe sanguin, allergies",
        "Champs dossier: type, diagnostic, symptomes, traitement, prescription",
        "Securite: RLS - seul le staff medical et admins peuvent acceder",
      ];
      medicalDesc.forEach((line) => {
        doc.text(line, margin + 5, y);
        y += 5;
      });
      y += 15;

      // Module SOS
      checkPageBreak(70);
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(margin, y, contentWidth, 65, 3, 3, "F");
      y += 10;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28);
      doc.text("3.10 Module SOS/Assistance", margin + 5, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const sosDesc = [
        "Systeme d'alertes d'urgence avec workflow complet de prise en charge.",
        "Temps reel via Supabase Realtime.",
        "",
        "Tables: sos_alerts, sos_comments, sos_responders",
        "Statuts: pending → in_progress → resolved / cancelled",
        "Priorites: critical, high, medium, low",
        "Categories: medical, security, fire, natural_disaster, other",
      ];
      sosDesc.forEach((line) => {
        doc.text(line, margin + 5, y);
        y += 5;
      });

      // Section 4: Diagrammes
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("4. Diagrammes de Flux", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 50, y);
      y += 15;

      doc.setFontSize(14);
      doc.text("4.1 Flux Global Utilisateur", margin, y);
      y += 10;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, 45, 3, 3, "F");
      y += 8;
      
      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      const globalFlow = [
        "VISITEUR ──► Landing Page (/) ──► Auth (/auth)",
        "                                      │",
        "                         ┌────────────┴────────────┐",
        "                         ▼                         ▼",
        "                    [LOGIN]                   [SIGNUP]",
        "                         └────────────┬────────────┘",
        "                                      ▼",
        "                            Dashboard (/dashboard)",
      ];
      globalFlow.forEach((line) => {
        doc.text(line, margin + 5, y);
        y += 5;
      });
      y += 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("4.2 Flux SOS/Urgence", margin, y);
      y += 10;

      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, contentWidth, 50, 3, 3, "F");
      y += 8;
      
      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      const sosFlow = [
        "UTILISATEUR ──► Bouton SOS ──► Formulaire Alerte",
        "                                     │",
        "                                     ▼",
        "                   Alerte creee (status: pending)",
        "                                     │",
        "       ┌─────────────────────────────┼─────────────────────────────┐",
        "       ▼                             ▼                             ▼",
        "  [PRISE EN CHARGE]           [COMMENTAIRES]              [RESOLUTION]",
        "  status: in_progress         Suivi interne              status: resolved",
      ];
      sosFlow.forEach((line) => {
        doc.text(line, margin + 5, y);
        y += 5;
      });

      // Section 5: Sécurité
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("5. Securite Globale", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 50, y);
      y += 15;

      doc.setFontSize(14);
      doc.text("5.1 Row Level Security (RLS)", margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const securityText = [
        "Toutes les tables utilisent RLS pour controler l'acces aux donnees.",
        "Chaque requete est automatiquement filtree selon l'utilisateur connecte.",
        "",
        "Roles disponibles: admin, teacher, student, medical_staff, parent, user",
        "",
        "Fonction de verification:",
        "has_role(user_id UUID, role app_role) → BOOLEAN",
      ];
      securityText.forEach((line) => {
        doc.text(line, margin, y);
        y += 6;
      });
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Table", "SELECT", "INSERT", "UPDATE", "DELETE"]],
        body: [
          ["profiles", "Owner only", "Auto (trigger)", "Owner only", "-"],
          ["patients", "Medical + Admin", "Medical + Admin", "Medical + Admin", "Admin only"],
          ["sos_alerts", "Participants", "Authenticated", "Owner/Assigned", "Admin only"],
          ["social_posts", "All authenticated", "Owner", "Owner", "Owner"],
          ["courses", "All (published)", "Teacher + Admin", "Teacher + Admin", "Admin only"],
        ],
        margin: { left: margin },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8 },
      });

      // Section 6: Backlog
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("6. Backlog Priorise", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 50, y);
      y += 15;

      autoTable(doc, {
        startY: y,
        head: [["#", "Fonctionnalite", "Module", "Priorite", "Effort"]],
        body: [
          ["1", "OAuth (Google, GitHub)", "Auth", "P1", "M"],
          ["2", "Reset password par email", "Auth", "P1", "S"],
          ["3", "Interoperabilite HL7/FHIR", "Medical", "P1", "L"],
          ["4", "Notifications push temps reel", "Notifications", "P1", "M"],
          ["5", "Geolocalisation alertes SOS", "SOS", "P1", "M"],
          ["6", "Export PDF dossier patient", "Medical", "P2", "M"],
          ["7", "Module Research Core", "Nouveau", "P2", "L"],
          ["8", "Dashboard intervenants SOS", "SOS", "P2", "M"],
          ["9", "Badges et gamification", "Courses", "P2", "M"],
          ["10", "Partage posts Social", "Social", "P2", "S"],
          ["11", "Planification RDV", "Medical", "P2", "M"],
          ["12", "SSO entreprise", "Auth", "P3", "L"],
          ["13", "IA diagnostic assiste", "Medical", "P3", "L"],
          ["14", "Visioconference", "Chat", "P3", "L"],
          ["15", "Application mobile", "Global", "P3", "L"],
        ],
        margin: { left: margin },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          3: { halign: "center" },
          4: { halign: "center" },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Legende effort: S = Small (1-2 jours), M = Medium (3-5 jours), L = Large (1-2 semaines)", margin, y);

      // Section 7: FAQ
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("7. Foire Aux Questions (FAQ)", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 70, y);
      y += 20;

      const faqItems = [
        {
          q: "Comment demarrer avec DONIA ?",
          a: "Clonez le repo, installez les dependances avec 'npm install', puis lancez 'npm run dev'. L'application sera accessible sur http://localhost:5173."
        },
        {
          q: "Quels sont les roles disponibles ?",
          a: "6 roles: admin, teacher, student, medical_staff, parent, user. Les admins peuvent attribuer des roles via le module Utilisateurs."
        },
        {
          q: "Comment fonctionne la securite des donnees ?",
          a: "DONIA utilise Row Level Security (RLS) de Supabase. Chaque table a des politiques definissant qui peut lire/ecrire les donnees selon le role de l'utilisateur."
        },
        {
          q: "Le module SOS est-il en temps reel ?",
          a: "Oui, le module SOS utilise Supabase Realtime pour afficher les alertes instantanement sans rafraichir la page."
        },
        {
          q: "Comment ajouter un nouveau module ?",
          a: "Creez une page dans src/pages/dashboard/, ajoutez la route dans App.tsx, et ajoutez le lien dans DashboardSidebar.tsx."
        },
        {
          q: "Les donnees sont-elles conformes RGPD ?",
          a: "L'architecture est concue pour la conformite RGPD avec RLS, chiffrement, et hebergement europeen (OVH Cloud)."
        },
        {
          q: "Comment deployer en production ?",
          a: "Build avec 'npm run build', deployez le dossier dist/ sur OVH via FTP ou serveur web. Le backend reste sur Lovable Cloud."
        },
        {
          q: "Quelles sont les prochaines fonctionnalites ?",
          a: "OAuth, interoperabilite HL7/FHIR, geolocalisation SOS, et notifications push sont en priorite P1 dans le backlog."
        },
      ];

      faqItems.forEach((item, index) => {
        checkPageBreak(30);
        
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, contentWidth, 25, 2, 2, "F");
        y += 7;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 64, 175);
        doc.text(`Q${index + 1}: ${item.q}`, margin + 5, y);
        y += 7;
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(item.a, contentWidth - 10);
        lines.forEach((line: string) => {
          doc.text(line, margin + 5, y);
          y += 4;
        });
        y += 8;
      });

      // Section 8: Glossaire
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("8. Glossaire", margin, y);
      y += 12;
      
      doc.setDrawColor(59, 130, 246);
      doc.line(margin, y, margin + 40, y);
      y += 15;

      const glossaryItems = [
        { term: "RLS (Row Level Security)", def: "Mecanisme de securite PostgreSQL permettant de definir des politiques d'acces aux donnees au niveau des lignes." },
        { term: "Supabase", def: "Plateforme backend open-source offrant base de donnees PostgreSQL, authentification, stockage et fonctions serverless." },
        { term: "Edge Functions", def: "Fonctions serverless executees au plus pres de l'utilisateur pour des reponses rapides." },
        { term: "JWT (JSON Web Token)", def: "Standard de token securise pour l'authentification, contenant les informations utilisateur encodees." },
        { term: "Realtime", def: "Technologie permettant la synchronisation instantanee des donnees entre serveur et clients via WebSocket." },
        { term: "TanStack Query", def: "Bibliotheque de gestion de cache et requetes asynchrones pour React (anciennement React Query)." },
        { term: "Shadcn/UI", def: "Collection de composants React reutilisables et personnalisables bases sur Radix UI." },
        { term: "Vite", def: "Outil de build moderne pour le developpement frontend, offrant un demarrage rapide et HMR." },
        { term: "RGPD", def: "Reglement General sur la Protection des Donnees - legislation europeenne sur la vie privee." },
        { term: "HL7/FHIR", def: "Standards d'interoperabilite pour l'echange de donnees medicales entre systemes de sante." },
        { term: "OAuth", def: "Protocole d'autorisation permettant la connexion via des fournisseurs tiers (Google, GitHub)." },
        { term: "Trigger", def: "Fonction SQL executee automatiquement lors d'evenements sur une table (INSERT, UPDATE, DELETE)." },
      ];

      autoTable(doc, {
        startY: y,
        head: [["Terme", "Definition"]],
        body: glossaryItems.map(item => [item.term, item.def]),
        margin: { left: margin },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45 },
          1: { cellWidth: contentWidth - 45 },
        },
      });

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `DONIA - Documentation Technique v1.0.0 | Page ${i - 1} / ${totalPages - 1}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      doc.save("DONIA_Documentation_Technique.pdf");
      toast.success("PDF généré avec succès!");
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const modules = [
    { name: "Auth", icon: Shield, color: "text-blue-500", status: "Implémenté" },
    { name: "Users", icon: Users, color: "text-purple-500", status: "Implémenté" },
    { name: "Medical", icon: Heart, color: "text-red-500", status: "Implémenté" },
    { name: "Courses", icon: BookOpen, color: "text-green-500", status: "Implémenté" },
    { name: "Agenda", icon: Calendar, color: "text-orange-500", status: "Implémenté" },
    { name: "Chat", icon: MessageSquare, color: "text-cyan-500", status: "Implémenté" },
    { name: "Notifications", icon: Bell, color: "text-yellow-500", status: "Implémenté" },
    { name: "Analytics", icon: BarChart3, color: "text-indigo-500", status: "Implémenté" },
    { name: "Social", icon: Layers, color: "text-pink-500", status: "Implémenté" },
    { name: "SOS", icon: AlertTriangle, color: "text-rose-500", status: "Implémenté" },
    { name: "Search", icon: Search, color: "text-slate-500", status: "Implémenté" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6 bg-slate-700" />
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-500" />
                <h1 className="text-xl font-bold text-white">Documentation DONIA</h1>
              </div>
            </div>
            <Button 
              onClick={generatePDF} 
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Génération..." : "Télécharger PDF"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Overview */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Vue d'ensemble
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 space-y-4">
                <p>
                  DONIA est une <strong className="text-white">plateforme web modulaire</strong> combinant 
                  des fonctionnalités sociales, éducatives, médicales et d'assistance d'urgence.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Frontend</h4>
                    <p className="text-sm text-slate-400">React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Backend</h4>
                    <p className="text-sm text-slate-400">Supabase (PostgreSQL, Auth, Edge Functions, Realtime)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Contenu du PDF</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 text-slate-300">
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-blue-400 font-mono text-sm">01</span>
                      <span>Vue d'ensemble et architecture</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-blue-400 font-mono text-sm">02</span>
                      <span>Carte des modules (tableau récapitulatif)</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-blue-400 font-mono text-sm">03</span>
                      <span>Documentation détaillée par module</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-blue-400 font-mono text-sm">04</span>
                      <span>Diagrammes de flux (ASCII)</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-blue-400 font-mono text-sm">05</span>
                      <span>Sécurité globale (RLS, rôles)</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-blue-400 font-mono text-sm">06</span>
                      <span>Backlog priorisé (Top 15)</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-blue-400 font-mono text-sm">07</span>
                      <span>FAQ (8 questions fréquentes)</span>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-amber-500" />
                  FAQ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { q: "Comment démarrer avec DONIA ?", a: "Clonez le repo, installez avec 'npm install', puis lancez 'npm run dev'." },
                    { q: "Quels sont les rôles disponibles ?", a: "admin, teacher, student, medical_staff, parent, user" },
                    { q: "Le module SOS est-il en temps réel ?", a: "Oui, via Supabase Realtime." },
                    { q: "Comment déployer en production ?", a: "Build avec 'npm run build', déployez sur OVH." },
                  ].map((faq, index) => (
                    <details key={index} className="group">
                      <summary className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                        <span className="text-slate-200 text-sm">{faq.q}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <p className="text-slate-400 text-sm p-3 pl-4 border-l-2 border-blue-500/50 ml-3 mt-2">
                        {faq.a}
                      </p>
                    </details>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Glossaire Section */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Book className="h-5 w-5 text-emerald-500" />
                  Glossaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {[
                      { term: "RLS", def: "Row Level Security - Contrôle d'accès aux données" },
                      { term: "JWT", def: "JSON Web Token - Token d'authentification" },
                      { term: "Realtime", def: "Synchronisation instantanée via WebSocket" },
                      { term: "Edge Functions", def: "Fonctions serverless distribuées" },
                      { term: "RGPD", def: "Règlement européen sur la protection des données" },
                      { term: "HL7/FHIR", def: "Standards d'interopérabilité médicale" },
                    ].map((item, index) => (
                      <div key={index} className="p-2 bg-slate-700/30 rounded-lg">
                        <span className="text-emerald-400 font-mono text-sm">{item.term}</span>
                        <p className="text-slate-400 text-xs mt-1">{item.def}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Modules */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  Modules documentés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {modules.map((module) => (
                    <div
                      key={module.name}
                      className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <module.icon className={`h-4 w-4 ${module.color}`} />
                        <span className="text-slate-200">{module.name}</span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                        {module.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500 mt-6">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-white/80 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Documentation complète
                </h3>
                <p className="text-blue-100 text-sm mb-4">
                  22+ pages de documentation technique professionnelle
                </p>
                <Button 
                  onClick={generatePDF}
                  disabled={isGenerating}
                  variant="secondary"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? "Génération..." : "Générer le PDF"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Documentation;
