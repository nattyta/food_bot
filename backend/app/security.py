
import os
import logging
from cryptography.fernet import Fernet, InvalidToken
from cryptography.exceptions import InvalidSignature
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet, InvalidToken
from cryptography.exceptions import InvalidSignature
from . import config

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")



class PhoneEncryptor:
    _instance = None
    
    def __init__(self):
        key = os.getenv("PHONE_ENCRYPTION_KEY")
        if not key:
            logger.critical("❌ PHONE_ENCRYPTION_KEY environment variable not set!")
            raise RuntimeError("Encryption key missing")
        
        try:
            self.cipher = Fernet(key.encode())
            logger.info("✅ PhoneEncryptor initialized successfully")
        except Exception as e:
            logger.critical(f"❌ Failed to initialize cipher: {str(e)}")
            raise
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            cls._instance = PhoneEncryptor()
        return cls._instance
    
    def encrypt(self, phone: str) -> str:
        try:
            return self.cipher.encrypt(phone.encode()).decode()
        except Exception as e:
            logger.error(f"🔒 Encryption failed: {str(e)}")
            raise RuntimeError("Encryption error")
    
    def decrypt(self, encrypted: str) -> str:
        try:
            return self.cipher.decrypt(encrypted.encode()).decode()
        except (InvalidToken, InvalidSignature) as e:
            logger.error(f"🔓 Decryption failed - invalid token: {str(e)}")
            raise RuntimeError("Decryption error")
        except Exception as e:
            logger.error(f"🔓 Decryption failed: {str(e)}")
            raise RuntimeError("Decryption error")
    
    def obfuscate(self, phone: str) -> str:
        try:
            return f"{phone[:5]}****{phone[-3:]}" if phone else ""
        except Exception as e:
            logger.error(f"👁️ Obfuscation failed: {str(e)}")
            return "***"




def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Fallback expiration time if not provided
        expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM
    )
    return encoded_jwt