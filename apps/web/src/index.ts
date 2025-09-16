import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import sessionRouter from "./routes/session";
import departmentRouter from "./routes/department";
import chatRouter from "./routes/chat";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import session from "express-session";
import cookieParser from "cookie-parser";
import passport from "passport";
import { Strategy as SamlStrategy, VerifiedCallback } from "@node-saml/passport-saml";
import authRouter from "./routes/auth";

const app = express();

// Trust proxy for proper forwarded headers in Replit environment
app.set('trust proxy', 1);

// Middleware to disable caching for Replit proxy environment
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(cors({
  origin: true, // Allow all origins for Replit proxy
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Nécessaire pour parser les données SAML POST
app.use(express.static("public"));
app.use(morgan("dev"));

// Session & cookies must be before passport.session()
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Configure Passport SAML strategy
const samlCallbackUrl = process.env.SAML_CALLBACK_URL || "http://localhost:3000/api/auth/callback";
const samlEntryPoint = process.env.SAML_ENTRYPOINT || ""; // e.g. from your IdP metadata
const samlIssuer = process.env.SAML_ISSUER || "ai-transformation-web";
const idpCertFromEnv = process.env.SAML_IDP_CERT;
const idpCertPath = process.env.SAML_IDP_CERT_PATH?.trim().replace(/^"|"$/g, '');

let idpCert;
if (idpCertFromEnv && idpCertFromEnv.trim().length > 0) {
  // Replace \n with actual newlines for proper PEM format
  idpCert = idpCertFromEnv.replace(/\\n/g, '\n').trim();
  console.log('DEBUG: Using cert from env variable, length:', idpCert.length);
} else if (idpCertPath && fs.existsSync(idpCertPath)) {
  const rawContent = fs.readFileSync(idpCertPath, "utf8");
  idpCert = rawContent.replace(/^\uFEFF/, '').trim();
  console.log('DEBUG: Using cert from file, length:', idpCert.length);
} else {
  idpCert = undefined;
  console.log('DEBUG: No cert found');
}

// Debug logging - check what we have
console.log('DEBUG SAML_IDP_CERT present:', !!process.env.SAML_IDP_CERT);
console.log('DEBUG SAML_IDP_CERT length:', process.env.SAML_IDP_CERT?.length || 0);
console.log('DEBUG SAML_ENTRYPOINT:', process.env.SAML_ENTRYPOINT);
console.log('DEBUG idpCert final value:', idpCert ? `present (${idpCert.length} chars)` : 'missing');
console.log('DEBUG samlEntryPoint:', samlEntryPoint ? 'present' : 'missing');

// Check if both required values are present
if (samlEntryPoint && idpCert) {
  console.log('DEBUG: Both samlEntryPoint and idpCert are present, initializing SAML strategy');
} else {
  console.log('DEBUG: Missing required SAML config:', {
    samlEntryPoint: !!samlEntryPoint,
    idpCert: !!idpCert
  });
}

const certPath = path.join(process.cwd(), "certs", "cert.pem");
const keyPath = path.join(process.cwd(), "certs", "key.pem");
const spCert = fs.existsSync(certPath) ? fs.readFileSync(certPath, "utf8") : undefined;
const spKey = fs.existsSync(keyPath) ? fs.readFileSync(keyPath, "utf8") : undefined;

if (samlEntryPoint && idpCert) {
  console.log('DEBUG: Initializing SAML strategy with cert length:', idpCert.length);
  console.log('DEBUG: Cert starts with:', idpCert.substring(0, 27));
  console.log('DEBUG: Cert ends with:', idpCert.substring(idpCert.length - 25));
  console.log('DEBUG: Cert contains BEGIN:', idpCert.includes('-----BEGIN CERTIFICATE-----'));
  console.log('DEBUG: Cert contains END:', idpCert.includes('-----END CERTIFICATE-----'));
  
  // Clean the certificate - remove any extra whitespace and ensure proper format
  const cleanCert = idpCert.replace(/\r/g, '').trim();
  console.log('DEBUG: Clean cert length:', cleanCert.length);
  
  try {
    passport.use(
      new (SamlStrategy as any)(
        {
          callbackUrl: samlCallbackUrl,
          entryPoint: samlEntryPoint,
          issuer: samlIssuer,
          idpCert: cleanCert,  // Try idpCert instead of cert
          privateKey: spKey, // optional for signing
          decryptionPvk: spKey, // optional for encrypted assertions
          disableRequestedAuthnContext: true,
          wantAssertionsSigned: false,
        },
        function verify(profile: any, done: VerifiedCallback) {
          // Prefer email or NameID as identifier
          const email = (profile as any)?.email || (profile as any)?.nameID || (profile as any)?.NameID;
          const user = {
            email: email ? String(email) : undefined,
            nameId: (profile as any)?.nameID || (profile as any)?.NameID,
            displayName: (profile as any)?.displayName,
            profile,
          };
          return done(null, user as any);
        },
        // logoutVerify callback (signature varies per version). Accept all for now.
        function logoutVerify(_req: any, _profileOrNameId: any, done: any) {
          return done(null, true);
        }
      )
    );
    console.log('DEBUG: SAML strategy initialized successfully');
  } catch (error: any) {
    console.error('DEBUG: Error initializing SAML strategy:', error.message);
    console.error('DEBUG: Full error:', error);
  }
} else {
  console.warn("[SAML] Disabled: missing SAML_ENTRYPOINT and/or SAML_IDP_CERT (or SAML_IDP_CERT_PATH)");
}

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

app.get("/health", (_req: Request, res: Response) => {
  console.log("Health endpoint called");
  res.json({ ok: true });
});
// Auth routes
app.use("/api/auth", authRouter);

// Require auth for session routes (disabled for demo/testing)
const requireAuth = (req: Request, res: Response, next: Function) => {
  // @ts-ignore - passport adds isAuthenticated
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) return next();
  return res.status(401).json({ error: "unauthorized" });
};

// Temporarily disable authentication for demo/testing purposes
app.use("/api/session", sessionRouter);
app.use("/api/department", departmentRouter);
app.use("/api/chat", chatRouter);

// Serve UI from /public
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`[web] listening on :${port}`));
