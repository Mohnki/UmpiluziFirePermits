import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
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
  BurnTypeService 
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
      const queryParams = permitQuerySchema.parse(req.query);
      
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

  const httpServer = createServer(app);

  return httpServer;
}
