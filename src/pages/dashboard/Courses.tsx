import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  BookOpen, 
  Play, 
  Clock, 
  Users, 
  CheckCircle, 
  ChevronRight, 
  GraduationCap,
  Loader2,
  ArrowLeft,
  FileQuestion
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  category: string;
  difficulty: string;
  duration_hours: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content: string | null;
  order_index: number;
  duration_minutes: number;
}

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
}

interface Enrollment {
  course_id: string;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-500",
  intermediate: "bg-orange-500/10 text-orange-500",
  advanced: "bg-red-500/10 text-red-500",
};

const difficultyLabels: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Course detail view
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des cours");
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  const fetchEnrollments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id);
    setEnrollments(data || []);
  };

  const fetchLessons = async (courseId: string) => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });
    setLessons(data || []);
  };

  const fetchLessonProgress = async (courseId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", user.id);
    setLessonProgress(data || []);
  };

  const fetchQuiz = async (lessonId: string) => {
    const { data: quizData } = await supabase
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle();
    
    if (quizData) {
      setQuiz(quizData);
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizData.id)
        .order("order_index", { ascending: true });
      
      // Parse options from JSON
      const parsedQuestions = (questions || []).map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));
      setQuizQuestions(parsedQuestions);
    } else {
      setQuiz(null);
      setQuizQuestions([]);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchEnrollments();
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("enrollments")
      .insert({ user_id: user.id, course_id: courseId });

    if (error) {
      if (error.code === '23505') {
        toast.info("Vous êtes déjà inscrit à ce cours");
      } else {
        toast.error("Erreur lors de l'inscription");
      }
    } else {
      toast.success("Inscription réussie !");
      fetchEnrollments();
    }
  };

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setSelectedLesson(null);
    await Promise.all([
      fetchLessons(course.id),
      fetchLessonProgress(course.id)
    ]);
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    await fetchQuiz(lesson.id);
    
    // Mark lesson as in progress
    if (user) {
      await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lesson.id,
          progress_percent: 50,
          completed: false
        }, { onConflict: 'user_id,lesson_id' });
    }
  };

  const markLessonComplete = async () => {
    if (!user || !selectedLesson) return;
    
    await supabase
      .from("lesson_progress")
      .upsert({
        user_id: user.id,
        lesson_id: selectedLesson.id,
        completed: true,
        progress_percent: 100,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' });
    
    toast.success("Leçon terminée !");
    if (selectedCourse) {
      fetchLessonProgress(selectedCourse.id);
    }
  };

  const startQuiz = () => {
    setShowQuiz(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
  };

  const submitQuiz = async () => {
    if (!quiz || !user) return;
    
    let correctCount = 0;
    quizQuestions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct_answer) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / quizQuestions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    
    await supabase
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: quiz.id,
        score,
        passed: score >= quiz.passing_score,
        answers: selectedAnswers
      });
    
    if (score >= quiz.passing_score) {
      toast.success(`Quiz réussi ! Score: ${score}%`);
      markLessonComplete();
    } else {
      toast.error(`Score: ${score}%. Minimum requis: ${quiz.passing_score}%`);
    }
  };

  const isEnrolled = (courseId: string) => 
    enrollments.some(e => e.course_id === courseId);

  const isLessonCompleted = (lessonId: string) =>
    lessonProgress.some(p => p.lesson_id === lessonId && p.completed);

  const getCourseProgress = () => {
    if (lessons.length === 0) return 0;
    const completed = lessons.filter(l => isLessonCompleted(l.id)).length;
    return Math.round((completed / lessons.length) * 100);
  };

  // Course detail view
  if (selectedCourse) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => {
              setSelectedCourse(null);
              setSelectedLesson(null);
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux cours
          </Button>

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Sidebar with lessons */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedCourse.title}</CardTitle>
                  <CardDescription>{selectedCourse.instructor_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progression</span>
                      <span>{getCourseProgress()}%</span>
                    </div>
                    <Progress value={getCourseProgress()} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Leçons</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors ${
                          selectedLesson?.id === lesson.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                          isLessonCompleted(lesson.id) 
                            ? 'bg-green-500 text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {isLessonCompleted(lesson.id) ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground">{lesson.duration_minutes} min</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main content */}
            <div className="space-y-6">
              {selectedLesson ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedLesson.title}</CardTitle>
                      <CardDescription>{selectedLesson.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedLesson.video_url && (
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <iframe
                            src={selectedLesson.video_url}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {selectedLesson.content && (
                        <div className="mt-4 prose prose-sm max-w-none">
                          <p>{selectedLesson.content}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    {quiz && quizQuestions.length > 0 && (
                      <Button onClick={startQuiz} className="gap-2">
                        <FileQuestion className="h-4 w-4" />
                        Passer le quiz
                      </Button>
                    )}
                    {!isLessonCompleted(selectedLesson.id) && (
                      <Button variant="outline" onClick={markLessonComplete} className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Marquer comme terminé
                      </Button>
                    )}
                  </div>

                  {/* Quiz Dialog */}
                  <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>{quiz?.title}</DialogTitle>
                        <DialogDescription>
                          Question {currentQuestionIndex + 1} sur {quizQuestions.length}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {!quizSubmitted ? (
                        <>
                          <div className="py-4">
                            <Progress value={((currentQuestionIndex + 1) / quizQuestions.length) * 100} className="mb-6" />
                            
                            {quizQuestions[currentQuestionIndex] && (
                              <div className="space-y-4">
                                <p className="font-medium text-lg">
                                  {quizQuestions[currentQuestionIndex].question}
                                </p>
                                <RadioGroup
                                  value={selectedAnswers[currentQuestionIndex]?.toString()}
                                  onValueChange={(value) => 
                                    setSelectedAnswers(prev => ({
                                      ...prev,
                                      [currentQuestionIndex]: parseInt(value)
                                    }))
                                  }
                                >
                                  {quizQuestions[currentQuestionIndex].options.map((option, idx) => (
                                    <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent">
                                      <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                                      <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                                        {option}
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            {currentQuestionIndex > 0 && (
                              <Button 
                                variant="outline" 
                                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                              >
                                Précédent
                              </Button>
                            )}
                            {currentQuestionIndex < quizQuestions.length - 1 ? (
                              <Button 
                                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                disabled={selectedAnswers[currentQuestionIndex] === undefined}
                              >
                                Suivant
                              </Button>
                            ) : (
                              <Button 
                                onClick={submitQuiz}
                                disabled={Object.keys(selectedAnswers).length !== quizQuestions.length}
                              >
                                Soumettre
                              </Button>
                            )}
                          </DialogFooter>
                        </>
                      ) : (
                        <div className="py-8 text-center">
                          <div className={`inline-flex h-20 w-20 items-center justify-center rounded-full ${
                            quizScore >= (quiz?.passing_score || 70) 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            <span className="text-3xl font-bold">{quizScore}%</span>
                          </div>
                          <p className="mt-4 text-lg font-medium">
                            {quizScore >= (quiz?.passing_score || 70) 
                              ? 'Félicitations ! Vous avez réussi !' 
                              : 'Vous pouvez réessayer !'}
                          </p>
                          <p className="text-muted-foreground">
                            Score minimum requis: {quiz?.passing_score}%
                          </p>
                          <Button onClick={() => setShowQuiz(false)} className="mt-6">
                            Fermer
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Play className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      Sélectionnez une leçon pour commencer
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Course list view
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cours en ligne</h1>
            <p className="text-muted-foreground">Accédez à vos formations et progressez à votre rythme</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cours disponibles</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mes inscriptions</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Heures de contenu</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {courses.reduce((sum, c) => sum + c.duration_hours, 0)}h
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cours terminés</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-primary/50" />
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className={difficultyColors[course.difficulty]}>
                      {difficultyLabels[course.difficulty]}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration_hours}h
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {course.instructor_name}
                    </span>
                    {isEnrolled(course.id) ? (
                      <Button 
                        size="sm" 
                        onClick={() => handleSelectCourse(course)}
                        className="gap-1"
                      >
                        Continuer
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEnroll(course.id)}
                      >
                        S'inscrire
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
