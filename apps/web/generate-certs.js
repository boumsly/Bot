const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'certs');

if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Write private key
fs.writeFileSync(path.join(certDir, 'key.pem'), privateKey);

// Write public key as cert (self-signed)
fs.writeFileSync(path.join(certDir, 'cert.pem'), publicKey);

console.log('Certificates generated successfully in certs/ directory');
