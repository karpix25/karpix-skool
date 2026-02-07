import aioboto3
from contextlib import asynccontextmanager
from ..config import settings
import uuid

class R2Storage:
    def __init__(self):
        self.session = aioboto3.Session()
        self.endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        self.access_key = settings.R2_ACCESS_KEY_ID
        self.secret_key = settings.R2_SECRET_ACCESS_KEY
        self.bucket_name = settings.R2_BUCKET_NAME
        self.public_url = settings.R2_PUBLIC_URL.rstrip("/")

    @asynccontextmanager
    async def get_client(self):
        async with self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as client:
            yield client

    async def upload_file(self, file_content: bytes, filename: str, content_type: str = "image/jpeg", folder: str = "oblozhki", use_uuid: bool = True) -> str:
        # Generate unique filename to avoid collisions
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        
        if use_uuid:
            unique_filename = f"{folder}/{uuid.uuid4()}.{ext}"
        else:
            # Clean filename to be safe
            safe_name = "".join([c for c in filename if c.isalnum() or c in "._-"])
            unique_filename = f"{folder}/{safe_name}"

        async with self.get_client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=file_content,
                ContentType=content_type
            )
        
        return f"{self.public_url}/{unique_filename}"

storage = R2Storage()
