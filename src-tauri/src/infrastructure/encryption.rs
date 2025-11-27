//! Encryption infrastructure
//!
//! Provides AES-256-GCM encryption with Argon2id key derivation.

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{password_hash::SaltString, Argon2, PasswordHasher};
use rand::RngCore;

use crate::error::{PubCastError, Result};

/// Nonce size for AES-256-GCM (96 bits = 12 bytes)
const NONCE_SIZE: usize = 12;
/// Salt size for Argon2id (16 bytes recommended)
const SALT_SIZE: usize = 16;
/// Key size for AES-256 (256 bits = 32 bytes)
const KEY_SIZE: usize = 32;

/// Encryption service for secure credential storage
#[derive(Clone)]
pub struct EncryptionService {
    /// Derived encryption key
    key: [u8; KEY_SIZE],
}

impl EncryptionService {
    /// Create a new encryption service with the given master key and salt
    pub fn new(master_key: &[u8], salt: &[u8]) -> Result<Self> {
        let key = Self::derive_key(master_key, salt)?;
        Ok(Self { key })
    }

    /// Derive a key from the master key using Argon2id
    fn derive_key(master_key: &[u8], salt: &[u8]) -> Result<[u8; KEY_SIZE]> {
        // Create salt string from bytes
        let salt_string = SaltString::encode_b64(salt)
            .map_err(|e| PubCastError::Encryption(format!("Invalid salt: {}", e)))?;

        // Configure Argon2id
        let argon2 = Argon2::default();

        // Hash the master key to derive encryption key
        let hash = argon2
            .hash_password(master_key, &salt_string)
            .map_err(|e| PubCastError::Encryption(format!("Key derivation failed: {}", e)))?;

        // Extract the hash output
        let hash_output = hash
            .hash
            .ok_or_else(|| PubCastError::Encryption("No hash output".to_string()))?;

        let hash_bytes = hash_output.as_bytes();
        if hash_bytes.len() < KEY_SIZE {
            return Err(PubCastError::Encryption(
                "Hash output too short".to_string(),
            ));
        }

        let mut key = [0u8; KEY_SIZE];
        key.copy_from_slice(&hash_bytes[..KEY_SIZE]);
        Ok(key)
    }

    /// Encrypt plaintext data
    ///
    /// Returns a tuple of (ciphertext, nonce)
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|e| PubCastError::Encryption(format!("Cipher init failed: {}", e)))?;

        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| PubCastError::Encryption(format!("Encryption failed: {}", e)))?;

        Ok((ciphertext, nonce_bytes.to_vec()))
    }

    /// Decrypt ciphertext data
    pub fn decrypt(&self, ciphertext: &[u8], nonce: &[u8]) -> Result<Vec<u8>> {
        if nonce.len() != NONCE_SIZE {
            return Err(PubCastError::Encryption(format!(
                "Invalid nonce size: expected {}, got {}",
                NONCE_SIZE,
                nonce.len()
            )));
        }

        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|e| PubCastError::Encryption(format!("Cipher init failed: {}", e)))?;

        let nonce = Nonce::from_slice(nonce);

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| PubCastError::Encryption(format!("Decryption failed: {}", e)))?;

        Ok(plaintext)
    }

    /// Generate a random salt for key derivation
    pub fn generate_salt() -> Vec<u8> {
        let mut salt = vec![0u8; SALT_SIZE];
        OsRng.fill_bytes(&mut salt);
        salt
    }
}

/// Keychain service for master key management
pub struct KeychainService {
    service_name: String,
}

impl KeychainService {
    /// Create a new keychain service
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
        }
    }

    /// Get or create the master key from the system keychain
    pub fn get_or_create_master_key(&self) -> Result<Vec<u8>> {
        let entry = keyring::Entry::new(&self.service_name, "master_key")?;

        // Try to get existing key
        match entry.get_password() {
            Ok(key_b64) => {
                // Decode base64 key
                use base64::{engine::general_purpose::STANDARD, Engine};
                STANDARD
                    .decode(&key_b64)
                    .map_err(|e| PubCastError::Encryption(format!("Invalid key format: {}", e)))
            }
            Err(keyring::Error::NoEntry) => {
                // Generate new key
                let mut key = vec![0u8; KEY_SIZE];
                OsRng.fill_bytes(&mut key);

                // Store in keychain (base64 encoded)
                use base64::{engine::general_purpose::STANDARD, Engine};
                let key_b64 = STANDARD.encode(&key);
                entry.set_password(&key_b64)?;

                tracing::info!("Generated new master key and stored in keychain");
                Ok(key)
            }
            Err(e) => Err(e.into()),
        }
    }

    /// Delete the master key from keychain (for testing/reset)
    #[allow(dead_code)]
    pub fn delete_master_key(&self) -> Result<()> {
        let entry = keyring::Entry::new(&self.service_name, "master_key")?;
        entry.delete_credential()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let master_key = b"test_master_key_12345";
        let salt = EncryptionService::generate_salt();

        let service = EncryptionService::new(master_key, &salt).unwrap();

        let plaintext = b"Hello, World! This is a secret message.";
        let (ciphertext, nonce) = service.encrypt(plaintext).unwrap();

        assert_ne!(ciphertext.as_slice(), plaintext);
        assert_eq!(nonce.len(), NONCE_SIZE);

        let decrypted = service.decrypt(&ciphertext, &nonce).unwrap();
        assert_eq!(decrypted.as_slice(), plaintext);
    }

    #[test]
    fn test_different_salts_produce_different_keys() {
        let master_key = b"test_master_key";
        let salt1 = EncryptionService::generate_salt();
        let salt2 = EncryptionService::generate_salt();

        let service1 = EncryptionService::new(master_key, &salt1).unwrap();
        let service2 = EncryptionService::new(master_key, &salt2).unwrap();

        let plaintext = b"test data";
        let (ciphertext1, nonce1) = service1.encrypt(plaintext).unwrap();

        // Service2 should not be able to decrypt service1's ciphertext
        let result = service2.decrypt(&ciphertext1, &nonce1);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_plaintext() {
        let master_key = b"test_master_key";
        let salt = EncryptionService::generate_salt();
        let service = EncryptionService::new(master_key, &salt).unwrap();

        let plaintext = b"";
        let (ciphertext, nonce) = service.encrypt(plaintext).unwrap();
        let decrypted = service.decrypt(&ciphertext, &nonce).unwrap();

        assert_eq!(decrypted.as_slice(), plaintext);
    }
}
