import type { Express, Request, Response } from "express";
import multer from "multer";
import {
  authRequestSchema,
  permitQuerySchema,
  ApiResponse,
} from "./schema";
import {
  AuthService,
  PermitService,
  AreaService,
  BurnTypeService,
  DocumentService,
  db,
} from "./firebase-service";
import {
  authenticateUser,
  requireAdmin,
  requireManagerAccess,
} from "./auth-middleware";
import { rateLimitMiddleware } from "./rate-limit-service";
import { StorageService } from "./storage-service";

export function registerRoutes(app: Express) {
  app.use("/api", rateLimitMiddleware);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG files are allowed."));
    },
  });

  // Auth
  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { idToken } = authRequestSchema.parse(req.body);
      const decodedToken = await AuthService.verifyIdToken(idToken);
      const userProfile = await AuthService.getUserProfile(decodedToken.uid);
      if (!userProfile) {
        return res.status(404).json({ success: false, error: "User profile not found" });
      }
      const response: ApiResponse = {
        success: true,
        data: { user: userProfile, token: decodedToken },
        message: "Authentication successful",
      };
      return res.json(response);
    } catch (error) {
      console.error("Auth verification error:", error);
      return res.status(401).json({ success: false, error: "Invalid authentication token" });
    }
  });

  // User profile
  app.get("/api/user/profile", authenticateUser, async (req: Request, res: Response) => {
    try {
      return res.json({ success: true, data: req.user } as ApiResponse);
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ success: false, error: "Failed to get user profile" });
    }
  });

  // Permits
  app.get("/api/permits", authenticateUser, async (req: Request, res: Response) => {
    try {
      const processedQuery: any = {
        ...req.query,
        includeHistorical: req.query.includeHistorical === "true" ? true : undefined,
      };
      if (processedQuery.limit) processedQuery.limit = parseInt(processedQuery.limit, 10);
      if (processedQuery.offset) processedQuery.offset = parseInt(processedQuery.offset, 10);
      if (
        processedQuery["location[latitude]"] ||
        processedQuery["location[longitude]"] ||
        processedQuery["location[radius]"]
      ) {
        processedQuery.location = {
          latitude: processedQuery["location[latitude]"]
            ? parseFloat(processedQuery["location[latitude]"])
            : undefined,
          longitude: processedQuery["location[longitude]"]
            ? parseFloat(processedQuery["location[longitude]"])
            : undefined,
          radius: processedQuery["location[radius]"]
            ? parseFloat(processedQuery["location[radius]"])
            : undefined,
        };
        delete processedQuery["location[latitude]"];
        delete processedQuery["location[longitude]"];
        delete processedQuery["location[radius]"];
      }

      const queryParams = permitQuerySchema.parse(processedQuery);
      if (req.user!.role === "user") queryParams.userId = req.user!.uid;

      const permits = await PermitService.getPermits(queryParams);
      return res.json({
        success: true,
        data: permits,
        message: `Retrieved ${permits.length} permits`,
      } as ApiResponse);
    } catch (error) {
      console.error("Get permits error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve permits" });
    }
  });

  app.get("/api/permits/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const permit = await PermitService.getPermitById(req.params.id);
      if (!permit) return res.status(404).json({ success: false, error: "Permit not found" });
      if (req.user!.role === "user" && permit.userId !== req.user!.uid) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
      return res.json({ success: true, data: permit } as ApiResponse);
    } catch (error) {
      console.error("Get permit error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve permit" });
    }
  });

  app.get(
    "/api/users/:userId/permits",
    authenticateUser,
    requireManagerAccess,
    async (req: Request, res: Response) => {
      try {
        const queryParams = permitQuerySchema.parse(req.query);
        queryParams.userId = req.params.userId;
        const permits = await PermitService.getPermits(queryParams);
        return res.json({
          success: true,
          data: permits,
          message: `Retrieved ${permits.length} permits for user ${req.params.userId}`,
        } as ApiResponse);
      } catch (error) {
        console.error("Get user permits error:", error);
        return res.status(500).json({ success: false, error: "Failed to retrieve user permits" });
      }
    }
  );

  app.get(
    "/api/areas/:areaId/permits",
    authenticateUser,
    requireManagerAccess,
    async (req: Request, res: Response) => {
      try {
        const queryParams = permitQuerySchema.parse(req.query);
        queryParams.areaId = req.params.areaId;
        const permits = await PermitService.getPermits(queryParams);
        return res.json({
          success: true,
          data: permits,
          message: `Retrieved ${permits.length} permits for area ${req.params.areaId}`,
        } as ApiResponse);
      } catch (error) {
        console.error("Get area permits error:", error);
        return res.status(500).json({ success: false, error: "Failed to retrieve area permits" });
      }
    }
  );

  app.patch("/api/permits/:id/complete", authenticateUser, async (req: Request, res: Response) => {
    try {
      const permit = await PermitService.getPermitById(req.params.id);
      if (!permit) return res.status(404).json({ success: false, error: "Permit not found" });
      if (permit.userId !== req.user!.uid) {
        return res
          .status(403)
          .json({ success: false, error: "You can only complete your own permits" });
      }
      if (permit.status !== "approved") {
        return res
          .status(400)
          .json({ success: false, error: "Only approved permits can be completed" });
      }
      await db.collection("burnPermits").doc(req.params.id).update({
        status: "completed",
        updatedAt: new Date(),
      });
      return res.json({
        success: true,
        data: { id: req.params.id, status: "completed" },
        message: "Permit completed successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Complete permit error:", error);
      return res.status(500).json({ success: false, error: "Failed to complete permit" });
    }
  });

  app.patch(
    "/api/permits/:id",
    authenticateUser,
    requireManagerAccess,
    async (req: Request, res: Response) => {
      try {
        const { status, rejectionReason } = req.body;
        if (!status || !["approved", "rejected", "cancelled"].includes(status)) {
          return res.status(400).json({
            success: false,
            error: "Valid status is required (approved, rejected, cancelled)",
          });
        }
        const permit = await PermitService.getPermitById(req.params.id);
        if (!permit) return res.status(404).json({ success: false, error: "Permit not found" });

        const updateData: any = { status, updatedAt: new Date() };
        if (status === "approved") {
          updateData.approvedBy = req.user?.uid;
          updateData.approvedAt = new Date();
        } else if (status === "rejected" || status === "cancelled") {
          updateData.rejectionReason = rejectionReason || "No reason provided";
        }
        await db.collection("burnPermits").doc(req.params.id).update(updateData);
        return res.json({
          success: true,
          data: { id: req.params.id, status },
          message: `Permit ${status} successfully`,
        } as ApiResponse);
      } catch (error) {
        console.error("Update permit error:", error);
        return res.status(500).json({ success: false, error: "Failed to update permit" });
      }
    }
  );

  // Areas
  app.get("/api/areas", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const areas = await AreaService.getAllAreas();
      return res.json({
        success: true,
        data: areas,
        message: `Retrieved ${areas.length} areas`,
      } as ApiResponse);
    } catch (error) {
      console.error("Get areas error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve areas" });
    }
  });

  app.get("/api/areas/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const area = await AreaService.getAreaById(req.params.id);
      if (!area) return res.status(404).json({ success: false, error: "Area not found" });
      return res.json({ success: true, data: area } as ApiResponse);
    } catch (error) {
      console.error("Get area error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve area" });
    }
  });

  // Burn types
  app.get("/api/burn-types", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const burnTypes = await BurnTypeService.getAllBurnTypes();
      return res.json({
        success: true,
        data: burnTypes,
        message: `Retrieved ${burnTypes.length} burn types`,
      } as ApiResponse);
    } catch (error) {
      console.error("Get burn types error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve burn types" });
    }
  });

  app.get("/api/burn-types/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const burnType = await BurnTypeService.getBurnTypeById(req.params.id);
      if (!burnType) return res.status(404).json({ success: false, error: "Burn type not found" });
      return res.json({ success: true, data: burnType } as ApiResponse);
    } catch (error) {
      console.error("Get burn type error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve burn type" });
    }
  });

  // Health
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: "API is running",
      timestamp: new Date().toISOString(),
    });
  });

  // GeoJSON
  app.get("/api/umpiluzi-fmu-geojson", async (_req: Request, res: Response) => {
    try {
      const umpiluziFMUGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: "Umpiluzi Fire Management Unit",
              description:
                "Primary fire management area under Umpiluzi Fire Protection Association",
              area_type: "Fire Management Unit",
              management_authority: "Umpiluzi FPA",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [30.35, -26.15],
                  [30.65, -26.15],
                  [30.65, -26.35],
                  [30.35, -26.35],
                  [30.35, -26.15],
                ],
              ],
            },
          },
        ],
      };
      return res.json({ success: true, data: umpiluziFMUGeoJSON });
    } catch (error) {
      console.error("Error serving GeoJSON:", error);
      return res.status(500).json({ success: false, error: "Failed to serve GeoJSON data" });
    }
  });

  // Documents
  app.get("/api/documents", authenticateUser, async (req: Request, res: Response) => {
    try {
      const documents =
        req.user?.role === "admin"
          ? await DocumentService.getAllDocuments()
          : await DocumentService.getPublicDocuments();
      return res.json({
        success: true,
        data: documents,
        message: `Retrieved ${documents.length} documents`,
      } as ApiResponse);
    } catch (error) {
      console.error("Get documents error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve documents" });
    }
  });

  app.get("/api/documents/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const document = await DocumentService.getDocumentById(req.params.id);
      if (!document) return res.status(404).json({ success: false, error: "Document not found" });
      if (!document.isPublic && req.user?.role !== "admin") {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
      return res.json({ success: true, data: document } as ApiResponse);
    } catch (error) {
      console.error("Get document error:", error);
      return res.status(500).json({ success: false, error: "Failed to retrieve document" });
    }
  });

  app.post(
    "/api/documents",
    authenticateUser,
    requireAdmin,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ success: false, error: "No file uploaded" });
        }
        const documentData = {
          title: req.body.title,
          description: req.body.description || "",
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          isPublic: req.body.isPublic === "true",
          uploadedBy: req.user!.uid,
        };
        // Create Firestore doc first so we have the ID for the storage path.
        const document = await DocumentService.createDocument(documentData);
        const storagePath = await StorageService.uploadDocument({
          documentId: document.id,
          fileName: req.file.originalname,
          contentType: req.file.mimetype,
          buffer: req.file.buffer,
        });
        await DocumentService.updateDocument(document.id, { storagePath });
        document.storagePath = storagePath;
        return res.json({
          success: true,
          data: document,
          message: "Document created successfully",
        } as ApiResponse);
      } catch (error) {
        console.error("Create document error:", error);
        return res.status(500).json({ success: false, error: "Failed to create document" });
      }
    }
  );

  app.patch(
    "/api/documents/:id",
    authenticateUser,
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const updates: Record<string, any> = {
          title: req.body.title,
          description: req.body.description,
          isPublic: req.body.isPublic,
        };
        Object.keys(updates).forEach(
          (key) => updates[key] === undefined && delete updates[key]
        );
        await DocumentService.updateDocument(req.params.id, updates);
        return res.json({
          success: true,
          message: "Document updated successfully",
        } as ApiResponse);
      } catch (error) {
        console.error("Update document error:", error);
        return res.status(500).json({ success: false, error: "Failed to update document" });
      }
    }
  );

  app.delete(
    "/api/documents/:id",
    authenticateUser,
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const document = await DocumentService.getDocumentById(req.params.id);
        if (document?.storagePath) {
          await StorageService.deleteDocument(document.storagePath);
        }
        await DocumentService.deleteDocument(req.params.id);
        return res.json({
          success: true,
          message: "Document deleted successfully",
        } as ApiResponse);
      } catch (error) {
        console.error("Delete document error:", error);
        return res.status(500).json({ success: false, error: "Failed to delete document" });
      }
    }
  );

  app.get("/api/documents/:id/download", authenticateUser, async (req: Request, res: Response) => {
    try {
      const document = await DocumentService.getDocumentById(req.params.id);
      if (!document) return res.status(404).json({ success: false, error: "Document not found" });
      if (!document.isPublic && req.user?.role !== "admin") {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
      if (!document.storagePath) {
        return res
          .status(410)
          .json({ success: false, error: "Document file is not available" });
      }
      await DocumentService.incrementDownloadCount(req.params.id);
      const url = await StorageService.getSignedDownloadUrl(
        document.storagePath,
        document.fileName,
        document.fileType
      );
      return res.redirect(302, url);
    } catch (error) {
      console.error("Download document error:", error);
      return res.status(500).json({ success: false, error: "Failed to process download" });
    }
  });

  app.post("/api/documents/:id/download", authenticateUser, async (req: Request, res: Response) => {
    try {
      const document = await DocumentService.getDocumentById(req.params.id);
      if (!document) return res.status(404).json({ success: false, error: "Document not found" });
      if (!document.isPublic && req.user?.role !== "admin") {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
      await DocumentService.incrementDownloadCount(req.params.id);
      return res.json({
        success: true,
        message: "Download count updated",
        data: { downloadUrl: `/api/documents/${req.params.id}/download` },
      } as ApiResponse);
    } catch (error) {
      console.error("Track download error:", error);
      return res.status(500).json({ success: false, error: "Failed to track download" });
    }
  });
}
