import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch public documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        
        // If user is authenticated, fetch with auth token, otherwise just fetch public docs
        let response;
        if (user) {
          const idToken = await user.getIdToken();
          response = await fetch('/api/documents', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
          });
        } else {
          // For unauthenticated users, we'd need a public endpoint
          // For now, we'll show nothing if not authenticated
          setDocuments([]);
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        
        const data = await response.json();
        // Filter to only show public documents for non-admin users
        const publicDocs = data.data?.filter((doc: Document) => doc.isPublic) || [];
        setDocuments(publicDocs);
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast({
          title: "Error",
          description: "Failed to load documents. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user, toast]);

  const handleDownload = async (doc: Document) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to download documents.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDownloadingId(doc.id);
      
      const idToken = await user.getIdToken();
      
      // Fetch the file as a blob
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the file as a blob
      const blob = await response.blob();
      
      // Create download URL and trigger download
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.fileName;
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download started",
        description: `Downloading "${doc.title}"`,
      });

      // Update local download count
      setDocuments(prev => 
        prev.map(document => 
          document.id === doc.id 
            ? { ...document, downloadCount: document.downloadCount + 1 }
            : document
        )
      );
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Don't show section if no public documents
  if (!loading && documents.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Documents & Resources
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Access important documents, guidelines, and resources provided by the Umpiluzi Fire Protection Association.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading documents...</span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <Card key={document.id} className="hover:shadow-lg transition-shadow duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-2">
                        {document.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {document.description || "No description available"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2 flex-shrink-0">
                      <FileText className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate">{document.fileName}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{format(new Date(document.uploadedAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center">
                        <Download className="h-4 w-4 mr-1" />
                        <span>{document.downloadCount}</span>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Size: {formatFileSize(document.fileSize)}
                    </div>

                    <Button 
                      className="w-full mt-4" 
                      onClick={() => handleDownload(document)}
                      disabled={downloadingId === document.id || !user}
                    >
                      {downloadingId === document.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>

                    {!user && (
                      <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 mt-2">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Sign in to download
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!user && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              <AlertCircle className="h-5 w-5 inline mr-2" />
              Sign in to access and download documents
            </p>
          </div>
        )}
      </div>
    </section>
  );
}