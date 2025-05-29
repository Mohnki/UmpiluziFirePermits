import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Copy, CheckCircle, Key, Code, Book, Shield, Eye, EyeOff } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function ApiDocumentation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [showToken, setShowToken] = useState(false);
  
  const baseUrl = window.location.origin;

  // Get user's ID token
  useEffect(() => {
    const getIdToken = async () => {
      if (user) {
        try {
          setLoadingToken(true);
          const token = await user.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error('Error getting ID token:', error);
          toast({
            title: "Token Error",
            description: "Failed to get authentication token. Please refresh the page.",
            variant: "destructive",
          });
        } finally {
          setLoadingToken(false);
        }
      }
    };

    getIdToken();
  }, [user, toast]);
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(label);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const CodeBlock = ({ code, language = "bash", label }: { code: string; language?: string; label: string }) => (
    <div className="relative">
      <pre className="bg-gray-900 dark:bg-gray-800 text-green-400 p-4 rounded-md overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8 p-0"
        onClick={() => copyToClipboard(code, label)}
      >
        {copiedCode === label ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Fire Permit API Documentation</h1>
            <p className="text-muted-foreground">
              Complete REST API for the Umpiluzi Fire Protection Association permit system
            </p>
          </div>
        </div>
        
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Welcome, {user?.displayName}! As an API user, you have access to all endpoints that require authentication. 
            Use your Firebase ID token for secure API access.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                API Overview
              </CardTitle>
              <CardDescription>
                The Fire Permit Management API provides secure access to permit data using Firebase authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <CodeBlock code={`${baseUrl}/api`} label="Base URL" />
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Response Format</h3>
                <CodeBlock 
                  code={`{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}`} 
                  language="json"
                  label="Response format"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Available Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Permits</h4>
                    <p className="text-sm text-muted-foreground">Manage and retrieve burn permits</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Areas</h4>
                    <p className="text-sm text-muted-foreground">Geographic areas and boundaries</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Burn Types</h4>
                    <p className="text-sm text-muted-foreground">Different types of burns allowed</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Users</h4>
                    <p className="text-sm text-muted-foreground">User profiles and authentication</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Authentication
              </CardTitle>
              <CardDescription>
                All API endpoints require Firebase ID token authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Your Firebase ID Token</h3>
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Current ID Token (click to copy)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowToken(!showToken)}
                        className="h-8 w-8 p-0"
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      {idToken && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(idToken, "ID Token")}
                          className="h-8 w-8 p-0"
                        >
                          {copiedCode === "ID Token" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {loadingToken ? (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Loading token...
                    </div>
                  ) : idToken ? (
                    <div className="bg-white dark:bg-gray-800 border rounded p-3 font-mono text-sm break-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                         onClick={() => copyToClipboard(idToken, "ID Token")}>
                      {showToken ? idToken : `${idToken.substring(0, 50)}...${idToken.substring(idToken.length - 20)}`}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Failed to load token. Please refresh the page.
                    </p>
                  )}
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                    This token is automatically refreshed and valid for 1 hour. Use this in the Authorization header for all API requests.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Required Headers</h3>
                <CodeBlock 
                  code={`Authorization: Bearer ${idToken ? idToken.substring(0, 30) + '...' : '<your_firebase_id_token>'}
Content-Type: application/json`}
                  label="Required headers"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Getting Your ID Token</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You can get your Firebase ID token by logging into the web application and checking the browser's developer tools.
                </p>
                <CodeBlock 
                  code={`// JavaScript example to get ID token
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
if (user) {
  const idToken = await user.getIdToken();
  console.log('Your ID token:', idToken);
}`}
                  language="javascript"
                  label="Get ID token"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Token Verification</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You can verify your token using the auth endpoint:
                </p>
                <CodeBlock 
                  code={`POST ${baseUrl}/api/auth/verify
{
  "idToken": "your_firebase_id_token"
}`}
                  label="Verify token"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Permits</CardTitle>
                <CardDescription>Retrieve and manage burn permits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/permits</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get permits with optional filtering</p>
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">Query Parameters</summary>
                    <ul className="mt-2 space-y-1 ml-4">
                      <li><code>status</code> - Filter by status (pending, approved, rejected, completed, cancelled)</li>
                      <li><code>areaId</code> - Filter by area ID</li>
                      <li><code>startDate</code> - Filter by start date (ISO format)</li>
                      <li><code>endDate</code> - Filter by end date (ISO format)</li>
                      <li><code>limit</code> - Maximum number of results (1-100)</li>
                      <li><code>offset</code> - Number of results to skip</li>
                    </ul>
                  </details>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/permits/:id</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get a specific permit by ID</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Areas</CardTitle>
                <CardDescription>Geographic areas and management zones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/areas</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get all areas</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/areas/:id</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get a specific area by ID</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/areas/:areaId/permits</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get all permits for a specific area</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Burn Types</CardTitle>
                <CardDescription>Types of burns and their requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/burn-types</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get all burn types</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/burn-types/:id</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get a specific burn type by ID</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User & Health</CardTitle>
                <CardDescription>User profile and system status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/user/profile</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get current user profile</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/health</code>
                  </div>
                  <p className="text-sm text-muted-foreground">API health check (no auth required)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>Ready-to-use examples for common API operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Get All Permits</h3>
                <CodeBlock 
                  code={`curl -H "Authorization: Bearer YOUR_ID_TOKEN" \\
     -H "Content-Type: application/json" \\
     "${baseUrl}/api/permits"`}
                  label="Get permits cURL"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Get Approved Permits</h3>
                <CodeBlock 
                  code={`curl -H "Authorization: Bearer YOUR_ID_TOKEN" \\
     -H "Content-Type: application/json" \\
     "${baseUrl}/api/permits?status=approved&limit=10"`}
                  label="Get approved permits cURL"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">JavaScript/Node.js Example</h3>
                <CodeBlock 
                  code={`const response = await fetch('${baseUrl}/api/permits', {
  headers: {
    'Authorization': \`Bearer \${idToken}\`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  console.log('Permits:', data.data);
} else {
  console.error('Error:', data.error);
}`}
                  language="javascript"
                  label="JavaScript example"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Python Example</h3>
                <CodeBlock 
                  code={`import requests

headers = {
    'Authorization': f'Bearer {id_token}',
    'Content-Type': 'application/json'
}

response = requests.get('${baseUrl}/api/permits', headers=headers)
data = response.json()

if data['success']:
    print('Permits:', data['data'])
else:
    print('Error:', data['error'])`}
                  language="python"
                  label="Python example"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}