import { Router, Request, Response } from "express";
import passport from "passport";
import fs from "fs";
import path from "path";
// This router relies on the SAML strategy configured in src/index.ts

const router = Router();

const samlReady = () => {
  const strategies = (passport as any)._strategies || {};
  console.log('DEBUG: Available strategies:', Object.keys(strategies));
  console.log('DEBUG: SAML strategy exists:', !!strategies["saml"]);
  return !!strategies["saml"];
};

// Kick off SSO login
router.get("/login", (req, res, next) => {
  console.log('DEBUG: /login route called');
  if (!samlReady()) {
    console.log('DEBUG: SAML not ready');
    return res.status(500).json({ error: "SAML not configured" });
  }
  console.log('DEBUG: Initiating SAML authentication');
  return (passport.authenticate("saml", { 
    failureRedirect: "/", 
    failureMessage: true,
    successRedirect: "/"
  }) as any)(req, res, next);
});

// IdP callback
router.post("/callback", (req: Request, res: Response, next) => {
  console.log('DEBUG: /callback route called');
  console.log('DEBUG: Request body:', req.body);
  console.log('DEBUG: Request headers:', req.headers);
  
  if (!samlReady()) {
    console.log('DEBUG: SAML not ready in callback');
    return res.status(500).json({ error: "SAML not configured" });
  }
  
  console.log('DEBUG: Processing SAML callback');
  return (passport.authenticate("saml", { 
    failureRedirect: "/", 
    failureMessage: true 
  }) as any)(req, res, (err: any) => {
    if (err) {
      console.error('DEBUG: SAML callback error:', err);
      return res.status(401).json({ error: "Authentication failed", details: err.message });
    }
    console.log('DEBUG: SAML callback successful, user:', req.user);
    res.redirect("/");
  });
});

// Service Provider metadata (optional but useful for IdP configuration)
router.get("/metadata", (req: Request, res: Response) => {
  const strategy: any = (passport as any)._strategy && (passport as any)._strategy("saml");
  if (strategy && typeof strategy.generateServiceProviderMetadata === "function") {
    const metadata = strategy.generateServiceProviderMetadata();
    res.type("application/xml").send(metadata);
  } else {
    // Fallback minimal metadata so the IdP can be configured before SAML is enabled
    // Auto-detect environment for metadata URLs
    const isReplit = !!process.env.REPL_SLUG;
    const defaultEntityId = isReplit 
      ? "https://bot-sightcall-polls.replit.app/api/auth/metadata"
      : "http://localhost:3000/api/auth/metadata";
    const defaultAcsUrl = isReplit 
      ? "https://bot-sightcall-polls.replit.app/api/auth/callback"
      : "http://localhost:3000/api/auth/callback";
      
    const entityId = process.env.SAML_ISSUER || defaultEntityId;
    const acsUrl = process.env.SAML_CALLBACK_URL || defaultAcsUrl;
    // Optional SP cert if present
    const certPath = path.join(process.cwd(), "certs", "cert.pem");
    let x509 = "";
    if (fs.existsSync(certPath)) {
      const pem = fs.readFileSync(certPath, "utf8");
      // strip BEGIN/END and newlines to base64 body if it's a full cert; if it's a public key, just omit
      const match = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/);
      if (match) {
        x509 = match[1].replace(/\r?\n/g, "").trim();
      }
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    ${x509 ? `<KeyDescriptor use="signing"><KeyInfo xmlns=\"http://www.w3.org/2000/09/xmldsig#\"><X509Data><X509Certificate>${x509}</X509Certificate></X509Data></KeyInfo></KeyDescriptor>` : ""}
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0" isDefault="true" />
  </SPSSODescriptor>
</EntityDescriptor>`;
    res.type("application/xml").send(xml);
  }
});

// Who am I
router.get("/me", (req: Request, res: Response) => {
  // @ts-ignore
  if (req.isAuthenticated && req.isAuthenticated()) {
    // @ts-ignore
    return res.json({ authenticated: true, user: req.user });
  }
  return res.status(401).json({ authenticated: false });
});

// Logout (local)
router.post("/logout", (req: Request, res: Response, next) => {
  // @ts-ignore
  if (req.logout) {
    // @ts-ignore
    req.logout(function () {
      res.json({ ok: true });
    });
  } else {
    res.json({ ok: true });
  }
});

export default router;
