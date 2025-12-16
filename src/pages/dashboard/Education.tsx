import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, FileText, Users, Plus, Library } from "lucide-react";
import { EducationalResources } from "@/components/education/EducationalResources";

const courses = [
  { id: 1, title: "Mathématiques avancées", students: 45, progress: 78 },
  { id: 2, title: "Physique quantique", students: 32, progress: 65 },
  { id: 3, title: "Biologie moléculaire", students: 28, progress: 82 },
  { id: 4, title: "Chimie organique", students: 38, progress: 71 },
];

export default function Education() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Éducation</h1>
          <p className="text-muted-foreground">Gérez les cours, examens et ressources pédagogiques</p>
        </div>

        <Tabs defaultValue="resources" className="space-y-6">
          <TabsList>
            <TabsTrigger value="resources" className="gap-2">
              <Library className="h-4 w-4" />
              Ressources Tunisiennes
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Mes Cours
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources">
            <EducationalResources />
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="flex items-center justify-end">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau cours
              </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Cours actifs</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Étudiants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Examens</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Taux de réussite</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                </CardContent>
              </Card>
            </div>

            {/* Courses List */}
            <Card>
              <CardHeader>
                <CardTitle>Cours récents</CardTitle>
                <CardDescription>Liste des cours en cours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">{course.students} étudiants</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progression</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-muted">
                            <div 
                              className="h-2 rounded-full bg-primary" 
                              style={{ width: `${course.progress}%` }} 
                            />
                          </div>
                        </div>
                        <Button variant="outline" size="sm">Voir</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
