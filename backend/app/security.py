# security.py
import os
from cryptography.fernet import Fernet

class PhoneEncryptor:
    _instance = None
    
    def __init__(self):
        key = os.getenv("PHONE_ENCRYPTION_KEY")
        if not key:
            raise RuntimeError("PHONE_ENCRYPTION_KEY environment variable not set!")
        self.cipher = Fernet(key.encode())
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            cls._instance = PhoneEncryptor()
        return cls._instance
    
    def encrypt(self, phone: str) -> str:
        return self.cipher.encrypt(phone.encode()).decode()
    
    def decrypt(self, encrypted: str) -> str:
        return self.cipher.decrypt(encrypted.encode()).decode()
    
    def obfuscate(self, phone: str) -> str:
        return f"{phone[:5]}****{phone[-3:]}" if phone else ""