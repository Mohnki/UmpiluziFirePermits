import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { 
  authRequestSchema, 
  permitQuerySchema, 
  areaQuerySchema,
  ApiResponse 
} from "../shared/schema";
import { 
  AuthService, 
  PermitService, 
  AreaService, 
  BurnTypeService,
  DocumentService,
  admin,
  db
} from "./firebase-service";
import { 
  authenticateUser, 
  requireAdmin, 
  requireManagerAccess,
  requireApiAccess 
} from "./auth-middleware";
import { 
  rateLimitMiddleware, 
  checkRateLimit, 
  RateLimitService 
} from "./rate-limit-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting middleware to all API routes
  app.use('/api', rateLimitMiddleware);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Check file types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG files are allowed.'));
      }
    }
  });

  // Authentication routes
  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { idToken } = authRequestSchema.parse(req.body);
      
      const decodedToken = await AuthService.verifyIdToken(idToken);
      const userProfile = await AuthService.getUserProfile(decodedToken.uid);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          error: "User profile not found"
        });
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: userProfile,
          token: decodedToken
        },
        message: "Authentication successful"
      };

      res.json(response);
    } catch (error) {
      console.error("Auth verification error:", error);
      res.status(401).json({
        success: false,
        error: "Invalid authentication token"
      });
    }
  });

  // User profile route
  app.get("/api/user/profile", authenticateUser, async (req: Request, res: Response) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: req.user
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user profile"
      });
    }
  });

  // Permit routes
  app.get("/api/permits", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Convert string query params to proper types before validation
      const processedQuery: any = {
        ...req.query,
        includeHistorical: req.query.includeHistorical === 'true' ? true : undefined
      };

      // Convert numeric parameters
      if (processedQuery.limit) {
        processedQuery.limit = parseInt(processedQuery.limit, 10);
      }
      if (processedQuery.offset) {
        processedQuery.offset = parseInt(processedQuery.offset, 10);
      }

      // Convert location parameters if they exist
      if (processedQuery['location[latitude]'] || processedQuery['location[longitude]'] || processedQuery['location[radius]']) {
        processedQuery.location = {
          latitude: processedQuery['location[latitude]'] ? parseFloat(processedQuery['location[latitude]']) : undefined,
          longitude: processedQuery['location[longitude]'] ? parseFloat(processedQuery['location[longitude]']) : undefined,
          radius: processedQuery['location[radius]'] ? parseFloat(processedQuery['location[radius]']) : undefined
        };
        // Remove the bracket notation parameters
        delete processedQuery['location[latitude]'];
        delete processedQuery['location[longitude]'];
        delete processedQuery['location[radius]'];
      }
      
      const queryParams = permitQuerySchema.parse(processedQuery);
      
      // Regular users can only see their own permits
      if (req.user!.role === 'user') {
        queryParams.userId = req.user!.uid;
      }
      
      const permits = await PermitService.getPermits(queryParams);
      
      const response: ApiResponse = {
        success: true,
        data: permits,
        message: `Retrieved ${permits.length} permits`
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get permits error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve permits"
      });
    }
  });

  app.get("/api/permits/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const permit = await PermitService.getPermitById(id);
      
      if (!permit) {
        return res.status(404).json({
          success: false,
          error: "Permit not found"
        });
      }

      // Check if user has permission to view this permit
      if (req.user!.role === 'user' && permit.userId !== req.user!.uid) {
        return res.status(403).json({
          success: false,
          error: "Access denied"
        });
      }

      const response: ApiResponse = {
        success: true,
        data: permit
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get permit error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve permit"
      });
    }
  });

  // Get permits by user ID (admin and area managers only)
  app.get("/api/users/:userId/permits", authenticateUser, requireManagerAccess, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const queryParams = permitQuerySchema.parse(req.query);
      queryParams.userId = userId;
      
      const permits = await PermitService.getPermits(queryParams);
      
      const response: ApiResponse = {
        success: true,
        data: permits,
        message: `Retrieved ${permits.length} permits for user ${userId}`
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get user permits error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve user permits"
      });
    }
  });

  // Get permits by area ID (area managers and admins only)
  app.get("/api/areas/:areaId/permits", authenticateUser, requireManagerAccess, async (req: Request, res: Response) => {
    try {
      const { areaId } = req.params;
      const queryParams = permitQuerySchema.parse(req.query);
      queryParams.areaId = areaId;
      
      const permits = await PermitService.getPermits(queryParams);
      
      const response: ApiResponse = {
        success: true,
        data: permits,
        message: `Retrieved ${permits.length} permits for area ${areaId}`
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get area permits error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve area permits"
      });
    }
  });

  // Complete permit by owner
  app.patch("/api/permits/:id/complete", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get the permit first to verify ownership
      const permit = await PermitService.getPermitById(id);
      if (!permit) {
        return res.status(404).json({
          success: false,
          error: "Permit not found"
        });
      }

      // Check if user owns this permit
      if (permit.userId !== req.user!.uid) {
        return res.status(403).json({
          success: false,
          error: "You can only complete your own permits"
        });
      }

      // Check if permit is in a valid state to be completed
      if (permit.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: "Only approved permits can be completed"
        });
      }

      // Update the permit to completed status
      const updateData = {
        status: 'completed',
        updatedAt: new Date()
      };

      await db.collection('burnPermits').doc(id).update(updateData);
      
      const response: ApiResponse = {
        success: true,
        data: { id, status: 'completed' },
        message: "Permit completed successfully"
      };
      
      res.json(response);
    } catch (error) {
      console.error("Complete permit error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to complete permit"
      });
    }
  });

  // Update permit status (area managers and admins only)
  app.patch("/api/permits/:id", authenticateUser, requireManagerAccess, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      
      if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Valid status is required (approved, rejected, cancelled)"
        });
      }

      // Get the permit first to verify it exists
      const permit = await PermitService.getPermitById(id);
      if (!permit) {
        return res.status(404).json({
          success: false,
          error: "Permit not found"
        });
      }

      // Update the permit in Firestore
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'approved') {
        updateData.approvedBy = req.user?.uid;
        updateData.approvedAt = new Date();
      } else if (status === 'rejected' || status === 'cancelled') {
        updateData.rejectionReason = rejectionReason || 'No reason provided';
      }

      await db.collection('burnPermits').doc(id).update(updateData);
      
      const response: ApiResponse = {
        success: true,
        data: { id, status },
        message: `Permit ${status} successfully`
      };
      
      res.json(response);
    } catch (error) {
      console.error("Update permit error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update permit"
      });
    }
  });

  // Area routes
  app.get("/api/areas", authenticateUser, async (req: Request, res: Response) => {
    try {
      const areas = await AreaService.getAllAreas();
      
      const response: ApiResponse = {
        success: true,
        data: areas,
        message: `Retrieved ${areas.length} areas`
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get areas error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve areas"
      });
    }
  });

  app.get("/api/areas/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const area = await AreaService.getAreaById(id);
      
      if (!area) {
        return res.status(404).json({
          success: false,
          error: "Area not found"
        });
      }

      const response: ApiResponse = {
        success: true,
        data: area
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get area error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve area"
      });
    }
  });

  // Burn type routes
  app.get("/api/burn-types", authenticateUser, async (req: Request, res: Response) => {
    try {
      const burnTypes = await BurnTypeService.getAllBurnTypes();
      
      const response: ApiResponse = {
        success: true,
        data: burnTypes,
        message: `Retrieved ${burnTypes.length} burn types`
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get burn types error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve burn types"
      });
    }
  });

  app.get("/api/burn-types/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const burnType = await BurnTypeService.getBurnTypeById(id);
      
      if (!burnType) {
        return res.status(404).json({
          success: false,
          error: "Burn type not found"
        });
      }

      const response: ApiResponse = {
        success: true,
        data: burnType
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get burn type error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve burn type"
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "API is running",
      timestamp: new Date().toISOString()
    });
  });

  // Umpiluzi FMU GeoJSON endpoint
  app.get("/api/umpiluzi-fmu-geojson", async (req: Request, res: Response) => {
    try {
      // GeoJSON representation of the Umpiluzi FMU area
      const umpiluziFMUGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: "Umpiluzi Fire Management Unit",
              description: "Primary fire management area under Umpiluzi Fire Protection Association",
              area_type: "Fire Management Unit",
              management_authority: "Umpiluzi FPA"
            },
            geometry: {
              type: "Polygon",
              coordinates: [[
                [30.35, -26.15],
                [30.65, -26.15],
                [30.65, -26.35],
                [30.35, -26.35],
                [30.35, -26.15]
              ]]
            }
          }
        ]
      };
      
      res.json({
        success: true,
        data: umpiluziFMUGeoJSON
      });
    } catch (error) {
      console.error('Error serving GeoJSON:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to serve GeoJSON data'
      });
    }
  });

  // Document routes
  app.get("/api/documents", authenticateUser, async (req: Request, res: Response) => {
    try {
      let documents;
      
      // Admins can see all documents, others only see public ones
      if (req.user?.role === 'admin') {
        documents = await DocumentService.getAllDocuments();
      } else {
        documents = await DocumentService.getPublicDocuments();
      }
      
      const response: ApiResponse = {
        success: true,
        data: documents,
        message: `Retrieved ${documents.length} documents`
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve documents"
      });
    }
  });

  app.get("/api/documents/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const document = await DocumentService.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          error: "Document not found"
        });
      }

      // Check if user can access this document
      if (!document.isPublic && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Access denied"
        });
      }

      const response: ApiResponse = {
        success: true,
        data: document
      };
      
      res.json(response);
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve document"
      });
    }
  });

  app.post("/api/documents", authenticateUser, requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded"
        });
      }

      const documentData = {
        title: req.body.title,
        description: req.body.description || '',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        isPublic: req.body.isPublic === 'true',
        uploadedBy: req.user!.uid,
      };

      const document = await DocumentService.createDocument(documentData);
      
      const response: ApiResponse = {
        success: true,
        data: document,
        message: "Document created successfully"
      };
      
      res.json(response);
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create document"
      });
    }
  });

  app.patch("/api/documents/:id", authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = {
        title: req.body.title,
        description: req.body.description,
        isPublic: req.body.isPublic,
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => 
        updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]
      );

      await DocumentService.updateDocument(id, updates);
      
      const response: ApiResponse = {
        success: true,
        message: "Document updated successfully"
      };
      
      res.json(response);
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update document"
      });
    }
  });

  app.delete("/api/documents/:id", authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await DocumentService.deleteDocument(id);
      
      const response: ApiResponse = {
        success: true,
        message: "Document deleted successfully"
      };
      
      res.json(response);
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete document"
      });
    }
  });

  app.get("/api/documents/:id/download", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const document = await DocumentService.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          error: "Document not found"
        });
      }

      // Check if user can access this document
      if (!document.isPublic && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Access denied"
        });
      }

      // Increment download count
      await DocumentService.incrementDownloadCount(id);
      
      // For now, since we don't have actual file storage, we'll create a simple text file
      // In a real implementation, you'd retrieve the actual file from storage (AWS S3, etc.)
      const fileContent = `Document: ${document.title}\n\nDescription: ${document.description || 'No description'}\n\nThis is a placeholder file. In a production system, this would be the actual uploaded file.`;
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Content-Length', Buffer.byteLength(fileContent));
      
      // Send the file content
      res.send(fileContent);
    } catch (error) {
      console.error("Download document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process download"
      });
    }
  });

  app.post("/api/documents/:id/download", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const document = await DocumentService.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          error: "Document not found"
        });
      }

      // Check if user can access this document
      if (!document.isPublic && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Access denied"
        });
      }

      // Increment download count
      await DocumentService.incrementDownloadCount(id);
      
      const response: ApiResponse = {
        success: true,
        message: "Download count updated",
        data: { downloadUrl: `/api/documents/${id}/download` }
      };
      
      res.json(response);
    } catch (error) {
      console.error("Track download error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to track download"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
