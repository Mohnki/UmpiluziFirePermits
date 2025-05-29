import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Copy, CheckCircle, Key, Code, Book, Shield, Eye, EyeOff, Download } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function ApiDocumentation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
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

  const CodeTabs = ({ jsCode, pythonCode, label }: { jsCode: string; pythonCode: string; label: string }) => (
    <Tabs defaultValue="javascript" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
        <TabsTrigger value="python">Python</TabsTrigger>
      </TabsList>
      <TabsContent value="javascript">
        <CodeBlock code={jsCode} language="javascript" label={`${label} JavaScript`} />
      </TabsContent>
      <TabsContent value="python">
        <CodeBlock code={pythonCode} language="python" label={`${label} Python`} />
      </TabsContent>
    </Tabs>
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
                <h3 className="font-semibold mb-2">Authentication Methods</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You can authenticate using Google OAuth or email/password to get your ID token.
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Google Authentication</h4>
                    <CodeTabs 
                      jsCode={`import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAkU77KLYS1fW3nLuGs-VF1xok4FhQ_TEc",
  authDomain: "umpiluzi-fire-permits.firebaseapp.com",
  projectId: "umpiluzi-fire-permits"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Sign in with Google
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const idToken = await user.getIdToken();
    console.log('ID Token:', idToken);
    return idToken;
  } catch (error) {
    console.error('Error signing in:', error);
  }
};`}
                      pythonCode={`# For Python applications, use email/password authentication
# Google OAuth in Python requires complex setup with OAuth2 libraries
# and browser integration. Email/password is simpler and more practical.

# Option 1: Get ID token from browser and use in Python
def use_token_from_browser():
    """
    The easiest approach: Get your ID token from the web application
    and use it in your Python script
    """
    # 1. Go to ${baseUrl}/api-docs in your browser
    # 2. Copy the ID token from the Authentication tab
    # 3. Use it in your Python code:
    
    id_token = "your_id_token_from_browser"
    
    # Now you can make API calls
    import requests
    headers = {
        'Authorization': f'Bearer {id_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get('${baseUrl}/api/permits', headers=headers)
    return response.json()

# Option 2: Use email/password authentication (see Email/Password tab)
print("Recommended: Use email/password authentication or copy token from browser")
print("Google OAuth in Python requires additional OAuth2 library setup")`}
                      label="Google Authentication"
                    />
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Email/Password Authentication</h4>
                    <CodeTabs 
                      jsCode={`import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAkU77KLYS1fW3nLuGs-VF1xok4FhQ_TEc",
  authDomain: "umpiluzi-fire-permits.firebaseapp.com",
  projectId: "umpiluzi-fire-permits"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign in with email and password
const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    console.log('ID Token:', idToken);
    return idToken;
  } catch (error) {
    console.error('Error signing in:', error);
  }
};

// Register new user
const registerWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    console.log('ID Token:', idToken);
    return idToken;
  } catch (error) {
    console.error('Error registering:', error);
  }
};`}
                      pythonCode={`import requests
import json

# Firebase Auth REST API endpoints
FIREBASE_WEB_API_KEY = "AIzaSyAkU77KLYS1fW3nLuGs-VF1xok4FhQ_TEc"
SIGN_IN_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
SIGN_UP_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_WEB_API_KEY}"

def sign_in_with_email(email, password):
    """Sign in with email and password"""
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    response = requests.post(SIGN_IN_URL, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        id_token = data['idToken']
        print(f'ID Token: {id_token}')
        return id_token
    else:
        error_data = response.json()
        print(f'Error: {error_data.get("error", {}).get("message", "Unknown error")}')
        return None

def register_with_email(email, password):
    """Register new user with email and password"""
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    response = requests.post(SIGN_UP_URL, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        id_token = data['idToken']
        print(f'ID Token: {id_token}')
        return id_token
    else:
        error_data = response.json()
        print(f'Error: {error_data.get("error", {}).get("message", "Unknown error")}')
        return None

# Example usage
# id_token = sign_in_with_email("user@example.com", "password123")
# id_token = register_with_email("newuser@example.com", "password123")`}
                      label="Email/Password Authentication"
                    />
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Get Token from Current User</h4>
                    <CodeTabs 
                      jsCode={`// If user is already authenticated
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  // Get current token
  const idToken = await user.getIdToken();
  console.log('Current ID token:', idToken);
  
  // Force refresh token (useful if token expired)
  const freshToken = await user.getIdToken(true);
  console.log('Fresh ID token:', freshToken);
} else {
  console.log('User not authenticated');
}`}
                      pythonCode={`import requests

# If you already have a refresh token, you can get a new ID token
def refresh_id_token(refresh_token):
    """Refresh ID token using refresh token"""
    url = f"https://securetoken.googleapis.com/v1/token?key=AIzaSyAkU77KLYS1fW3nLuGs-VF1xok4FhQ_TEc"
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        new_id_token = data['id_token']
        print(f'New ID Token: {new_id_token}')
        return new_id_token
    else:
        print(f'Error refreshing token: {response.text}')
        return None

# Example usage
# new_token = refresh_id_token("your_refresh_token_here")`}
                      label="Get Current User Token"
                    />
                  </div>
                </div>
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
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Rate Limiting & Query Behavior</h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <div>• <strong>Default behavior:</strong> All endpoints return current day data only</div>
              <div>• Use <code>includeHistorical=true</code> to access historical data with date filters</div>
              <div>• Rate limits: Permits (100/hour), Areas (50/hour), Burn Types (30/hour)</div>
              <div>• Daily limits: API Users (1000), Area Managers (500), Admins (2000), Users (100)</div>
              <div>• All requests are logged and monitored for usage tracking</div>
              <div>• Rate limit headers: <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code></div>
            </div>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Permits</CardTitle>
                <CardDescription>Retrieve and manage burn permits with advanced filtering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/permits</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get permits with advanced filtering. Returns current day permits by default.</p>
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">Query Parameters</summary>
                    <ul className="mt-2 space-y-1 ml-4">
                      <li><code>userId</code> - Filter by user ID</li>
                      <li><code>areaId</code> - Filter by area ID</li>
                      <li><code>burnTypeId</code> - Filter by burn type ID</li>
                      <li><code>status</code> - Filter by status (pending, approved, rejected, completed, cancelled)</li>
                      <li><code>includeHistorical</code> - Set to true to access historical data (default: false)</li>
                      <li><code>startDate</code> - Filter by start date (ISO format, requires includeHistorical=true)</li>
                      <li><code>endDate</code> - Filter by end date (ISO format, requires includeHistorical=true)</li>
                      <li><code>location[latitude]</code> - Latitude for location filtering</li>
                      <li><code>location[longitude]</code> - Longitude for location filtering</li>
                      <li><code>location[radius]</code> - Search radius in kilometers (default: 10km)</li>
                      <li><code>limit</code> - Maximum number of results (1-100, default: 50)</li>
                      <li><code>offset</code> - Number of results to skip (default: 0)</li>
                    </ul>
                  </details>
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950 rounded text-xs text-amber-800 dark:text-amber-200">
                    <strong>Example:</strong> <code>/api/permits?location[latitude]=-26.2041&location[longitude]=28.0473&location[radius]=5&status=approved</code>
                  </div>
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
                <CardDescription>Geographic areas and management zones with advanced filtering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code>/api/areas</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get areas with advanced filtering options</p>
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">Query Parameters</summary>
                    <ul className="mt-2 space-y-1 ml-4">
                      <li><code>managerId</code> - Filter by area manager ID</li>
                      <li><code>location[latitude]</code> - Latitude for location filtering</li>
                      <li><code>location[longitude]</code> - Longitude for location filtering</li>
                      <li><code>location[radius]</code> - Search radius in kilometers (default: 50km)</li>
                      <li><code>hasActiveBans</code> - Filter areas with/without active burn bans (true/false)</li>
                      <li><code>allowedBurnType</code> - Filter areas that allow specific burn type ID</li>
                      <li><code>limit</code> - Maximum number of results (1-100, default: 50)</li>
                      <li><code>offset</code> - Number of results to skip (default: 0)</li>
                    </ul>
                  </details>
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950 rounded text-xs text-amber-800 dark:text-amber-200">
                    <strong>Example:</strong> <code>/api/areas?location[latitude]=-26.2041&location[longitude]=28.0473&hasActiveBans=false</code>
                  </div>
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
                <h3 className="font-semibold mb-3">Get All Permits</h3>
                <CodeTabs 
                  jsCode={`const response = await fetch('${baseUrl}/api/permits', {
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
                  pythonCode={`import requests

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
                  label="Get All Permits"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Location-Based Permit Search</h3>
                <CodeTabs 
                  jsCode={`// Find approved permits within 5km of Johannesburg
const params = new URLSearchParams({
  'status': 'approved',
  'location[latitude]': '-26.2041',
  'location[longitude]': '28.0473',
  'location[radius]': '5',
  'limit': '20'
});

const response = await fetch(\`${baseUrl}/api/permits?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${idToken}\`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  console.log(\`Found \${data.data.length} permits within 5km\`);
  console.log('Rate limit remaining:', response.headers.get('X-RateLimit-Remaining'));
  
  data.data.forEach(permit => {
    console.log(\`Permit \${permit.id}: \${permit.details}\`);
    console.log(\`Location: \${permit.location.latitude}, \${permit.location.longitude}\`);
  });
} else {
  console.error('Error:', data.error);
}`}
                  pythonCode={`import requests

headers = {
    'Authorization': f'Bearer {id_token}',
    'Content-Type': 'application/json'
}

# Find approved permits within 5km of Johannesburg
params = {
    'status': 'approved',
    'location[latitude]': '-26.2041',
    'location[longitude]': '28.0473',
    'location[radius]': '5',
    'limit': 20
}

response = requests.get('${baseUrl}/api/permits', headers=headers, params=params)
data = response.json()

if data['success']:
    print(f"Found {len(data['data'])} permits within 5km")
    print(f"Rate limit remaining: {response.headers.get('X-RateLimit-Remaining')}")
    
    for permit in data['data']:
        print(f"Permit {permit['id']}: {permit['details']}")
        print(f"Location: {permit['location']['latitude']}, {permit['location']['longitude']}")
else:
    print('Error:', data['error'])`}
                  label="Location-Based Search"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Historical Data Access</h3>
                <CodeTabs 
                  jsCode={`// Get historical permits from last month (requires includeHistorical=true)
const params = new URLSearchParams({
  'includeHistorical': 'true',
  'startDate': '2024-12-01T00:00:00Z',
  'endDate': '2024-12-31T23:59:59Z',
  'status': 'completed',
  'limit': '50'
});

const response = await fetch(\`${baseUrl}/api/permits?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${idToken}\`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  console.log(\`Found \${data.data.length} completed permits from December 2024\`);
  
  // Group by burn type
  const byBurnType = data.data.reduce((acc, permit) => {
    acc[permit.burnTypeId] = (acc[permit.burnTypeId] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Permits by burn type:', byBurnType);
} else {
  console.error('Error:', data.error);
}`}
                  pythonCode={`import requests
from datetime import datetime

headers = {
    'Authorization': f'Bearer {id_token}',
    'Content-Type': 'application/json'
}

# Get historical permits from last month
params = {
    'includeHistorical': 'true',
    'startDate': '2024-12-01T00:00:00Z',
    'endDate': '2024-12-31T23:59:59Z',
    'status': 'completed',
    'limit': 50
}

response = requests.get('${baseUrl}/api/permits', headers=headers, params=params)
data = response.json()

if data['success']:
    print(f"Found {len(data['data'])} completed permits from December 2024")
    
    # Group by burn type
    by_burn_type = {}
    for permit in data['data']:
        burn_type = permit['burnTypeId']
        by_burn_type[burn_type] = by_burn_type.get(burn_type, 0) + 1
    
    print('Permits by burn type:', by_burn_type)
else:
    print('Error:', data['error'])`}
                  label="Historical Data"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Get Areas and Burn Types</h3>
                <CodeTabs 
                  jsCode={`// Get all areas
const areasResponse = await fetch('${baseUrl}/api/areas', {
  headers: {
    'Authorization': \`Bearer \${idToken}\`,
    'Content-Type': 'application/json'
  }
});

// Get all burn types
const burnTypesResponse = await fetch('${baseUrl}/api/burn-types', {
  headers: {
    'Authorization': \`Bearer \${idToken}\`,
    'Content-Type': 'application/json'
  }
});

const areas = await areasResponse.json();
const burnTypes = await burnTypesResponse.json();

if (areas.success && burnTypes.success) {
  console.log('Areas:', areas.data);
  console.log('Burn Types:', burnTypes.data);
}`}
                  pythonCode={`import requests

headers = {
    'Authorization': f'Bearer {id_token}',
    'Content-Type': 'application/json'
}

# Get all areas
areas_response = requests.get('${baseUrl}/api/areas', headers=headers)
areas_data = areas_response.json()

# Get all burn types
burn_types_response = requests.get('${baseUrl}/api/burn-types', headers=headers)
burn_types_data = burn_types_response.json()

if areas_data['success'] and burn_types_data['success']:
    print('Areas:', areas_data['data'])
    print('Burn Types:', burn_types_data['data'])`}
                  label="Get Areas and Burn Types"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Complete Example with Error Handling</h3>
                <CodeTabs 
                  jsCode={`class FirePermitAPI {
  constructor(baseUrl, idToken) {
    this.baseUrl = baseUrl;
    this.idToken = idToken;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(\`\${this.baseUrl}/api\${endpoint}\`, {
        ...options,
        headers: {
          'Authorization': \`Bearer \${this.idToken}\`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || \`HTTP \${response.status}\`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error.message);
      throw error;
    }
  }

  async getPermits(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.makeRequest(\`/permits?\${params}\`);
  }

  async getPermitById(id) {
    return this.makeRequest(\`/permits/\${id}\`);
  }

  async getAreas() {
    return this.makeRequest('/areas');
  }
}

// Usage
const api = new FirePermitAPI('${baseUrl}', idToken);
const permits = await api.getPermits({ status: 'approved' });`}
                  pythonCode={`import requests
from typing import Dict, Any, Optional

class FirePermitAPI:
    def __init__(self, base_url: str, id_token: str):
        self.base_url = base_url
        self.id_token = id_token
        self.headers = {
            'Authorization': f'Bearer {id_token}',
            'Content-Type': 'application/json'
        }

    def make_request(self, endpoint: str, method: str = 'GET', params: Optional[Dict] = None) -> Dict[str, Any]:
        try:
            url = f"{self.base_url}/api{endpoint}"
            response = requests.request(method, url, headers=self.headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            if not data.get('success', False):
                raise Exception(data.get('error', 'Unknown error'))
            
            return data
        except requests.exceptions.RequestException as e:
            print(f'API Error: {e}')
            raise

    def get_permits(self, filters: Optional[Dict] = None) -> Dict[str, Any]:
        return self.make_request('/permits', params=filters)

    def get_permit_by_id(self, permit_id: str) -> Dict[str, Any]:
        return self.make_request(f'/permits/{permit_id}')

    def get_areas(self) -> Dict[str, Any]:
        return self.make_request('/areas')

# Usage
api = FirePermitAPI('${baseUrl}', id_token)
permits = api.get_permits({'status': 'approved'})`}
                  label="Complete API Class"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}