import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Loader2, Trash2, Sparkles, TrendingUp, ChevronRight, Info, AlertCircle } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"

export default function ProgressPage() {
  const photos = useQuery(api.progressPhotos.getPhotos, {})
  const latestAnalysis = useQuery(api.progressPhotos.getLatestAnalysis, {})
  const generateUploadUrl = useMutation(api.progressPhotos.generateUploadUrl)
  const savePhoto = useMutation(api.progressPhotos.savePhoto)
  const deletePhoto = useMutation(api.progressPhotos.deletePhoto)

  const [isUploading, setIsUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      
      if (!result.ok) throw new Error("Upload failed")
      
      const { storageId } = await result.json()
      await savePhoto({ storageId })
      toast.success("Photo uploaded! AI analysis started.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPhoto) return
    setIsDeleting(true)
    try {
      await deletePhoto({ photoId: selectedPhoto._id })
      toast.success("Photo deleted")
      setSelectedPhoto(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed")
    } finally {
      setIsDeleting(false)
    }
  }

  if (photos === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-1000">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-serif tracking-tight">Progress Photos</h1>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <Button size="icon" className="rounded-full h-14 w-14 bg-primary shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
          </Button>
        </div>
      </header>

      {/* Latest Analysis Card */}
      {latestAnalysis ? (
        <Card className="bg-card border-border rounded-[2rem] overflow-hidden relative shadow-sm hover-lift">
          <div className="absolute right-[-5%] top-[-5%] opacity-[0.03]">
            <Sparkles className="w-48 h-48" />
          </div>
          <CardHeader className="p-8 pb-2 relative z-10">
            <div className="flex justify-between items-center">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Analysis
              </CardTitle>
              <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground border-none text-[9px] font-semibold rounded-full px-2.5">
                {new Date(latestAnalysis.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-8 relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-serif leading-none text-primary">{latestAnalysis.overallScore}</span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest opacity-60">/ 10 Score</span>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Strong Points</p>
                <div className="flex flex-wrap gap-1.5">
                  {latestAnalysis.strongMuscles.map(m => (
                    <Badge key={m} className="bg-success/10 text-success border-none text-[8px] uppercase font-bold rounded-full px-2">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Lagging Muscles</p>
                <div className="flex flex-wrap gap-1.5">
                  {latestAnalysis.laggingMuscles.map(m => (
                    <Badge key={m} className="bg-destructive/10 text-destructive border-none text-[8px] uppercase font-bold rounded-full px-2">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <p className="text-[9px] font-bold uppercase tracking-widest text-primary mb-3">Recommendations</p>
              <ul className="space-y-2">
                {latestAnalysis.recommendations.slice(0, 2).map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground font-medium flex items-start gap-3 leading-relaxed">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/50" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-dashed border-border border-2 rounded-[2rem] opacity-60">
          <CardContent className="p-12 text-center space-y-6">
            <div className="bg-secondary/50 p-6 rounded-full w-fit mx-auto border border-border/50">
              <Sparkles className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <p className="font-serif text-2xl tracking-tight">No Analysis Yet</p>
              <p className="text-sm text-muted-foreground font-medium max-w-[200px] mx-auto">Upload your first progress photo for an AI assessment.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          History
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div 
              key={photo._id} 
              className="aspect-[3/4] rounded-2xl overflow-hidden relative cursor-pointer group shadow-sm"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo.imageUrl || ""} 
                alt={photo.date} 
                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                <span className="text-[8px] font-bold text-white uppercase tracking-widest">
                  {new Date(photo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {!photo.analysisComplete ? (
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                ) : photo.muscleAnalysis ? (
                  <Sparkles className="w-3 h-3 text-primary" />
                ) : null}
              </div>
            </div>
          ))}
          {photos.length === 0 && (
            <div className="col-span-3 py-16 text-center text-muted-foreground font-medium italic text-sm opacity-60">
              No photos uploaded yet.
            </div>
          )}
        </div>
      </div>

      {/* Photo Detail Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] overflow-hidden p-0 border-none bg-card shadow-2xl">
          {selectedPhoto && (
            <>
              <div className="relative aspect-[3/4]">
                <img 
                  src={selectedPhoto.imageUrl || ""} 
                  alt={selectedPhoto.date} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute top-6 right-6 flex gap-3">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-10 w-10 rounded-full shadow-2xl bg-destructive/80 backdrop-blur-md border-none"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-serif leading-none tracking-tight">
                      {new Date(selectedPhoto.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest mt-2">Progress Entry</p>
                  </div>
                  {selectedPhoto.muscleAnalysis && (
                    <div className="text-right">
                      <span className="text-5xl font-serif leading-none text-primary">{selectedPhoto.muscleAnalysis.overallScore}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest block opacity-60 mt-1">Score</span>
                    </div>
                  )}
                </div>

                {selectedPhoto.analysisComplete ? (
                  selectedPhoto.muscleAnalysis ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Strong Points</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPhoto.muscleAnalysis.strongMuscles.map((m: string) => (
                              <Badge key={m} className="bg-success/10 text-success border-none text-[8px] uppercase font-bold rounded-full px-2">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Lagging Muscles</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPhoto.muscleAnalysis.laggingMuscles.map((m: string) => (
                              <Badge key={m} className="bg-destructive/10 text-destructive border-none text-[8px] uppercase font-bold rounded-full px-2">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 bg-secondary/30 p-6 rounded-[1.5rem] border border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" /> AI Recommendations
                        </p>
                        <ul className="space-y-2.5">
                          {selectedPhoto.muscleAnalysis.recommendations.map((r: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground font-medium italic flex items-start gap-3 leading-relaxed">
                              <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/50" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary/30 p-10 rounded-[1.5rem] text-center space-y-4 border border-border/50">
                      <AlertCircle className="w-10 h-10 text-muted-foreground/20 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold uppercase tracking-widest">Analysis Failed</p>
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">We couldn't analyze this photo. Make sure you are clearly visible and lighting is good.</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 space-y-6">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary animate-pulse">Analyzing Physique...</p>
                  </div>
                )}
              </div>
              <DialogFooter className="p-8 pt-0">
                <Button variant="ghost" onClick={() => setSelectedPhoto(null)} className="w-full font-semibold rounded-full h-12">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
