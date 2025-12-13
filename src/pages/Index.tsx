import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, 
  Stethoscope, 
  Bell, 
  Users, 
  ArrowRight, 
  BookOpen,
  Calendar,
  Shield,
  FileText
} from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "Éducation",
    description: "Cours en ligne, examens et suivi des étudiants",
  },
  {
    icon: Stethoscope,
    title: "Médical",
    description: "Gestion des rendez-vous et dossiers médicaux",
  },
  {
    icon: Calendar,
    title: "Agenda",
    description: "Planification et organisation des événements",
  },
  {
    icon: BookOpen,
    title: "Cours en ligne",
    description: "Accès aux formations et ressources pédagogiques",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Restez informé en temps réel",
  },
  {
    icon: Users,
    title: "Gestion des utilisateurs",
    description: "Administration des comptes et rôles",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-2xl font-bold text-primary">DONIA</span>
          <nav className="flex items-center gap-4">
            <Link to="/documentation">
              <Button variant="ghost" className="gap-2">
                <FileText className="h-4 w-4" />
                Documentation
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/auth">
              <Button>Commencer</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
            <Shield className="h-4 w-4" />
            Plateforme sécurisée
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Plateforme éducative et médicale{" "}
            <span className="text-primary">DONIA 2026</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Une solution complète pour la gestion de l'éducation et des services médicaux.
            Gérez vos cours, rendez-vous, et restez connecté avec votre communauté.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Accéder au tableau de bord
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Fonctionnalités principales</h2>
          <p className="mt-2 text-muted-foreground">
            Découvrez tout ce que DONIA peut faire pour vous
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-2 inline-flex rounded-lg bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Prêt à commencer ?</h2>
          <p className="mt-2 text-muted-foreground">
            Rejoignez DONIA aujourd'hui et transformez votre façon de gérer l'éducation et la santé.
          </p>
          <Link to="/auth" className="mt-6 inline-block">
            <Button size="lg" className="gap-2">
              Créer un compte gratuit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 DONIA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
